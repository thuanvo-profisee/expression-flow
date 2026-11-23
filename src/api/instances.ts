// ─── Saved Profisee instances (browser storage) ──────────────────
//
// The extension popup keeps a list of instances the user can switch
// between. Only the active one is written to the connection config
// (config.ts) that the app reads.

import { loadStoredConfig, normalizeInstanceUrl } from "./config";
import type { ProfiseeConfig } from "./config";

export interface SavedInstance extends ProfiseeConfig {
    id: string;
    /** User label; empty means "use the host name" */
    name: string;
}

const STORAGE_KEY = "expression-flow.profisee-instances";

/** Label to show for an instance: its name, else the URL's host */
export function instanceLabel(
    inst: Pick<SavedInstance, "name" | "instanceUrl">,
): string {
    if (inst.name.trim()) return inst.name.trim();
    try {
        return new URL(inst.instanceUrl).host;
    } catch {
        return inst.instanceUrl || "New instance";
    }
}

/** Same server and same client ID */
export function sameConnection(a: ProfiseeConfig, b: ProfiseeConfig): boolean {
    return (
        normalizeInstanceUrl(a.instanceUrl) ===
            normalizeInstanceUrl(b.instanceUrl) &&
        a.apiKey.trim() === b.apiKey.trim()
    );
}

export function loadInstances(): SavedInstance[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as SavedInstance[];
        }
    } catch {
        /* fall through to the seed below */
    }
    // First run: start the list from the current connection, if any
    const active = loadStoredConfig();
    return active?.instanceUrl
        ? [{ id: crypto.randomUUID(), name: "", ...active }]
        : [];
}

function saveInstances(list: SavedInstance[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Add the instance, or replace the one with the same id */
export function upsertInstance(inst: SavedInstance): SavedInstance[] {
    const list = loadInstances();
    const i = list.findIndex((x) => x.id === inst.id);
    if (i >= 0) list[i] = inst;
    else list.push(inst);
    saveInstances(list);
    return list;
}

export function removeInstance(id: string): SavedInstance[] {
    const list = loadInstances().filter((x) => x.id !== id);
    saveInstances(list);
    return list;
}

/** Add a connection to the list unless an identical one is saved */
export function rememberConnection(cfg: ProfiseeConfig): void {
    const list = loadInstances();
    if (list.some((x) => sameConnection(x, cfg))) {
        saveInstances(list); // persists the first-run seed
        return;
    }
    saveInstances([...list, { id: crypto.randomUUID(), name: "", ...cfg }]);
}
