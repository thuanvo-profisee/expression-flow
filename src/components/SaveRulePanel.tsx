// ─── Save the canvas back to Profisee ─────────────────────────────
//
// Writes the two expression blocks to the platform via PUT /Rules:
//   block 0 → whatExpression   block 1 → whenExpression
// A validation-mode block 0 produces a validation clause (with the
// Is Constraint flag), an assignment-mode block 0 an assignment clause.

import { useMemo } from "react";
import {
    AlertTriangle,
    Check,
    FilePlus2,
    Loader2,
    Save,
    Tag,
    Unplug,
} from "lucide-react";
import {
    useExpressionStore,
    attributeNameFromPath,
    defaultRuleDisplayText,
    DEMO_PREFIX,
} from "../store";
import { SearchableDropdown } from "./SearchableDropdown";

export function SaveRulePanel() {
    const selectedEntityName = useExpressionStore((s) => s.selectedEntityName);
    const flatAttributes = useExpressionStore((s) => s.flatAttributes);
    const blockConfigs = useExpressionStore((s) => s.blockConfigs);
    const generatedCodes = useExpressionStore((s) => s.generatedCodes);
    const ruleId = useExpressionStore((s) => s.ruleId);
    const ruleAttributeName = useExpressionStore((s) => s.ruleAttributeName);
    const ruleDisplayText = useExpressionStore((s) => s.ruleDisplayText);
    const ruleIsEnabled = useExpressionStore((s) => s.ruleIsEnabled);
    const saving = useExpressionStore((s) => s.ruleSaving);
    const saveError = useExpressionStore((s) => s.ruleSaveError);
    const savedAt = useExpressionStore((s) => s.ruleSavedAt);
    const setRuleAttributeName = useExpressionStore(
        (s) => s.setRuleAttributeName,
    );
    const setRuleDisplayText = useExpressionStore((s) => s.setRuleDisplayText);
    const setRuleIsEnabled = useExpressionStore((s) => s.setRuleIsEnabled);
    const startNewRule = useExpressionStore((s) => s.startNewRule);
    const saveRule = useExpressionStore((s) => s.saveRule);

    const isLive =
        !!selectedEntityName && !selectedEntityName.startsWith(DEMO_PREFIX);

    /** Rules attach to a single attribute — only top-level names qualify */
    const attributeOptions = useMemo(() => {
        const names = flatAttributes
            .filter((a) => a.depth === 0)
            .map((a) => attributeNameFromPath(a.value))
            .filter((n): n is string => !!n);
        return [
            { value: "", label: "(entity level)" },
            ...[...new Set(names)].map((name) => ({
                value: name,
                label: name,
            })),
        ];
    }, [flatAttributes]);

    const clauseKind =
        blockConfigs[0]?.expressionMode === "assignment"
            ? "Assignment clause"
            : "Validation clause";

    // Left blank, the save falls back to the clause text — show it as a hint
    const displayTextFallback = defaultRuleDisplayText(
        generatedCodes[0] ?? "",
        generatedCodes[1],
    );

    return (
        // No overflow-hidden here — the attribute dropdown opens past the card
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg w-[240px]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                <Save size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">
                    Save rule
                </span>
                <div className="flex-1" />
                <span className="text-[9px] font-semibold text-slate-400">
                    {ruleId ? "Update" : "New"}
                </span>
            </div>

            {!isLive ? (
                <div className="flex items-start gap-1.5 px-3 py-2.5">
                    <Unplug
                        size={11}
                        className="text-slate-300 shrink-0 mt-0.5"
                    />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Select a Profisee entity to save — demo catalogs are
                        local only.
                    </p>
                </div>
            ) : (
                <div className="px-3 py-2.5 space-y-2">
                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                        {selectedEntityName} · {clauseKind}
                    </div>

                    <div>
                        <span className="text-[10px] font-medium text-slate-500">
                            Attribute
                        </span>
                        <div className="mt-0.5">
                            <SearchableDropdown
                                options={attributeOptions}
                                value={ruleAttributeName ?? ""}
                                onSelect={(v) =>
                                    setRuleAttributeName(v || null)
                                }
                                icon={
                                    <Tag
                                        size={11}
                                        className="text-blue-400 shrink-0"
                                    />
                                }
                                placeholder="Select an attribute…"
                                searchPlaceholder="Search attributes..."
                                emptyLabel="No attributes found"
                            />
                        </div>
                    </div>

                    <label className="block">
                        <span className="text-[10px] font-medium text-slate-500">
                            Display text
                        </span>
                        <input
                            type="text"
                            value={ruleDisplayText}
                            onChange={(e) => setRuleDisplayText(e.target.value)}
                            title={
                                ruleDisplayText ||
                                displayTextFallback ||
                                undefined
                            }
                            placeholder={
                                displayTextFallback || "Shown to data stewards"
                            }
                            className="mt-0.5 w-full text-[11px] border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={ruleIsEnabled}
                            onChange={(e) => setRuleIsEnabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium text-slate-600">
                            Enabled
                        </span>
                    </label>

                    <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                            onClick={() => void saveRule()}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-[11px] font-semibold px-2 py-1.5 transition-colors"
                        >
                            {saving ? (
                                <Loader2 size={11} className="animate-spin" />
                            ) : (
                                <Save size={11} />
                            )}
                            {saving
                                ? "Saving…"
                                : ruleId
                                  ? "Update rule"
                                  : "Create rule"}
                        </button>
                        {ruleId && (
                            <button
                                onClick={startNewRule}
                                title="Save as a new rule instead"
                                className="flex items-center gap-1 rounded-md border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold text-slate-500 px-1.5 py-1.5 transition-colors"
                            >
                                <FilePlus2 size={11} />
                                New
                            </button>
                        )}
                    </div>

                    {saveError && (
                        <div className="flex items-start gap-1.5 rounded-md bg-rose-50 border border-rose-200 px-1.5 py-1">
                            <AlertTriangle
                                size={10}
                                className="text-rose-400 shrink-0 mt-0.5"
                            />
                            <span className="text-[9px] text-rose-600 break-words">
                                {saveError}
                            </span>
                        </div>
                    )}
                    {!saveError && savedAt && (
                        <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-1">
                            <Check size={10} className="text-emerald-500" />
                            <span className="text-[9px] font-semibold text-emerald-600">
                                Saved to Profisee
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
