// ─── Golden expression fixtures ───────────────────────────────────
//
// One platform-valid expression per FUNCTION_REGISTRY entry, hand-derived from
// the "Syntax:" line of that entry's `details` field in src/types.ts, which
// mirrors the Profisee platform's documented expression grammar.
//
// Shared by the syntax-alignment and parser round-trip suites.

import type { Block } from "../types";
import { attr, fn, lit, nullary, variadic } from "./helpers";

export interface Row {
    /** FUNCTION_REGISTRY key under test */
    key: string;
    /** Block tree as the canvas would hold it */
    build: () => Block;
    /** Platform-valid expression text that must be emitted */
    expected: string;
}

const group = (...items: Block[]) => variadic("GROUP", ...items);

export const ROWS: Row[] = [
    // ━━ LOGIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "IF",
        build: () =>
            fn(
                "IF",
                fn("=", attr("[Class].[Code]"), lit('"A"')),
                attr("[Name]"),
                lit('""'),
            ),
        expected: 'IF([Class].[Code] = "A", [Name], "")',
    },
    {
        key: "AND",
        build: () =>
            variadic(
                "AND",
                fn("<>", attr("[Name]"), lit('""')),
                fn("<>", attr("[Code]"), lit('""')),
            ),
        expected: '[Name] <> "" AND [Code] <> ""',
    },
    {
        key: "OR",
        build: () =>
            variadic(
                "OR",
                fn("=", attr("[Size].[Code]"), lit('"S"')),
                fn("=", attr("[Size].[Code]"), lit('"M"')),
            ),
        expected: '[Size].[Code] = "S" OR [Size].[Code] = "M"',
    },
    {
        key: "NOT",
        build: () => fn("NOT", fn("CONTAINS", attr("[Name]"), lit('"Bike"'))),
        expected: 'NOT(CONTAINS([Name], "Bike"))',
    },

    // ━━ STRING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "CONCAT",
        build: () =>
            variadic("CONCAT", attr("[Class].[Name]"), attr("[Color].[Name]")),
        expected: "CONCAT([Class].[Name], [Color].[Name])",
    },
    {
        key: "CONTAINS",
        build: () => fn("CONTAINS", attr("[Name]"), lit('"Bike"')),
        expected: 'CONTAINS([Name], "Bike")',
    },
    {
        key: "CONTAINSPATTERN",
        build: () => fn("CONTAINSPATTERN", attr("[Code]"), lit('"[0-9][0-9]"')),
        expected: 'CONTAINSPATTERN([Code], "[0-9][0-9]")',
    },
    {
        key: "ENDSWITH",
        build: () => fn("ENDSWITH", attr("[Name]"), lit('"-XL"')),
        expected: 'ENDSWITH([Name], "-XL")',
    },
    {
        key: "STARTSWITH",
        build: () => fn("STARTSWITH", attr("[Code]"), lit('"BK"')),
        expected: 'STARTSWITH([Code], "BK")',
    },
    {
        key: "INDEXOF",
        build: () => fn("INDEXOF", attr("[Name]"), lit('"-"')),
        expected: 'INDEXOF([Name], "-")',
    },
    {
        key: "LEFT",
        build: () => fn("LEFT", attr("[Name]"), lit("3")),
        expected: "LEFT([Name], 3)",
    },
    {
        key: "RIGHT",
        build: () => fn("RIGHT", attr("[Name]"), lit("3")),
        expected: "RIGHT([Name], 3)",
    },
    {
        key: "LENGTH",
        build: () => fn("LENGTH", attr("[Name]")),
        expected: "LENGTH([Name])",
    },
    {
        key: "SUBSTRING",
        build: () => fn("SUBSTRING", attr("[Name]"), lit("0"), lit("5")),
        expected: "SUBSTRING([Name], 0, 5)",
    },

    // ━━ DATE & TIME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "DATE",
        build: () => fn("DATE", lit("1"), lit("6"), lit("2024")),
        expected: "DATE(1, 6, 2024)",
    },
    {
        key: "DATEADD",
        build: () =>
            fn("DATEADD", attr("[SellStartDate]"), lit("30"), lit("DAY")),
        expected: "DATEADD([SellStartDate], 30, DAY)",
    },
    {
        key: "DATEDIFF",
        build: () =>
            fn("DATEDIFF", attr("[SellStartDate]"), attr("[SellEndDate]")),
        expected: "DATEDIFF([SellStartDate], [SellEndDate])",
    },
    {
        // 7th arg (milliseconds) is optional — the empty slot must not be emitted
        key: "DATETIMEUTC",
        build: () =>
            variadic(
                "DATETIMEUTC",
                lit("1"),
                lit("6"),
                lit("2024"),
                lit("13"),
                lit("30"),
                lit("0"),
            ),
        expected: "DATETIMEUTC(1, 6, 2024, 13, 30, 0)",
    },
    {
        key: "RELATIVEDATE",
        build: () =>
            fn("RELATIVEDATE", attr("[SellStartDate]"), lit("StartOfMonth")),
        expected: "RELATIVEDATE([SellStartDate], StartOfMonth)",
    },
    { key: "NOW", build: () => nullary("NOW"), expected: "NOW" },
    { key: "TODAY", build: () => nullary("TODAY"), expected: "TODAY" },

    // ━━ CONVERSION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "TEXT",
        build: () => fn("TEXT", attr("[MSRP]")),
        expected: "TEXT([MSRP])",
    },
    {
        key: "TONUMBER",
        build: () => fn("TONUMBER", attr("[Size].[Code]")),
        expected: "TONUMBER([Size].[Code])",
    },
    {
        key: "TODATE",
        build: () => fn("TODATE", lit('"2024-06-01"')),
        expected: 'TODATE("2024-06-01")',
    },
    {
        key: "TODATETIMEUTC",
        build: () => fn("TODATETIMEUTC", lit('"2024-06-01 13:30:00"')),
        expected: 'TODATETIMEUTC("2024-06-01 13:30:00")',
    },
    { key: "NEWGUID", build: () => nullary("NEWGUID"), expected: "NEWGUID" },

    // ━━ CHANGE DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "CHANGED",
        build: () => variadic("CHANGED", attr("[Name]"), attr("[Code]")),
        expected: "CHANGED([Name], [Code])",
    },
    {
        key: "CHANGEDFROM",
        build: () =>
            fn(
                "CHANGEDFROM",
                attr("[Size].[Code]"),
                group(lit('"S"'), lit('"M"')),
            ),
        expected: 'CHANGEDFROM([Size].[Code], ("S", "M"))',
    },
    {
        key: "CHANGEDTO",
        build: () =>
            fn(
                "CHANGEDTO",
                attr("[Size].[Code]"),
                group(lit('"L"'), lit('"XL"')),
            ),
        expected: 'CHANGEDTO([Size].[Code], ("L", "XL"))',
    },
    {
        key: "PRIOR",
        build: () => fn("PRIOR", attr("[MSRP]")),
        expected: "PRIOR([MSRP])",
    },

    // ━━ SET OPERATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "IN",
        build: () =>
            fn(
                "IN",
                attr("[Size].[Code]"),
                group(lit('"S"'), lit('"M"'), lit('"L"')),
            ),
        expected: '[Size].[Code] IN ("S", "M", "L")',
    },

    // ━━ COMPARISON OPERATORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: ">",
        build: () => fn(">", attr("[MSRP]"), lit("100")),
        expected: "[MSRP] > 100",
    },
    {
        key: "<",
        build: () => fn("<", attr("[MSRP]"), lit("100")),
        expected: "[MSRP] < 100",
    },
    {
        key: ">=",
        build: () => fn(">=", attr("[MSRP]"), attr("[StandardCost]")),
        expected: "[MSRP] >= [StandardCost]",
    },
    {
        key: "<=",
        build: () =>
            fn("<=", attr("[ReorderPoint]"), attr("[SafetyStockLevel]")),
        expected: "[ReorderPoint] <= [SafetyStockLevel]",
    },
    {
        key: "<>",
        build: () => fn("<>", attr("[Name]"), lit('""')),
        expected: '[Name] <> ""',
    },
    {
        key: "=",
        build: () => fn("=", attr("[Code]"), attr("[Class].[Code]")),
        expected: "[Code] = [Class].[Code]",
    },

    // ━━ ARITHMETIC OPERATORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "+",
        build: () => fn("+", attr("[MSRP]"), lit("10")),
        expected: "[MSRP] + 10",
    },
    {
        key: "-",
        build: () => fn("-", attr("[MSRP]"), attr("[StandardCost]")),
        expected: "[MSRP] - [StandardCost]",
    },
    {
        key: "*",
        build: () => fn("*", attr("[StandardCost]"), lit("2")),
        expected: "[StandardCost] * 2",
    },
    {
        key: "/",
        build: () => fn("/", attr("[MSRP]"), lit("2")),
        expected: "[MSRP] / 2",
    },
    {
        key: "&",
        build: () =>
            variadic(
                "&",
                attr("[Class].[Name]"),
                lit('"-"'),
                attr("[Color].[Name]"),
            ),
        expected: '[Class].[Name] & "-" & [Color].[Name]',
    },

    // ━━ GROUPING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        key: "GROUP",
        build: () => group(lit('"S"'), lit('"M"')),
        expected: '("S", "M")',
    },
];

/** Golden expression strings, reused by the parser round-trip suite */
export const GOLDEN_EXPRESSIONS = ROWS.map((r) => r.expected);

// ─── Realistic rule expressions ───────────────────────────────────
//
// Shapes seen in real Data Quality Rules. Each must survive a
// parse → generate round-trip byte-for-byte.

export const DQR_EXPRESSIONS = [
    "[Code] = CONCAT([Class].[Name], [Color].[Name])",
    'IF(LENGTH([Name]) > 0, [Name], "")',
    "LENGTH([Code]) > 0 AND LENGTH([Name]) > 0",
    "IF(CHANGED([MSRP]), [MSRP] * 0.9, [DealerCost])",
    '[Size].[Code] IN ("S", "M", "L")',
    "DATEDIFF([SellStartDate], [SellEndDate]) >= 0",
    'TEXT([MSRP]) & " USD"',
    'IF([InHouseManufactured].[Code] = "Y", NEWGUID, TEXT([Code]))',
    'NOT(STARTSWITH([Name], "TEST"))',
    "RELATIVEDATE([$EnterDTM], StartOfMonth) <= TODAY",
    'CHANGEDTO([ProductLine].[Code], ("R", "M"))',
    "SUBSTRING([Name], 0, 3) = LEFT([Code], 3)",
    '[ProductSubcategory].[ProductCategory].[Name] <> ""',
    "DATEADD([SellStartDate], 30, DAY) > [SellEndDate]",
    "[MSRP] > 0 AND [StandardCost] > 0 AND [MSRP] >= [StandardCost]",
];
