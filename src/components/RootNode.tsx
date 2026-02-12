import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  ShieldCheck,
  ArrowRightLeft,
  Trash2,
  Plus,
  BookOpen,
} from 'lucide-react';
import type { Block, BlockConfig, DragItem } from '../types';
import { EXPRESSION_MODE_META } from '../types';
import { useExpressionStore } from '../store';
import { BlockRenderer } from './BlockRenderer';

// ─── Root Drop Zone (shown when canvas is empty) ─────────────────

function RootDropZone({ config, rootIndex }: { config: BlockConfig; rootIndex: number }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const setRootFromDrop = useExpressionStore((s) => s.setRootFromDrop);
  const modeMeta = EXPRESSION_MODE_META[config.expressionMode];

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
        setRootFromDrop(rootIndex, item);
      } catch {
        // ignore
      }
    },
    [setRootFromDrop, rootIndex],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col items-center justify-center gap-3
        min-h-[140px] rounded-xl border-2 border-dashed
        transition-all duration-200 select-none
        ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-50/80 scale-[1.01]'
            : 'border-slate-300 bg-white/60 hover:border-slate-400'
        }
      `}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${isDragOver ? 'bg-indigo-100' : 'bg-slate-100'}
      `}>
        <Plus size={20} className={isDragOver ? 'text-indigo-500' : 'text-slate-400'} />
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-slate-500">
          Drop an expression here
        </div>
        <div className="text-xs text-slate-400 mt-0.5 px-10">
          {config.expressionMode === 'validation'
            ? 'Start with a comparison operator (=, >, <, ...) or a logical function (AND, OR, ...)'
            : 'Start with a function (IF, CONCAT, ...) or a data attribute'}
        </div>
      </div>
      <div className="text-[10px] text-slate-300 mt-1">
        e.g. {modeMeta.example}
      </div>
    </div>
  );
}

// ─── Root Node (React Flow custom node) ──────────────────────────

type RootNodeData = {
  root: Block | null;
  blockConfig: BlockConfig;
  rootIndex: number;
  totalBlocks: number;
};

function RootNodeInner({ data }: NodeProps) {
  const { root, blockConfig, rootIndex, totalBlocks } = data as unknown as RootNodeData;
  const clearRoot = useExpressionStore((s) => s.clearRoot);
  const loadDemo = useExpressionStore((s) => s.loadDemo);
  const modeMeta = EXPRESSION_MODE_META[blockConfig.expressionMode];

  const isValidation = blockConfig.expressionMode === 'validation';
  const isFirst = rootIndex === 0;
  const isLast = rootIndex === totalBlocks - 1;

  return (
    <div className="min-w-[340px] max-w-[620px] relative">
      {/* Left handle — shown on every block except the first */}
      {!isFirst && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white !-left-1.5"
        />
      )}

      {/* Right handle — shown on every block except the last */}
      {!isLast && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white !-right-1.5"
        />
      )}

      {/* Mode header card */}
      <div className={`
        rounded-t-xl border-2 border-b-0 px-4 py-2.5
        flex items-center gap-2
        ${isValidation
          ? 'border-amber-300 bg-amber-50'
          : 'border-indigo-300 bg-indigo-50'
        }
      `}>
        {isValidation ? (
          <ShieldCheck size={16} className="text-amber-600" />
        ) : (
          <ArrowRightLeft size={16} className="text-indigo-600" />
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${isValidation ? 'text-amber-700' : 'text-indigo-700'}`}>
            {blockConfig.name}
          </div>
          <div className="text-[10px] text-slate-400">
            Returns: {modeMeta.returnType}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => loadDemo(rootIndex)}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-colors group/demo"
            title="Load example"
          >
            <BookOpen size={14} className="text-slate-400 group-hover/demo:text-slate-600" />
          </button>
          {root && (
            <button
              onClick={() => clearRoot(rootIndex)}
              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors group/clear"
              title="Clear expression"
            >
              <Trash2 size={14} className="text-slate-400 group-hover/clear:text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Expression body */}
      <div className={`
        rounded-b-xl border-2 border-t-0 p-4 bg-white/80 backdrop-blur-sm
        ${isValidation ? 'border-amber-300' : 'border-indigo-300'}
      `}>
        {root ? (
          <BlockRenderer block={root} />
        ) : (
          <RootDropZone config={blockConfig} rootIndex={rootIndex} />
        )}
      </div>
    </div>
  );
}

export const RootNode = memo(RootNodeInner);
