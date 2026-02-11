import { useCallback, useState } from 'react';
import {
  GripVertical,
  Braces,
  Sparkles,
  ShieldCheck,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Zap,
  Type,
  Calendar,
  History,
  ArrowLeftRight,
  ListFilter,
  Scale,
  Calculator,
  Search,
} from 'lucide-react';
import type { DragItem, FunctionMeta, FunctionSubcategory, ExpressionMode } from '../types';
import { getFunctionsBySubcategory, SUBCATEGORY_ORDER, EXPRESSION_MODE_META } from '../types';
import { useExpressionStore } from '../store';

// ─── Icon resolver ───────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Type, Calendar, History,
  ArrowRightLeft: ArrowLeftRight,
  ListFilter, Scale, Calculator,
  Braces,
};

function SubcategoryIcon({ name, size = 12 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Braces;
  return <Icon size={size} />;
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

// ─── Function card (compact) ────────────────────────────────────

function FunctionCard({ meta }: { meta: FunctionMeta }) {
  const item: DragItem = { type: 'FUNCTION', name: meta.name };
  const argCount = meta.argLabels.length;
  const isZeroArg = argCount === 0;

  return (
    <DraggableItem item={item}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-md border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-150 group">
        <GripVertical size={10} className="text-slate-300 group-hover:text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
          {meta.description && (
            <span className="text-[9px] text-slate-400 ml-1 hidden group-hover:inline">
              — {meta.description}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded shrink-0">
          {isZeroArg ? 'const' : `${argCount}`}
        </span>
      </div>
    </DraggableItem>
  );
}

// ─── Operator chip ──────────────────────────────────────────────

function OperatorChip({ meta }: { meta: FunctionMeta }) {
  const item: DragItem = { type: 'FUNCTION', name: meta.name };
  return (
    <DraggableItem item={item}>
      <div
        className="
          flex items-center justify-center
          min-w-[36px] h-9 px-2 rounded-md
          bg-white border border-slate-200
          hover:border-emerald-300 hover:shadow-sm
          transition-all duration-150
          font-mono font-bold text-sm text-slate-700
          hover:text-emerald-700
        "
        title={meta.description}
      >
        {meta.label}
      </div>
    </DraggableItem>
  );
}

// ─── Collapsible Section ────────────────────────────────────────

function Section({
  subcategory,
  label,
  iconName,
  functions,
  defaultOpen = true,
}: {
  subcategory: FunctionSubcategory;
  label: string;
  iconName: string;
  functions: FunctionMeta[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOperatorGrid = subcategory === 'comparison' || subcategory === 'arithmetic';

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <SubcategoryIcon name={iconName} size={10} />
        <span>{label}</span>
        <span className="text-slate-300 ml-auto font-normal normal-case">{functions.length}</span>
      </button>
      {open && (
        isOperatorGrid ? (
          <div className="flex flex-wrap gap-1 mb-2">
            {functions.map((m) => <OperatorChip key={m.name} meta={m} />)}
          </div>
        ) : (
          <div className="space-y-1 mb-2">
            {functions.map((m) => <FunctionCard key={m.name} meta={m} />)}
          </div>
        )
      )}
    </div>
  );
}

// ─── Mode Toggle ────────────────────────────────────────────────

function ModeToggle() {
  const mode = useExpressionStore((s) => s.expressionMode);
  const setMode = useExpressionStore((s) => s.setExpressionMode);

  return (
    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80">
      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Expression Type
      </div>
      <div className="flex gap-0.5 p-0.5 bg-slate-200/60 rounded-lg">
        {(['validation', 'assignment'] as ExpressionMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`
              flex-1 flex items-center justify-center gap-1
              px-2 py-1.5 rounded-md text-[10px] font-semibold
              transition-all duration-200
              ${mode === m
                ? (m === 'validation' ? 'bg-white text-amber-700 shadow-sm' : 'bg-white text-indigo-700 shadow-sm')
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
              }
            `}
          >
            {m === 'validation' ? <ShieldCheck size={11} /> : <ArrowRightLeft size={11} />}
            {EXPRESSION_MODE_META[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Functions Panel (Left) ─────────────────────────────────────

export function FunctionsPanel() {
  const [search, setSearch] = useState('');
  const lowerSearch = search.toLowerCase().trim();

  return (
    <div className="w-[280px] h-full flex flex-col bg-white border-r border-slate-200 shrink-0">
      {/* Title */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-600">
        <Sparkles size={16} className="text-white" />
        <h1 className="text-sm font-bold text-white tracking-tight">Expression Flow</h1>
      </div>

      {/* Mode Toggle */}
      <ModeToggle />

      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
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
                (f.description ?? '').toLowerCase().includes(lowerSearch),
            );
          }
          if (funcs.length === 0) return null;
          return (
            <Section
              key={key}
              subcategory={key}
              label={label}
              iconName={icon}
              functions={funcs}
              defaultOpen={!lowerSearch ? key === 'logic' || key === 'comparison' : true}
            />
          );
        })}
      </div>
    </div>
  );
}
