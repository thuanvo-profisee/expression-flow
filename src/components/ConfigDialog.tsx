import { useCallback, useState } from "react";
import {
    Server,
    KeyRound,
    Eye,
    EyeOff,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Plug,
} from "lucide-react";
import { useExpressionStore } from "../store";
import { loadStoredConfig, normalizeInstanceUrl } from "../api/config";
import { testConnection } from "../api/profisee";

/**
 * Connection settings popup — asks for the Profisee instance URL and
 * member client ID, verifies them against the server, and stores them in
 * the browser's local storage. Opens automatically when no connection is
 * configured (or the server rejects the ID), and manually via the
 * gear button in the Data & Values panel.
 */
export function ConfigDialog() {
    const isOpen = useExpressionStore((s) => s.configDialogOpen);
    // Mount the form fresh each time the dialog opens so it prefills
    // from the latest stored config via useState initializers.
    if (!isOpen) return null;
    return <ConfigDialogForm />;
}

function ConfigDialogForm() {
    const closeConfigDialog = useExpressionStore((s) => s.closeConfigDialog);
    const saveConnectionConfig = useExpressionStore(
        (s) => s.saveConnectionConfig,
    );

    const [instanceUrl, setInstanceUrl] = useState(
        () => loadStoredConfig()?.instanceUrl ?? "",
    );
    const [apiKey, setApiKey] = useState(
        () => loadStoredConfig()?.apiKey ?? "",
    );
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [entityCount, setEntityCount] = useState<number | null>(null);

    const canSave = instanceUrl.trim() !== "" && apiKey.trim() !== "";

    const handleSave = useCallback(async () => {
        if (!canSave || testing) return;
        const cfg = {
            instanceUrl: normalizeInstanceUrl(instanceUrl),
            apiKey: apiKey.trim(),
        };
        setTesting(true);
        setError(null);
        setEntityCount(null);
        try {
            const count = await testConnection(cfg);
            setEntityCount(count);
            // Brief success flash before closing
            setTimeout(() => saveConnectionConfig(cfg), 400);
        } catch (e) {
            setError((e as Error).message);
            setTesting(false);
        }
    }, [canSave, testing, instanceUrl, apiKey, saveConnectionConfig]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") closeConfigDialog();
        },
        [handleSave, closeConfigDialog],
    );

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) closeConfigDialog();
            }}
        >
            <div
                className="w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Plug size={16} className="text-white" />
                    <h2 className="text-sm font-bold text-white tracking-tight">
                        Profisee Connection
                    </h2>
                    <button
                        onClick={closeConfigDialog}
                        className="ml-auto p-1 rounded hover:bg-white/20 transition-colors"
                        title="Close"
                    >
                        <X size={14} className="text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Enter your Profisee instance to load entities and
                        attributes. Settings are stored in this browser only.
                    </p>

                    {/* Instance URL */}
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <Server size={10} />
                            Instance URL
                        </label>
                        <input
                            type="text"
                            value={instanceUrl}
                            onChange={(e) => setInstanceUrl(e.target.value)}
                            placeholder="https://server.corp.profisee.com/profisee"
                            autoFocus
                            className="
                w-full px-2.5 py-1.5 rounded-md
                border border-slate-200 bg-white
                text-xs font-mono text-slate-700
                placeholder:text-slate-300
                focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
              "
                        />
                    </div>

                    {/* Client ID */}
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <KeyRound size={10} />
                            Client ID
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Member client ID"
                                className="
                  w-full pl-2.5 pr-8 py-1.5 rounded-md
                  border border-slate-200 bg-white
                  text-xs font-mono text-slate-700
                  placeholder:text-slate-300
                  focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
                "
                            />
                            <button
                                onClick={() => setShowKey((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                title={
                                    showKey
                                        ? "Hide client ID"
                                        : "Show client ID"
                                }
                                tabIndex={-1}
                            >
                                {showKey ? (
                                    <EyeOff size={12} />
                                ) : (
                                    <Eye size={12} />
                                )}
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            To find it, open{" "}
                            <span className="text-slate-500 font-semibold">
                                Account &amp; Team
                            </span>{" "}
                            in Profisee{" "}
                            <span className="text-slate-500 font-semibold">
                                Administration
                            </span>
                            , then open the member you want Expression Flow to
                            work with — its client ID is sent as the X-Api-Key
                            header.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-md bg-rose-50 border border-rose-200">
                            <AlertTriangle
                                size={11}
                                className="text-rose-400 shrink-0 mt-0.5"
                            />
                            <span className="text-[10px] text-rose-600 break-words min-w-0">
                                {error}
                            </span>
                        </div>
                    )}

                    {/* Success flash */}
                    {entityCount != null && (
                        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-emerald-50 border border-emerald-200">
                            <CheckCircle2
                                size={11}
                                className="text-emerald-500 shrink-0"
                            />
                            <span className="text-[10px] text-emerald-600">
                                Connected — {entityCount} entities found
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={closeConfigDialog}
                        className="
              px-3 py-1.5 rounded-md text-xs font-semibold
              text-slate-500 hover:text-slate-700 hover:bg-slate-200/60
              transition-colors
            "
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => void handleSave()}
                        disabled={!canSave || testing}
                        className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-xs font-semibold text-white
              bg-gradient-to-r from-blue-500 to-cyan-500
              hover:from-blue-600 hover:to-cyan-600
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm transition-all
            "
                    >
                        {testing ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                Testing…
                            </>
                        ) : (
                            "Save & Connect"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
