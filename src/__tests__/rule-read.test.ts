// ─── Reading rules (GET /Rules) ───────────────────────────────────
//
// GET /DataQualityRules caps at 50 rules and labels clauses with their display
// text, so rules are read from GET /Rules with Attributes=[Configuration]. The
// fixtures below follow the shape a live instance returns.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDataQualityRules, mapRuleRecord } from "../api/profisee";
import type { DataQualityRule, RawRuleRecord } from "../api/profisee";
import { useExpressionStore } from "../store";

const ENTITY_UID = "11111111-2222-4333-8444-555555555555";

function record(id: string, overrides: Partial<RawRuleRecord["configuration"]> = {}): RawRuleRecord {
    return {
        id,
        configuration: {
            entityId: { id: ENTITY_UID, name: "Product", internalId: 1 },
            attributeId: { id: "attr-1", name: "Code", internalId: 2 },
            isEnabled: true,
            validationClauses: [],
            assignmentClauses: [],
            ...overrides,
        },
    };
}

function page(data: RawRuleRecord[], totalPages: number) {
    return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ totalPages, data }),
    };
}

describe("mapRuleRecord", () => {
    it("keeps expressions, display text and constraint per clause", () => {
        const rule = mapRuleRecord(
            record("rule-1", {
                validationClauses: [
                    {
                        id: "c1",
                        whatExpression: "LENGTH([Code]) = 9",
                        whatDisplayText: "Code must be 9 characters",
                        whenExpression: '[Class].[Code] = "A"',
                        whenDisplayText: '[Class].[Code] = "A"',
                        isConstraint: true,
                    },
                ],
                assignmentClauses: [
                    {
                        id: "c2",
                        whatExpression: "LEFT( [Code]  ,  10)",
                        whatDisplayText: "LEFT( [Code]  ,  10)",
                        whenExpression: null,
                        whenDisplayText: null,
                    },
                ],
            }),
        );

        expect(rule).toEqual<DataQualityRule>({
            id: "rule-1",
            entityName: "Product",
            attributeName: "Code",
            isEnabled: true,
            clauses: [
                {
                    id: "c1",
                    kind: "validation",
                    whatExpression: "LENGTH([Code]) = 9",
                    whenExpression: '[Class].[Code] = "A"',
                    whatDisplayText: "Code must be 9 characters",
                    isConstraint: true,
                },
                {
                    id: "c2",
                    kind: "assignment",
                    whatExpression: "LEFT( [Code]  ,  10)",
                    whenExpression: null,
                    whatDisplayText: "LEFT( [Code]  ,  10)",
                    isConstraint: false,
                },
            ],
        });
    });

    it("tolerates a missing configuration and empty clauses", () => {
        const rule = mapRuleRecord({ id: "r", configuration: null });
        expect(rule.clauses).toEqual([]);
        expect(rule.attributeName).toBeNull();

        const blank = mapRuleRecord(
            record("r", {
                validationClauses: [
                    {
                        id: "c",
                        whatExpression: "  ",
                        whatDisplayText: null,
                        whenExpression: null,
                        whenDisplayText: null,
                    },
                ],
                assignmentClauses: null,
            }),
        );
        expect(blank.clauses).toEqual([]);
    });
});

describe("fetchDataQualityRules", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("localStorage", {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("filters GET /Rules by entity uid and asks for the configuration", async () => {
        fetchMock.mockResolvedValueOnce(page([record("r1")], 1));
        await fetchDataQualityRules(ENTITY_UID);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe("GET");
        const parsed = new URL(String(url), "http://x");
        expect(parsed.pathname).toBe("/profisee/rest/v1/Rules");
        expect(parsed.searchParams.get("Filter")).toBe(`[EntityUid] eq '${ENTITY_UID}'`);
        expect(parsed.searchParams.get("Attributes")).toBe("[Configuration]");
        expect(parsed.searchParams.get("PageNumber")).toBe("1");
    });

    it("follows every page instead of stopping at the first", async () => {
        fetchMock
            .mockResolvedValueOnce(page([record("r1"), record("r2")], 3))
            .mockResolvedValueOnce(page([record("r3")], 3))
            .mockResolvedValueOnce(page([record("r4")], 3));

        const rules = await fetchDataQualityRules(ENTITY_UID);

        expect(rules.map((r) => r.id)).toEqual(["r1", "r2", "r3", "r4"]);
        const pages = fetchMock.mock.calls.map(([url]) =>
            new URL(String(url), "http://x").searchParams.get("PageNumber"),
        );
        expect(pages).toEqual(["1", "2", "3"]);
    });

    it("returns an empty list for an entity without rules", async () => {
        fetchMock.mockResolvedValueOnce(page([], 0));
        expect(await fetchDataQualityRules(ENTITY_UID)).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe("store.loadRuleClause", () => {
    const store = () => useExpressionStore.getState();

    const rule: DataQualityRule = {
        id: "rule-1",
        entityName: "Product",
        attributeName: "Code",
        isEnabled: false,
        clauses: [],
    };

    beforeEach(() => {
        store().setScenario("validIf");
        store().setRoot(0, null);
        store().setRoot(1, null);
        store().setIsConstraint(false);
        store().startNewRule();
    });

    it("loads the expressions, not the display text", () => {
        store().loadRuleClause(rule, {
            id: "clause-1",
            kind: "validation",
            whatExpression: "LENGTH([Code]) = 9",
            whenExpression: 'NOT CONTAINS([Class].[Code], "A") AND [Color] <> NULL',
            whatDisplayText: "Code must be 9 characters",
            isConstraint: true,
        });

        expect(store().dqRulesError).toBeNull();
        expect(store().generatedCodes).toEqual([
            "LENGTH([Code]) = 9",
            'NOT(CONTAINS([Class].[Code], "A")) AND [Color] <> NULL',
        ]);
        expect(store().isConstraint).toBe(true);
        expect(store().ruleId).toBe("rule-1");
        expect(store().ruleClauseId).toBe("clause-1");
        expect(store().ruleAttributeName).toBe("Code");
        expect(store().ruleIsEnabled).toBe(false);
        expect(store().ruleDisplayText).toBe("Code must be 9 characters");
    });

    it("switches to the Change To scenario for an assignment clause", () => {
        store().loadRuleClause(rule, {
            id: "clause-2",
            kind: "assignment",
            whatExpression: "LEFT([Code], 10)",
            whenExpression: null,
            whatDisplayText: "LEFT([Code], 10)",
            isConstraint: false,
        });

        expect(store().scenario).toBe("changeTo");
        expect(store().blockConfigs[0].expressionMode).toBe("assignment");
        expect(store().generatedCodes[0]).toBe("LEFT([Code], 10)");
        expect(store().roots[1]).toBeNull();
        // display text that only repeats the expression is left to follow it
        expect(store().ruleDisplayText).toBe("");
    });
});
