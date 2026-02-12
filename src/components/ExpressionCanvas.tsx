import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import { useExpressionStore } from '../store';
import { RootNode } from './RootNode';

export function ExpressionCanvas() {
  const root = useExpressionStore((s) => s.root);
  const expressionMode = useExpressionStore((s) => s.expressionMode);

  // Register custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({ rootNode: RootNode }), []);

  // The single root node that contains the entire recursive tree
  const nodes: Node[] = useMemo(
    () => [
      {
        id: 'root-wrapper',
        type: 'rootNode',
        position: { x: 50, y: 50 },
        data: { root, expressionMode },
        draggable: true,
      },
    ],
    [root, expressionMode],
  );

  // Handle drag-over on the canvas (allow drops)
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div className="flex-1 h-full bg-slate-100">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-100"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls
          showInteractive={false}
          className="!bg-white !border-slate-200 !shadow-lg !rounded-xl"
        />
        {/* <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bg-white !border-slate-200 !shadow-lg !rounded-xl"
        /> */}
      </ReactFlow>
    </div>
  );
}
