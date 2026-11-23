// ─── Real-environment rules fixture ───────────────────────────────
//
// fixtures/real-env-rules.json holds every Data Quality Rule of a live
// instance, anonymized by scripts/capture-rules-fixture.mjs. This module
// expands its compact rows back into GET /Rules records and serves them
// from a fake, read-only REST endpoint.

import raw from "./fixtures/real-env-rules.json?raw";
import type { RawRuleClause, RawRuleRecord } from "../api/profisee";

/** null | "=" (same as its expression) | opaque token */
type DisplayRef = string | null;

type ClauseRow =
    | ["v", number, number | null, DisplayRef, DisplayRef, boolean]
    | ["a", number, number | null, DisplayRef, DisplayRef];

/** [attributeName, isEnabled, clauses] */
type RuleRow = [string | null, boolean, ClauseRow[]];

export interface RealEnvFixture {
    format: 1;
    capturedOn: string;
    expressions: string[];
    entities: { name: string; rules: RuleRow[] }[];
}

export interface FixtureEntity {
    name: string;
    uid: string;
    records: RawRuleRecord[];
}

export const fixture = JSON.parse(raw) as RealEnvFixture;

/** Stable fake GUID: 00000000-0000-4000-8000-<n in hex> */
function fakeId(n: number): string {
    return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function expandEntities(): FixtureEntity[] {
    let next = 0;
    const id = () => fakeId(++next);
    const attributeIds = new Map<string, string>();
    const expr = (i: number | null) => (i === null ? null : fixture.expressions[i]);
    const display = (ref: DisplayRef, expression: string | null) =>
        ref === "=" ? expression : ref;

    return fixture.entities.map((entity) => {
        const uid = id();
        const records = entity.rules.map(([attribute, isEnabled, rows]) => {
            const validationClauses: RawRuleClause[] = [];
            const assignmentClauses: RawRuleClause[] = [];
            for (const row of rows) {
                const what = expr(row[1]);
                const when = expr(row[2]);
                const clause: RawRuleClause = {
                    id: id(),
                    whatExpression: what,
                    whatDisplayText: display(row[3], what),
                    whenExpression: when,
                    whenDisplayText: display(row[4], when),
                };
                if (row[0] === "v") {
                    validationClauses.push({ ...clause, isConstraint: row[5] });
                } else {
                    assignmentClauses.push(clause);
                }
            }
            if (attribute && !attributeIds.has(attribute)) {
                attributeIds.set(attribute, id());
            }
            const record: RawRuleRecord = {
                id: id(),
                configuration: {
                    entityId: { id: uid, name: entity.name, internalId: 0 },
                    attributeId: attribute
                        ? { id: attributeIds.get(attribute)!, name: attribute, internalId: 0 }
                        : null,
                    isEnabled,
                    validationClauses,
                    assignmentClauses,
                },
            };
            return record;
        });
        return { name: entity.name, uid, records };
    });
}

export const entities = expandEntities();

/**
 * fetch() stand-in for GET /Rules?Filter=[EntityUid] eq '<uid>'.
 * Pages like the platform does; `maxPageSize` caps the requested size.
 * Anything but a GET of /Rules fails the test.
 */
export function rulesServer(maxPageSize = Number.POSITIVE_INFINITY) {
    const byUid = new Map(entities.map((e) => [e.uid, e.records]));
    return async (input: string | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const url = new URL(String(input), "http://fixture");
        if (method !== "GET" || !url.pathname.endsWith("/Rules")) {
            throw new Error(`Unexpected request: ${method} ${url.pathname}`);
        }
        const filter = url.searchParams.get("Filter") ?? "";
        const uid = /^\[EntityUid\] eq '([^']+)'$/.exec(filter)?.[1];
        const all = (uid && byUid.get(uid)) || [];
        const pageSize = Math.min(Number(url.searchParams.get("PageSize") ?? 50), maxPageSize);
        const pageNumber = Number(url.searchParams.get("PageNumber") ?? 1);
        const data = all.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        const body = {
            pageNumber,
            pageSize,
            resultCount: data.length,
            totalPages: Math.ceil(all.length / pageSize),
            totalRecords: all.length,
            data,
        };
        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(body),
        } as Response;
    };
}
