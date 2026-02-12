import { create } from "zustand";
import type {
    Block,
    BlockConfig,
    DragItem,
    ExpressionMode,
    AttributeCatalogKey,
    AttributeNode,
    FlatAttribute,
} from "./types";
import {
    FUNCTION_REGISTRY,
    ATTRIBUTE_CATALOGS,
    flattenAttributes,
} from "./types";
import type { ReactFlowInstance } from "@xyflow/react";

// ─── ReactFlow instance holder (for programmatic panning) ────────

let _rfInstance: ReactFlowInstance | null = null;

/** Called from ExpressionCanvas onInit to store the instance */
export function setReactFlowInstance(instance: ReactFlowInstance) {
    _rfInstance = instance;
}

/** Pan the ReactFlow viewport so the given block is centered on screen */
export function panToBlock(blockId: string) {
    const el = document.querySelector(
        `[data-block-id="${blockId}"]`,
    ) as HTMLElement | null;
    if (!el || !_rfInstance) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const flowPos = _rfInstance.screenToFlowPosition({
        x: centerX,
        y: centerY,
    });
    _rfInstance.setCenter(flowPos.x, flowPos.y, {
        duration: 400,
        zoom: 1.5,
    });
}

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
    if (item.type === "ATTRIBUTE") {
        return { id: uid(), type: "ATTRIBUTE", name: item.name, args: [] };
    }
    if (item.type === "LITERAL") {
        return {
            id: uid(),
            type: "LITERAL",
            name: "Literal",
            value: item.value ?? '""',
            args: [],
        };
    }
    // FUNCTION
    const meta = FUNCTION_REGISTRY[item.name];
    const slotCount = meta ? meta.argLabels.length : 2;
    return {
        id: uid(),
        type: "FUNCTION",
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
    if (!block) return "/* empty */";

    // ATTRIBUTE — just the name
    if (block.type === "ATTRIBUTE") return block.name;

    // LITERAL — the raw value
    if (block.type === "LITERAL") return block.value ?? '""';

    // FUNCTION
    const meta = FUNCTION_REGISTRY[block.name];

    // 0-arg functions: just the name (NOW, TODAY, NEWGUID)
    if (block.args.length === 0) {
        return block.name;
    }

    // GROUP — parentheses wrapper (supports multiple items as a list)
    if (block.name === "GROUP") {
        const items = block.args.filter(Boolean).map((a) => generateCode(a));
        return `(${items.join(", ")})`;
    }

    // Variadic infix operators (e.g. &): val1 OP val2 OP val3 ...
    if (meta?.isInfix && meta?.variadic) {
        const filled = block.args.filter(Boolean).map((a) => generateCode(a));
        return filled.join(` ${block.name} `);
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
        return `${block.name}(${filled.join(", ")})`;
    }

    // Standard function call: NAME(arg1, arg2, ...)
    const argsStr = block.args.map((a) => generateCode(a)).join(", ");
    return `${block.name}(${argsStr})`;
}

// ─── Recursive search helper ─────────────────────────────────────

/** Find which root index contains a given block ID */
function findRootIndex(roots: (Block | null)[], blockId: string): number {
    const search = (block: Block | null): boolean => {
        if (!block) return false;
        if (block.id === blockId) return true;
        return block.args.some(search);
    };
    return roots.findIndex(search);
}

/** Find a block by ID in any root */
function findBlockById(roots: (Block | null)[], blockId: string): Block | null {
    const search = (node: Block | null): Block | null => {
        if (!node) return null;
        if (node.id === blockId) return node;
        for (const arg of node.args) {
            const found = search(arg);
            if (found) return found;
        }
        return null;
    };
    for (const root of roots) {
        const found = search(root);
        if (found) return found;
    }
    return null;
}

// ─── Demo Data ───────────────────────────────────────────────────

/** Validation demo: [Code] = CONCAT([Class].[Name], [Color].[Name]) */
const DEMO_VALIDATION: Block = {
    id: "root-v",
    type: "FUNCTION",
    name: "=",
    args: [
        { id: "v-attr1", type: "ATTRIBUTE", name: "[Code]", args: [] },
        {
            id: "v-concat",
            type: "FUNCTION",
            name: "CONCAT",
            args: [
                {
                    id: "v-attr2",
                    type: "ATTRIBUTE",
                    name: "[Class].[Name]",
                    args: [],
                },
                {
                    id: "v-attr3",
                    type: "ATTRIBUTE",
                    name: "[Color].[Name]",
                    args: [],
                },
                null,
            ],
        },
    ],
};

/** Assignment demo: IF(LENGTH([Name]) > 0, [Name], "") */
const DEMO_ASSIGNMENT: Block = {
    id: "root-a",
    type: "FUNCTION",
    name: "IF",
    args: [
        {
            id: "gt1",
            type: "FUNCTION",
            name: ">",
            args: [
                {
                    id: "len1",
                    type: "FUNCTION",
                    name: "LENGTH",
                    args: [
                        {
                            id: "a-attr1",
                            type: "ATTRIBUTE",
                            name: "[Name]",
                            args: [],
                        },
                    ],
                },
                {
                    id: "a-lit1",
                    type: "LITERAL",
                    name: "Literal",
                    value: "0",
                    args: [],
                },
            ],
        },
        { id: "a-attr2", type: "ATTRIBUTE", name: "[Name]", args: [] },
        {
            id: "a-lit2",
            type: "LITERAL",
            name: "Literal",
            value: '""',
            args: [],
        },
    ],
};

function getDemoForMode(mode: ExpressionMode): Block {
    return mode === "validation" ? DEMO_VALIDATION : DEMO_ASSIGNMENT;
}

// ─── Store Interface ─────────────────────────────────────────────

// ─── Scenarios ───────────────────────────────────────────────────

export type ScenarioKey = "validIf" | "changeTo";

export interface Scenario {
    key: ScenarioKey;
    label: string;
    description: string;
    configs: BlockConfig[];
}

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
    validIf: {
        key: "validIf",
        label: "Valid If",
        description: "Both blocks return boolean",
        configs: [
            { name: "Valid If", expressionMode: "validation" },
            { name: "When", expressionMode: "validation" },
        ],
    },
    changeTo: {
        key: "changeTo",
        label: "Change To",
        description: "Assignment value with a validation condition",
        configs: [
            { name: "Change to", expressionMode: "assignment" },
            { name: "When", expressionMode: "validation" },
        ],
    },
};

// ─── Store Interface ─────────────────────────────────────────────

interface ExpressionState {
    scenario: ScenarioKey;
    blockConfigs: BlockConfig[]; // developer-defined block names & return types
    roots: (Block | null)[]; // expression tree per block
    generatedCodes: string[]; // generated code per block
    isConstraint: boolean; // global "Is Constraint" flag

    // Attribute catalog
    activeCatalogKey: AttributeCatalogKey;
    activeCatalog: AttributeNode[];
    flatAttributes: FlatAttribute[];

    // Clipboard
    clipboard: Block | null;

    // Focus (for tree-view navigation)
    focusedBlockId: string | null;

    // Actions
    focusBlock: (blockId: string | null) => void;
    setActiveCatalog: (key: AttributeCatalogKey) => void;
    copyBlock: (blockId: string) => void;
    pasteToSlot: (parentId: string, slotIndex: number) => void;
    pasteToRoot: (rootIndex: number) => void;
    setScenario: (key: ScenarioKey) => void;
    setBlockConfigs: (configs: BlockConfig[]) => void;
    setIsConstraint: (value: boolean) => void;
    loadDemo: (rootIndex: number) => void;
    setRootFromDrop: (rootIndex: number, item: DragItem) => void;
    clearRoot: (rootIndex: number) => void;
    addBlock: (parentId: string, slotIndex: number, item: DragItem) => void;
    removeBlock: (blockId: string) => void;
    toggleCollapse: (blockId: string) => void;
    moveBlock: (
        fromId: string,
        toParentId: string,
        toSlotIndex: number,
    ) => void;
    updateBlockValue: (blockId: string, newValue: string) => void;
    updateBlockName: (blockId: string, newName: string) => void;
    addArgSlot: (blockId: string) => void;
    removeArgSlot: (blockId: string, slotIndex: number) => void;
    setRoot: (rootIndex: number, root: Block | null) => void;
}

// ─── Zustand Store ───────────────────────────────────────────────

const INITIAL_SCENARIO: ScenarioKey = "validIf";
const INITIAL_CONFIGS = SCENARIOS[INITIAL_SCENARIO].configs;
const INITIAL_ROOTS: (Block | null)[] = INITIAL_CONFIGS.map(() => null);
const INITIAL_CODES: string[] = INITIAL_ROOTS.map((r) => generateCode(r));
const INITIAL_CATALOG_KEY: AttributeCatalogKey = "product";
const INITIAL_CATALOG = ATTRIBUTE_CATALOGS[INITIAL_CATALOG_KEY].catalog;
const INITIAL_FLAT = flattenAttributes(INITIAL_CATALOG);

/** Immutably update one root in the array and regenerate its code */
function patchRoot(
    roots: (Block | null)[],
    codes: string[],
    idx: number,
    newRoot: Block | null,
): { roots: (Block | null)[]; generatedCodes: string[] } {
    const newRoots = [...roots];
    const newCodes = [...codes];
    newRoots[idx] = newRoot;
    newCodes[idx] = generateCode(newRoot);
    return { roots: newRoots, generatedCodes: newCodes };
}

export const useExpressionStore = create<ExpressionState>((set, get) => ({
    activeCatalogKey: INITIAL_CATALOG_KEY,
    activeCatalog: INITIAL_CATALOG,
    flatAttributes: INITIAL_FLAT,

    focusedBlockId: null,
    focusBlock: (blockId) => {
        set({ focusedBlockId: blockId });
        if (blockId) {
            // Auto-clear highlight after 2 seconds
            setTimeout(() => {
                // Only clear if it's still the same block
                if (get().focusedBlockId === blockId) {
                    set({ focusedBlockId: null });
                }
            }, 2000);
        }
    },

    clipboard: null,

    setActiveCatalog: (key) => {
        const entry = ATTRIBUTE_CATALOGS[key];
        set({
            activeCatalogKey: key,
            activeCatalog: entry.catalog,
            flatAttributes: flattenAttributes(entry.catalog),
        });
    },

    copyBlock: (blockId) => {
        const { roots } = get();
        const block = findBlockById(roots, blockId);
        if (block) {
            set({ clipboard: block });
        }
    },

    pasteToSlot: (parentId, slotIndex) => {
        const { clipboard } = get();
        if (!clipboard) return;
        const cloned = cloneBlock(clipboard);
        if (!cloned) return;
        set((state) => {
            const idx = findRootIndex(state.roots, parentId);
            if (idx === -1) return state;
            const root = state.roots[idx]!;
            const newRoot = updateInTree(root, parentId, (parent) => {
                const newArgs = [...parent.args];
                newArgs[slotIndex] = cloned;
                return { ...parent, args: newArgs };
            });
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    pasteToRoot: (rootIndex) => {
        const { clipboard, roots, generatedCodes } = get();
        if (!clipboard) return;
        const cloned = cloneBlock(clipboard);
        if (!cloned) return;
        set(patchRoot(roots, generatedCodes, rootIndex, cloned));
    },

    scenario: INITIAL_SCENARIO,
    blockConfigs: INITIAL_CONFIGS,
    roots: INITIAL_ROOTS,
    generatedCodes: INITIAL_CODES,
    isConstraint: false,

    setIsConstraint: (value) => set({ isConstraint: value }),

    setScenario: (key) => {
        const { configs } = SCENARIOS[key];
        const { roots, generatedCodes } = get();
        // Resize roots/codes and preserve existing data where indices match
        const newRoots = configs.map((_, i) => roots[i] ?? null);
        const newCodes = configs.map(
            (_, i) => generatedCodes[i] ?? generateCode(null),
        );
        set({
            scenario: key,
            blockConfigs: configs,
            roots: newRoots,
            generatedCodes: newCodes,
        });
    },

    setBlockConfigs: (configs) => {
        const { roots, generatedCodes } = get();
        // Resize roots & codes to match the new number of blocks
        // — existing data at the same index is preserved
        const newRoots = configs.map((_, i) => roots[i] ?? null);
        const newCodes = configs.map(
            (_, i) => generatedCodes[i] ?? generateCode(null),
        );
        set({
            blockConfigs: configs,
            roots: newRoots,
            generatedCodes: newCodes,
        });
    },

    loadDemo: (rootIndex) => {
        const { blockConfigs, roots, generatedCodes } = get();
        const mode = blockConfigs[rootIndex]?.expressionMode ?? "assignment";
        const demo = getDemoForMode(mode);
        set(patchRoot(roots, generatedCodes, rootIndex, demo));
    },

    setRootFromDrop: (rootIndex, item) => {
        const newBlock = createBlockFromDrag(item);
        const { roots, generatedCodes } = get();
        set(patchRoot(roots, generatedCodes, rootIndex, newBlock));
    },

    clearRoot: (rootIndex) => {
        const { roots, generatedCodes } = get();
        set(patchRoot(roots, generatedCodes, rootIndex, null));
    },

    addBlock: (parentId, slotIndex, item) => {
        const newBlock = createBlockFromDrag(item);
        set((state) => {
            const idx = findRootIndex(state.roots, parentId);
            if (idx === -1) return state;
            const root = state.roots[idx]!;
            const newRoot = updateInTree(root, parentId, (parent) => {
                const newArgs = [...parent.args];
                newArgs[slotIndex] = newBlock;
                return { ...parent, args: newArgs };
            });
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    removeBlock: (blockId) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const root = state.roots[idx]!;
            // If removing the root block itself, clear that slot
            if (root.id === blockId) {
                return patchRoot(state.roots, state.generatedCodes, idx, null);
            }
            const newRoot = removeFromTree(root, blockId);
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    toggleCollapse: (blockId) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const root = state.roots[idx]!;
            const newRoot = updateInTree(root, blockId, (b) => ({
                ...b,
                isCollapsed: !b.isCollapsed,
            }));
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    moveBlock: (fromId, toParentId, toSlotIndex) => {
        const state = get();
        const fromIdx = findRootIndex(state.roots, fromId);
        if (fromIdx === -1) return;
        const fromRoot = state.roots[fromIdx]!;

        const findBlock = (node: Block | null): Block | null => {
            if (!node) return null;
            if (node.id === fromId) return node;
            for (const arg of node.args) {
                const found = findBlock(arg);
                if (found) return found;
            }
            return null;
        };
        const blockToMove = findBlock(fromRoot);
        if (!blockToMove) return;

        const cloned = cloneBlock(blockToMove);
        if (!cloned) return;
        cloned.id = blockToMove.id;

        const toIdx = findRootIndex(state.roots, toParentId);
        if (toIdx === -1) return;

        const newRoots = [...state.roots];
        const newCodes = [...state.generatedCodes];

        // Remove from source
        if (fromRoot.id === fromId) {
            newRoots[fromIdx] = null;
        } else {
            newRoots[fromIdx] = removeFromTree(fromRoot, fromId);
        }
        newCodes[fromIdx] = generateCode(newRoots[fromIdx]);

        // Add to target
        const targetRoot =
            fromIdx === toIdx ? newRoots[toIdx]! : state.roots[toIdx]!;
        const updatedTarget =
            fromIdx === toIdx
                ? updateInTree(newRoots[toIdx]!, toParentId, (parent) => {
                      const newArgs = [...parent.args];
                      newArgs[toSlotIndex] = cloned;
                      return { ...parent, args: newArgs };
                  })
                : updateInTree(targetRoot, toParentId, (parent) => {
                      const newArgs = [...parent.args];
                      newArgs[toSlotIndex] = cloned;
                      return { ...parent, args: newArgs };
                  });
        newRoots[toIdx] = updatedTarget;
        newCodes[toIdx] = generateCode(updatedTarget);

        set({ roots: newRoots, generatedCodes: newCodes });
    },

    updateBlockValue: (blockId, newValue) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const newRoot = updateInTree(state.roots[idx]!, blockId, (b) => ({
                ...b,
                value: newValue,
            }));
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    updateBlockName: (blockId, newName) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const newRoot = updateInTree(state.roots[idx]!, blockId, (b) => ({
                ...b,
                name: newName,
            }));
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    addArgSlot: (blockId) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const newRoot = updateInTree(state.roots[idx]!, blockId, (b) => ({
                ...b,
                args: [...b.args, null],
            }));
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    removeArgSlot: (blockId, slotIndex) => {
        set((state) => {
            const idx = findRootIndex(state.roots, blockId);
            if (idx === -1) return state;
            const newRoot = updateInTree(state.roots[idx]!, blockId, (b) => {
                const meta = FUNCTION_REGISTRY[b.name];
                const minSlots = (meta?.variadicFrom ?? 0) + 1;
                if (b.args.length <= minSlots) return b;
                const newArgs = [...b.args];
                newArgs.splice(slotIndex, 1);
                return { ...b, args: newArgs };
            });
            return patchRoot(state.roots, state.generatedCodes, idx, newRoot);
        });
    },

    setRoot: (rootIndex, root) => {
        const { roots, generatedCodes } = get();
        set(patchRoot(roots, generatedCodes, rootIndex, root));
    },
}));
