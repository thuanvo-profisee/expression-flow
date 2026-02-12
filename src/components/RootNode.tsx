import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
    ShieldCheck,
    ArrowRightLeft,
    Trash2,
    Plus,
    BookOpen,
    Clipboard,
    FileText,
    AlertCircle,
    Upload,
    X,
} from "lucide-react";
import type { Block, BlockConfig, DragItem } from "../types";
import { EXPRESSION_MODE_META } from "../types";
import { useExpressionStore } from "../store";
import { BlockRenderer } from "./BlockRenderer";
import { parseExpressionToBlock } from "../parser";

// ─── Import Expression Area ──────────────────────────────────────

function ImportExpressionArea({
    rootIndex,
    onClose,
    isValidation,
}: {
    rootIndex: number;
    onClose: () => void;
    isValidation: boolean;
}) {
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const setRoot = useExpressionStore((s) => s.setRoot);

    const handleImport = () => {
        const trimmed = text.trim();
        if (!trimmed) {
            setError("Please enter an expression");
            return;
        }
        try {
            const block = parseExpressionToBlock(trimmed);
            if (!block) {
                setError("Expression is empty");
                return;
            }
            setRoot(rootIndex, block);
            onClose();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to parse expression",
            );
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleImport();
        }
        if (e.key === "Escape") {
            onClose();
        }
    };

    // Stop wheel / pointer events from reaching ReactFlow so that
    // scrolling, text-selection and textarea-resize work without
    // accidentally dragging the node or zooming the canvas.
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const stopWheel = (e: WheelEvent) => e.stopPropagation();
        const stopPointer = (e: PointerEvent | MouseEvent) =>
            e.stopPropagation();

        el.addEventListener("wheel", stopWheel, {
            capture: true,
            passive: false,
        });
        el.addEventListener("pointerdown", stopPointer, { capture: true });
        el.addEventListener("mousedown", stopPointer, { capture: true });
        return () => {
            el.removeEventListener("wheel", stopWheel, { capture: true });
            el.removeEventListener("pointerdown", stopPointer, {
                capture: true,
            });
            el.removeEventListener("mousedown", stopPointer, {
                capture: true,
            });
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={`
      border-x-2 px-4 py-3 space-y-2.5
      bg-gradient-to-b from-slate-50 to-white
      ${isValidation ? "border-amber-300" : "border-indigo-300"}
    `}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Import from expression
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-slate-100 transition-colors"
                    title="Cancel"
                >
                    <X size={12} className="text-slate-400" />
                </button>
            </div>

            <textarea
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                    "Paste expression, e.g.\n" +
                    (isValidation
                        ? "[Code] = CONCAT([Class].[Name], [Color].[Name])"
                        : 'IF(LENGTH([Name]) > 0, [Name], "")')
                }
                autoFocus
                rows={3}
                className="
          w-full px-3 py-2 rounded-lg
          border border-slate-200 bg-white
          text-xs font-mono text-slate-700 leading-relaxed
          placeholder:text-slate-300
          focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300
          resize-y min-h-[60px] max-h-[200px]
        "
            />

            {error && (
                <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle
                        size={12}
                        className="text-red-400 shrink-0 mt-0.5"
                    />
                    <span className="text-[11px] text-red-600 leading-snug">
                        {error}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={handleImport}
                    className={`
            flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-semibold text-white
            transition-all duration-150
            ${
                isValidation
                    ? "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-200"
                    : "bg-indigo-500 hover:bg-indigo-600 shadow-sm shadow-indigo-200"
            }
          `}
                >
                    <Upload size={12} />
                    Import
                </button>
                <button
                    onClick={onClose}
                    className="
            px-3 py-1.5 rounded-lg
            text-xs font-medium text-slate-500
            hover:bg-slate-100 hover:text-slate-700
            transition-all duration-150
          "
                >
                    Cancel
                </button>
                <span className="text-[9px] text-slate-300 ml-auto">
                    Ctrl+Enter to import
                </span>
            </div>
        </div>
    );
}

// ─── Root Drop Zone (shown when canvas is empty) ─────────────────

function RootDropZone({
    config,
    rootIndex,
    onOpenImport,
}: {
    config: BlockConfig;
    rootIndex: number;
    onOpenImport: () => void;
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const setRootFromDrop = useExpressionStore((s) => s.setRootFromDrop);
    const clipboard = useExpressionStore((s) => s.clipboard);
    const pasteToRoot = useExpressionStore((s) => s.pasteToRoot);
    const modeMeta = EXPRESSION_MODE_META[config.expressionMode];

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
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
                const raw = e.dataTransfer.getData("application/json");
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
        transition-all duration-200 select-none p-3
        ${
            isDragOver
                ? "border-indigo-400 bg-indigo-50/80 scale-[1.01]"
                : "border-slate-300 bg-white/60 hover:border-slate-400"
        }
      `}
        >
            <div
                className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${isDragOver ? "bg-indigo-100" : "bg-slate-100"}
      `}
            >
                <Plus
                    size={20}
                    className={
                        isDragOver ? "text-indigo-500" : "text-slate-400"
                    }
                />
            </div>
            <div className="text-center">
                <div className="text-sm font-medium text-slate-500">
                    Drop an expression here
                </div>
                <div className="text-xs text-slate-400 mt-0.5 px-10">
                    {config.expressionMode === "validation"
                        ? "Start with a comparison operator (=, >, <, ...) or a logical function (AND, OR, ...)"
                        : "Start with a function (IF, CONCAT, ...) or a data attribute"}
                </div>
            </div>
            <div className="text-[10px] text-slate-300 mt-1">
                e.g. {modeMeta.example}
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-2 mt-1">
                {clipboard && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pasteToRoot(rootIndex);
                        }}
                        className="
              flex items-center gap-1.5
              px-3 py-1.5 rounded-full
              bg-blue-100 border border-blue-300 text-blue-600
              hover:bg-blue-200 hover:text-blue-700
              text-xs font-medium
              transition-all duration-150
            "
                        title="Paste from clipboard"
                    >
                        <Clipboard size={12} />
                        Paste
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenImport();
                    }}
                    className="
            flex items-center gap-1.5
            px-3 py-1.5 rounded-full
            bg-violet-100 border border-violet-300 text-violet-600
            hover:bg-violet-200 hover:text-violet-700
            text-xs font-medium
            transition-all duration-150
          "
                    title="Import from expression text"
                >
                    <FileText size={12} />
                    Paste Expression
                </button>
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
    const { root, blockConfig, rootIndex, totalBlocks } =
        data as unknown as RootNodeData;
    const clearRoot = useExpressionStore((s) => s.clearRoot);
    const loadDemo = useExpressionStore((s) => s.loadDemo);
    const modeMeta = EXPRESSION_MODE_META[blockConfig.expressionMode];

    const isValidation = blockConfig.expressionMode === "validation";
    const isFirst = rootIndex === 0;
    const isLast = rootIndex === totalBlocks - 1;

    const [showImport, setShowImport] = useState(false);

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
            <div
                className={`
        rounded-t-xl border-2 border-b-0 px-4 py-2.5
        flex items-center gap-2
        ${
            isValidation
                ? "border-amber-300 bg-amber-50"
                : "border-indigo-300 bg-indigo-50"
        }
      `}
            >
                {isValidation ? (
                    <ShieldCheck size={16} className="text-amber-600" />
                ) : (
                    <ArrowRightLeft size={16} className="text-indigo-600" />
                )}
                <div className="flex-1 min-w-0">
                    <div
                        className={`text-sm font-bold ${isValidation ? "text-amber-700" : "text-indigo-700"}`}
                    >
                        {blockConfig.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                        Returns: {modeMeta.returnType}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowImport(!showImport)}
                        className={`p-1.5 rounded-lg transition-colors group/import ${
                            showImport
                                ? isValidation
                                    ? "bg-amber-200/80"
                                    : "bg-indigo-200/80"
                                : "hover:bg-white/60"
                        }`}
                        title="Import expression from text"
                    >
                        <FileText
                            size={14}
                            className={`${
                                showImport
                                    ? isValidation
                                        ? "text-amber-600"
                                        : "text-indigo-600"
                                    : "text-slate-400 group-hover/import:text-slate-600"
                            }`}
                        />
                    </button>
                    <button
                        onClick={() => loadDemo(rootIndex)}
                        className="p-1.5 rounded-lg hover:bg-white/60 transition-colors group/demo"
                        title="Load example"
                    >
                        <BookOpen
                            size={14}
                            className="text-slate-400 group-hover/demo:text-slate-600"
                        />
                    </button>
                    {root && (
                        <button
                            onClick={() => clearRoot(rootIndex)}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors group/clear"
                            title="Clear expression"
                        >
                            <Trash2
                                size={14}
                                className="text-slate-400 group-hover/clear:text-red-500"
                            />
                        </button>
                    )}
                </div>
            </div>

            {/* Import expression area (inline, between header and body) */}
            {showImport && (
                <ImportExpressionArea
                    rootIndex={rootIndex}
                    onClose={() => setShowImport(false)}
                    isValidation={isValidation}
                />
            )}

            {/* Expression body */}
            <div
                className={`
        rounded-b-xl border-2 border-t-0 p-4 bg-white/80 backdrop-blur-sm
        ${isValidation ? "border-amber-300" : "border-indigo-300"}
      `}
            >
                {root ? (
                    <BlockRenderer block={root} />
                ) : (
                    <RootDropZone
                        config={blockConfig}
                        rootIndex={rootIndex}
                        onOpenImport={() => setShowImport(true)}
                    />
                )}
            </div>
        </div>
    );
}

export const RootNode = memo(RootNodeInner);
