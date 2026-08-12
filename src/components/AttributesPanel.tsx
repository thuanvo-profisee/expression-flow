import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
    Database,
    Hash,
    Code2,
    Type,
    Plus,
    Search,
    ChevronRight,
    ChevronDown,
    GripVertical,
    Binary,
    ListTree,
    Braces,
    Maximize2,
    Minimize2,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Settings,
    ShieldAlert,
    MousePointerClick,
    Ban,
} from "lucide-react";
import type { DragItem, AttributeNode, Block, BlockConfig } from "../types";
import { splitDqrClause } from "../parser";
import {
    ATTRIBUTE_CATALOGS,
    ATTRIBUTE_CATALOG_KEYS,
    FUNCTION_REGISTRY,
} from "../types";
import {
    useExpressionStore,
    generateCode,
    panToBlock,
    DEMO_PREFIX,
} from "../store";

// ─── Helpers ────────────────────────────────────────────────────

/** Check if a node or any descendant matches the search */
function nodeMatchesSearch(node: AttributeNode, search: string): boolean {
    if (node.label.toLowerCase().includes(search)) return true;
    if (node.value.toLowerCase().includes(search)) return true;
    return (node.children ?? []).some((c) => nodeMatchesSearch(c, search));
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

// ─── Attribute Tree Node ────────────────────────────────────────

function AttributeTreeNode({
    node,
    depth,
    search,
}: {
    node: AttributeNode;
    depth: number;
    search: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [childError, setChildError] = useState(false);
    const loadNodeChildren = useExpressionStore((s) => s.loadNodeChildren);

    const loadedChildren = (node.children ?? []).length > 0;
    // Domain-based attribute whose children haven't been fetched yet
    const isLazy =
        !!node.domainEntityName && !node.childrenLoaded && !loadedChildren;
    const hasChildren = loadedChildren || isLazy;
    const item: DragItem = { type: "ATTRIBUTE", name: node.value };

    // When searching, auto-expand matching branches
    const isSearching = search.length > 0;
    const showExpanded = isSearching
        ? nodeMatchesSearch(node, search)
        : expanded;
    const labelMatches = node.label.toLowerCase().includes(search);

    const fetchChildren = useCallback(async () => {
        setLoadingChildren(true);
        setChildError(false);
        try {
            await loadNodeChildren(node.value);
        } catch {
            setChildError(true);
        } finally {
            setLoadingChildren(false);
        }
    }, [loadNodeChildren, node.value]);

    const handleToggle = useCallback(() => {
        const next = !showExpanded;
        setExpanded(next);
        if (next && isLazy && !loadingChildren) {
            void fetchChildren();
        }
    }, [showExpanded, isLazy, loadingChildren, fetchChildren]);

    // Hide nodes that don't match during search (and have no matching descendants)
    if (isSearching && !nodeMatchesSearch(node, search)) return null;

    return (
        <div>
            {/* This node */}
            <div
                className="flex items-center gap-0.5 group"
                style={{ paddingLeft: `${depth * 16}px` }}
            >
                {/* Expand toggle */}
                {hasChildren ? (
                    <button
                        onClick={handleToggle}
                        className="p-0.5 rounded hover:bg-slate-100 transition-colors shrink-0"
                    >
                        {loadingChildren ? (
                            <Loader2
                                size={12}
                                className="text-blue-400 animate-spin"
                            />
                        ) : showExpanded ? (
                            <ChevronDown size={12} className="text-slate-400" />
                        ) : (
                            <ChevronRight
                                size={12}
                                className="text-slate-400"
                            />
                        )}
                    </button>
                ) : (
                    <span className="w-[16px] shrink-0" />
                )}

                {/* Draggable pill */}
                <DraggableItem item={item}>
                    <div
                        className={`
            flex items-center gap-1 px-2 py-1 rounded-full
            border text-xs font-medium
            hover:shadow-sm transition-all duration-150
            ${
                labelMatches && isSearching
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-blue-50 border-blue-200 text-blue-600 hover:border-blue-300"
            }
          `}
                    >
                        <GripVertical
                            size={9}
                            className="text-blue-300 opacity-0 group-hover:opacity-100 shrink-0"
                        />
                        <Hash size={9} className="text-blue-400 shrink-0" />
                        <span className="truncate">{node.label}</span>
                        {hasChildren && (
                            <span className="text-[8px] text-blue-300 ml-0.5 shrink-0">
                                {loadedChildren
                                    ? `+${node.children!.length}`
                                    : "…"}
                            </span>
                        )}
                    </div>
                </DraggableItem>

                {/* Full path tooltip on hover (only for nested) */}
                {depth > 0 && (
                    <span
                        className="text-[8px] text-slate-300 ml-1 opacity-0 group-hover:opacity-100 truncate max-w-[80px] transition-opacity"
                        title={node.value}
                    >
                        {node.value}
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && showExpanded && (
                <div className="mt-1.5 space-y-1">
                    {childError && (
                        <button
                            onClick={() => void fetchChildren()}
                            className="flex items-center gap-1 text-[9px] text-rose-500 hover:text-rose-700 transition-colors"
                            style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                        >
                            <AlertTriangle size={9} />
                            Failed to load — retry
                        </button>
                    )}
                    {node.children!.map((child) => (
                        <AttributeTreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            search={search}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Custom Value Input ─────────────────────────────────────────

/** Keywords that should not be auto-quoted */
const KEYWORD_VALUES = new Set(["TRUE", "FALSE", "NULL"]);

/** Detect value type: number, text, or keyword */
function detectValueType(raw: string): "number" | "text" | "keyword" {
    if (KEYWORD_VALUES.has(raw.toUpperCase())) return "keyword";
    if (raw !== "" && !isNaN(Number(raw))) return "number";
    return "text";
}

/** Resolve the literal value for codegen — auto-wraps text in quotes */
function resolveLiteralValue(raw: string): string {
    const type = detectValueType(raw);
    if (type === "number") return raw;
    if (type === "keyword") return raw.toUpperCase();
    // Text: wrap in quotes unless user already added them
    if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
    ) {
        return raw;
    }
    return `"${raw}"`;
}

function CustomValueInput() {
    const [inputValue, setInputValue] = useState("");

    const trimmed = inputValue.trim();
    const valueType = trimmed ? detectValueType(trimmed) : null;
    const resolvedValue = trimmed ? resolveLiteralValue(trimmed) : "";

    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            if (!resolvedValue) {
                e.preventDefault();
                return;
            }
            const item: DragItem = {
                type: "LITERAL",
                name: "Literal",
                value: resolvedValue,
            };
            e.dataTransfer.setData("application/json", JSON.stringify(item));
            e.dataTransfer.effectAllowed = "copy";
        },
        [resolvedValue],
    );

    return (
        <div className="space-y-1.5">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. hello or 42"
                className="
          w-full px-2.5 py-1.5 rounded-md
          border border-slate-200 bg-white
          text-xs font-mono text-slate-700
          placeholder:text-slate-300
          focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400
        "
            />
            {trimmed && (
                <div className="flex items-center gap-2">
                    <div
                        draggable
                        onDragStart={handleDragStart}
                        className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1.5 rounded-md
              text-xs font-mono
              cursor-grab active:cursor-grabbing
              hover:shadow-sm transition-all duration-150
              ${
                  valueType === "number"
                      ? "bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100"
                      : "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
              }
            `}
                    >
                        {valueType === "number" ? (
                            <Binary size={10} className="text-amber-400" />
                        ) : (
                            <Type size={10} className="text-green-400" />
                        )}
                        <span>{resolvedValue}</span>
                        <span
                            className={`text-[9px] ml-1 ${
                                valueType === "number"
                                    ? "text-amber-400"
                                    : "text-green-400"
                            }`}
                        >
                            drag me
                        </span>
                    </div>
                    <span
                        className={`
            text-[9px] font-semibold px-1.5 py-0.5 rounded
            ${
                valueType === "number"
                    ? "bg-amber-100 text-amber-600"
                    : valueType === "keyword"
                      ? "bg-violet-100 text-violet-600"
                      : "bg-green-100 text-green-600"
            }
          `}
                    >
                        {valueType === "number"
                            ? "Number"
                            : valueType === "keyword"
                              ? "Keyword"
                              : "Text"}
                    </span>
                </div>
            )}
            {/* Presets */}
            <div className="flex flex-wrap gap-1">
                {(
                    [
                        ['""', "EMPTY"],
                        ['" "', "SPACE"],
                        ["NULL", "NULL"],
                        ["TRUE", "TRUE"],
                        ["FALSE", "FALSE"],
                        ["0", "0"],
                        ["1", "1"],
                    ] as [string, string][]
                ).map(([value, label]) => {
                    const item: DragItem = {
                        type: "LITERAL",
                        name: "Literal",
                        value,
                    };
                    return (
                        <DraggableItem key={value} item={item}>
                            <div
                                className="
                px-1.5 py-0.5 rounded text-[10px] font-mono
                bg-slate-100 border border-slate-200 text-slate-500
                hover:border-green-300 hover:text-green-600 hover:bg-green-50
                transition-all duration-150
              "
                                title={`Value: ${value}`}
                            >
                                {label}
                            </div>
                        </DraggableItem>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Entity Dropdown ────────────────────────────────────────────
// Searchable dropdown styled to match the attribute-select dropdown
// in BlockRenderer (search header + hover/highlight result list).

interface EntityDropdownOption {
    value: string; // entity name, or "demo:<key>"
    label: string;
    group: "profisee" | "demo";
}

const GROUP_LABELS: Record<EntityDropdownOption["group"], string> = {
    profisee: "Profisee Entities",
    demo: "Demo Catalogs",
};

function EntityDropdown({
    options,
    selected,
    loading,
    onSelect,
}: {
    options: EntityDropdownOption[];
    selected: string | null;
    loading: boolean;
    onSelect: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightIdx, setHighlightIdx] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [query, options]);

    const selectedLabel =
        options.find((o) => o.value === selected)?.label ?? null;

    // Focus search when opened
    useEffect(() => {
        if (isOpen) searchInputRef.current?.focus();
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("pointerdown", handler, true);
        return () => document.removeEventListener("pointerdown", handler, true);
    }, [isOpen]);

    const select = useCallback(
        (value: string) => {
            onSelect(value);
            setIsOpen(false);
            setQuery("");
        },
        [onSelect],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault();
                select(filtered[highlightIdx].value);
            } else if (e.key === "Escape") {
                setIsOpen(false);
                setQuery("");
            }
        },
        [filtered, highlightIdx, select],
    );

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                disabled={loading && options.length === 0}
                className={`
          w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
          border bg-white text-xs font-medium text-slate-700
          transition-all duration-150
          hover:border-blue-300 hover:shadow-sm
          disabled:opacity-60 disabled:cursor-wait
          ${isOpen ? "border-blue-400 ring-2 ring-blue-400/30" : "border-slate-200"}
        `}
            >
                <Database size={12} className="text-blue-400 shrink-0" />
                <span
                    className={`truncate ${selectedLabel ? "" : "text-slate-300"}`}
                >
                    {selectedLabel ??
                        (loading ? "Loading entities…" : "Select an entity…")}
                </span>
                {loading ? (
                    <Loader2
                        size={12}
                        className="text-blue-400 animate-spin ml-auto shrink-0"
                    />
                ) : (
                    <ChevronDown
                        size={12}
                        className={`text-slate-400 ml-auto shrink-0 transition-transform duration-150 ${
                            isOpen ? "rotate-180" : ""
                        }`}
                    />
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    className="
            absolute left-0 right-0 top-full mt-1 z-50
            max-h-[240px]
            bg-white border border-slate-200 rounded-lg shadow-lg
            flex flex-col overflow-hidden
          "
                >
                    {/* Search input */}
                    <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-slate-100">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHighlightIdx(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search entities..."
                            className="
                flex-1 text-xs text-slate-700 bg-transparent
                placeholder:text-slate-300
                outline-none
              "
                        />
                        <span className="text-[9px] text-slate-300">
                            {filtered.length}
                        </span>
                    </div>
                    {/* Results */}
                    <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-slate-400 text-center">
                                No entities found
                            </div>
                        ) : (
                            filtered.map((opt, idx) => (
                                <div key={opt.value}>
                                    {/* Group header when group changes */}
                                    {(idx === 0 ||
                                        filtered[idx - 1].group !==
                                            opt.group) && (
                                        <div className="px-2.5 pt-2 pb-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                            {GROUP_LABELS[opt.group]}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => select(opt.value)}
                                        onMouseEnter={() =>
                                            setHighlightIdx(idx)
                                        }
                                        className={`
                      w-full flex items-center gap-2 px-2.5 py-1.5 text-left
                      text-xs transition-colors
                      ${idx === highlightIdx ? "bg-blue-50" : "hover:bg-slate-50"}
                      ${opt.value === selected ? "font-semibold" : ""}
                    `}
                                        title={opt.label}
                                    >
                                        <Database
                                            size={10}
                                            className={`shrink-0 ${
                                                opt.group === "demo"
                                                    ? "text-slate-300"
                                                    : "text-blue-400"
                                            }`}
                                        />
                                        <span className="text-slate-700 truncate">
                                            {opt.label}
                                        </span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Collapsible Section ────────────────────────────────────────

function CollapsibleSection({
    icon,
    label,
    count,
    defaultOpen = false,
    onReload,
    reloading,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    count?: number;
    defaultOpen?: boolean;
    onReload?: () => void;
    reloading?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <div className="flex items-center gap-1.5 w-full mb-1">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                    {open ? (
                        <ChevronDown size={10} />
                    ) : (
                        <ChevronRight size={10} />
                    )}
                    {icon}
                    <span className="truncate">{label}</span>
                    {count != null && (
                        <span className="text-slate-300 font-normal normal-case shrink-0">
                            {count}
                        </span>
                    )}
                </button>
                {onReload && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReload();
                        }}
                        disabled={reloading}
                        title="Reload"
                        className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <RefreshCw
                            size={10}
                            className={reloading ? "animate-spin" : ""}
                        />
                    </button>
                )}
            </div>
            {open && <div className="mb-2">{children}</div>}
        </div>
    );
}

// ─── Expression Tree View ───────────────────────────────────────

/** Color map for function categories (matches BlockRenderer palette) */
const TREE_COLORS: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
    rose: "text-rose-600 bg-rose-50 border-rose-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    pink: "text-pink-600 bg-pink-50 border-pink-200",
    sky: "text-sky-600 bg-sky-50 border-sky-200",
    teal: "text-teal-600 bg-teal-50 border-teal-200",
    violet: "text-violet-600 bg-violet-50 border-violet-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    lime: "text-lime-600 bg-lime-50 border-lime-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    slate: "text-slate-600 bg-slate-50 border-slate-200",
};

function getNodeLabel(block: Block): string {
    if (block.type === "ATTRIBUTE") return block.name;
    if (block.type === "LITERAL") return block.value ?? '""';
    const meta = FUNCTION_REGISTRY[block.name];
    return meta?.label ?? block.name;
}

function getNodeStyle(block: Block): string {
    if (block.type === "ATTRIBUTE")
        return "text-blue-600 bg-blue-50 border-blue-200";
    if (block.type === "LITERAL")
        return "text-green-700 bg-green-50 border-green-200";
    const meta = FUNCTION_REGISTRY[block.name];
    return TREE_COLORS[meta?.color ?? "slate"] ?? TREE_COLORS.slate;
}

function getNodeIcon(block: Block) {
    if (block.type === "ATTRIBUTE")
        return <Hash size={9} className="shrink-0 opacity-70" />;
    if (block.type === "LITERAL")
        return <Type size={9} className="shrink-0 opacity-70" />;
    return <Braces size={9} className="shrink-0 opacity-70" />;
}

function ExpressionTreeNode({
    block,
    depth,
    argLabel,
}: {
    block: Block;
    depth: number;
    argLabel?: string;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const focusBlock = useExpressionStore((s) => s.focusBlock);
    const focusedBlockId = useExpressionStore((s) => s.focusedBlockId);
    const filledArgs = block.args.filter(Boolean) as Block[];
    const hasChildren = block.type === "FUNCTION" && filledArgs.length > 0;
    const meta = FUNCTION_REGISTRY[block.name];
    const isActive = focusedBlockId === block.id;

    const handleClick = useCallback(() => {
        focusBlock(block.id);
        // Small delay so the highlight renders before panning
        requestAnimationFrame(() => panToBlock(block.id));
    }, [block.id, focusBlock]);

    return (
        <div>
            <div
                className="flex items-center gap-1 group"
                style={{ paddingLeft: `${depth * 14}px` }}
            >
                {/* Expand toggle */}
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors shrink-0"
                    >
                        {expanded ? (
                            <ChevronDown size={10} className="text-slate-400" />
                        ) : (
                            <ChevronRight
                                size={10}
                                className="text-slate-400"
                            />
                        )}
                    </button>
                ) : (
                    <span className="w-[18px] shrink-0" />
                )}

                {/* Arg label (e.g. "Condition", "Left") */}
                {argLabel && (
                    <span className="text-[8px] text-slate-400 shrink-0 w-[52px] truncate text-right mr-0.5">
                        {argLabel}
                    </span>
                )}

                {/* Node pill — clickable to focus on canvas */}
                <button
                    onClick={handleClick}
                    className={`
                        inline-flex items-center gap-1 px-1.5 py-0.5
                        rounded border text-[10px] font-medium leading-tight
                        max-w-[180px] truncate
                        cursor-pointer transition-all duration-150
                        ${getNodeStyle(block)}
                        ${isActive ? "ring-2 ring-orange-400 ring-offset-1" : "hover:brightness-95"}
                    `}
                    title={`Click to focus — ${
                        block.type === "FUNCTION"
                            ? `${block.name}(${filledArgs.length} args)`
                            : getNodeLabel(block)
                    }`}
                >
                    {getNodeIcon(block)}
                    <span className="truncate">{getNodeLabel(block)}</span>
                </button>

                {/* Children count badge */}
                {hasChildren && !expanded && (
                    <span className="text-[8px] text-slate-400 ml-0.5">
                        ({filledArgs.length})
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <div className="mt-0.5 space-y-0.5">
                    {block.args.map((arg, i) => {
                        if (!arg) return null;
                        const label =
                            meta?.argLabels[i] ??
                            (meta?.variadic
                                ? `${meta?.argLabels[0]?.replace(
                                      /\s*\d+$/,
                                      "",
                                  )} ${i + 1}`
                                : undefined);
                        return (
                            <ExpressionTreeNode
                                key={arg.id}
                                block={arg}
                                depth={depth + 1}
                                argLabel={label}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ExpressionTreeView({
    root,
    expanded,
}: {
    root: Block | null;
    expanded?: boolean;
}) {
    if (!root) {
        return (
            <div className="text-[10px] text-slate-300 italic px-1 py-2">
                Empty expression
            </div>
        );
    }
    return (
        <div
            className={`bg-white border border-slate-200 rounded-lg p-2 overflow-auto space-y-0.5 ${
                expanded ? "" : "max-h-60"
            }`}
        >
            <ExpressionTreeNode block={root} depth={0} />
        </div>
    );
}

// ─── Generated Panel with Code / Tree toggle ───────────────────

type GeneratedViewMode = "code" | "tree";

function GeneratedPanel({
    roots,
    blockConfigs,
    isExpanded,
    onToggleExpand,
}: {
    roots: (Block | null)[];
    blockConfigs: { name: string; expressionMode: string }[];
    isExpanded: boolean;
    onToggleExpand: () => void;
}) {
    const [viewMode, setViewMode] = useState<GeneratedViewMode>("code");

    return (
        <div
            className={`border-t border-slate-200 bg-slate-50 ${
                isExpanded ? "flex-1 flex flex-col overflow-hidden" : ""
            }`}
        >
            {/* Header with toggle */}
            <div className="flex items-center gap-1.5 px-3 py-2">
                <Code2 size={12} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Generated
                </span>
                {/* Expand / collapse button */}
                <button
                    onClick={onToggleExpand}
                    className="ml-auto p-1 rounded hover:bg-slate-200/80 transition-colors group/exp"
                    title={
                        isExpanded ? "Collapse panel" : "Expand to full panel"
                    }
                >
                    {isExpanded ? (
                        <Minimize2
                            size={12}
                            className="text-slate-400 group-hover/exp:text-slate-600"
                        />
                    ) : (
                        <Maximize2
                            size={12}
                            className="text-slate-400 group-hover/exp:text-slate-600"
                        />
                    )}
                </button>
                {/* View mode toggle */}
                <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/60 rounded-md">
                    <button
                        onClick={() => setViewMode("code")}
                        className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded
                            text-[9px] font-semibold transition-all duration-150
                            ${
                                viewMode === "code"
                                    ? "bg-white text-slate-700 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            }
                        `}
                        title="Code view"
                    >
                        <Code2 size={9} />
                        Code
                    </button>
                    <button
                        onClick={() => setViewMode("tree")}
                        className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded
                            text-[9px] font-semibold transition-all duration-150
                            ${
                                viewMode === "tree"
                                    ? "bg-white text-slate-700 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            }
                        `}
                        title="Tree view"
                    >
                        <ListTree size={9} />
                        Tree
                    </button>
                </div>
            </div>

            {/* Content */}
            <div
                className={`px-3 pb-3 space-y-2 ${
                    isExpanded ? "flex-1 overflow-y-auto sidebar-scroll" : ""
                }`}
            >
                {roots.map((root, idx) => {
                    const cfg = blockConfigs[idx];
                    const isValidation = cfg?.expressionMode === "validation";
                    return (
                        <div key={idx}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[9px] font-semibold text-slate-400 truncate">
                                    {cfg?.name ?? `Expression ${idx + 1}`}
                                </span>
                                <span
                                    className={`
                                        text-[8px] font-semibold px-1 py-0.5 rounded shrink-0
                                        ${
                                            isValidation
                                                ? "bg-amber-100 text-amber-600"
                                                : "bg-indigo-100 text-indigo-600"
                                        }
                                    `}
                                >
                                    {isValidation ? "bool" : "value"}
                                </span>
                            </div>

                            {viewMode === "code" ? (
                                <pre
                                    className={`text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto ${
                                        isExpanded ? "" : "max-h-24"
                                    }`}
                                >
                                    {generateCode(root)}
                                </pre>
                            ) : (
                                <ExpressionTreeView
                                    root={root}
                                    expanded={isExpanded}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Data Quality Rules ──────────────────────────────────────────

function DataQualityRulesSection({
    blockConfigs,
}: {
    blockConfigs: BlockConfig[];
}) {
    const rules = useExpressionStore((s) => s.dataQualityRules);
    const loading = useExpressionStore((s) => s.dqRulesLoading);
    const error = useExpressionStore((s) => s.dqRulesError);
    const reload = useExpressionStore((s) => s.loadDataQualityRules);
    const loadDqrClause = useExpressionStore((s) => s.loadDqrClause);
    const mainLabel = blockConfigs[0]?.name ?? "Main";
    const whenLabel = blockConfigs[1]?.name ?? "When";

    return (
        <CollapsibleSection
            icon={<ShieldAlert size={10} />}
            label="Data Quality Rules"
            count={rules.length}
            onReload={() => void reload()}
            reloading={loading}
        >
            {loading ? (
                <div className="flex items-center gap-1.5 px-1 py-2 text-[10px] text-slate-400">
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                    Loading rules…
                </div>
            ) : error ? (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-rose-50 border border-rose-200">
                    <AlertTriangle
                        size={10}
                        className="text-rose-400 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                        <div className="text-[9px] text-rose-600 break-words">
                            {error}
                        </div>
                        <button
                            onClick={() => void reload()}
                            className="flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                        >
                            <RefreshCw size={9} />
                            Retry
                        </button>
                    </div>
                </div>
            ) : rules.length === 0 ? (
                <div className="text-[10px] text-slate-300 italic px-1 py-2">
                    No data quality rules
                </div>
            ) : (
                <div className="space-y-1.5">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className="rounded-md border border-slate-200 bg-white p-1.5"
                        >
                            <div className="flex items-center gap-1 mb-1">
                                {!rule.isEnabled && (
                                    <Ban
                                        size={9}
                                        className="text-slate-300 shrink-0"
                                        aria-label="Disabled"
                                    />
                                )}
                                <span className="text-[10px] font-semibold text-slate-600 truncate">
                                    {rule.displayText ??
                                        rule.attributeName ??
                                        "Rule"}
                                </span>
                            </div>
                            {rule.clauses.map((clause) => {
                                const parsed = splitDqrClause(clause.text);
                                return (
                                    <button
                                        key={clause.id}
                                        onClick={() =>
                                            loadDqrClause(clause.text, {
                                                ruleId: rule.id,
                                                clauseId: clause.id,
                                                attributeName:
                                                    rule.attributeName,
                                                displayText: rule.displayText,
                                                isEnabled: rule.isEnabled,
                                            })
                                        }
                                        title="Click to load into canvas"
                                        className="w-full text-left mb-1 last:mb-0 rounded border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors px-1.5 py-1 group"
                                    >
                                        <div className="flex items-start gap-1">
                                            <span className="text-[8px] font-semibold text-slate-400 shrink-0 w-[52px] truncate">
                                                {mainLabel}
                                            </span>
                                            <pre className="flex-1 min-w-0 text-[9px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
                                                {parsed.main}
                                            </pre>
                                        </div>
                                        {parsed.when && (
                                            <div className="flex items-start gap-1 mt-0.5">
                                                <span className="text-[8px] font-semibold text-slate-400 shrink-0 w-[52px] truncate">
                                                    {whenLabel}
                                                </span>
                                                <pre className="flex-1 min-w-0 text-[9px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {parsed.when}
                                                </pre>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {parsed.isConstraint && (
                                                <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-600">
                                                    Constraint
                                                </span>
                                            )}
                                            <span className="flex items-center gap-0.5 text-[8px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                                <MousePointerClick size={8} />
                                                Load
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </CollapsibleSection>
    );
}

// ─── Attributes Panel (Right) ───────────────────────────────────

const MIN_WIDTH = 250;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 300;

export function AttributesPanel() {
    const roots = useExpressionStore((s) => s.roots);
    const blockConfigs = useExpressionStore((s) => s.blockConfigs);
    const activeCatalog = useExpressionStore((s) => s.activeCatalog);
    const entities = useExpressionStore((s) => s.entities);
    const entitiesLoading = useExpressionStore((s) => s.entitiesLoading);
    const entitiesError = useExpressionStore((s) => s.entitiesError);
    const selectedEntityName = useExpressionStore((s) => s.selectedEntityName);
    const attributesLoading = useExpressionStore((s) => s.attributesLoading);
    const attributesError = useExpressionStore((s) => s.attributesError);
    const loadEntities = useExpressionStore((s) => s.loadEntities);
    const selectEntity = useExpressionStore((s) => s.selectEntity);
    const openConfigDialog = useExpressionStore((s) => s.openConfigDialog);
    const [search, setSearch] = useState("");

    // Load the entity list from the Profisee REST API on mount
    useEffect(() => {
        void loadEntities();
    }, [loadEntities]);

    // API entities + built-in demo catalogs, as dropdown options
    const entityOptions = useMemo<EntityDropdownOption[]>(
        () => [
            ...entities.map((e) => ({
                value: e.name,
                label: e.name,
                group: "profisee" as const,
            })),
            ...ATTRIBUTE_CATALOG_KEYS.map((key) => ({
                value: `${DEMO_PREFIX}${key}`,
                label: `${ATTRIBUTE_CATALOGS[key].label} (demo)`,
                group: "demo" as const,
            })),
        ],
        [entities],
    );
    const lowerSearch = search.toLowerCase().trim();
    const [generatedExpanded, setGeneratedExpanded] = useState(false);

    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const isResizing = useRef(false);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            isResizing.current = true;
            const startX = e.clientX;
            const startWidth = width;

            const onMouseMove = (ev: MouseEvent) => {
                if (!isResizing.current) return;
                // Dragging left increases width, dragging right decreases
                const delta = startX - ev.clientX;
                const newWidth = Math.min(
                    MAX_WIDTH,
                    Math.max(MIN_WIDTH, startWidth + delta),
                );
                setWidth(newWidth);
            };

            const onMouseUp = () => {
                isResizing.current = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            };

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [width],
    );

    return (
        <div
            className="h-full flex flex-col bg-white border-l border-slate-200 shrink-0 relative"
            style={{ width }}
        >
            {/* Resize handle */}
            <div
                onMouseDown={handleMouseDown}
                className="
          absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10
          hover:bg-indigo-400/40 active:bg-indigo-500/50
          transition-colors duration-150
        "
            />
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-cyan-500">
                <Database size={16} className="text-white" />
                <h2 className="text-sm font-bold text-white tracking-tight">
                    Data & Values
                </h2>
                <button
                    onClick={openConfigDialog}
                    className="ml-auto p-1 rounded hover:bg-white/20 transition-colors"
                    title="Connection settings"
                >
                    <Settings size={14} className="text-white" />
                </button>
            </div>

            {/* Entity Picker — hidden when generated panel is expanded */}
            {!generatedExpanded && (
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            Entity
                        </span>
                        <button
                            onClick={() => void loadEntities()}
                            disabled={entitiesLoading}
                            title="Reload entities"
                            className="ml-auto p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw
                                size={10}
                                className={
                                    entitiesLoading ? "animate-spin" : ""
                                }
                            />
                        </button>
                    </div>
                    <EntityDropdown
                        options={entityOptions}
                        selected={selectedEntityName}
                        loading={entitiesLoading}
                        onSelect={(value) => void selectEntity(value)}
                    />
                    {entitiesError && (
                        <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-rose-50 border border-rose-200">
                            <AlertTriangle
                                size={10}
                                className="text-rose-400 shrink-0 mt-0.5"
                            />
                            <div className="min-w-0">
                                <div className="text-[9px] text-rose-600 break-words">
                                    {entitiesError}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <button
                                        onClick={() => void loadEntities()}
                                        className="flex items-center gap-1 text-[9px] font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                                    >
                                        <RefreshCw size={9} />
                                        Retry
                                    </button>
                                    <button
                                        onClick={openConfigDialog}
                                        className="flex items-center gap-1 text-[9px] font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                                    >
                                        <Settings size={9} />
                                        Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Scrollable content — hidden when generated panel is expanded */}
            {!generatedExpanded && (
                <div className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-4">
                    {/* Custom Value — collapsible */}
                    <CollapsibleSection
                        icon={<Plus size={10} />}
                        label="Custom Value"
                        defaultOpen
                    >
                        <CustomValueInput />
                    </CollapsibleSection>

                    {/* Data Quality Rules — collapsible */}
                    <DataQualityRulesSection blockConfigs={blockConfigs} />

                    {/* Break line */}
                    <div className="h-px bg-slate-200 w-full" />

                    {/* Search */}
                    <div className="relative">
                        <Search
                            size={12}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search attributes..."
                            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                        />
                    </div>

                    {/* Data Attributes Tree — collapsible */}
                    <CollapsibleSection
                        icon={<Database size={10} />}
                        label="Attributes"
                        count={activeCatalog.length}
                        defaultOpen
                        onReload={() =>
                            selectedEntityName &&
                            void selectEntity(selectedEntityName)
                        }
                        reloading={attributesLoading}
                    >
                        {attributesLoading ? (
                            <div className="flex items-center gap-1.5 px-1 py-2 text-[10px] text-slate-400">
                                <Loader2
                                    size={12}
                                    className="text-blue-400 animate-spin"
                                />
                                Loading attributes…
                            </div>
                        ) : attributesError ? (
                            <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-rose-50 border border-rose-200">
                                <AlertTriangle
                                    size={10}
                                    className="text-rose-400 shrink-0 mt-0.5"
                                />
                                <div className="min-w-0">
                                    <div className="text-[9px] text-rose-600 break-words">
                                        {attributesError}
                                    </div>
                                    {selectedEntityName && (
                                        <button
                                            onClick={() =>
                                                void selectEntity(
                                                    selectedEntityName,
                                                )
                                            }
                                            className="flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                                        >
                                            <RefreshCw size={9} />
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : activeCatalog.length === 0 ? (
                            <div className="text-[10px] text-slate-300 italic px-1 py-2">
                                No attributes
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {activeCatalog.map((node) => (
                                    <AttributeTreeNode
                                        key={node.id}
                                        node={node}
                                        depth={0}
                                        search={lowerSearch}
                                    />
                                ))}
                            </div>
                        )}
                    </CollapsibleSection>
                </div>
            )}

            {/* Generated Code Panel */}
            <GeneratedPanel
                roots={roots}
                blockConfigs={blockConfigs}
                isExpanded={generatedExpanded}
                onToggleExpand={() => setGeneratedExpanded((v) => !v)}
            />
        </div>
    );
}
