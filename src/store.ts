import { create } from 'zustand';
import type { Block, DragItem, ExpressionMode } from './types';
import { FUNCTION_REGISTRY } from './types';

// ─── Helper: Generate unique IDs ─────────────────────────────────
let counter = 100;
export const uid = () => `block_${++counter}`;

// ─── Helper: Deep-clone a block tree ─────────────────────────────
const cloneBlock = (b: Block | null): Block | null => {
  if (!b) return null;
  return {
    ...b,
    id: uid(),
    args: b.args.map(cloneBlock),
  };
};

// ─── Helper: Create a fresh block from a DragItem ────────────────

export const createBlockFromDrag = (item: DragItem): Block => {
  if (item.type === 'ATTRIBUTE') {
    return { id: uid(), type: 'ATTRIBUTE', name: item.name, args: [] };
  }
  if (item.type === 'LITERAL') {
    return {
      id: uid(),
      type: 'LITERAL',
      name: 'Literal',
      value: item.value ?? '""',
      args: [],
    };
  }
  // FUNCTION
  const meta = FUNCTION_REGISTRY[item.name];
  const slotCount = meta ? meta.argLabels.length : 2;
  return {
    id: uid(),
    type: 'FUNCTION',
    name: item.name,
    args: new Array(slotCount).fill(null),
  };
};

// ─── Recursive tree helpers ──────────────────────────────────────

/** Find and update a block by id, returns new tree (immutable) */
function updateInTree(
  node: Block,
  targetId: string,
  updater: (b: Block) => Block,
): Block {
  if (node.id === targetId) return updater(node);
  return {
    ...node,
    args: node.args.map((arg) =>
      arg ? updateInTree(arg, targetId, updater) : null,
    ),
  };
}

/** Remove a block by id from the tree (replace with null in parent's args) */
function removeFromTree(node: Block, targetId: string): Block {
  return {
    ...node,
    args: node.args.map((arg) => {
      if (!arg) return null;
      if (arg.id === targetId) return null;
      return removeFromTree(arg, targetId);
    }),
  };
}

// ─── Code Generator ──────────────────────────────────────────────

export function generateCode(block: Block | null): string {
  if (!block) return '/* empty */';

  // ATTRIBUTE — just the name
  if (block.type === 'ATTRIBUTE') return block.name;

  // LITERAL — the raw value
  if (block.type === 'LITERAL') return block.value ?? '""';

  // FUNCTION
  const meta = FUNCTION_REGISTRY[block.name];

  // 0-arg functions: just the name (NOW, TODAY, NEWGUID)
  if (block.args.length === 0) {
    return block.name;
  }

  // GROUP — parentheses wrapper (supports multiple items as a list)
  if (block.name === 'GROUP') {
    const items = block.args.filter(Boolean).map((a) => generateCode(a));
    return `(${items.join(', ')})`;
  }

  // Infix operators: Left OP Right
  if (meta?.isInfix) {
    const left = generateCode(block.args[0]);
    const right = generateCode(block.args[1]);
    return `${left} ${block.name} ${right}`;
  }

  // Variadic: skip null/empty args
  if (meta?.variadic) {
    const filled = block.args.filter(Boolean).map((a) => generateCode(a));
    if (filled.length === 0) return `${block.name}()`;
    return `${block.name}(${filled.join(', ')})`;
  }

  // Standard function call: NAME(arg1, arg2, ...)
  const argsStr = block.args.map((a) => generateCode(a)).join(', ');
  return `${block.name}(${argsStr})`;
}

// ─── Demo Data ───────────────────────────────────────────────────

/** Validation demo: [Code] = CONCAT([Class].[Name], [Color].[Name]) */
const DEMO_VALIDATION: Block = {
  id: 'root-v',
  type: 'FUNCTION',
  name: '=',
  args: [
    { id: 'v-attr1', type: 'ATTRIBUTE', name: '[Code]', args: [] },
    {
      id: 'v-concat',
      type: 'FUNCTION',
      name: 'CONCAT',
      args: [
        { id: 'v-attr2', type: 'ATTRIBUTE', name: '[Class].[Name]', args: [] },
        { id: 'v-attr3', type: 'ATTRIBUTE', name: '[Color].[Name]', args: [] },
        null,
      ],
    },
  ],
};

/** Assignment demo: IF(LENGTH([Name]) > 0, [Name], "") */
const DEMO_ASSIGNMENT: Block = {
  id: 'root-a',
  type: 'FUNCTION',
  name: 'IF',
  args: [
    {
      id: 'gt1',
      type: 'FUNCTION',
      name: '>',
      args: [
        {
          id: 'len1',
          type: 'FUNCTION',
          name: 'LENGTH',
          args: [
            { id: 'a-attr1', type: 'ATTRIBUTE', name: '[Name]', args: [] },
          ],
        },
        { id: 'a-lit1', type: 'LITERAL', name: 'Literal', value: '0', args: [] },
      ],
    },
    { id: 'a-attr2', type: 'ATTRIBUTE', name: '[Name]', args: [] },
    { id: 'a-lit2', type: 'LITERAL', name: 'Literal', value: '""', args: [] },
  ],
};

function getDemoForMode(mode: ExpressionMode): Block {
  return mode === 'validation' ? DEMO_VALIDATION : DEMO_ASSIGNMENT;
}

// ─── Store Interface ─────────────────────────────────────────────

interface ExpressionState {
  expressionMode: ExpressionMode;
  root: Block | null;        // null = empty canvas, awaiting first drop
  generatedCode: string;

  // Actions
  setExpressionMode: (mode: ExpressionMode) => void;
  loadDemo: () => void;
  setRootFromDrop: (item: DragItem) => void;
  clearRoot: () => void;
  addBlock: (parentId: string, slotIndex: number, item: DragItem) => void;
  removeBlock: (blockId: string) => void;
  toggleCollapse: (blockId: string) => void;
  moveBlock: (fromId: string, toParentId: string, toSlotIndex: number) => void;
  updateBlockValue: (blockId: string, newValue: string) => void;
  updateBlockName: (blockId: string, newName: string) => void;
  addArgSlot: (blockId: string) => void;
  removeArgSlot: (blockId: string, slotIndex: number) => void;
  setRoot: (root: Block | null) => void;
}

// ─── Zustand Store ───────────────────────────────────────────────

const INITIAL_MODE: ExpressionMode = 'assignment';
const INITIAL_ROOT = getDemoForMode(INITIAL_MODE);

export const useExpressionStore = create<ExpressionState>((set, get) => ({
  expressionMode: INITIAL_MODE,
  root: INITIAL_ROOT,
  generatedCode: generateCode(INITIAL_ROOT),

  setExpressionMode: (mode) => {
    set({ expressionMode: mode });
  },

  loadDemo: () => {
    const { expressionMode } = get();
    const demo = getDemoForMode(expressionMode);
    set({ root: demo, generatedCode: generateCode(demo) });
  },

  setRootFromDrop: (item) => {
    const newBlock = createBlockFromDrag(item);
    set({ root: newBlock, generatedCode: generateCode(newBlock) });
  },

  clearRoot: () => {
    set({ root: null, generatedCode: '/* empty */' });
  },

  addBlock: (parentId, slotIndex, item) => {
    const newBlock = createBlockFromDrag(item);
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, parentId, (parent) => {
        const newArgs = [...parent.args];
        newArgs[slotIndex] = newBlock;
        return { ...parent, args: newArgs };
      });
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  removeBlock: (blockId) => {
    set((state) => {
      if (!state.root) return state;
      // If removing the root block itself, clear the canvas
      if (state.root.id === blockId) {
        return { root: null, generatedCode: '/* empty */' };
      }
      const newRoot = removeFromTree(state.root, blockId);
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  toggleCollapse: (blockId) => {
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, blockId, (b) => ({
        ...b,
        isCollapsed: !b.isCollapsed,
      }));
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  moveBlock: (fromId, toParentId, toSlotIndex) => {
    const state = get();
    if (!state.root) return;
    const findBlock = (node: Block | null): Block | null => {
      if (!node) return null;
      if (node.id === fromId) return node;
      for (const arg of node.args) {
        const found = findBlock(arg);
        if (found) return found;
      }
      return null;
    };
    const blockToMove = findBlock(state.root);
    if (!blockToMove) return;

    const cloned = cloneBlock(blockToMove);
    if (!cloned) return;
    cloned.id = blockToMove.id;

    let newRoot = removeFromTree(state.root, fromId);
    newRoot = updateInTree(newRoot, toParentId, (parent) => {
      const newArgs = [...parent.args];
      newArgs[toSlotIndex] = cloned;
      return { ...parent, args: newArgs };
    });

    set({ root: newRoot, generatedCode: generateCode(newRoot) });
  },

  updateBlockValue: (blockId, newValue) => {
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, blockId, (b) => ({
        ...b,
        value: newValue,
      }));
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  updateBlockName: (blockId, newName) => {
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, blockId, (b) => ({
        ...b,
        name: newName,
      }));
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  addArgSlot: (blockId) => {
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, blockId, (b) => ({
        ...b,
        args: [...b.args, null],
      }));
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  removeArgSlot: (blockId, slotIndex) => {
    set((state) => {
      if (!state.root) return state;
      const newRoot = updateInTree(state.root, blockId, (b) => {
        const meta = FUNCTION_REGISTRY[b.name];
        const minSlots = (meta?.variadicFrom ?? 0) + 1; // keep at least fixed args + 1 variadic
        if (b.args.length <= minSlots) return b;
        const newArgs = [...b.args];
        newArgs.splice(slotIndex, 1);
        return { ...b, args: newArgs };
      });
      return { root: newRoot, generatedCode: generateCode(newRoot) };
    });
  },

  setRoot: (root) => set({ root, generatedCode: generateCode(root) }),
}));
