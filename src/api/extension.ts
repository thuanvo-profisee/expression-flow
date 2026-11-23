// ─── Chrome extension helpers ────────────────────────────────────
//
// In the extension build, cross-origin fetches only bypass CORS for
// origins the user has granted. The manifest lists every origin as an
// optional host permission; requestHostAccess asks for the one instance
// the user entered. Outside an extension both helpers are no-ops.

interface ChromeApi {
    permissions?: {
        request(permissions: { origins: string[] }): Promise<boolean>;
    };
    runtime?: {
        getURL(path: string): string;
        getContexts(filter: {
            contextTypes: string[];
            documentUrls: string[];
        }): Promise<{ tabId: number; windowId: number }[]>;
    };
    tabs?: {
        create(props: { url: string }): Promise<unknown>;
        update(tabId: number, props: { active: boolean }): Promise<unknown>;
    };
    windows?: {
        update(windowId: number, props: { focused: boolean }): Promise<unknown>;
    };
}

function chromeApi(): ChromeApi | undefined {
    return (globalThis as { chrome?: ChromeApi }).chrome;
}

/**
 * Ask for access to the instance's origin. Must run inside a user
 * gesture (click / key press) and before any other `await`.
 */
export async function requestHostAccess(instanceUrl: string): Promise<void> {
    const permissions = chromeApi()?.permissions;
    if (!permissions) return;
    let origin: string;
    try {
        origin = new URL(instanceUrl).origin;
    } catch {
        throw new Error("Instance URL is not a valid http(s) URL");
    }
    const granted = await permissions.request({ origins: [`${origin}/*`] });
    if (!granted) {
        throw new Error(`Access to ${origin} was not granted`);
    }
}

/** Focus the open app tab, or open a new one */
export async function openAppTab(): Promise<void> {
    const chrome = chromeApi();
    if (!chrome?.runtime || !chrome.tabs || !chrome.windows) return;
    const url = chrome.runtime.getURL("index.html");
    // getContexts sees our own pages without the "tabs" permission
    const [ctx] = await chrome.runtime.getContexts({
        contextTypes: ["TAB"],
        documentUrls: [url],
    });
    if (ctx) {
        await chrome.tabs.update(ctx.tabId, { active: true });
        await chrome.windows.update(ctx.windowId, { focused: true });
        return;
    }
    await chrome.tabs.create({ url });
}
