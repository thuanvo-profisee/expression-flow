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

export interface DataQualityRule {
    id: string;
    entityName: string;
    attributeName: string | null;
    isEnabled: boolean;
    displayText: string | null;
    /** Expression code, e.g. [Color].[Code]="Hello" */
    clauses: string[];
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

async function apiGet<T>(path: string, cfg?: ProfiseeConfig | null): Promise<T> {
    const { base, headers } = resolveRequest(cfg);
    let res: Response;
    try {
        res = await fetch(`${base}${path}`, {
            headers: { Accept: "application/json", ...headers },
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
    const json = await res.json();
    // Some endpoints wrap the payload in { data: ... }
    return (json?.data ?? json) as T;
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
        clauses: r.clauses.map((c) => c.name.trim()).filter(Boolean),
    }));
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
            const path = basePath
                ? `${basePath}.[${token}]`
                : `[${token}]`;
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
