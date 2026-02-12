import { useCallback, useState, useRef, useEffect } from "react";
import {
    GripVertical,
    Braces,
    Sparkles,
    ChevronDown,
    ChevronRight,
    Zap,
    Type,
    Calendar,
    History,
    ArrowLeftRight,
    ListFilter,
    Info,
    X,
    Scale,
    Calculator,
    Search,
} from "lucide-react";
import type { DragItem, FunctionMeta } from "../types";
import { getFunctionsBySubcategory, SUBCATEGORY_ORDER } from "../types";
import { useExpressionStore, SCENARIOS } from "../store";
import type { ScenarioKey } from "../store";

// ─── Color mapping (matches BlockRenderer on the canvas) ─────────

const PANEL_COLORS: Record<
    string,
    { border: string; bg: string; text: string }
> = {
    indigo: {
        border: "border-l-indigo-400",
        bg: "bg-indigo-50/60",
        text: "text-indigo-700",
    },
    emerald: {
        border: "border-l-emerald-400",
        bg: "bg-emerald-50/60",
        text: "text-emerald-700",
    },
    amber: {
        border: "border-l-amber-400",
        bg: "bg-amber-50/60",
        text: "text-amber-700",
    },
    rose: {
        border: "border-l-rose-400",
        bg: "bg-rose-50/60",
        text: "text-rose-700",
    },
    purple: {
        border: "border-l-purple-400",
        bg: "bg-purple-50/60",
        text: "text-purple-700",
    },
    cyan: {
        border: "border-l-cyan-400",
        bg: "bg-cyan-50/60",
        text: "text-cyan-700",
    },
    teal: {
        border: "border-l-teal-400",
        bg: "bg-teal-50/60",
        text: "text-teal-700",
    },
    pink: {
        border: "border-l-pink-400",
        bg: "bg-pink-50/60",
        text: "text-pink-700",
    },
    orange: {
        border: "border-l-orange-400",
        bg: "bg-orange-50/60",
        text: "text-orange-700",
    },
    sky: {
        border: "border-l-sky-400",
        bg: "bg-sky-50/60",
        text: "text-sky-700",
    },
    violet: {
        border: "border-l-violet-400",
        bg: "bg-violet-50/60",
        text: "text-violet-700",
    },
    lime: {
        border: "border-l-lime-500",
        bg: "bg-lime-50/60",
        text: "text-lime-700",
    },
    slate: {
        border: "border-l-slate-400",
        bg: "bg-slate-50/60",
        text: "text-slate-700",
    },
};

const DEFAULT_PANEL_COLOR = {
    border: "border-l-slate-300",
    bg: "bg-white",
    text: "text-slate-700",
};

function getPanelColor(colorKey: string) {
    return PANEL_COLORS[colorKey] ?? DEFAULT_PANEL_COLOR;
}

// ─── Icon resolver ───────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Zap> = {
    Zap,
    Type,
    Calendar,
    History,
    ArrowRightLeft: ArrowLeftRight,
    ListFilter,
    Scale,
    Calculator,
    Braces,
};

function SubcategoryIcon({ name, size = 12 }: { name: string; size?: number }) {
    const Icon = ICON_MAP[name] ?? Braces;
    return <Icon size={size} />;
}

// ─── Draggable wrapper ──────────────────────────────────────────

function DraggableItem({
    item,
    children,
}: {
    item: DragItem;
    children: React.ReactNode;
}) {
    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            e.dataTransfer.setData("application/json", JSON.stringify(item));
            e.dataTransfer.effectAllowed = "copy";
            const el = e.currentTarget as HTMLElement;
            e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
        },
        [item],
    );
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="cursor-grab active:cursor-grabbing"
        >
            {children}
        </div>
    );
}

// ─── Info Popover ───────────────────────────────────────────────

function InfoPopover({
    meta,
    onClose,
}: {
    meta: FunctionMeta;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node))
                onClose();
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[100] w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-left"
            style={{
                left: "var(--popover-left, 12px)",
                top: "var(--popover-top, 0px)",
            }}
        >
            <div className="flex items-start justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700">
                    {meta.label}
                </span>
                <button
                    onClick={onClose}
                    className="p-0.5 hover:bg-slate-100 rounded transition-colors shrink-0 ml-2"
                >
                    <X size={12} className="text-slate-400" />
                </button>
            </div>
            {meta.description && (
                <div className="text-[10px] text-slate-500 mb-2">
                    {meta.description}
                </div>
            )}
            {meta.details && (
                <pre className="text-[10px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-2 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                    {meta.details}
                </pre>
            )}
        </div>
    );
}

/** Wrapper that positions the popover using a portal-like fixed approach */
function InfoButton({ meta }: { meta: FunctionMeta }) {
    const [showInfo, setShowInfo] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState({ left: 0, top: 0 });

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!showInfo && btnRef.current) {
                const rect = btnRef.current.getBoundingClientRect();
                setPos({ left: rect.left, top: rect.bottom + 4 });
            }
            setShowInfo(!showInfo);
        },
        [showInfo],
    );

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleClick}
                className="p-0.5 rounded hover:bg-indigo-50 transition-colors shrink-0"
                title="Show details"
            >
                <Info
                    size={11}
                    className={
                        showInfo
                            ? "text-indigo-500"
                            : "text-slate-300 hover:text-indigo-400"
                    }
                />
            </button>
            {showInfo && (
                <div
                    style={
                        {
                            "--popover-left": `${pos.left}px`,
                            "--popover-top": `${pos.top}px`,
                        } as React.CSSProperties
                    }
                >
                    <InfoPopover
                        meta={meta}
                        onClose={() => setShowInfo(false)}
                    />
                </div>
            )}
        </>
    );
}

// ─── Function card (compact) ────────────────────────────────────

function FunctionCard({ meta }: { meta: FunctionMeta }) {
    const item: DragItem = { type: "FUNCTION", name: meta.name };
    const argCount = meta.argLabels.length;
    const isZeroArg = argCount === 0;
    const colors = getPanelColor(meta.color);

    return (
        <div className="flex items-center gap-0.5">
            <div className="flex-1 min-w-0">
                <DraggableItem item={item}>
                    <div
                        className={`
            flex items-center gap-1.5 px-2 py-1.5
            rounded-md border border-slate-200 border-l-[3px]
            hover:shadow-sm transition-all duration-150 group
            ${colors.border} ${colors.bg}
          `}
                    >
                        <GripVertical
                            size={10}
                            className="text-slate-300 group-hover:text-slate-400 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <div
                                className={`text-xs font-semibold ${colors.text}`}
                            >
                                {meta.label}
                            </div>
                            {meta.description && (
                                <div className="text-[9px] text-slate-400 leading-tight truncate">
                                    {meta.description}
                                </div>
                            )}
                        </div>

                        <span className="text-[9px] text-slate-400 bg-white/60 px-1 py-0.5 rounded shrink-0">
                            {isZeroArg ? "const" : `${argCount}`}
                        </span>
                        {meta.details && <InfoButton meta={meta} />}
                    </div>
                </DraggableItem>
            </div>
        </div>
    );
}

// ─── Collapsible Section ────────────────────────────────────────

function Section({
    label,
    iconName,
    functions,
    defaultOpen = false,
}: {
    label: string;
    iconName: string;
    functions: FunctionMeta[];
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 w-full text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700 transition-colors"
            >
                {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <SubcategoryIcon name={iconName} size={10} />
                <span>{label}</span>
                <span className="text-slate-300 ml-auto font-normal normal-case">
                    {functions.length}
                </span>
            </button>
            {open && (
                <div className="space-y-1 mb-2">
                    {functions.map((m) => (
                        <FunctionCard key={m.name} meta={m} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Scenario Picker ────────────────────────────────────────────

const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

function ScenarioPicker() {
    const scenario = useExpressionStore((s) => s.scenario);
    const setScenario = useExpressionStore((s) => s.setScenario);

    return (
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80">
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Scenario
            </div>
            <div className="flex gap-0.5 p-0.5 bg-slate-200/60 rounded-lg">
                {SCENARIO_KEYS.map((key) => {
                    const s = SCENARIOS[key];
                    const isActive = scenario === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setScenario(key)}
                            title={s.description}
                            className={`
                flex-1 flex items-center justify-center gap-1
                px-2 py-1.5 rounded-md text-[10px] font-semibold
                transition-all duration-200
                ${
                    isActive
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                }
              `}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Functions Panel (Left) ─────────────────────────────────────

export function FunctionsPanel() {
    const [search, setSearch] = useState("");
    const lowerSearch = search.toLowerCase().trim();

    return (
        <div className="w-[280px] h-full flex flex-col bg-white border-r border-slate-200 shrink-0">
            {/* Title */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-600">
                <Sparkles size={16} className="text-white" />
                <h1 className="text-sm font-bold text-white tracking-tight">
                    Expression Flow
                </h1>
            </div>

            {/* Scenario Toggle */}
            <ScenarioPicker />

            {/* Search */}
            <div className="px-3 pt-2 pb-1">
                <div className="relative">
                    <Search
                        size={12}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search functions..."
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                    />
                </div>
            </div>

            {/* Function list */}
            <div className="flex-1 overflow-y-auto sidebar-scroll px-3 py-2 space-y-1">
                {SUBCATEGORY_ORDER.map(({ key, label, icon }) => {
                    let funcs = getFunctionsBySubcategory(key);
                    if (lowerSearch) {
                        funcs = funcs.filter(
                            (f) =>
                                f.name.toLowerCase().includes(lowerSearch) ||
                                f.label.toLowerCase().includes(lowerSearch) ||
                                (f.description ?? "")
                                    .toLowerCase()
                                    .includes(lowerSearch),
                        );
                    }
                    if (funcs.length === 0) return null;
                    return (
                        <Section
                            key={key}
                            label={label}
                            iconName={icon}
                            functions={funcs}
                            defaultOpen={!!lowerSearch}
                        />
                    );
                })}
            </div>
        </div>
    );
}
