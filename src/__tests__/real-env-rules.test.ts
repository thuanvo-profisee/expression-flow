// ─── Real-environment Data Quality Rules ──────────────────────────
//
// Every rule of a live instance (anonymized, see realEnvFixture.ts) is read
// through the app's own code: the REST client, the parser, the generator and
// the store. Regenerate the fixture with
//   node scripts/capture-rules-fixture.mjs
//
// Each test loops the whole corpus and lists the first failures, so one
// broken expression reads as one message rather than thousands of cases.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDataQualityRules, mapRuleRecord } from "../api/profisee";
import type { RawRuleClause } from "../api/profisee";
import { parseExpressionToBlock } from "../parser";
import { generateCode, useExpressionStore } from "../store";
import { FUNCTION_REGISTRY } from "../types";
import type { Block } from "../types";
import { entities, fixture, rulesServer } from "./realEnvFixture";

const allRecords = entities.flatMap((e) => e.records);
const allRules = allRecords.map(mapRuleRecord);
const allClauses = allRules.flatMap((rule) => rule.clauses.map((clause) => ({ rule, clause })));

/** Tree without block ids, for comparing two parses */
function shape(block: Block | null): string {
    return JSON.stringify(block, (key, value) => (key === "id" ? undefined : value));
}

/** First failures, readable in the assertion message */
function report(failures: string[]): string[] {
    return failures.length > 10
        ? [...failures.slice(0, 10), `…and ${failures.length - 10} more`]
        : failures;
}

// ─── The fixture must stay anonymized ────────────────────────────

const KEYWORDS = new Set([
    "TRUE", "FALSE", "NULL", "AND", "OR", "NOT", "IN",
    "YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR", "MINUTE", "SECOND",
]);
const FUNCTIONS = new Set(Object.keys(FUNCTION_REGISTRY).map((k) => k.toUpperCase()));
const ATTRIBUTE = /^(Attr ?\d+|Code|Name|\$\w+)$/;

/** Every piece of data in an expression that is not a pseudonym */
function unmaskedParts(expression: string): string[] {
    const found: string[] = [];
    for (const m of expression.matchAll(/"([^"]*)"|'([^']*)'|\[([^\]]*)\]|([A-Za-z_$][\w$]*)|(\d[\d.]*)/g)) {
        const [, dq, sq, attr, word, num] = m;
        const text = dq ?? sq;
        if (text !== undefined && text !== "" && !/^s\d+$/.test(text)) found.push(`"${text}"`);
        if (attr !== undefined && !ATTRIBUTE.test(attr)) found.push(`[${attr}]`);
        if (word !== undefined) {
            const upper = word.toUpperCase();
            if (!FUNCTIONS.has(upper) && !KEYWORDS.has(upper) && !/^w\d+$/.test(word)) found.push(word);
        }
        if (num !== undefined && num.split(".")[0].length > 4 && !/^0\d{4}$/.test(num)) found.push(num);
    }
    return found;
}

describe("real-env fixture is anonymized", () => {
    it("expressions hold only pseudonyms and platform vocabulary", () => {
        const failures = fixture.expressions.flatMap((x) =>
            unmaskedParts(x).map((part) => `${part} in ${x}`),
        );
        expect(report(failures)).toEqual([]);
    });

    it("entity, attribute and display values are pseudonyms", () => {
        const failures: string[] = [];
        for (const entity of fixture.entities) {
            if (!/^Entity\d+$/.test(entity.name)) failures.push(entity.name);
            for (const [attribute, , clauses] of entity.rules) {
                if (attribute !== null && !ATTRIBUTE.test(attribute)) failures.push(attribute);
                for (const row of clauses) {
                    for (const display of [row[3], row[4]]) {
                        if (display === null || display === "=" || /^dt\d+$/.test(display)) continue;
                        // display text that repeats the clause, e.g. "<what> WHEN <when>"
                        if (unmaskedParts(display).length > 0) failures.push(display);
                    }
                }
            }
        }
        expect(report(failures)).toEqual([]);
    });
});

// ─── The fixture keeps covering the bugs it was captured for ──────

describe("real-env fixture coverage", () => {
    it("has entities above the 50 rules GET /DataQualityRules returned", () => {
        expect(entities.some((e) => e.records.length > 50)).toBe(true);
    });

    it("has entities without rules", () => {
        expect(entities.some((e) => e.records.length === 0)).toBe(true);
    });

    it("has validation, assignment and constraint clauses", () => {
        const kinds = new Set(allClauses.map(({ clause }) => clause.kind));
        expect([...kinds].sort()).toEqual(["assignment", "validation"]);
        expect(allClauses.some(({ clause }) => clause.isConstraint)).toBe(true);
    });

    it("has display text that differs from the expression", () => {
        expect(
            allClauses.some(
                ({ clause }) =>
                    clause.whatDisplayText !== null &&
                    clause.whatDisplayText !== clause.whatExpression,
            ),
        ).toBe(true);
    });

    it("has prefix NOT and grouping that precedence depends on", () => {
        expect(fixture.expressions.some((x) => /\bNOT\s+[A-Z]+\(/.test(x))).toBe(true);
        expect(fixture.expressions.some((x) => /\b(AND|OR)\s*\(/.test(x))).toBe(true);
    });
});

// ─── Parser and code generator ───────────────────────────────────

describe("real-env expressions", () => {
    it("all parse", () => {
        const failures: string[] = [];
        for (const x of fixture.expressions) {
            try {
                if (!parseExpressionToBlock(x)) failures.push(`empty: ${x}`);
            } catch (e) {
                failures.push(`${(e as Error).message}: ${x}`);
            }
        }
        expect(report(failures)).toEqual([]);
    });

    it("keep their meaning through generated code", () => {
        // The canvas re-emits code before a save — it must parse back to the same tree
        const failures: string[] = [];
        for (const x of fixture.expressions) {
            const tree = parseExpressionToBlock(x);
            const code = generateCode(tree);
            if (shape(parseExpressionToBlock(code)) !== shape(tree)) failures.push(`${x}  →  ${code}`);
        }
        expect(report(failures)).toEqual([]);
    });

    it("generate stable code", () => {
        const failures: string[] = [];
        for (const x of fixture.expressions) {
            const once = generateCode(parseExpressionToBlock(x));
            const twice = generateCode(parseExpressionToBlock(once));
            if (once !== twice) failures.push(`${once}  →  ${twice}`);
        }
        expect(report(failures)).toEqual([]);
    });
});

// ─── REST client ─────────────────────────────────────────────────

describe("fetchDataQualityRules on real-env rules", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([
        ["one page per entity", Number.POSITIVE_INFINITY],
        ["a server that caps pages at 50", 50],
    ])("returns every rule of every entity (%s)", async (_label, cap) => {
        vi.stubGlobal("fetch", vi.fn(rulesServer(cap)));
        const failures: string[] = [];
        for (const entity of entities) {
            const rules = await fetchDataQualityRules(entity.uid);
            const got = rules.map((r) => r.id).join();
            const want = entity.records.map((r) => r.id).join();
            if (got !== want) {
                failures.push(`${entity.name}: ${rules.length} of ${entity.records.length} rules`);
            }
        }
        expect(report(failures)).toEqual([]);
    });

    it("maps every clause with its expressions, kind and constraint flag", async () => {
        vi.stubGlobal("fetch", vi.fn(rulesServer()));
        const failures: string[] = [];
        for (const entity of entities) {
            const rules = await fetchDataQualityRules(entity.uid);
            rules.forEach((rule, i) => {
                const cfg = entity.records[i].configuration!;
                // Some live expressions end in a newline; the client trims them
                const what = (c: RawRuleClause) => c.whatExpression?.trim();
                const when = (c: RawRuleClause) => c.whenExpression?.trim() || null;
                const expected = [
                    ...cfg.validationClauses!.map((c) => ["validation", what(c), when(c), !!c.isConstraint]),
                    ...cfg.assignmentClauses!.map((c) => ["assignment", what(c), when(c), false]),
                ];
                const actual = rule.clauses.map((c) => [c.kind, c.whatExpression, c.whenExpression, c.isConstraint]);
                if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${entity.name} rule ${i}`);
                if (rule.attributeName !== (cfg.attributeId?.name ?? null)) failures.push(`${entity.name} rule ${i} attribute`);
            });
        }
        expect(report(failures)).toEqual([]);
    });
});

// ─── Loading a clause into the canvas ────────────────────────────

describe("loadRuleClause on real-env clauses", () => {
    const store = () => useExpressionStore.getState();

    beforeEach(() => {
        store().setScenario("validIf");
        store().startNewRule();
        useExpressionStore.setState({ dqRulesError: null });
    });

    it("loads every clause and keeps its meaning on the canvas", () => {
        const failures: string[] = [];
        for (const { rule, clause } of allClauses) {
            store().loadRuleClause(rule, clause);
            const s = store();
            const where = `${rule.entityName} ${clause.id}`;
            if (s.dqRulesError) {
                failures.push(`${where}: ${s.dqRulesError}`);
                useExpressionStore.setState({ dqRulesError: null });
                continue;
            }
            if (s.blockConfigs[0].expressionMode !== clause.kind) failures.push(`${where}: wrong scenario`);
            if (s.isConstraint !== clause.isConstraint) failures.push(`${where}: constraint flag`);
            if (s.ruleId !== rule.id || s.ruleClauseId !== clause.id) failures.push(`${where}: save target`);
            const canvas: [string | null, string][] = [
                [clause.whatExpression, s.generatedCodes[0]],
                [clause.whenExpression, s.generatedCodes[1]],
            ];
            for (const [source, code] of canvas) {
                const expected = source ? shape(parseExpressionToBlock(source)) : shape(null);
                const actual = source ? shape(parseExpressionToBlock(code)) : shape(s.roots[1]);
                if (actual !== expected) failures.push(`${where}: ${source}  →  ${code}`);
            }
        }
        expect(report(failures)).toEqual([]);
    });

    it("keeps free display text and drops text that only repeats the clause", () => {
        const failures: string[] = [];
        for (const { rule, clause } of allClauses) {
            store().loadRuleClause(rule, clause);
            const repeats =
                clause.whatDisplayText === null ||
                clause.whatDisplayText === clause.whatExpression ||
                clause.whatDisplayText === `${clause.whatExpression} WHEN ${clause.whenExpression}`;
            const expected = repeats ? "" : clause.whatDisplayText;
            if (store().ruleDisplayText !== expected) failures.push(`${rule.entityName} ${clause.id}`);
        }
        expect(report(failures)).toEqual([]);
    });
});
