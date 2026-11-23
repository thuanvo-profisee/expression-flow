import { useRef, useState } from "react";
import {
    Server,
    KeyRound,
    Tag,
    Eye,
    EyeOff,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Plug,
    Plus,
    Trash2,
    ExternalLink,
} from "lucide-react";
import {
    loadStoredConfig,
    normalizeInstanceUrl,
    saveStoredConfig,
} from "../api/config";
import type { ProfiseeConfig } from "../api/config";
import {
    instanceLabel,
    loadInstances,
    removeInstance,
    sameConnection,
    upsertInstance,
} from "../api/instances";
import type { SavedInstance } from "../api/instances";
import { testConnection } from "../api/profisee";
import { openAppTab, requestHostAccess } from "../api/extension";
import { UpdateNotice } from "../components/UpdateNotice";

/** Form values; id is null for an instance not saved yet */
interface FormState extends ProfiseeConfig {
    id: string | null;
    name: string;
}

const EMPTY_FORM: FormState = {
    id: null,
    name: "",
    instanceUrl: "",
    apiKey: "",
};

// Unsaved form values. Chrome can close the popup while its permission
// prompt is open, so the fields survive a reopen.
const DRAFT_KEY = "expression-flow.popup-draft";

function initialForm(instances: SavedInstance[]): FormState {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) return { ...EMPTY_FORM, ...(JSON.parse(raw) as FormState) };
    } catch {
        /* fall through */
    }
    // Start on the instance the app uses, else the first saved one
    const active = loadStoredConfig();
    const inst =
        (active && instances.find((x) => sameConnection(x, active))) ??
        instances[0];
    return inst ? { ...inst } : EMPTY_FORM;
}

function saveDraft(form: FormState): void {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
        /* draft is a convenience only */
    }
}

function clearDraft(): void {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch {
        /* ignore */
    }
}

const labelClass =
    "flex items-center gap-1 text-[12px] font-semibold text-slate-500 uppercase tracking-wider";

const inputClass = `
    w-full px-2.5 py-1.5 rounded-md
    border border-slate-200 bg-white
    text-[13px] text-slate-700
    placeholder:text-slate-400
    focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
`;

/**
 * Toolbar popup: keep a list of Profisee instances, test the selected
 * one, then open the app in a tab connected to it. The app tab reads
 * the same localStorage config, so it starts (or reconnects) on it.
 */
export function Popup() {
    const [instances, setInstances] = useState(loadInstances);
    const [form, setForm] = useState(() => initialForm(instances));
    const [active, setActive] = useState(loadStoredConfig);
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    // The values that passed the test; editing URL or key invalidates them
    const [tested, setTested] = useState<{
        cfg: ProfiseeConfig;
        entityCount: number;
    } | null>(null);
    // Ignore results of a test started for a previous selection
    const testRun = useRef(0);

    const cfg: ProfiseeConfig = {
        instanceUrl: normalizeInstanceUrl(form.instanceUrl),
        apiKey: form.apiKey.trim(),
    };
    const canTest = cfg.instanceUrl !== "" && cfg.apiKey !== "" && !testing;
    const canOpen = tested !== null && sameConnection(tested.cfg, cfg);
    const isSaved = instances.some((x) => x.id === form.id);

    const changeForm = (next: FormState) => {
        setForm(next);
        saveDraft(next);
        setError(null);
        setConfirmDeleteId(null);
    };

    const runTest = async (values: FormState) => {
        const testCfg = {
            instanceUrl: normalizeInstanceUrl(values.instanceUrl),
            apiKey: values.apiKey.trim(),
        };
        if (!testCfg.instanceUrl || !testCfg.apiKey) return;
        const run = ++testRun.current;
        setTesting(true);
        setError(null);
        setTested(null);
        try {
            await requestHostAccess(testCfg.instanceUrl);
            const entityCount = await testConnection(testCfg);
            if (run !== testRun.current) return;
            // A working connection is saved to the list
            const inst: SavedInstance = {
                id: values.id ?? crypto.randomUUID(),
                name: values.name.trim(),
                ...testCfg,
            };
            setInstances(upsertInstance(inst));
            const next = { ...values, id: inst.id };
            setForm(next);
            saveDraft(next);
            setTested({ cfg: testCfg, entityCount });
        } catch (e) {
            if (run === testRun.current) setError((e as Error).message);
        } finally {
            if (run === testRun.current) setTesting(false);
        }
    };

    const selectInstance = (inst: SavedInstance) => {
        const next = { ...inst };
        changeForm(next);
        void runTest(next);
    };

    const newInstance = () => {
        testRun.current++;
        setTesting(false);
        setTested(null);
        changeForm(EMPTY_FORM);
    };

    const deleteInstance = (id: string) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            return;
        }
        setInstances(removeInstance(id));
        setConfirmDeleteId(null);
        if (form.id === id) newInstance();
    };

    const updateName = (name: string) => {
        const next = { ...form, name };
        changeForm(next);
        // Renaming a saved instance needs no new test
        const saved = instances.find((x) => x.id === form.id);
        if (saved)
            setInstances(upsertInstance({ ...saved, name: name.trim() }));
    };

    const updateConnection = (patch: Partial<ProfiseeConfig>) => {
        changeForm({ ...form, ...patch });
    };

    const handleOpen = async () => {
        if (!canOpen) return;
        saveStoredConfig(cfg);
        setActive(cfg);
        clearDraft();
        await openAppTab();
        window.close();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return;
        if (canOpen) void handleOpen();
        else if (canTest) void runTest(form);
    };

    return (
        <div className="bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500">
                <Plug size={16} className="text-white" />
                <h1 className="text-sm font-bold text-white tracking-tight">
                    Expression Flow
                </h1>
            </div>
            <UpdateNotice />

            {/* Saved instances */}
            <div className="px-4 pt-3">
                <div className="flex items-center mb-1.5">
                    <span className={labelClass}>
                        <Server size={10} />
                        Instances
                    </span>
                    <button
                        onClick={newInstance}
                        className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[12px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        <Plus size={11} />
                        New
                    </button>
                </div>
                {instances.length === 0 ? (
                    <p className="text-[12px] text-slate-500 py-2">
                        No saved instances yet. Enter one below and test it.
                    </p>
                ) : (
                    <ul className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                        {instances.map((inst) => {
                            const selected = inst.id === form.id;
                            const inUse =
                                active !== null && sameConnection(inst, active);
                            const confirming = confirmDeleteId === inst.id;
                            return (
                                <li key={inst.id}>
                                    <div
                                        className={`
                                            group flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors
                                            ${selected ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400" : "border-slate-200 bg-white hover:bg-slate-50"}
                                        `}
                                        onClick={() => selectInstance(inst)}
                                        title={`Select and test ${instanceLabel(inst)}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-semibold text-slate-700 truncate">
                                                    {instanceLabel(inst)}
                                                </span>
                                                {inUse && (
                                                    <span className="shrink-0 px-1 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-100">
                                                        In use
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[12px] font-mono text-slate-500 truncate">
                                                {inst.instanceUrl}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteInstance(inst.id);
                                            }}
                                            className={`
                                                shrink-0 flex items-center gap-1 px-1 py-0.5 rounded text-[12px] font-semibold transition-colors
                                                ${confirming ? "text-white bg-rose-500 hover:bg-rose-600" : "text-slate-400 hover:text-rose-500"}
                                            `}
                                            title={
                                                confirming
                                                    ? "Click again to delete"
                                                    : "Delete instance"
                                            }
                                        >
                                            <Trash2 size={11} />
                                            {confirming && "Delete"}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Selected instance */}
            <div className="p-4 space-y-3" onKeyDown={handleKeyDown}>
                <div className="text-[13px] font-semibold text-slate-600 border-t border-slate-100 pt-3">
                    {isSaved ? `Edit ${instanceLabel(form)}` : "New instance"}
                </div>

                <div>
                    <label className={`${labelClass} mb-1`}>
                        <Tag size={10} />
                        Name
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateName(e.target.value)}
                        placeholder="Optional, e.g. QA or Production"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={`${labelClass} mb-1`}>
                        <Server size={10} />
                        Instance URL
                    </label>
                    <input
                        type="text"
                        value={form.instanceUrl}
                        onChange={(e) =>
                            updateConnection({ instanceUrl: e.target.value })
                        }
                        placeholder="https://server.corp.profisee.com/profisee"
                        autoFocus={!isSaved}
                        className={`${inputClass} font-mono`}
                    />
                </div>

                <div>
                    <label className={`${labelClass} mb-1`}>
                        <KeyRound size={10} />
                        Client ID
                    </label>
                    <div className="relative">
                        <input
                            type={showKey ? "text" : "password"}
                            value={form.apiKey}
                            onChange={(e) =>
                                updateConnection({ apiKey: e.target.value })
                            }
                            placeholder="Member client ID"
                            className={`${inputClass} font-mono pr-8`}
                        />
                        <button
                            onClick={() => setShowKey((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                            title={
                                showKey ? "Hide client ID" : "Show client ID"
                            }
                            tabIndex={-1}
                        >
                            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Find it in Profisee{" "}
                        <span className="text-slate-500 font-semibold">
                            Administration › Account &amp; Team
                        </span>
                        , on the member Expression Flow works as.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-md bg-rose-50 border border-rose-200">
                        <AlertTriangle
                            size={11}
                            className="text-rose-400 shrink-0 mt-0.5"
                        />
                        <span className="text-[12px] text-rose-600 break-words min-w-0">
                            {error}
                        </span>
                    </div>
                )}

                {canOpen && tested && (
                    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-emerald-50 border border-emerald-200">
                        <CheckCircle2
                            size={11}
                            className="text-emerald-500 shrink-0"
                        />
                        <span className="text-[12px] text-emerald-600">
                            Connected — {tested.entityCount}{" "}
                            {tested.entityCount === 1 ? "entity" : "entities"}{" "}
                            found
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                <button
                    onClick={() => void runTest(form)}
                    disabled={!canTest}
                    className="
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md
                        text-[13px] font-semibold text-slate-600
                        border border-slate-300 bg-white hover:bg-slate-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors
                    "
                >
                    {testing ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            Testing…
                        </>
                    ) : (
                        "Test connection"
                    )}
                </button>
                <button
                    onClick={() => void handleOpen()}
                    disabled={!canOpen}
                    className="
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md
                        text-[13px] font-semibold text-white
                        bg-gradient-to-r from-blue-500 to-cyan-500
                        hover:from-blue-600 hover:to-cyan-600
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-sm transition-all
                    "
                >
                    <ExternalLink size={12} />
                    Open in tab
                </button>
            </div>
        </div>
    );
}
