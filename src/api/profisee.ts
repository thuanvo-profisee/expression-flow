// ─── Profisee REST API client ─────────────────────────────────────
//
// Calls go through the Vite dev-server proxy (see vite.config.ts):
//   /profisee/rest/v1/*  →  ${PROFISEE_TARGET}/profisee/rest/v1/*
// The proxy injects the X-Api-Key header from PROFISEE_API_KEY so the
// key never reaches the browser bundle.

import type { AttributeNode } from "../types";
import { loadStoredConfig, normalizeInstanceUrl } from "./config";
import type { ProfiseeConfig } from "./config";

/** Fallback when no config is stored: the Vite dev proxy */
const PROXY_BASE = "/profisee/rest/v1";

// ─── Raw API shapes (subset of fields we consume) ────────────────

interface MemberIdentifier {
    id: string;
    name: string | null;
    internalId: number;
}

interface RawEntity {
    identifier: MemberIdentifier;
    isSystem?: boolean;
}

/** AttributeType enum: 0 NotSpecified, 1 FreeForm, 2 Domain, 3 System, 4 File */
const ATTRIBUTE_TYPE_DOMAIN = 2;
const ATTRIBUTE_TYPE_FILE = 4;

interface RawAttribute {
    attributeType: number;
    domainEntityId: MemberIdentifier | null;
    identifier: MemberIdentifier;
    isSystem: boolean;
    isCode: boolean;
    isName: boolean;
    displayOrder: number;
    sortOrder: number;
}

export interface EntityOption {
    uid: string;
    name: string;
}

interface RawDataQualityRule {
    id: string;
    entityId: MemberIdentifier;
    attributeId: MemberIdentifier | null;
    isEnabled: boolean;
    displayText: string | null;
    clauses: { id: string; name: string }[];
    triggeringAction: number;
}

/** One clause of a rule: expression text plus its platform id */
export interface DataQualityRuleClause {
    id: string;
    /** Expression code, e.g. [Color].[Code]="Hello" WHEN [Name]="Name" */
    text: string;
}

export interface DataQualityRule {
    id: string;
    entityName: string;
    attributeName: string | null;
    isEnabled: boolean;
    displayText: string | null;
    clauses: DataQualityRuleClause[];
}

// ─── Fetch helper ────────────────────────────────────────────────

/** Resolve REST base URL + headers from stored config (proxy fallback) */
function resolveRequest(cfg?: ProfiseeConfig | null): {
    base: string;
    headers: Record<string, string>;
} {
    const config = cfg ?? loadStoredConfig();
    if (config?.instanceUrl) {
        return {
            base: `${normalizeInstanceUrl(config.instanceUrl)}/rest/v1`,
            headers: config.apiKey ? { "X-Api-Key": config.apiKey } : {},
        };
    }
    // Dev proxy injects the key server-side from .env
    return { base: PROXY_BASE, headers: {} };
}

async function apiRequest<T>(
    method: "GET" | "PUT" | "POST",
    path: string,
    body?: unknown,
    cfg?: ProfiseeConfig | null,
): Promise<T> {
    const { base, headers } = resolveRequest(cfg);
    let res: Response;
    try {
        res = await fetch(`${base}${path}`, {
            method,
            headers: {
                Accept: "application/json",
                ...(body === undefined
                    ? {}
                    : { "Content-Type": "application/json" }),
                ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new Error("Network error — is the Profisee server reachable?");
    }
    if (!res.ok) {
        let detail = "";
        try {
            const body = await res.json();
            detail =
                body?.title ??
                (body?.errors ? JSON.stringify(body.errors) : "");
        } catch {
            /* non-JSON error body */
        }
        if (res.status === 401) {
            detail = detail || "Missing or invalid API key";
        }
        throw new Error(
            `Profisee API ${res.status}${detail ? ` — ${detail}` : ""}`,
        );
    }
    // 204 / empty bodies are valid responses for writes
    const text = await res.text();
    if (!text) return undefined as T;
    const json = JSON.parse(text);
    // Some endpoints wrap the payload in { data: ... }
    return (json?.data ?? json) as T;
}

function apiGet<T>(path: string, cfg?: ProfiseeConfig | null): Promise<T> {
    return apiRequest<T>("GET", path, undefined, cfg);
}

// ─── Entities ────────────────────────────────────────────────────

export async function fetchEntities(): Promise<EntityOption[]> {
    const raw = await apiGet<RawEntity[]>("/Entities");
    return mapEntities(raw);
}

/**
 * Probe a connection config without saving it.
 * Returns the number of entities visible with those credentials.
 */
export async function testConnection(cfg: ProfiseeConfig): Promise<number> {
    const raw = await apiGet<RawEntity[]>("/Entities", cfg);
    return mapEntities(raw).length;
}

/** Fetch the Data Quality Rules defined for an entity */
export async function fetchDataQualityRules(
    entityUid: string,
): Promise<DataQualityRule[]> {
    const raw = await apiGet<RawDataQualityRule[]>(
        `/DataQualityRules?entityUid=${encodeURIComponent(entityUid)}`,
    );
    return raw.map((r) => ({
        id: r.id,
        entityName: r.entityId.name ?? "",
        attributeName: r.attributeId?.name ?? null,
        isEnabled: r.isEnabled,
        displayText: r.displayText,
        clauses: r.clauses
            .map((c) => ({ id: c.id, text: c.name.trim() }))
            .filter((c) => c.text),
    }));
}

// ─── Saving rules (PUT /Rules) ───────────────────────────────────
//
// Payload shape (a list, so several rules can be saved in one call):
//   [{ id, configuration: { entityId, attributeId, isEnabled,
//                           validationClauses, assignmentClauses,
//                           assignmentExecutionMode } }]
// Identifiers accept either a Name or an ID. Omitting a rule/clause id
// (or sending the empty GUID) creates a new one.

/** Empty GUID — the platform reads it as "create a new record" */
export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/** Entity / attribute reference: Name or ID, either is accepted */
export interface RuleIdentifierInput {
    name?: string | null;
    id?: string | null;
}

export interface RuleClauseInput {
    /** Existing clause id; omitted / empty GUID creates a new clause */
    id?: string | null;
    whatExpression: string;
    whatDisplayText?: string | null;
    whenExpression?: string | null;
    whenDisplayText?: string | null;
    /** Validation clauses only — ignored for assignment clauses */
    isConstraint?: boolean;
}

export interface SaveRuleInput {
    /** Existing rule id; omitted / empty GUID creates a new rule */
    id?: string | null;
    entity: RuleIdentifierInput;
    attribute?: RuleIdentifierInput | null;
    isEnabled?: boolean;
    validationClauses?: RuleClauseInput[];
    assignmentClauses?: RuleClauseInput[];
    /** Assignment execution mode; 1 = the platform default */
    assignmentExecutionMode?: number;
}

/** Serialized rule as the platform expects it */
export interface RulePayloadItem {
    id: string;
    configuration: {
        entityId: { name?: string; id?: string };
        attributeId: { name?: string; id?: string } | null;
        isEnabled: boolean;
        validationClauses: {
            isConstraint: boolean;
            id: string;
            whatExpression: string;
            whatDisplayText: string | null;
            whenExpression: string | null;
            whenDisplayText: string | null;
        }[];
        assignmentClauses: {
            id: string;
            whatExpression: string;
            whatDisplayText: string | null;
            whenExpression: string | null;
            whenDisplayText: string | null;
        }[];
        assignmentExecutionMode: number;
    };
}

/** Keep only the identifier fields that carry a value */
function identifier(
    ref: RuleIdentifierInput,
): { name?: string; id?: string } | null {
    const out: { name?: string; id?: string } = {};
    if (ref.name) out.name = ref.name;
    if (ref.id) out.id = ref.id;
    return Object.keys(out).length > 0 ? out : null;
}

/** Blank / placeholder expressions are sent as null, not as empty strings */
function expression(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === "/* empty */") return null;
    return trimmed;
}

/**
 * Map rule inputs onto the PUT /Rules request body.
 * Exported separately from the request so it can be asserted in tests.
 */
export function buildRulePayload(inputs: SaveRuleInput[]): RulePayloadItem[] {
    return inputs.map((rule) => {
        const entityId = identifier(rule.entity);
        if (!entityId) throw new Error("A rule needs an entity name or id");

        const clause = (c: RuleClauseInput) => {
            const what = expression(c.whatExpression);
            if (!what) throw new Error("A clause needs a what-expression");
            return {
                id: c.id || EMPTY_GUID,
                whatExpression: what,
                whatDisplayText: c.whatDisplayText?.trim() || null,
                whenExpression: expression(c.whenExpression),
                whenDisplayText: c.whenDisplayText?.trim() || null,
            };
        };

        return {
            id: rule.id || EMPTY_GUID,
            configuration: {
                entityId,
                attributeId: rule.attribute ? identifier(rule.attribute) : null,
                isEnabled: rule.isEnabled ?? true,
                validationClauses: (rule.validationClauses ?? []).map((c) => ({
                    isConstraint: c.isConstraint ?? false,
                    ...clause(c),
                })),
                assignmentClauses: (rule.assignmentClauses ?? []).map(clause),
                assignmentExecutionMode: rule.assignmentExecutionMode ?? 1,
            },
        };
    });
}

/** Save (create or update) one or more data quality rules */
export async function saveDataQualityRules(
    inputs: SaveRuleInput[],
): Promise<void> {
    if (inputs.length === 0) return;
    await apiRequest<unknown>("PUT", "/Rules", buildRulePayload(inputs));
}

function mapEntities(raw: RawEntity[]): EntityOption[] {
    return raw
        .map((e) => ({
            uid: e.identifier.id,
            name: e.identifier.name ?? "",
        }))
        .filter((e) => e.name)
        .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Attributes ──────────────────────────────────────────────────

/** Friendly labels for well-known system attributes */
const SYSTEM_LABELS: Record<string, string> = {
    EnterUserName: "Created By",
    EnterDTM: "Created On",
    LastChgUserName: "Last Updated By",
    LastChgDTM: "Last Updated On",
};

/**
 * Fetch the attributes of an entity and map them into AttributeNode[].
 *
 * @param entityName Profisee entity name
 * @param basePath   bracket path prefix for nested (domain) attributes,
 *                   e.g. "[Class]" → children like "[Class].[Name]"
 */
export async function fetchEntityAttributes(
    entityName: string,
    basePath = "",
): Promise<AttributeNode[]> {
    const raw = await apiGet<RawAttribute[]>(
        `/Entities/${encodeURIComponent(entityName)}/attributes`,
    );

    return raw
        .filter((a) => a.attributeType !== ATTRIBUTE_TYPE_FILE)
        .filter((a) => a.identifier.name)
        .map((a) => {
            const name = a.identifier.name!;
            // System attributes are referenced as [$Name] in expressions
            const isPlainSystem = a.isSystem && !a.isCode && !a.isName;
            const token =
                isPlainSystem && !name.startsWith("$") ? `$${name}` : name;
            const path = basePath ? `${basePath}.[${token}]` : `[${token}]`;
            const isDomain =
                a.attributeType === ATTRIBUTE_TYPE_DOMAIN &&
                !!a.domainEntityId?.name;

            const node: AttributeNode = {
                id: path,
                label: SYSTEM_LABELS[name] ?? name,
                value: path,
                propertiesCallback: null,
            };
            if (isDomain) {
                // Children are loaded lazily on expand (see store.loadNodeChildren)
                node.domainEntityName = a.domainEntityId!.name;
                node.children = [];
                node.childrenLoaded = false;
            }
            return node;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
}
