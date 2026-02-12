import { useState, useMemo, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    applyNodeChanges,
    type Node,
    type Edge,
    type NodeChange,
    type NodeTypes,
    BackgroundVariant,
} from "@xyflow/react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useExpressionStore, setReactFlowInstance } from "../store";
import type { Block, BlockConfig } from "../types";
import { RootNode } from "./RootNode";

function buildNodes(
    roots: (Block | null)[],
    blockConfigs: BlockConfig[],
    prevNodes?: Node[],
): Node[] {
    const total = blockConfigs.length;
    return blockConfigs.map((cfg, index) => {
        const existing = prevNodes?.[index];
        return {
            id: `root-wrapper-${index}`,
            type: "rootNode",
            position: existing?.position ?? { x: 50 + index * 720, y: 50 },
            data: {
                root: roots[index] ?? null,
                blockConfig: cfg,
                rootIndex: index,
                totalBlocks: total,
            },
            draggable: true,
        };
    });
}

/** Build edges that chain consecutive blocks: 0→1, 1→2, … */
function buildEdges(blockConfigs: BlockConfig[]): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < blockConfigs.length - 1; i++) {
        edges.push({
            id: `edge-${i}-${i + 1}`,
            source: `root-wrapper-${i}`,
            target: `root-wrapper-${i + 1}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            label: "",
        });
    }
    return edges;
}

export function ExpressionCanvas() {
    const roots = useExpressionStore((s) => s.roots);
    const blockConfigs = useExpressionStore((s) => s.blockConfigs);

    const nodeTypes: NodeTypes = useMemo(() => ({ rootNode: RootNode }), []);

    // Nodes live in local state — positions are owned by ReactFlow via
    // applyNodeChanges; data is synced from the Zustand store.
    const [nodes, setNodes] = useState<Node[]>(() =>
        buildNodes(roots, blockConfigs),
    );

    // Track previous store values so we only update data when they change.
    const [prevRoots, setPrevRoots] = useState(roots);
    const [prevConfigs, setPrevConfigs] = useState(blockConfigs);

    if (prevRoots !== roots || prevConfigs !== blockConfigs) {
        setPrevRoots(roots);
        setPrevConfigs(blockConfigs);
        setNodes((prev) => buildNodes(roots, blockConfigs, prev));
    }

    // Edges are derived purely from config (no local state needed)
    const edges = useMemo(() => buildEdges(blockConfigs), [blockConfigs]);

    // applyNodeChanges updates only the changed fields (e.g. position) while
    // preserving data references — so memo'd RootNode won't re-render during drag.
    const onNodesChange = useCallback(
        (changes: NodeChange[]) =>
            setNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    );

    // Allow drops on the canvas
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);

    const isConstraint = useExpressionStore((s) => s.isConstraint);
    const setIsConstraint = useExpressionStore((s) => s.setIsConstraint);
    const [optionsExpanded, setOptionsExpanded] = useState(true);

    return (
        <div className="flex-1 h-full bg-slate-100">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onDragOver={onDragOver}
                onInit={setReactFlowInstance}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.1}
                maxZoom={1}
                proOptions={{ hideAttribution: true }}
                className="bg-slate-100"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={2}
                    color="#cbd5e1"
                />
                <Controls
                    showInteractive={false}
                    className="!bg-white !border-slate-200 !shadow-lg !rounded-xl"
                    position={"bottom-right"}
                />

                {/* Floating options card */}
                <Panel position="bottom-center" className="!mb-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg min-w-[260px] overflow-hidden">
                        {/* Card header — always visible, click to expand */}
                        <button
                            onClick={() => setOptionsExpanded((v) => !v)}
                            className="
                w-full flex items-center gap-2 px-3 py-2
                hover:bg-slate-50 transition-colors
              "
                        >
                            <Settings2 size={14} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600">
                                Options
                            </span>
                            <div className="flex-1" />
                            {optionsExpanded ? (
                                <ChevronDown
                                    size={14}
                                    className="text-slate-400"
                                />
                            ) : (
                                <ChevronUp
                                    size={14}
                                    className="text-slate-400"
                                />
                            )}
                        </button>

                        {/* Expandable body */}
                        {optionsExpanded && (
                            <div className="border-t border-slate-100 px-3 py-2.5 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isConstraint}
                                        onChange={(e) =>
                                            setIsConstraint(e.target.checked)
                                        }
                                        className="
                      h-3.5 w-3.5 rounded border-slate-300 text-indigo-600
                      focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer
                    "
                                    />
                                    <span className="text-[11px] font-medium text-slate-600">
                                        Is Constraint
                                    </span>
                                </label>
                                {/* Future options can be added here */}
                            </div>
                        )}
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
