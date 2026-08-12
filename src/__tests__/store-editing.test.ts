// ─── Store editing keeps the emitted expression valid ─────────────
//
// Every canvas interaction goes through the store, and the store regenerates
// the expression text after each mutation. These tests drive the real store and
// assert on `generatedCodes`, i.e. exactly the text the user would copy into
// the platform.

import { beforeEach, describe, expect, it } from "vitest";
import type { Block, DragItem } from "../types";
import { EXPRESSION_MODE_META } from "../types";
import { useExpressionStore } from "../store";

const store = () => useExpressionStore.getState();
const code = (i = 0) => store().generatedCodes[i];
const root = (i = 0) => store().roots[i] as Block;

const ATTR = (name: string): DragItem => ({ type: "ATTRIBUTE", name });
const LIT = (value: string): DragItem => ({
    type: "LITERAL",
    name: "Literal",
    value,
});
const FUNC = (name: string): DragItem => ({ type: "FUNCTION", name });

/** Collect every block id in a tree — used to prove paste clones deeply */
function collectIds(block: Block | null): string[] {
    if (!block) return [];
    return [block.id, ...block.args.flatMap(collectIds)];
}

beforeEach(() => {
    useExpressionStore.setState({
        clipboard: null,
        focusedBlockId: null,
        dqRulesError: null,
    });
    store().setScenario("validIf");
    store().setRoot(0, null);
    store().setRoot(1, null);
    store().setIsConstraint(false);
});

describe("dropping and filling blocks", () => {
    it("starts empty", () => {
        expect(code(0)).toBe("/* empty */");
        expect(code(1)).toBe("/* empty */");
    });

    it("creates one empty slot per documented argument", () => {
        store().setRootFromDrop(0, FUNC("IF"));
        expect(code(0)).toBe("IF(/* empty */, /* empty */, /* empty */)");
    });

    it("regenerates the code after every slot is filled", () => {
        store().setRootFromDrop(0, FUNC("IF"));
        const ifId = root(0).id;

        store().addBlock(ifId, 0, FUNC("="));
        const eqId = root(0).args[0]!.id;
        store().addBlock(eqId, 0, ATTR("[Class].[Code]"));
        store().addBlock(eqId, 1, LIT('"A"'));
        expect(code(0)).toBe(
            'IF([Class].[Code] = "A", /* empty */, /* empty */)',
        );

        store().addBlock(ifId, 1, ATTR("[Name]"));
        store().addBlock(ifId, 2, LIT('""'));
        expect(code(0)).toBe('IF([Class].[Code] = "A", [Name], "")');
    });

    it("drops a literal with its raw value", () => {
        store().setRootFromDrop(0, LIT('"Bike"'));
        expect(code(0)).toBe('"Bike"');
    });

    it("drops a 0-arg function as a bare name", () => {
        store().setRootFromDrop(0, FUNC("NOW"));
        expect(code(0)).toBe("NOW");
    });

    it("clears a root back to the empty placeholder", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().clearRoot(0);
        expect(code(0)).toBe("/* empty */");
        expect(store().roots[0]).toBeNull();
    });

    it("edits a literal value in place", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().addBlock(root(0).id, 0, LIT('"x"'));
        store().updateBlockValue(root(0).args[0]!.id, '"Bike"');
        expect(code(0)).toBe('LENGTH("Bike")');
    });

    it("swaps an attribute path in place", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().updateBlockName(root(0).id, "[Class].[Name]");
        expect(code(0)).toBe("[Class].[Name]");
    });
});

describe("moving blocks", () => {
    it("moves a child between slots without duplicating it", () => {
        store().setRootFromDrop(0, FUNC("IF"));
        const ifId = root(0).id;
        store().addBlock(ifId, 1, ATTR("[Name]"));
        const attrId = root(0).args[1]!.id;

        store().moveBlock(attrId, ifId, 2);
        expect(code(0)).toBe("IF(/* empty */, /* empty */, [Name])");
        expect(collectIds(root(0)).filter((id) => id === attrId)).toHaveLength(
            1,
        );
    });

    it("moves a child from one root into another", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().addBlock(root(0).id, 0, ATTR("[Name]"));
        const attrId = root(0).args[0]!.id;

        store().setRootFromDrop(1, FUNC("NOT"));
        store().moveBlock(attrId, root(1).id, 0);

        expect(code(0)).toBe("LENGTH(/* empty */)");
        expect(code(1)).toBe("NOT([Name])");
    });

    it("moves a whole subtree with its children", () => {
        store().setRootFromDrop(0, FUNC("IF"));
        const ifId = root(0).id;
        store().addBlock(ifId, 1, FUNC("LENGTH"));
        const lenId = root(0).args[1]!.id;
        store().addBlock(lenId, 0, ATTR("[Name]"));

        store().moveBlock(lenId, ifId, 2);
        expect(code(0)).toBe("IF(/* empty */, /* empty */, LENGTH([Name]))");
    });
});

describe("variadic slots", () => {
    it("ignores an added empty slot in the generated code", () => {
        store().setRootFromDrop(0, FUNC("CONCAT"));
        const id = root(0).id;
        store().addBlock(id, 0, ATTR("[Class].[Name]"));
        store().addBlock(id, 1, ATTR("[Color].[Name]"));
        expect(code(0)).toBe("CONCAT([Class].[Name], [Color].[Name])");

        store().addArgSlot(id);
        expect(root(0).args).toHaveLength(3);
        expect(code(0)).toBe("CONCAT([Class].[Name], [Color].[Name])");
    });

    it("emits the third operand once the added slot is filled", () => {
        store().setRootFromDrop(0, FUNC("CONCAT"));
        const id = root(0).id;
        store().addBlock(id, 0, ATTR("[Name]"));
        store().addBlock(id, 1, ATTR("[Code]"));
        store().addArgSlot(id);
        store().addBlock(id, 2, LIT('"!"'));
        expect(code(0)).toBe('CONCAT([Name], [Code], "!")');
    });

    it("removes a slot and its content", () => {
        store().setRootFromDrop(0, FUNC("CONCAT"));
        const id = root(0).id;
        store().addBlock(id, 0, ATTR("[Name]"));
        store().addBlock(id, 1, ATTR("[Code]"));
        store().removeArgSlot(id, 1);
        expect(root(0).args).toHaveLength(1);
        expect(code(0)).toBe("CONCAT([Name])");
    });

    it("keeps at least one slot", () => {
        store().setRootFromDrop(0, FUNC("CONCAT"));
        const id = root(0).id;
        store().addBlock(id, 0, ATTR("[Name]"));
        store().removeArgSlot(id, 1);
        store().removeArgSlot(id, 0);
        expect(root(0).args).toHaveLength(1);
        expect(code(0)).toBe("CONCAT([Name])");
    });

    it("grows an & chain one operand at a time", () => {
        store().setRootFromDrop(0, FUNC("&"));
        const id = root(0).id;
        store().addBlock(id, 0, ATTR("[Class].[Name]"));
        store().addBlock(id, 1, LIT('"-"'));
        expect(code(0)).toBe('[Class].[Name] & "-"');
        store().addArgSlot(id);
        store().addBlock(id, 2, ATTR("[Color].[Name]"));
        expect(code(0)).toBe('[Class].[Name] & "-" & [Color].[Name]');
    });
});

describe("copy and paste", () => {
    it("pastes an identical but independent subtree into a slot", () => {
        store().setRootFromDrop(0, FUNC("CONCAT"));
        const id = root(0).id;
        store().addBlock(id, 0, FUNC("LENGTH"));
        const lenId = root(0).args[0]!.id;
        store().addBlock(lenId, 0, ATTR("[Name]"));

        store().copyBlock(lenId);
        store().pasteToSlot(id, 1);

        expect(code(0)).toBe("CONCAT(LENGTH([Name]), LENGTH([Name]))");
        const pastedIds = collectIds(root(0).args[1]);
        const sourceIds = collectIds(root(0).args[0]);
        expect(pastedIds).toHaveLength(sourceIds.length);
        expect(pastedIds.some((pid) => sourceIds.includes(pid))).toBe(false);
    });

    it("pastes into another root", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().addBlock(root(0).id, 0, ATTR("[Name]"));
        store().copyBlock(root(0).id);
        store().pasteToRoot(1);
        expect(code(1)).toBe("LENGTH([Name])");
        expect(root(1).id).not.toBe(root(0).id);
    });

    it("does nothing when the clipboard is empty", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().pasteToRoot(1);
        expect(code(1)).toBe("/* empty */");
    });
});

describe("removing blocks", () => {
    it("leaves an empty slot when a child is removed", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().addBlock(root(0).id, 0, ATTR("[Name]"));
        store().removeBlock(root(0).args[0]!.id);
        expect(code(0)).toBe("LENGTH(/* empty */)");
    });

    it("clears the root when the root block is removed", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().removeBlock(root(0).id);
        expect(store().roots[0]).toBeNull();
        expect(code(0)).toBe("/* empty */");
    });

    it("collapsing a block does not change the generated code", () => {
        store().setRootFromDrop(0, FUNC("LENGTH"));
        store().addBlock(root(0).id, 0, ATTR("[Name]"));
        store().toggleCollapse(root(0).id);
        expect(root(0).isCollapsed).toBe(true);
        expect(code(0)).toBe("LENGTH([Name])");
    });
});

describe("loading a platform DQR clause", () => {
    it("splits main / WHEN / constraint into the two roots", () => {
        store().loadDqrClause(
            '[Color].[Code]="Hello" WHEN [Name]="Name" [Constraint]',
        );
        expect(code(0)).toBe('[Color].[Code] = "Hello"');
        expect(code(1)).toBe('[Name] = "Name"');
        expect(store().isConstraint).toBe(true);
        expect(store().dqRulesError).toBeNull();
    });

    it("clears the WHEN root when the clause has no guard", () => {
        store().setRootFromDrop(1, ATTR("[Name]"));
        store().loadDqrClause("[MSRP] >= [StandardCost]");
        expect(code(0)).toBe("[MSRP] >= [StandardCost]");
        expect(store().roots[1]).toBeNull();
        expect(store().isConstraint).toBe(false);
    });

    it("loads a rule that uses functions on both sides", () => {
        store().loadDqrClause(
            "[Code] = CONCAT([Class].[Name], [Color].[Name]) WHEN CHANGED([Class], [Color])",
        );
        expect(code(0)).toBe("[Code] = CONCAT([Class].[Name], [Color].[Name])");
        expect(code(1)).toBe("CHANGED([Class], [Color])");
    });

    it("reports a parse error and leaves the canvas untouched", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().loadDqrClause("IF([Name], ");
        expect(store().dqRulesError).toMatch(/Expected|Unexpected/);
        expect(code(0)).toBe("[Name]");
    });
});

describe("scenarios and demos", () => {
    it("preserves index-matched roots when the scenario changes", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().setRootFromDrop(1, ATTR("[Code]"));
        store().setScenario("changeTo");
        expect(store().blockConfigs.map((c) => c.name)).toEqual([
            "Change to",
            "When",
        ]);
        expect(code(0)).toBe("[Name]");
        expect(code(1)).toBe("[Code]");
    });

    it("resizes roots and codes when block configs change", () => {
        store().setRootFromDrop(0, ATTR("[Name]"));
        store().setBlockConfigs([
            { name: "Only", expressionMode: "assignment" },
        ]);
        expect(store().roots).toHaveLength(1);
        expect(store().generatedCodes).toEqual(["[Name]"]);
    });

    it("emits the documented example for the validation demo", () => {
        store().setScenario("validIf"); // both blocks are validation
        store().loadDemo(0);
        expect(code(0)).toBe(EXPRESSION_MODE_META.validation.example);
    });

    it("emits the documented example for the assignment demo", () => {
        store().setScenario("changeTo"); // block 0 is assignment
        store().loadDemo(0);
        expect(code(0)).toBe(EXPRESSION_MODE_META.assignment.example);
    });
});
