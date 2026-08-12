// ─── DQR clause splitting ─────────────────────────────────────────
//
// A platform Data Quality Rule clause packs three things into one string:
//   <main expression> [WHEN <condition>] [[Constraint]]
// splitDqrClause has to peel those apart without touching text inside quotes,
// so that each half parses on its own and reassembles into the same clause.

import { describe, expect, it } from "vitest";
import { parseExpressionToBlock, splitDqrClause } from "../parser";
import { generateCode } from "../store";

describe("splitDqrClause", () => {
    it("returns the main expression when there is no guard", () => {
        expect(splitDqrClause('[Color].[Code] = "Hello"')).toEqual({
            main: '[Color].[Code] = "Hello"',
            when: null,
            isConstraint: false,
        });
    });

    it("splits on a top-level WHEN", () => {
        expect(
            splitDqrClause('[Color].[Code]="Hello" WHEN [Name]="Name"'),
        ).toEqual({
            main: '[Color].[Code]="Hello"',
            when: '[Name]="Name"',
            isConstraint: false,
        });
    });

    it("strips a trailing [Constraint] marker", () => {
        expect(
            splitDqrClause(
                '[Color].[Code]="Hello" WHEN [Name]="Name" [Constraint]',
            ),
        ).toEqual({
            main: '[Color].[Code]="Hello"',
            when: '[Name]="Name"',
            isConstraint: true,
        });
    });

    it("matches the [Constraint] marker case-insensitively", () => {
        expect(splitDqrClause("[MSRP] > 0 [CONSTRAINT]")).toEqual({
            main: "[MSRP] > 0",
            when: null,
            isConstraint: true,
        });
        expect(splitDqrClause("[MSRP] > 0 [constraint]").isConstraint).toBe(
            true,
        );
    });

    it("handles a constraint marker without a WHEN guard", () => {
        expect(splitDqrClause("[MSRP] > 0  [Constraint]  ")).toEqual({
            main: "[MSRP] > 0",
            when: null,
            isConstraint: true,
        });
    });

    it("ignores WHEN inside a quoted string", () => {
        expect(splitDqrClause('[Name] <> "WHEN"')).toEqual({
            main: '[Name] <> "WHEN"',
            when: null,
            isConstraint: false,
        });
    });

    it("still splits on the real WHEN after a quoted one", () => {
        expect(splitDqrClause('[Name] <> "say WHEN" WHEN [MSRP] > 0')).toEqual({
            main: '[Name] <> "say WHEN"',
            when: "[MSRP] > 0",
            isConstraint: false,
        });
    });

    it("does not split on WHEN as part of a longer word", () => {
        expect(splitDqrClause("[WhenDate] > TODAY").when).toBeNull();
        expect(splitDqrClause("WHENEVER([A])").when).toBeNull();
    });

    it("matches WHEN case-insensitively", () => {
        expect(splitDqrClause("[MSRP] > 0 when [Weight] > 0").when).toBe(
            "[Weight] > 0",
        );
    });

    it("trims surrounding whitespace on both halves", () => {
        expect(splitDqrClause("  [MSRP] > 0   WHEN   [Weight] > 0  ")).toEqual({
            main: "[MSRP] > 0",
            when: "[Weight] > 0",
            isConstraint: false,
        });
    });
});

describe("split halves are independently valid expressions", () => {
    const CLAUSES = [
        '[Color].[Code]="Hello" WHEN [Name]="Name" [Constraint]',
        'CONCAT([Class].[Name], [Color].[Name]) WHEN [Code] <> ""',
        'IF(LENGTH([Name]) > 0, [Name], "") WHEN CHANGED([Name])',
        '[Size].[Code] IN ("S", "M", "L") WHEN [IsActive].[Code] = "Y"',
        "[MSRP] >= [StandardCost]",
    ];

    it.each(CLAUSES)("%s", (clause) => {
        const { main, when, isConstraint } = splitDqrClause(clause);

        const mainCode = generateCode(parseExpressionToBlock(main));
        expect(mainCode).not.toContain("/* empty */");

        let reassembled = mainCode;
        if (when) {
            const whenCode = generateCode(parseExpressionToBlock(when));
            expect(whenCode).not.toContain("/* empty */");
            reassembled += ` WHEN ${whenCode}`;
        }
        if (isConstraint) reassembled += " [Constraint]";

        // Re-splitting the rebuilt clause yields the same three parts
        const again = splitDqrClause(reassembled);
        expect(again.main).toBe(mainCode);
        expect(again.isConstraint).toBe(isConstraint);
        expect(again.when === null).toBe(when === null);
    });
});
