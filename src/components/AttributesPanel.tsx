import { useCallback, useState, useRef } from "react";
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
} from "lucide-react";
import type { DragItem, AttributeNode, Block } from "../types";
import {
    ATTRIBUTE_CATALOGS,
    ATTRIBUTE_CATALOG_KEYS,
    FUNCTION_REGISTRY,
} from "../types";
import { useExpressionStore, generateCode, panToBlock } from "../store";

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
    const hasChildren = (node.children ?? []).length > 0;
    const item: DragItem = { type: "ATTRIBUTE", name: node.value };

    // When searching, auto-expand matching branches
    const isSearching = search.length > 0;
    const showExpanded = isSearching
        ? nodeMatchesSearch(node, search)
        : expanded;
    const labelMatches = node.label.toLowerCase().includes(search);

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
                        onClick={() => setExpanded(!showExpanded)}
                        className="p-0.5 rounded hover:bg-slate-100 transition-colors shrink-0"
                    >
                        {showExpanded ? (
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
                                +{node.children!.length}
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

// ─── Collapsible Section ────────────────────────────────────────

function CollapsibleSection({
    icon,
    label,
    count,
    defaultOpen = false,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 w-full text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700 transition-colors"
            >
                {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {icon}
                <span>{label}</span>
                {count != null && (
                    <span className="text-slate-300 ml-auto font-normal normal-case">
                        {count}
                    </span>
                )}
            </button>
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
    const hasChildren =
        block.type === "FUNCTION" && filledArgs.length > 0;
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
                            <ChevronDown
                                size={10}
                                className="text-slate-400"
                            />
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
                    <span className="truncate">
                        {getNodeLabel(block)}
                    </span>
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

function ExpressionTreeView({ root }: { root: Block | null }) {
    if (!root) {
        return (
            <div className="text-[10px] text-slate-300 italic px-1 py-2">
                Empty expression
            </div>
        );
    }
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-2 overflow-auto max-h-60 space-y-0.5">
            <ExpressionTreeNode block={root} depth={0} />
        </div>
    );
}

// ─── Generated Panel with Code / Tree toggle ───────────────────

type GeneratedViewMode = "code" | "tree";

function GeneratedPanel({
    roots,
    blockConfigs,
}: {
    roots: (Block | null)[];
    blockConfigs: { name: string; expressionMode: string }[];
}) {
    const [viewMode, setViewMode] = useState<GeneratedViewMode>("code");

    return (
        <div className="border-t border-slate-200 bg-slate-50">
            {/* Header with toggle */}
            <div className="flex items-center gap-1.5 px-3 py-2">
                <Code2 size={12} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Generated
                </span>
                {/* View mode toggle */}
                <div className="ml-auto flex items-center gap-0.5 p-0.5 bg-slate-200/60 rounded-md">
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
            <div className="px-3 pb-3 space-y-2">
                {roots.map((root, idx) => {
                    const cfg = blockConfigs[idx];
                    const isValidation =
                        cfg?.expressionMode === "validation";
                    return (
                        <div key={idx}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[9px] font-semibold text-slate-400 truncate">
                                    {cfg?.name ??
                                        `Expression ${idx + 1}`}
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
                                <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-24 overflow-y-auto">
                                    {generateCode(root)}
                                </pre>
                            ) : (
                                <ExpressionTreeView root={root} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Attributes Panel (Right) ───────────────────────────────────

const MIN_WIDTH = 250;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 300;

export function AttributesPanel() {
    const roots = useExpressionStore((s) => s.roots);
    const blockConfigs = useExpressionStore((s) => s.blockConfigs);
    const activeCatalogKey = useExpressionStore((s) => s.activeCatalogKey);
    const activeCatalog = useExpressionStore((s) => s.activeCatalog);
    const setActiveCatalog = useExpressionStore((s) => s.setActiveCatalog);
    const [search, setSearch] = useState("");
    const lowerSearch = search.toLowerCase().trim();

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
            </div>

            {/* Entity / Catalog Picker */}
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80">
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Entity
                </div>
                <div className="flex gap-0.5 p-0.5 bg-slate-200/60 rounded-lg">
                    {ATTRIBUTE_CATALOG_KEYS.map((key) => {
                        const entry = ATTRIBUTE_CATALOGS[key];
                        const isActive = activeCatalogKey === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveCatalog(key)}
                                className={`
                  flex-1 flex items-center justify-center gap-1
                  px-2 py-1.5 rounded-md text-[10px] font-semibold
                  transition-all duration-200
                  ${
                      isActive
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                  }
                `}
                            >
                                {entry.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-4">
                {/* Custom Value — collapsible */}
                <CollapsibleSection
                    icon={<Plus size={10} />}
                    label="Custom Value"
                    defaultOpen
                >
                    <CustomValueInput />
                </CollapsibleSection>

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
                >
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
                </CollapsibleSection>
            </div>

            {/* Generated Code Panel */}
            <GeneratedPanel roots={roots} blockConfigs={blockConfigs} />
        </div>
    );
}
