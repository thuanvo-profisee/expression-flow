import { useCallback, useState } from 'react';
import {
  Database,
  Hash,
  Code2,
  Type,
  Plus,
  Search,
} from 'lucide-react';
import type { DragItem } from '../types';
import { useExpressionStore, generateCode } from '../store';

// ─── Data Attributes Catalog ─────────────────────────────────────
const DATA_ATTRIBUTES: string[] = [
  '[SnOPComputeArchGrp]',
  '[ForecastMktSegment]',
  '[MktSegment]',
  '[MarketingCdNm]',
  '[CreatedBy]',
  '[SnOPSupplyProduct]',
  '[ProductGroup]',
  '[Region]',
  '[SalesOrg]',
  '[FiscalYear]',
  '[Currency]',
  '[UnitOfMeasure]',
];

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

// ─── Attribute Pill ─────────────────────────────────────────────

function AttributeItem({ name }: { name: string }) {
  const item: DragItem = { type: 'ATTRIBUTE', name };
  return (
    <DraggableItem item={item}>
      <div className="
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
        border text-xs font-medium
        hover:shadow-sm transition-all duration-150
        bg-blue-50 border-blue-200 text-blue-600 hover:border-blue-300
      ">
        <Hash size={10} className="text-blue-400 shrink-0" />
        <span className="truncate">{name}</span>
      </div>
    </DraggableItem>
  );
}

// ─── Custom Value Input ─────────────────────────────────────────

function CustomValueInput() {
  const [inputValue, setInputValue] = useState('');

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const val = inputValue.trim();
      if (!val) { e.preventDefault(); return; }
      const item: DragItem = { type: 'LITERAL', name: 'Literal', value: val };
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [inputValue],
  );

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder='e.g. "hello" or 42'
        className="
          w-full px-2.5 py-1.5 rounded-md
          border border-slate-200 bg-white
          text-xs font-mono text-slate-700
          placeholder:text-slate-300
          focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400
        "
      />
      {inputValue.trim() && (
        <div
          draggable
          onDragStart={handleDragStart}
          className="
            inline-flex items-center gap-1.5
            px-2.5 py-1.5 rounded-md
            bg-green-50 border border-green-300
            text-green-700 text-xs font-mono
            cursor-grab active:cursor-grabbing
            hover:bg-green-100 hover:shadow-sm
            transition-all duration-150
          "
        >
          <Type size={10} className="text-green-400" />
          <span>{inputValue.trim()}</span>
          <span className="text-[9px] text-green-400 ml-1">drag me</span>
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

  const filtered = lowerSearch
    ? DATA_ATTRIBUTES.filter((a) => a.toLowerCase().includes(lowerSearch))
    : DATA_ATTRIBUTES;

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

        {/* Data Attributes */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <Database size={10} />
            <span>Attributes</span>
            <span className="text-slate-300 ml-auto font-normal normal-case">{filtered.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((name) => (
              <AttributeItem key={name} name={name} />
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-slate-400 italic">No matches</div>
            )}
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
