// ─── Registry syntax alignment ────────────────────────────────────
//
// One golden expectation per FUNCTION_REGISTRY entry. Each expectation is
// hand-derived from the "Syntax:" line of that entry's `details` field, which
// mirrors the Profisee platform's documented expression grammar.
//
// Every row asserts three things:
//   1. generateCode(tree) emits exactly the platform form
//   2. that form contains no /* empty */ placeholder
//   3. parsing the form back and re-emitting it is stable (idempotent)

import { describe, expect, it } from "vitest";
import { FUNCTION_REGISTRY } from "../types";
import { generateCode } from "../store";
import { parseExpressionToBlock } from "../parser";
import { attr, fn, lit, nullary, variadic } from "./helpers";
import { ROWS } from "./fixtures";

describe("generated syntax matches the documented platform form", () => {
    for (const { key, build, expected } of ROWS) {
        describe(key, () => {
            it(`emits ${expected}`, () => {
                expect(generateCode(build())).toBe(expected);
            });

            it("emits no empty-slot placeholder", () => {
                expect(generateCode(build())).not.toContain("/* empty */");
            });

            it("survives a parse → generate round-trip unchanged", () => {
                expect(generateCode(parseExpressionToBlock(expected))).toBe(
                    expected,
                );
            });
        });
    }

    it("covers every FUNCTION_REGISTRY entry", () => {
        const covered = new Set(ROWS.map((r) => r.key));
        const missing = Object.keys(FUNCTION_REGISTRY).filter(
            (k) => !covered.has(k),
        );
        expect(missing).toEqual([]);
    });

    it("uses the canonical registry name for every row", () => {
        const unknown = ROWS.map((r) => r.key).filter(
            (k) => !FUNCTION_REGISTRY[k],
        );
        expect(unknown).toEqual([]);
    });
});

describe("structural emission rules", () => {
    it("emits 0-arg functions as bare names, never NAME()", () => {
        for (const name of ["NOW", "TODAY", "NEWGUID"]) {
            expect(generateCode(nullary(name))).toBe(name);
        }
    });

    it("drops the trailing empty slot of a variadic function", () => {
        expect(generateCode(variadic("CONCAT", attr("[Name]")))).toBe(
            "CONCAT([Name])",
        );
    });

    it("drops empty slots between filled ones in a variadic function", () => {
        const block = fn("CONCAT", attr("[Name]"), null, attr("[Code]"), null);
        expect(generateCode(block)).toBe("CONCAT([Name], [Code])");
    });

    it("drops empty operands of a variadic infix operator", () => {
        expect(generateCode(variadic("&", attr("[Name]"), lit('"-"')))).toBe(
            '[Name] & "-"',
        );
    });

    it("emits a placeholder for empty slots of a fixed-arity function", () => {
        expect(generateCode(fn("LEFT", attr("[Name]"), null))).toBe(
            "LEFT([Name], /* empty */)",
        );
    });

    it("emits an empty argument list when a variadic function has no operands", () => {
        expect(generateCode(variadic("CONCAT"))).toBe("CONCAT()");
    });

    it("emits an empty list for an empty GROUP", () => {
        expect(generateCode(variadic("GROUP"))).toBe("()");
    });

    it("emits /* empty */ for a missing root", () => {
        expect(generateCode(null)).toBe("/* empty */");
    });

    it("emits nested expressions depth-first", () => {
        const block = fn(
            "IF",
            fn(">", fn("LENGTH", attr("[Name]")), lit("0")),
            attr("[Name]"),
            lit('""'),
        );
        expect(generateCode(block)).toBe('IF(LENGTH([Name]) > 0, [Name], "")');
    });
});
