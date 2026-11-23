// ─── Capture an anonymized Data Quality Rules fixture ─────────────
//
// Reads every entity's rules from a live Profisee instance and writes them,
// anonymized, to src/__tests__/fixtures/real-env-rules.json for the
// real-environment tests (src/__tests__/real-env-rules.test.ts).
//
//   node scripts/capture-rules-fixture.mjs [path/to/.env]
//
// Safety:
//   • Read-only: the fetch wrapper refuses any method but GET.
//   • Raw data stays in memory; only the anonymized fixture is written.
//   • Before writing, every original name, literal, display text, id and
//     the instance URL are searched for in the output; a hit aborts.
//
// Anonymization keeps what the parser and loaders depend on (operators,
// function names, nesting, whitespace, numbers, NULL, empty strings, which
// values repeat) and replaces everything that describes the customer:
//   [ListPrice]           → [Attr12]      ([List Price] → [Attr 7])
//   "Red"                 → "s34"         ("" stays "")
//   entity names          → Entity5
//   free display text     → dt81
//   ids                   → dropped (the tests derive fake ones)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/__tests__/fixtures/real-env-rules.json");
const ENV_PATH = resolve(process.argv[2] ?? resolve(ROOT, ".env"));
const PAGE_SIZE = 500;

/** Platform attribute names that carry no customer information */
const KEEP_ATTRIBUTES = new Set(["Code", "Name"]);
/** Bare words of the expression language */
const KEEP_WORDS = new Set([
    "TRUE", "FALSE", "NULL", "AND", "OR", "NOT", "IN",
    "NOW", "TODAY", "NEWGUID",
    "YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR", "MINUTE", "SECOND",
]);

// ─── Read-only API access ────────────────────────────────────────

function loadEnv(path) {
    return Object.fromEntries(
        readFileSync(path, "utf8")
            .split(/\r?\n/)
            .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
            .map((l) => {
                const i = l.indexOf("=");
                const value = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
                return [l.slice(0, i).trim(), value];
            }),
    );
}

const env = loadEnv(ENV_PATH);
const instanceUrl = (env.PROFISEE_TARGET ?? "").replace(/\/+$/, "");
const apiKey = env.PROFISEE_API_KEY || env.QA_CLIENT_ID;
if (!instanceUrl || !apiKey) {
    console.error(`PROFISEE_TARGET and QA_CLIENT_ID are required in ${ENV_PATH}`);
    process.exit(1);
}
const base = `${instanceUrl}/rest/v1`;

// Read-only: refuse any request but GET, whatever later edits add
const httpFetch = globalThis.fetch;
globalThis.fetch = (url, init = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (method !== "GET") throw new Error(`Refused ${method}: this script is read-only`);
    return httpFetch(url, init);
};

async function get(path) {
    const res = await fetch(`${base}${path}`, {
        method: "GET",
        headers: { Accept: "application/json", "X-Api-Key": apiKey },
    });
    if (!res.ok) throw new Error(`GET ${path.split("?")[0]} → ${res.status}`);
    return res.json();
}

async function fetchRules(entityUid) {
    const filter = encodeURIComponent(`[EntityUid] eq '${entityUid}'`);
    const attributes = encodeURIComponent("[Configuration]");
    const records = [];
    for (let page = 1, totalPages = 1; page <= totalPages; page++) {
        const res = await get(
            `/Rules?Filter=${filter}&Attributes=${attributes}&PageSize=${PAGE_SIZE}&PageNumber=${page}`,
        );
        const data = res?.data ?? [];
        records.push(...data);
        if (data.length === 0) break;
        totalPages = res.totalPages ?? 1;
    }
    return records;
}

// ─── Pseudonyms ──────────────────────────────────────────────────

/** Stable value → pseudonym map; the same input always gets the same output */
function pseudonyms(make) {
    const map = new Map();
    return (value) => {
        if (!map.has(value)) map.set(value, make(map.size + 1, value));
        return map.get(value);
    };
}

const fakeId = pseudonyms((n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`);
const entityName = pseudonyms((n) => `Entity${n}`);
const attrName = pseudonyms((n, v) => (/\s/.test(v) ? `Attr ${n}` : `Attr${n}`));
const literal = pseudonyms((n) => `s${n}`);
const bareWord = pseudonyms((n) => `w${n}`);
const displayText = pseudonyms((n) => `dt${n}`);
// Numbers over 4 digits could be account numbers: 0 + 4 digits marks a pseudonym
const longNumber = pseudonyms((n) => `0${String(n).padStart(4, "0")}`);

/** Originals that must not appear in the output (checked before writing) */
const secrets = new Set();
const keepAttribute = (name) => KEEP_ATTRIBUTES.has(name) || name.startsWith("$");

function maskAttribute(name) {
    if (keepAttribute(name)) return name;
    secrets.add(name);
    return attrName(name);
}

/** Replace data in an expression, keeping its structure character for character */
function maskExpression(text) {
    let out = "";
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (ch === '"' || ch === "'") {
            const end = text.indexOf(ch, i + 1);
            const close = end === -1 ? text.length : end;
            const content = text.slice(i + 1, close);
            if (content) secrets.add(content);
            out += ch + (content ? literal(content) : "") + (end === -1 ? "" : ch);
            i = close + 1;
        } else if (ch === "[") {
            const end = text.indexOf("]", i + 1);
            const close = end === -1 ? text.length : end;
            out += `[${maskAttribute(text.slice(i + 1, close))}]`;
            i = close + 1;
        } else if (/[A-Za-z_$]/.test(ch)) {
            const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(i))[0];
            const isCall = /^\s*\(/.test(text.slice(i + word.length));
            if (isCall || KEEP_WORDS.has(word.toUpperCase())) {
                out += word;
            } else {
                secrets.add(word);
                out += bareWord(word);
            }
            i += word.length;
        } else if (/\d/.test(ch)) {
            const num = /^\d[\d.]*/.exec(text.slice(i))[0];
            out += num.replace(/\./g, "").length > 4 ? longNumber(num) : num;
            i += num.length;
        } else {
            out += ch;
            i++;
        }
    }
    return out;
}

function maskId(id) {
    if (!id) return id;
    secrets.add(id);
    return fakeId(id.toLowerCase());
}

/**
 * Display text that only repeats the clause keeps that relationship (the
 * loader treats it specially); free text becomes an opaque token.
 */
function maskDisplay(display, what, when, maskedWhat, maskedWhen) {
    if (display == null || display === "") return display ?? null;
    if (display === what) return maskedWhat;
    if (when && display === when) return maskedWhen;
    if (when && display === `${what} WHEN ${when}`) return `${maskedWhat} WHEN ${maskedWhen}`;
    secrets.add(display);
    return displayText(display);
}

function maskClause(c, kind) {
    const what = c.whatExpression ?? null;
    const when = c.whenExpression ?? null;
    const maskedWhat = what == null ? null : maskExpression(what);
    const maskedWhen = when == null ? null : maskExpression(when);
    const out = {
        id: maskId(c.id),
        whatExpression: maskedWhat,
        whatDisplayText: maskDisplay(c.whatDisplayText, what, when, maskedWhat, maskedWhen),
        whenExpression: maskedWhen,
        whenDisplayText: maskDisplay(c.whenDisplayText, when, null, maskedWhen, null),
    };
    if (kind === "validation") out.isConstraint = !!c.isConstraint;
    return out;
}

function maskIdentifier(ref, maskName) {
    if (!ref) return null;
    return { id: maskId(ref.id), name: ref.name == null ? null : maskName(ref.name) };
}

function maskRecord(r) {
    const cfg = r.configuration;
    return {
        id: maskId(r.id),
        configuration: cfg && {
            entityId: maskIdentifier(cfg.entityId, (n) => (secrets.add(n), entityName(n))),
            attributeId: maskIdentifier(cfg.attributeId, maskAttribute),
            isEnabled: cfg.isEnabled,
            validationClauses: (cfg.validationClauses ?? []).map((c) => maskClause(c, "validation")),
            assignmentClauses: (cfg.assignmentClauses ?? []).map((c) => maskClause(c, "assignment")),
        },
    };
}

// ─── Leak check ──────────────────────────────────────────────────

/** Words of the expression language — allowed in the output */
function vocabulary() {
    const types = readFileSync(resolve(ROOT, "src/types.ts"), "utf8");
    // Fixture keys and pseudonym prefixes are ours, not data
    const ours = ["format", "capturedOn", "expressions", "entities", "name", "rules"];
    const words = new Set([...KEEP_WORDS, ...KEEP_ATTRIBUTES, ...ours].map((w) => w.toUpperCase()));
    for (const m of types.matchAll(/^ {4}([A-Z_]+): \{/gm)) words.add(m[1]);
    return words;
}

function assertNoLeaks(json) {
    const allowed = vocabulary();
    const outputTokens = new Set(json.toUpperCase().match(/[A-Z0-9_$]+/g));
    const leaks = [];
    for (const secret of secrets) {
        if (/^[0-9a-f-]{36}$/i.test(secret)) {
            if (json.toLowerCase().includes(secret.toLowerCase())) leaks.push("an original id");
            continue;
        }
        for (const word of secret.toUpperCase().match(/[A-Z0-9_$]{4,}/g) ?? []) {
            if (/^\d+$/.test(word) || allowed.has(word)) continue;
            if (outputTokens.has(word)) leaks.push(word);
        }
    }
    const url = new URL(instanceUrl);
    for (const part of [url.hostname, ...url.hostname.split("."), ...url.pathname.split("/")]) {
        if (part.length >= 4 && json.toLowerCase().includes(part.toLowerCase())) leaks.push("the instance URL");
    }
    if (json.includes(apiKey)) leaks.push("the API key");
    if (leaks.length > 0) {
        console.error(`Not written — original values found in the output: ${[...new Set(leaks)].join(", ")}`);
        process.exit(1);
    }
}

// ─── Compact form ────────────────────────────────────────────────
//
// Expressions repeat across entities, so they are stored once and rules
// refer to them by index. Layout (see src/__tests__/realEnvFixture.ts):
//   rule   = [attributeName | null, isEnabled, clause[]]
//   clause = [kind "v" | "a", what, when | null, whatDisplay, whenDisplay, isConstraint]
//   what / when   index into `expressions`
//   *Display      null | "=" (same as its expression) | opaque token
// Ids are not kept; the test derives stable fake ids.

function compact(entities) {
    const expressions = [];
    const index = new Map();
    const ref = (text) => {
        if (text == null) return null;
        if (!index.has(text)) index.set(text, expressions.push(text) - 1);
        return index.get(text);
    };
    const display = (text, expression) =>
        text == null ? null : text === expression ? "=" : text;
    const clause = (kind) => (c) => {
        const row = [kind, ref(c.whatExpression), ref(c.whenExpression),
            display(c.whatDisplayText, c.whatExpression),
            display(c.whenDisplayText, c.whenExpression)];
        if (kind === "v") row.push(c.isConstraint);
        return row;
    };
    const rows = entities.map((e) => ({
        name: e.name,
        rules: e.rules.map(({ configuration: cfg }) => [
            cfg?.attributeId?.name ?? null,
            cfg?.isEnabled ?? true,
            [...(cfg?.validationClauses ?? []).map(clause("v")),
                ...(cfg?.assignmentClauses ?? []).map(clause("a"))],
        ]),
    }));
    return { expressions, entities: rows };
}

/** One expression / one rule per line, so fixture diffs stay readable */
function serialize({ expressions, entities }) {
    const lines = [
        "{",
        ` "format": 1,`,
        ` "capturedOn": ${JSON.stringify(new Date().toISOString().slice(0, 10))},`,
        ` "expressions": [`,
        expressions.map((x) => `  ${JSON.stringify(x)}`).join(",\n"),
        " ],",
        ` "entities": [`,
        entities
            .map((e) => {
                const rules = e.rules.map((r) => `   ${JSON.stringify(r)}`).join(",\n");
                const head = `  {"name": ${JSON.stringify(e.name)}, "rules": [`;
                return rules ? `${head}\n${rules}\n  ]}` : `${head}]}`;
            })
            .join(",\n"),
        " ]",
        "}",
    ];
    return lines.join("\n") + "\n";
}

// ─── Main ────────────────────────────────────────────────────────

const entities = (await get("/Entities")).data ?? [];
const masked = [];
for (const e of entities) {
    const rules = await fetchRules(e.identifier.id);
    secrets.add(e.identifier.name);
    masked.push({ name: entityName(e.identifier.name), rules: rules.map(maskRecord) });
    process.stdout.write(".");
}
process.stdout.write("\n");

const fixture = compact(masked);
const json = serialize(fixture);
JSON.parse(json); // must stay valid JSON
assertNoLeaks(json);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);

const ruleCount = fixture.entities.reduce((n, e) => n + e.rules.length, 0);
console.log(
    `Wrote ${OUT}: ${fixture.entities.length} entities, ${ruleCount} rules, ` +
        `${fixture.expressions.length} expressions, ${(json.length / 1024).toFixed(0)} KB`,
);
