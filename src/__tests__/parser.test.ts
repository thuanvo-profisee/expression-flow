// ─── Parser + round-trip fidelity ─────────────────────────────────
//
// The Data Quality Rules panel loads clause text from the platform, parses it
// into blocks, and the canvas re-emits it. Anything the platform accepted must
// come back out unchanged, otherwise saving the rule would silently rewrite it.

import { describe, expect, it } from "vitest";
import { generateCode } from "../store";
import { parseExpressionToBlock } from "../parser";
import { roundTrip } from "./helpers";
import { DQR_EXPRESSIONS, ROWS } from "./fixtures";

describe("attributes", () => {
    it.each([
        "[Name]",
        "[Class].[Name]",
        "[ProductSubcategory].[ProductCategory].[Name]",
        "[ProductSubcategory].[ProductCategory].[ProductGroup].[Code]",
        "[$EnterDTM]",
        "[$LastChgUserName]",
    ])("parses %s as a single attribute block", (path) => {
        const block = parseExpressionToBlock(path)!;
        expect(block.type).toBe("ATTRIBUTE");
        expect(block.name).toBe(path);
        expect(generateCode(block)).toBe(path);
    });
});

describe("literals", () => {
    it("keeps double-quoted strings verbatim", () => {
        const block = parseExpressionToBlock('"Bike - 42"')!;
        expect(block.type).toBe("LITERAL");
        expect(block.value).toBe('"Bike - 42"');
    });

    it("keeps single-quoted strings verbatim", () => {
        expect(parseExpressionToBlock("'Bike'")!.value).toBe("'Bike'");
    });

    it("keeps the empty string", () => {
        expect(roundTrip('""')).toBe('""');
    });

    it.each(["0", "42", "3.14"])("parses the number %s", (num) => {
        const block = parseExpressionToBlock(num)!;
        expect(block.type).toBe("LITERAL");
        expect(block.value).toBe(num);
    });

    it("folds a leading minus into a negative number", () => {
        const block = parseExpressionToBlock("-5")!;
        expect(block.type).toBe("LITERAL");
        expect(block.value).toBe("-5");
    });

    it.each(["TRUE", "FALSE", "NULL"])("parses the keyword %s", (kw) => {
        const block = parseExpressionToBlock(kw)!;
        expect(block.type).toBe("LITERAL");
        expect(block.value).toBe(kw);
    });

    it("upper-cases boolean / null keywords", () => {
        expect(parseExpressionToBlock("true")!.value).toBe("TRUE");
    });

    it("treats interval keywords as bare literals", () => {
        const block = parseExpressionToBlock("StartOfMonth")!;
        expect(block.type).toBe("LITERAL");
        expect(block.value).toBe("StartOfMonth");
    });
});

describe("operator precedence", () => {
    it("binds * tighter than +", () => {
        const block = parseExpressionToBlock("[MSRP] + [StandardCost] * 2")!;
        expect(block.name).toBe("+");
        expect(block.args[1]!.name).toBe("*");
    });

    it("binds arithmetic tighter than comparison", () => {
        const block = parseExpressionToBlock("[MSRP] - 10 > 100")!;
        expect(block.name).toBe(">");
        expect(block.args[0]!.name).toBe("-");
    });

    it("binds comparison tighter than AND", () => {
        const block = parseExpressionToBlock("[MSRP] > 0 AND [Weight] > 0")!;
        expect(block.name).toBe("AND");
        expect(block.args[0]!.name).toBe(">");
        expect(block.args[1]!.name).toBe(">");
    });

    it("binds AND tighter than OR", () => {
        const block = parseExpressionToBlock("[A] = 1 OR [B] = 2 AND [C] = 3")!;
        expect(block.name).toBe("OR");
        expect(block.args[1]!.name).toBe("AND");
    });

    it("binds IN tighter than AND", () => {
        const block = parseExpressionToBlock(
            '[Size].[Code] IN ("S", "M") AND [MSRP] > 0',
        )!;
        expect(block.name).toBe("AND");
        expect(block.args[0]!.name).toBe("IN");
    });

    it("honours explicit parentheses in the parsed tree", () => {
        const block = parseExpressionToBlock("([MSRP] + 10) * 2")!;
        expect(block.name).toBe("*");
        expect(block.args[0]!.name).toBe("+");
    });
});

describe("variadic infix flattening", () => {
    it("flattens an & chain into one block with a trailing empty slot", () => {
        const block = parseExpressionToBlock('[Name] & "-" & [Code] & "!"')!;
        expect(block.name).toBe("&");
        expect(block.args).toHaveLength(5); // 4 operands + add-another slot
        expect(block.args[4]).toBeNull();
        expect(block.args.filter(Boolean).map((a) => generateCode(a))).toEqual([
            "[Name]",
            '"-"',
            "[Code]",
            '"!"',
        ]);
    });

    it("flattens an AND chain into one block", () => {
        const block = parseExpressionToBlock(
            "[A] = 1 AND [B] = 2 AND [C] = 3",
        )!;
        expect(block.name).toBe("AND");
        expect(block.args.filter(Boolean)).toHaveLength(3);
    });
});

describe("function-name resolution", () => {
    it.each([
        ["if([A], 1, 2)", "IF([A], 1, 2)"],
        ["Concat([Name], [Code])", "CONCAT([Name], [Code])"],
        ["length([Name])", "LENGTH([Name])"],
        ["now", "NOW"],
    ])("canonicalises %s", (input, expected) => {
        expect(roundTrip(input)).toBe(expected);
    });

    it("pads a fixed-arity call that is missing arguments", () => {
        const block = parseExpressionToBlock("IF([A])")!;
        expect(block.args).toHaveLength(3);
        expect(block.args[1]).toBeNull();
        expect(block.args[2]).toBeNull();
    });
});

describe("empty and commented input", () => {
    it.each(["", "   ", "/* empty */"])("returns null for %j", (input) => {
        expect(parseExpressionToBlock(input)).toBeNull();
    });

    it("skips block comments inside an expression", () => {
        expect(roundTrip("LENGTH(/* comment */[Name])")).toBe("LENGTH([Name])");
    });

    it("returns null when the input is only a comment", () => {
        expect(parseExpressionToBlock("/* nothing here */")).toBeNull();
    });
});

describe("malformed input is rejected", () => {
    it("rejects an unclosed function call", () => {
        expect(() => parseExpressionToBlock("IF([A], 1, 2")).toThrow(
            /Expected .* end of expression/,
        );
    });

    it("rejects trailing junk", () => {
        expect(() => parseExpressionToBlock("[A] = 1 )")).toThrow(/Unexpected/);
    });

    it("rejects a leading binary operator", () => {
        expect(() => parseExpressionToBlock("= [A]")).toThrow(/Unexpected/);
    });

    it("rejects a dangling operator", () => {
        expect(() => parseExpressionToBlock("[A] AND")).toThrow(
            /Unexpected end of expression/,
        );
    });
});

describe("round-trip fidelity", () => {
    it.each(ROWS.map((r) => r.expected))("%s", (expr) => {
        expect(roundTrip(expr)).toBe(expr);
    });

    it.each(DQR_EXPRESSIONS)("%s", (expr) => {
        expect(roundTrip(expr)).toBe(expr);
    });
});

describe("documented normalisations", () => {
    it.each([
        // unary minus on an expression is modelled as 0 - expr
        ["-[MSRP]", "0 - [MSRP]"],
        // single-item parentheses are precedence-only and get unwrapped
        ["([Name])", "[Name]"],
        ["(([MSRP] > 0))", "[MSRP] > 0"],
        // whitespace around infix operators is normalised to one space
        ["[Code]='A'", "[Code] = 'A'"],
        ["[MSRP]   >   100", "[MSRP] > 100"],
        ["CONCAT([Name],[Code])", "CONCAT([Name], [Code])"],
    ])("%s → %s", (input, expected) => {
        expect(roundTrip(input)).toBe(expected);
    });
});

describe("known gap: grouping is not re-emitted", () => {
    // generateCode never parenthesises infix children (src/store.ts:158), so a
    // lower-precedence subtree loses its grouping and the platform would read
    // the result with different semantics. Recorded here as an expected
    // failure; the fix is to wrap an infix child whose precedence is lower
    // than its parent's.
    it.fails("preserves parentheses around a lower-precedence child", () => {
        const expr = "([A] = 1 OR [B] = 2) AND [C] = 3";
        expect(roundTrip(expr)).toBe(expr);
    });

    it("currently drops them, changing how the platform reads the rule", () => {
        expect(roundTrip("([A] = 1 OR [B] = 2) AND [C] = 3")).toBe(
            "[A] = 1 OR [B] = 2 AND [C] = 3",
        );
    });

    it.fails("preserves parentheses around an arithmetic child", () => {
        const expr = "([MSRP] + 10) * 2";
        expect(roundTrip(expr)).toBe(expr);
    });
});
