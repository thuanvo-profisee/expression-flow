import { useCallback, useState } from 'react';
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
} from 'lucide-react';
import type { DragItem, AttributeNode } from '../types';
import { ATTRIBUTE_CATALOG } from '../types';
import { useExpressionStore, generateCode } from '../store';

// ─── Helpers ────────────────────────────────────────────────────

/** Check if a node or any descendant matches the search */
function nodeMatchesSearch(node: AttributeNode, search: string): boolean {
  if (node.label.toLowerCase().includes(search)) return true;
  if (node.value.toLowerCase().includes(search)) return true;
  return (node.children ?? []).some((c) => nodeMatchesSearch(c, search));
}

// ─── Draggable wrapper ──────────────────────────────────────────

function DraggableItem({ item, children }: { item: DragItem; children: React.ReactNode }) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
      const el = e.currentTarget as HTMLElement;
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
    },
    [item],
  );
  return (
    <div draggable onDragStart={handleDragStart} className="cursor-grab active:cursor-grabbing">
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
  const item: DragItem = { type: 'ATTRIBUTE', name: node.value };

  // When searching, auto-expand matching branches
  const isSearching = search.length > 0;
  const showExpanded = isSearching ? nodeMatchesSearch(node, search) : expanded;
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
              <ChevronRight size={12} className="text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-[20px] shrink-0" />
        )}

        {/* Draggable pill */}
        <DraggableItem item={item}>
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-md
            border text-xs font-medium
            hover:shadow-sm transition-all duration-150
            ${labelMatches && isSearching
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-blue-50 border-blue-200 text-blue-600 hover:border-blue-300'
            }
          `}>
            <GripVertical size={9} className="text-blue-300 opacity-0 group-hover:opacity-100 shrink-0" />
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
          <span className="text-[8px] text-slate-300 ml-1 opacity-0 group-hover:opacity-100 truncate max-w-[80px] transition-opacity" title={node.value}>
            {node.value}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && showExpanded && (
        <div className="mt-0.5">
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
const KEYWORD_VALUES = new Set(['TRUE', 'FALSE', 'NULL']);

/** Detect value type: number, text, or keyword */
function detectValueType(raw: string): 'number' | 'text' | 'keyword' {
  if (KEYWORD_VALUES.has(raw.toUpperCase())) return 'keyword';
  if (raw !== '' && !isNaN(Number(raw))) return 'number';
  return 'text';
}

/** Resolve the literal value for codegen — auto-wraps text in quotes */
function resolveLiteralValue(raw: string): string {
  const type = detectValueType(raw);
  if (type === 'number') return raw;
  if (type === 'keyword') return raw.toUpperCase();
  // Text: wrap in quotes unless user already added them
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw;
  }
  return `"${raw}"`;
}

function CustomValueInput() {
  const [inputValue, setInputValue] = useState('');

  const trimmed = inputValue.trim();
  const valueType = trimmed ? detectValueType(trimmed) : null;
  const resolvedValue = trimmed ? resolveLiteralValue(trimmed) : '';

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!resolvedValue) { e.preventDefault(); return; }
      const item: DragItem = { type: 'LITERAL', name: 'Literal', value: resolvedValue };
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [resolvedValue],
  );

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder='e.g. hello or 42'
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
              ${valueType === 'number'
                ? 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100'
                : 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
              }
            `}
          >
            {valueType === 'number'
              ? <Binary size={10} className="text-amber-400" />
              : <Type size={10} className="text-green-400" />
            }
            <span>{resolvedValue}</span>
            <span className={`text-[9px] ml-1 ${valueType === 'number' ? 'text-amber-400' : 'text-green-400'}`}>drag me</span>
          </div>
          <span className={`
            text-[9px] font-semibold px-1.5 py-0.5 rounded
            ${valueType === 'number'
              ? 'bg-amber-100 text-amber-600'
              : valueType === 'keyword'
                ? 'bg-violet-100 text-violet-600'
                : 'bg-green-100 text-green-600'
            }
          `}>
            {valueType === 'number' ? 'Number' : valueType === 'keyword' ? 'Keyword' : 'Text'}
          </span>
        </div>
      )}
      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {([['""', '""'], ['" "', 'SPACE'], ['0', '0'], ['1', '1'], ['TRUE', 'TRUE'], ['FALSE', 'FALSE'], ['NULL', 'NULL']] as [string, string][]).map(([value, label]) => {
          const item: DragItem = { type: 'LITERAL', name: 'Literal', value };
          return (
            <DraggableItem key={value} item={item}>
              <div className="
                px-1.5 py-0.5 rounded text-[10px] font-mono
                bg-slate-100 border border-slate-200 text-slate-500
                hover:border-green-300 hover:text-green-600 hover:bg-green-50
                transition-all duration-150
              " title={`Value: ${value}`}>
                {label}
              </div>
            </DraggableItem>
          );
        })}
      </div>
    </div>
  );
}

// ─── Attributes Panel (Right) ───────────────────────────────────

export function AttributesPanel() {
  const root = useExpressionStore((s) => s.root);
  const expressionMode = useExpressionStore((s) => s.expressionMode);
  const [search, setSearch] = useState('');
  const lowerSearch = search.toLowerCase().trim();

  return (
    <div className="w-[260px] h-full flex flex-col bg-white border-l border-slate-200 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-cyan-500">
        <Database size={16} className="text-white" />
        <h2 className="text-sm font-bold text-white tracking-tight">Data & Values</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attributes..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        {/* Data Attributes Tree */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <Database size={10} />
            <span>Attributes</span>
            <span className="text-slate-300 ml-auto font-normal normal-case">{ATTRIBUTE_CATALOG.length}</span>
          </div>
          <div className="space-y-0.5">
            {ATTRIBUTE_CATALOG.map((node) => (
              <AttributeTreeNode
                key={node.id}
                node={node}
                depth={0}
                search={lowerSearch}
              />
            ))}
          </div>
        </div>

        {/* Custom Value */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <Plus size={10} />
            <span>Custom Value</span>
          </div>
          <CustomValueInput />
        </div>
      </div>

      {/* Generated Code Panel */}
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <Code2 size={12} className="text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Generated
          </span>
          <div className="flex-1" />
          <span className={`
            text-[9px] font-semibold px-1.5 py-0.5 rounded
            ${expressionMode === 'validation'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-indigo-100 text-indigo-600'
            }
          `}>
            {expressionMode === 'validation' ? 'bool' : 'value'}
          </span>
        </div>
        <div className="px-3 pb-3">
          <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
            {generateCode(root)}
          </pre>
        </div>
      </div>
    </div>
  );
}
