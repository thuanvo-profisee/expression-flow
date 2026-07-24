// ─── Profisee connection config (browser storage) ────────────────
//
// The instance URL + API key are kept in localStorage so each user
// can point the app at their own Profisee instance. When no config
// is stored, API calls fall back to the Vite dev proxy (/profisee),
// which injects the key from .env server-side.

export interface ProfiseeConfig {
    /** Profisee service URL, e.g. "https://server.corp.profisee.com/profisee" */
    instanceUrl: string;
    /** Unattended-authentication client ID, sent as X-Api-Key */
    apiKey: string;
}

const STORAGE_KEY = "expression-flow.profisee-config";

/** Trim, drop trailing slashes and an accidental "/rest..." suffix */
export function normalizeInstanceUrl(raw: string): string {
    let url = raw.trim().replace(/\/+$/, "");
    url = url.replace(/\/rest(\/.*)?$/i, "");
    return url;
}

export function loadStoredConfig(): ProfiseeConfig | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<ProfiseeConfig>;
        if (typeof parsed.instanceUrl !== "string") return null;
        return {
            instanceUrl: parsed.instanceUrl,
            apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        };
    } catch {
        return null;
    }
}

export function saveStoredConfig(cfg: ProfiseeConfig): void {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            instanceUrl: normalizeInstanceUrl(cfg.instanceUrl),
            apiKey: cfg.apiKey.trim(),
        }),
    );
}

export function clearStoredConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
}
