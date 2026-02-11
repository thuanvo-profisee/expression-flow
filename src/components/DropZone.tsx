import { useState, useCallback } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useExpressionStore } from '../store';
import type { DragItem } from '../types';

interface DropZoneProps {
  parentId: string;
  slotIndex: number;
  label: string;
  /** Optional suggested literal values shown as clickable chips */
  suggestions?: string[];
}

export function DropZone({ parentId, slotIndex, label, suggestions }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addBlock = useExpressionStore((s) => s.addBlock);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const item: DragItem = JSON.parse(raw);
        addBlock(parentId, slotIndex, item);
      } catch {
        // ignore bad drag data
      }
    },
    [parentId, slotIndex, addBlock],
  );

  const handleSuggestionClick = useCallback(
    (value: string) => {
      const item: DragItem = { type: 'LITERAL', name: 'Literal', value };
      addBlock(parentId, slotIndex, item);
    },
    [parentId, slotIndex, addBlock],
  );

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="flex flex-col gap-0">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={hasSuggestions ? () => setShowSuggestions((v) => !v) : undefined}
        className={`
          relative flex items-center justify-center
          min-h-[44px] border-2 border-dashed
          transition-all duration-200 select-none
          ${hasSuggestions ? 'cursor-pointer' : 'cursor-default'}
          ${showSuggestions ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'}
          ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-50 scale-[1.02] drop-active'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          }
        `}
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Plus size={14} />
          <span>Drop {label} here</span>
          {hasSuggestions && (
            <span className="ml-1 flex items-center gap-0.5 text-teal-500">
              {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          )}
        </div>
      </div>

      {/* Suggestion chips */}
      {hasSuggestions && showSuggestions && (
        <div className="
          flex flex-wrap gap-1 p-2
          bg-slate-50 border-2 border-dashed border-t-0 border-slate-300
          rounded-b-lg
        ">
          {suggestions.map((value) => (
            <button
              key={value}
              onClick={(e) => { e.stopPropagation(); handleSuggestionClick(value); }}
              className="
                px-2 py-0.5 rounded text-[11px] font-mono
                bg-teal-50 border border-teal-200 text-teal-600
                hover:border-teal-400 hover:bg-teal-100 hover:text-teal-700
                transition-all duration-150
              "
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
