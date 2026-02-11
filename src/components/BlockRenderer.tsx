import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
  Braces,
  Hash,
  Type,
  Plus,
  Minus,
  Binary,
  ToggleLeft,
  CircleOff,
  Search,
} from "lucide-react";
import type { Block } from "../types";
import { FUNCTION_REGISTRY, FLAT_ATTRIBUTES } from "../types";
import { useExpressionStore } from "../store";
import { DropZone } from "./DropZone";

// ─── Color Mapping ───────────────────────────────────────────────
const COLOR_MAP: Record<
  string,
  { border: string; bg: string; header: string; text: string }
> = {
  indigo: {
    border: "border-indigo-300",
    bg: "bg-indigo-50/80",
    header: "bg-indigo-100",
    text: "text-indigo-700",
  },
  emerald: {
    border: "border-emerald-300",
    bg: "bg-emerald-50/80",
    header: "bg-emerald-100",
    text: "text-emerald-700",
  },
  amber: {
    border: "border-amber-300",
    bg: "bg-amber-50/80",
    header: "bg-amber-100",
    text: "text-amber-700",
  },
  rose: {
    border: "border-rose-300",
    bg: "bg-rose-50/80",
    header: "bg-rose-100",
    text: "text-rose-700",
  },
  purple: {
    border: "border-purple-300",
    bg: "bg-purple-50/80",
    header: "bg-purple-100",
    text: "text-purple-700",
  },
  cyan: {
    border: "border-cyan-300",
    bg: "bg-cyan-50/80",
    header: "bg-cyan-100",
    text: "text-cyan-700",
  },
  teal: {
    border: "border-teal-300",
    bg: "bg-teal-50/80",
    header: "bg-teal-100",
    text: "text-teal-700",
  },
  pink: {
    border: "border-pink-300",
    bg: "bg-pink-50/80",
    header: "bg-pink-100",
    text: "text-pink-700",
  },
  orange: {
    border: "border-orange-300",
    bg: "bg-orange-50/80",
    header: "bg-orange-100",
    text: "text-orange-700",
  },
  sky: {
    border: "border-sky-300",
    bg: "bg-sky-50/80",
    header: "bg-sky-100",
    text: "text-sky-700",
  },
  violet: {
    border: "border-violet-300",
    bg: "bg-violet-50/80",
    header: "bg-violet-100",
    text: "text-violet-700",
  },
  lime: {
    border: "border-lime-400",
    bg: "bg-lime-50/80",
    header: "bg-lime-100",
    text: "text-lime-700",
  },
  slate: {
    border: "border-slate-400",
    bg: "bg-slate-50/80",
    header: "bg-slate-200",
    text: "text-slate-700",
  },
};

const DEFAULT_COLORS = {
  border: "border-slate-300",
  bg: "bg-slate-50/80",
  header: "bg-slate-100",
  text: "text-slate-700",
};

function getColors(funcName: string) {
  const meta = FUNCTION_REGISTRY[funcName];
  if (meta && COLOR_MAP[meta.color]) return COLOR_MAP[meta.color];
  return DEFAULT_COLORS;
}

// ─── Attribute Pill ──────────────────────────────────────────────

function AttributePill({ block }: { block: Block }) {
  const removeBlock = useExpressionStore((s) => s.removeBlock);
  const updateBlockName = useExpressionStore((s) => s.updateBlockName);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>(
    { top: 0, left: 0 }
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return FLAT_ATTRIBUTES;
    return FLAT_ATTRIBUTES.filter(
      (a) =>
        a.label.toLowerCase().includes(q) || a.value.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Position the dropdown below the pill
  useLayoutEffect(() => {
    if (isSearchOpen && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSearchOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close on outside click (capture phase so it fires before canvas handlers)
  useEffect(() => {
    if (!isSearchOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      const inPill = pillRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inPill && !inDropdown) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [isSearchOpen]);

  const selectAttribute = useCallback(
    (value: string) => {
      updateBlockName(block.id, value);
      setIsSearchOpen(false);
      setSearchQuery("");
    },
    [block.id, updateBlockName]
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
        selectAttribute(filtered[highlightIdx].value);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    },
    [filtered, highlightIdx, selectAttribute]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isSearchOpen) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ type: block.type, name: block.name })
      );
      e.dataTransfer.effectAllowed = "copyMove";
    },
    [block, isSearchOpen]
  );

  // Stop wheel events from reaching the canvas (prevents zoom)
  const stopWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <div ref={pillRef} className="inline-block">
        <div
          draggable={!isSearchOpen}
          onDragStart={handleDragStart}
          onClick={() => {
            if (!isSearchOpen) {
              setIsSearchOpen(true);
            }
          }}
          className={`
            group inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-full
            bg-blue-100 border border-blue-300
            text-blue-700 text-sm font-medium
            cursor-pointer
            hover:bg-blue-200 hover:shadow-sm
            transition-all duration-150
            ${isSearchOpen ? "ring-2 ring-blue-400" : ""}
          `}
        >
          <Hash size={12} className="text-blue-400" />
          <span>{block.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            className="
              ml-1 opacity-0 group-hover:opacity-100
              hover:text-red-500 transition-opacity duration-150
            "
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Portal dropdown — rendered outside the canvas DOM so it's never clipped */}
      {isSearchOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            onWheel={stopWheel}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
            }}
            className="
            w-[350px] max-h-[240px]
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search attributes..."
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
            <div className="flex-1 overflow-y-auto" onWheel={stopWheel}>
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-400 text-center">
                  No attributes found
                </div>
              ) : (
                filtered.map((attr, idx) => (
                  <button
                    key={attr.value}
                    onClick={() => selectAttribute(attr.value)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    style={{ paddingLeft: `${10 + attr.depth * 14}px` }}
                    className={`
                    w-full flex items-center gap-2 pr-2.5 py-1.5 text-left
                    text-xs transition-colors
                    ${idx === highlightIdx ? "bg-blue-50" : "hover:bg-slate-50"}
                    ${attr.value === block.name ? "font-semibold" : ""}
                  `}
                    title={attr.value}
                  >
                    <Hash
                      size={10}
                      className={`shrink-0 ${
                        attr.depth > 0 ? "text-blue-300" : "text-blue-400"
                      }`}
                    />
                    <span className="text-slate-700 truncate">
                      {attr.label}
                    </span>
                    <span className="text-[9px] text-slate-300 ml-auto truncate max-w-[120px]">
                      {attr.value}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Literal type detection ──────────────────────────────────────

type LiteralType = "number" | "boolean" | "null" | "text";

function detectLiteralType(val: string): LiteralType {
  const upper = val.toUpperCase();
  if (upper === "TRUE" || upper === "FALSE") return "boolean";
  if (upper === "NULL") return "null";
  if (val !== "" && !isNaN(Number(val))) return "number";
  return "text";
}

const LITERAL_STYLES: Record<
  LiteralType,
  { pill: string; icon: string; input: string }
> = {
  number: {
    pill: "bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100",
    icon: "text-amber-400",
    input: "border border-amber-300 text-amber-800 focus:ring-amber-400",
  },
  boolean: {
    pill: "bg-violet-50 border border-violet-300 text-violet-700 hover:bg-violet-100",
    icon: "text-violet-400",
    input: "border border-violet-300 text-violet-800 focus:ring-violet-400",
  },
  null: {
    pill: "bg-slate-100 border border-slate-400 text-slate-500 hover:bg-slate-200",
    icon: "text-slate-400",
    input: "border border-slate-400 text-slate-600 focus:ring-slate-400",
  },
  text: {
    pill: "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100",
    icon: "text-green-400",
    input: "border border-green-300 text-green-800 focus:ring-green-400",
  },
};

function LiteralIcon({
  type,
  size = 12,
}: {
  type: LiteralType;
  size?: number;
}) {
  const cls = `${LITERAL_STYLES[type].icon} shrink-0`;
  switch (type) {
    case "number":
      return <Binary size={size} className={cls} />;
    case "boolean":
      return <ToggleLeft size={size} className={cls} />;
    case "null":
      return <CircleOff size={size} className={cls} />;
    default:
      return <Type size={size} className={cls} />;
  }
}

// ─── Literal Pill (editable) ─────────────────────────────────────

function LiteralPill({ block }: { block: Block }) {
  const removeBlock = useExpressionStore((s) => s.removeBlock);
  const updateBlockValue = useExpressionStore((s) => s.updateBlockValue);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.value ?? '""');
  const inputRef = useRef<HTMLInputElement>(null);

  const litType = detectLiteralType(block.value ?? '""');
  const styles = LITERAL_STYLES[litType];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ type: "LITERAL", name: "Literal", value: block.value })
      );
      e.dataTransfer.effectAllowed = "copyMove";
    },
    [block.value]
  );

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    updateBlockValue(block.id, editValue);
  }, [block.id, editValue, updateBlockValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") {
        setEditValue(block.value ?? '""');
        setIsEditing(false);
      }
    },
    [commitEdit, block.value]
  );

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      className={`
        group inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-lg
        text-sm font-mono
        cursor-grab active:cursor-grabbing
        hover:shadow-sm transition-all duration-150
        ${styles.pill}
      `}
    >
      <LiteralIcon type={litType} />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={`
            bg-white rounded px-1.5 py-0.5
            text-sm font-mono
            outline-none focus:ring-2
            min-w-[60px] max-w-[180px]
            ${styles.input}
          `}
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className="cursor-text select-none"
          title="Double-click to edit"
        >
          {block.value || '""'}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeBlock(block.id);
        }}
        className="
          ml-1 opacity-0 group-hover:opacity-100
          hover:text-red-500 transition-opacity duration-150 shrink-0
        "
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Function / Operator Block ───────────────────────────────────

function FunctionBlock({ block }: { block: Block }) {
  const removeBlock = useExpressionStore((s) => s.removeBlock);
  const toggleCollapse = useExpressionStore((s) => s.toggleCollapse);
  const addArgSlot = useExpressionStore((s) => s.addArgSlot);
  const removeArgSlot = useExpressionStore((s) => s.removeArgSlot);
  const meta = FUNCTION_REGISTRY[block.name];
  const colors = getColors(block.name);
  const argLabels = meta?.argLabels ?? block.args.map((_, i) => `Arg ${i + 1}`);
  const displayLabel = meta?.label ?? block.name;
  const isOperator = meta?.isInfix;
  const isVariadic = meta?.variadic;

  return (
    <div
      className={`
        rounded-xl border-2 ${colors.border} ${colors.bg}
        shadow-sm hover:shadow-md
        transition-shadow duration-200
        overflow-hidden
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2
          ${colors.header}
          border-b ${colors.border}
        `}
      >
        <GripVertical size={14} className="text-slate-400 cursor-grab" />
        <button
          onClick={() => toggleCollapse(block.id)}
          className="p-0.5 hover:bg-white/50 rounded transition-colors"
        >
          {block.isCollapsed ? (
            <ChevronRight size={14} className={colors.text} />
          ) : (
            <ChevronDown size={14} className={colors.text} />
          )}
        </button>
        {isOperator ? (
          <span className={`font-bold text-base ${colors.text} font-mono`}>
            {displayLabel}
          </span>
        ) : (
          <>
            <Braces size={14} className={colors.text} />
            <span className={`font-bold text-sm ${colors.text} tracking-wide`}>
              {displayLabel}
            </span>
          </>
        )}
        {meta?.description && (
          <span className="text-xs text-slate-400 ml-1 hidden sm:inline">
            — {meta.description}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(block.id);
          }}
          className="p-0.5 hover:bg-red-100 rounded transition-colors group/del"
        >
          <X
            size={14}
            className="text-slate-400 group-hover/del:text-red-500"
          />
        </button>
      </div>

      {/* Args Slots */}
      {!block.isCollapsed && (
        <div className="flex flex-col gap-2 p-3">
          {block.args.map((arg, index) => (
            <div key={arg?.id ?? `slot-${block.id}-${index}`}>
              <div className="flex items-center gap-1 mb-1">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {argLabels[index] ?? `String ${index + 1}`}
                </div>
                {isVariadic && block.args.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeArgSlot(block.id, index);
                    }}
                    className="ml-auto p-0.5 rounded hover:bg-red-100 transition-colors group/rm"
                    title="Remove this slot"
                  >
                    <Minus
                      size={10}
                      className="text-slate-300 group-hover/rm:text-red-500"
                    />
                  </button>
                )}
              </div>
              {arg ? (
                <BlockRenderer block={arg} />
              ) : (
                <DropZone
                  parentId={block.id}
                  slotIndex={index}
                  label={argLabels[index] ?? `String ${index + 1}`}
                  suggestions={meta?.argSuggestions?.[index]}
                />
              )}
            </div>
          ))}
          {/* Add slot button for variadic functions */}
          {isVariadic && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addArgSlot(block.id);
              }}
              className="
                flex items-center justify-center gap-1.5
                py-1.5 rounded-lg border border-dashed border-slate-300
                text-xs text-slate-400
                hover:border-slate-400 hover:text-slate-600 hover:bg-white/60
                transition-all duration-150
              "
            >
              <Plus size={12} />
              <span>Add argument</span>
            </button>
          )}
        </div>
      )}

      {/* Collapsed indicator */}
      {block.isCollapsed && (
        <div className="px-3 py-2 text-xs text-slate-400 italic">
          {block.args.filter(Boolean).length} / {block.args.length} slots filled
          — click to expand
        </div>
      )}
    </div>
  );
}

// ─── Main BlockRenderer ──────────────────────────────────────────

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  if (block.type === "ATTRIBUTE") {
    return <AttributePill block={block} />;
  }
  if (block.type === "LITERAL") {
    return <LiteralPill block={block} />;
  }
  return <FunctionBlock block={block} />;
}
