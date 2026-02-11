import { useCallback, useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import type { Block } from '../types';
import { FUNCTION_REGISTRY } from '../types';
import { useExpressionStore } from '../store';
import { DropZone } from './DropZone';

// ─── Color Mapping ───────────────────────────────────────────────
const COLOR_MAP: Record<string, { border: string; bg: string; header: string; text: string }> = {
  indigo:  { border: 'border-indigo-300',  bg: 'bg-indigo-50/80',  header: 'bg-indigo-100', text: 'text-indigo-700' },
  emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50/80', header: 'bg-emerald-100', text: 'text-emerald-700' },
  amber:   { border: 'border-amber-300',   bg: 'bg-amber-50/80',   header: 'bg-amber-100', text: 'text-amber-700' },
  rose:    { border: 'border-rose-300',     bg: 'bg-rose-50/80',    header: 'bg-rose-100', text: 'text-rose-700' },
  purple:  { border: 'border-purple-300',   bg: 'bg-purple-50/80',  header: 'bg-purple-100', text: 'text-purple-700' },
  cyan:    { border: 'border-cyan-300',     bg: 'bg-cyan-50/80',    header: 'bg-cyan-100', text: 'text-cyan-700' },
  teal:    { border: 'border-teal-300',     bg: 'bg-teal-50/80',    header: 'bg-teal-100', text: 'text-teal-700' },
  pink:    { border: 'border-pink-300',     bg: 'bg-pink-50/80',    header: 'bg-pink-100', text: 'text-pink-700' },
  orange:  { border: 'border-orange-300',   bg: 'bg-orange-50/80',  header: 'bg-orange-100', text: 'text-orange-700' },
  sky:     { border: 'border-sky-300',      bg: 'bg-sky-50/80',     header: 'bg-sky-100', text: 'text-sky-700' },
  violet:  { border: 'border-violet-300',   bg: 'bg-violet-50/80',  header: 'bg-violet-100', text: 'text-violet-700' },
  lime:    { border: 'border-lime-400',     bg: 'bg-lime-50/80',    header: 'bg-lime-100', text: 'text-lime-700' },
  slate:   { border: 'border-slate-400',    bg: 'bg-slate-50/80',   header: 'bg-slate-200', text: 'text-slate-700' },
};

const DEFAULT_COLORS = { border: 'border-slate-300', bg: 'bg-slate-50/80', header: 'bg-slate-100', text: 'text-slate-700' };

function getColors(funcName: string) {
  const meta = FUNCTION_REGISTRY[funcName];
  if (meta && COLOR_MAP[meta.color]) return COLOR_MAP[meta.color];
  return DEFAULT_COLORS;
}

// ─── Attribute Pill ──────────────────────────────────────────────

function AttributePill({ block }: { block: Block }) {
  const removeBlock = useExpressionStore((s) => s.removeBlock);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ type: block.type, name: block.name }),
      );
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    [block],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="
        group inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-full
        bg-blue-100 border border-blue-300
        text-blue-700 text-sm font-medium
        cursor-grab active:cursor-grabbing
        hover:bg-blue-200 hover:shadow-sm
        transition-all duration-150
      "
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
  );
}

// ─── Literal Pill (editable) ─────────────────────────────────────

function LiteralPill({ block }: { block: Block }) {
  const removeBlock = useExpressionStore((s) => s.removeBlock);
  const updateBlockValue = useExpressionStore((s) => s.updateBlockValue);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.value ?? '""');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ type: 'LITERAL', name: 'Literal', value: block.value }),
      );
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    [block.value],
  );

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    updateBlockValue(block.id, editValue);
  }, [block.id, editValue, updateBlockValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') {
        setEditValue(block.value ?? '""');
        setIsEditing(false);
      }
    },
    [commitEdit, block.value],
  );

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      className="
        group inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-lg
        bg-green-50 border border-green-300
        text-green-700 text-sm font-mono
        cursor-grab active:cursor-grabbing
        hover:bg-green-100 hover:shadow-sm
        transition-all duration-150
      "
    >
      <Type size={12} className="text-green-400 shrink-0" />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="
            bg-white border border-green-300 rounded px-1.5 py-0.5
            text-sm font-mono text-green-800
            outline-none focus:ring-2 focus:ring-green-400
            min-w-[60px] max-w-[180px]
          "
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
          <X size={14} className="text-slate-400 group-hover/del:text-red-500" />
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
                    onClick={(e) => { e.stopPropagation(); removeArgSlot(block.id, index); }}
                    className="ml-auto p-0.5 rounded hover:bg-red-100 transition-colors group/rm"
                    title="Remove this slot"
                  >
                    <Minus size={10} className="text-slate-300 group-hover/rm:text-red-500" />
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
                />
              )}
            </div>
          ))}
          {/* Add slot button for variadic functions */}
          {isVariadic && (
            <button
              onClick={(e) => { e.stopPropagation(); addArgSlot(block.id); }}
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
          {block.args.filter(Boolean).length} / {block.args.length} slots filled — click to expand
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
  if (block.type === 'ATTRIBUTE') {
    return <AttributePill block={block} />;
  }
  if (block.type === 'LITERAL') {
    return <LiteralPill block={block} />;
  }
  return <FunctionBlock block={block} />;
}
