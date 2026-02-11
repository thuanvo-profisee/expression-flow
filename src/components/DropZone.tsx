import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useExpressionStore } from '../store';
import type { DragItem } from '../types';

interface DropZoneProps {
  parentId: string;
  slotIndex: number;
  label: string;
}

export function DropZone({ parentId, slotIndex, label }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex items-center justify-center
        min-h-[44px] rounded-lg border-2 border-dashed
        transition-all duration-200 cursor-pointer select-none
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
      </div>
    </div>
  );
}
