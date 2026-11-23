// ─── New release check ───────────────────────────────────────────
//
// The extension is installed unpacked from a GitHub release zip, so
// Chrome never updates it. The popup and the editor tab ask GitHub for
// the latest release (at most once every 12 hours) and show a notice
// when it is newer than the installed version. The web app is always
// current, so it never checks.

import { extensionVersion } from "./extension";

const REPO = "thuanvo-profisee/expression-flow";
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = "expression-flow.latest-release";
const DISMISSED_KEY = "expression-flow.dismissed-release";
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

export interface ReleaseInfo {
    version: string;
    /** Release page with the notes */
    pageUrl: string;
    /** The extension zip, or the release page when it has no zip */
    zipUrl: string;
}

export interface AvailableUpdate extends ReleaseInfo {
    current: string;
}

interface CachedRelease extends ReleaseInfo {
    checkedAt: number;
}

interface GitHubRelease {
    tag_name?: string;
    html_url?: string;
    assets?: { name: string; browser_download_url: string }[];
}

/** "v1.2.3" or "1.2.3" → [1, 2, 3]; null when it is not a version */
function parseVersion(version: string): number[] | null {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
    return m ? m.slice(1).map(Number) : null;
}

export function isNewerVersion(candidate: string, current: string): boolean {
    const a = parseVersion(candidate);
    const b = parseVersion(current);
    if (!a || !b) return false;
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
}

export function toReleaseInfo(body: GitHubRelease): ReleaseInfo | null {
    if (!body.tag_name || !body.html_url) return null;
    const zip = body.assets?.find((a) => a.name.endsWith(".zip"));
    return {
        version: body.tag_name.replace(/^v/, ""),
        pageUrl: body.html_url,
        zipUrl: zip?.browser_download_url ?? body.html_url,
    };
}

function readStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* the check runs again next time */
    }
}

function readCache(): CachedRelease | null {
    const raw = readStorage(CACHE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as CachedRelease;
    } catch {
        return null;
    }
}

async function latestRelease(): Promise<ReleaseInfo | null> {
    const cached = readCache();
    const now = Date.now();
    if (cached && now - cached.checkedAt < CHECK_INTERVAL_MS) return cached;
    try {
        const res = await fetch(LATEST_URL, {
            headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return cached;
        const release = toReleaseInfo((await res.json()) as GitHubRelease);
        if (!release) return cached;
        writeStorage(CACHE_KEY, JSON.stringify({ ...release, checkedAt: now }));
        return release;
    } catch {
        // Offline or blocked: keep the last known release
        return cached;
    }
}

/** The newer release to show, or null when there is none to show */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
    const current = extensionVersion();
    if (!current) return null;
    const latest = await latestRelease();
    if (!latest || !isNewerVersion(latest.version, current)) return null;
    if (readStorage(DISMISSED_KEY) === latest.version) return null;
    return { ...latest, current };
}

/** Hide the notice until a release newer than this one comes out */
export function dismissUpdate(version: string): void {
    writeStorage(DISMISSED_KEY, version);
}
