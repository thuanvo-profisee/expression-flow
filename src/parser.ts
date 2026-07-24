// ─── Expression Parser ───────────────────────────────────────────
//
// Converts expression text (e.g. "IF(LENGTH([Name]) > 0, [Name], "")")
// back into a Block tree that the visual editor can render.
//
// Supports:
//   • Attributes:     [Name], [Class].[Name], [$EnterDTM]
//   • Literals:       "hello", 42, TRUE, FALSE, NULL
//   • Functions:      IF(...), CONCAT(...), LENGTH(...)
//   • 0-arg funcs:    NOW, TODAY, NEWGUID
//   • Infix ops:      =, <>, >, <, >=, <=, +, -, *, /, IN, AND, OR
//   • Grouping:       (a, b, c)  → GROUP block
//   • Precedence:     *, / > +, - > comparisons > IN > AND > OR
// ─────────────────────────────────────────────────────────────────

import type { Block } from "./types";
import { FUNCTION_REGISTRY } from "./types";
import { uid } from "./store";

// ─── Token Types ─────────────────────────────────────────────────

type TokenType =
    | "ATTR"
    | "STRING"
    | "NUMBER"
    | "IDENT"
    | "OP"
    | "LPAREN"
    | "RPAREN"
    | "COMMA";

interface Token {
    type: TokenType;
    value: string;
    pos: number;
}

// ─── Tokenizer ───────────────────────────────────────────────────

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
        const ch = input[i];

        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Skip block comments like /* empty */
        if (ch === "/" && i + 1 < len && input[i + 1] === "*") {
            const end = input.indexOf("*/", i + 2);
            if (end !== -1) {
                i = end + 2;
                continue;
            }
            // Unclosed comment — skip rest
            break;
        }

        // ── Attribute: [...].[...]... ──
        if (ch === "[") {
            const start = i;
            let attrStr = "";
            while (i < len && input[i] === "[") {
                if (attrStr) attrStr += ".";
                i++; // skip opening [
                const inner = i;
                while (i < len && input[i] !== "]") i++;
                attrStr += "[" + input.substring(inner, i) + "]";
                if (i < len) i++; // skip closing ]
                // Check for .[  chain
                if (
                    i < len &&
                    input[i] === "." &&
                    i + 1 < len &&
                    input[i + 1] === "["
                ) {
                    i++; // skip the dot
                }
            }
            tokens.push({ type: "ATTR", value: attrStr, pos: start });
            continue;
        }

        // ── String: "..." or '...' ──
        if (ch === '"' || ch === "'") {
            const quote = ch;
            const start = i;
            i++; // skip opening quote
            while (i < len && input[i] !== quote) i++;
            const value = input.substring(start, i + 1); // include both quotes
            if (i < len) i++; // skip closing quote
            tokens.push({ type: "STRING", value, pos: start });
            continue;
        }

        // ── Multi-char operators: <>, >=, <= ──
        if (ch === "<" && i + 1 < len && input[i + 1] === ">") {
            tokens.push({ type: "OP", value: "<>", pos: i });
            i += 2;
            continue;
        }
        if (ch === ">" && i + 1 < len && input[i + 1] === "=") {
            tokens.push({ type: "OP", value: ">=", pos: i });
            i += 2;
            continue;
        }
        if (ch === "<" && i + 1 < len && input[i + 1] === "=") {
            tokens.push({ type: "OP", value: "<=", pos: i });
            i += 2;
            continue;
        }

        // ── Single-char operators (except -) ──
        if ("=><+*/&".includes(ch)) {
            tokens.push({ type: "OP", value: ch, pos: i });
            i++;
            continue;
        }

        // ── Minus: always tokenize as OP, parser handles unary ──
        if (ch === "-") {
            tokens.push({ type: "OP", value: "-", pos: i });
            i++;
            continue;
        }

        // ── Parentheses ──
        if (ch === "(") {
            tokens.push({ type: "LPAREN", value: "(", pos: i });
            i++;
            continue;
        }
        if (ch === ")") {
            tokens.push({ type: "RPAREN", value: ")", pos: i });
            i++;
            continue;
        }

        // ── Comma ──
        if (ch === ",") {
            tokens.push({ type: "COMMA", value: ",", pos: i });
            i++;
            continue;
        }

        // ── Number ──
        if (/\d/.test(ch)) {
            const start = i;
            while (i < len && /[\d.]/.test(input[i])) i++;
            tokens.push({
                type: "NUMBER",
                value: input.substring(start, i),
                pos: start,
            });
            continue;
        }

        // ── Identifier (function name, keyword, etc.) ──
        if (/[a-zA-Z_$]/.test(ch)) {
            const start = i;
            while (i < len && /[a-zA-Z0-9_$]/.test(input[i])) i++;
            const word = input.substring(start, i);
            const upper = word.toUpperCase();
            // AND, OR, IN are infix operators
            if (upper === "AND" || upper === "OR" || upper === "IN") {
                tokens.push({ type: "OP", value: upper, pos: start });
            } else {
                tokens.push({ type: "IDENT", value: word, pos: start });
            }
            continue;
        }

        // Unknown character — skip
        i++;
    }

    return tokens;
}

// ─── Parser (Recursive Descent with Precedence Climbing) ─────────

function getOperatorPrecedence(op: string): number {
    switch (op) {
        case "OR":
            return 1;
        case "AND":
            return 2;
        case "IN":
            return 3;
        case "=":
        case "<>":
        case ">":
        case "<":
        case ">=":
        case "<=":
            return 4;
        case "&":
        case "+":
        case "-":
            return 5;
        case "*":
        case "/":
            return 6;
        default:
            return -1;
    }
}

/** Look up a function name in the registry (case-insensitive) */
function resolveRegistryName(name: string): string {
    // Try exact match first
    if (FUNCTION_REGISTRY[name]) return name;
    // Try uppercase
    const upper = name.toUpperCase();
    if (FUNCTION_REGISTRY[upper]) return upper;
    // Try case-insensitive search
    const match = Object.keys(FUNCTION_REGISTRY).find(
        (k) => k.toUpperCase() === upper,
    );
    return match ?? upper;
}

class ExpressionParser {
    private tokens: Token[];
    private pos: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.pos = 0;
    }

    private peek(): Token | null {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
    }

    private consume(): Token {
        if (this.pos >= this.tokens.length) {
            throw new Error("Unexpected end of expression");
        }
        return this.tokens[this.pos++];
    }

    private expect(type: TokenType, value?: string): Token {
        const token = this.peek();
        if (!token) {
            const expected = value ? `'${value}'` : type;
            throw new Error(
                `Expected ${expected} but reached end of expression`,
            );
        }
        if (
            token.type !== type ||
            (value !== undefined && token.value !== value)
        ) {
            const got = `'${token.value}'`;
            const expected = value ? `'${value}'` : type;
            throw new Error(
                `Expected ${expected} but found ${got} at position ${token.pos}`,
            );
        }
        return this.consume();
    }

    parse(): Block {
        const result = this.parseExpression();
        if (this.pos < this.tokens.length) {
            const remaining = this.tokens[this.pos];
            throw new Error(
                `Unexpected '${remaining.value}' at position ${remaining.pos}`,
            );
        }
        return result;
    }

    private parseExpression(): Block {
        return this.parseInfix(0);
    }

    /** Precedence climbing for infix operators */
    private parseInfix(minPrec: number): Block {
        let left = this.parsePrimary();

        while (true) {
            const token = this.peek();
            if (!token || token.type !== "OP") break;

            const prec = getOperatorPrecedence(token.value);
            if (prec < 0 || prec < minPrec) break;

            this.consume(); // consume operator
            const right = this.parseInfix(prec + 1);

            left = {
                id: uid(),
                type: "FUNCTION",
                name: token.value,
                args: [left, right],
            };
        }

        return left;
    }

    /** Parse a primary expression (atom or prefix) */
    private parsePrimary(): Block {
        const token = this.peek();
        if (!token) throw new Error("Unexpected end of expression");

        // ── Attribute: [Name], [Class].[Name] ──
        if (token.type === "ATTR") {
            this.consume();
            return {
                id: uid(),
                type: "ATTRIBUTE",
                name: token.value,
                args: [],
            };
        }

        // ── String literal: "hello", 'world' ──
        if (token.type === "STRING") {
            this.consume();
            return {
                id: uid(),
                type: "LITERAL",
                name: "Literal",
                value: token.value,
                args: [],
            };
        }

        // ── Number literal: 42, 3.14 ──
        if (token.type === "NUMBER") {
            this.consume();
            return {
                id: uid(),
                type: "LITERAL",
                name: "Literal",
                value: token.value,
                args: [],
            };
        }

        // ── Parenthesized expression or GROUP ──
        if (token.type === "LPAREN") {
            this.consume(); // skip (
            const items: Block[] = [];

            if (this.peek()?.type !== "RPAREN") {
                items.push(this.parseExpression());
                while (this.peek()?.type === "COMMA") {
                    this.consume(); // skip ,
                    items.push(this.parseExpression());
                }
            }
            this.expect("RPAREN");

            // Single item → precedence grouping, just unwrap
            if (items.length === 1) return items[0];

            // Multiple items or empty → GROUP block (variadic, add null slot)
            return {
                id: uid(),
                type: "FUNCTION",
                name: "GROUP",
                args: [...items, null],
            };
        }

        // ── Identifier: function call, 0-arg function, or keyword literal ──
        if (token.type === "IDENT") {
            this.consume();
            const registryName = resolveRegistryName(token.value);

            // Function call with parentheses
            if (this.peek()?.type === "LPAREN") {
                this.consume(); // skip (
                const args: (Block | null)[] = [];

                if (this.peek()?.type !== "RPAREN") {
                    args.push(this.parseExpression());
                    while (this.peek()?.type === "COMMA") {
                        this.consume(); // skip ,
                        args.push(this.parseExpression());
                    }
                }
                this.expect("RPAREN");

                const meta = FUNCTION_REGISTRY[registryName];
                if (meta) {
                    // Pad to minimum arg count
                    while (args.length < meta.argLabels.length) {
                        args.push(null);
                    }
                    // For variadic functions, add an extra null slot
                    if (meta.variadic) {
                        args.push(null);
                    }
                }

                return {
                    id: uid(),
                    type: "FUNCTION",
                    name: registryName,
                    args,
                };
            }

            // No parens — check for 0-arg function
            const meta = FUNCTION_REGISTRY[registryName];
            if (meta && meta.argLabels.length === 0) {
                return {
                    id: uid(),
                    type: "FUNCTION",
                    name: registryName,
                    args: [],
                };
            }

            // Keywords: TRUE, FALSE, NULL
            const upper = token.value.toUpperCase();
            if (["TRUE", "FALSE", "NULL"].includes(upper)) {
                return {
                    id: uid(),
                    type: "LITERAL",
                    name: "Literal",
                    value: upper,
                    args: [],
                };
            }

            // Unknown identifier → literal value (e.g. DAY, MONTH, StartOfWeek, etc.)
            return {
                id: uid(),
                type: "LITERAL",
                name: "Literal",
                value: token.value,
                args: [],
            };
        }

        // ── Unary minus ──
        if (token.type === "OP" && token.value === "-") {
            this.consume();
            const next = this.peek();
            // Negative number
            if (next?.type === "NUMBER") {
                this.consume();
                return {
                    id: uid(),
                    type: "LITERAL",
                    name: "Literal",
                    value: "-" + next.value,
                    args: [],
                };
            }
            // Unary minus on expression → model as  0 - expr
            const operand = this.parsePrimary();
            return {
                id: uid(),
                type: "FUNCTION",
                name: "-",
                args: [
                    {
                        id: uid(),
                        type: "LITERAL",
                        name: "Literal",
                        value: "0",
                        args: [],
                    },
                    operand,
                ],
            };
        }

        throw new Error(`Unexpected '${token.value}' at position ${token.pos}`);
    }
}

// ─── Post-processing: flatten variadic infix chains ─────────────

/**
 * Operators that are both infix and variadic (e.g. `&`).
 * After parsing, nested binary trees of these operators are flattened
 * into a single block with many args + a trailing null slot.
 */
const VARIADIC_INFIX = new Set(
    Object.values(FUNCTION_REGISTRY)
        .filter((m) => m.isInfix && m.variadic)
        .map((m) => m.name),
);

/** Recursively flatten variadic-infix chains into single blocks. */
function flattenVariadicInfix(block: Block): Block {
    // Recurse into all children first
    const args = block.args.map((a) =>
        a ? flattenVariadicInfix(a) : null,
    );

    if (
        block.type !== "FUNCTION" ||
        !VARIADIC_INFIX.has(block.name)
    ) {
        return { ...block, args };
    }

    // Collect all chained operands of the same operator
    const operands: (Block | null)[] = [];
    function collect(node: Block | null) {
        if (
            node &&
            node.type === "FUNCTION" &&
            node.name === block.name
        ) {
            for (const child of node.args) {
                collect(child);
            }
        } else {
            operands.push(node);
        }
    }
    collect({ ...block, args });

    // Keep non-null operands, add trailing null for the variadic "add" slot
    const filled = operands.filter(Boolean) as Block[];
    return {
        ...block,
        args: [...filled, null],
    };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Parse an expression string into a Block tree.
 * Returns null for empty/blank input.
 * Throws an Error with a descriptive message if parsing fails.
 */
export function parseExpressionToBlock(input: string): Block | null {
    const trimmed = input.trim();
    if (!trimmed || trimmed === "/* empty */") return null;

    const tokens = tokenize(trimmed);
    if (tokens.length === 0) return null;

    const parser = new ExpressionParser(tokens);
    const tree = parser.parse();
    return flattenVariadicInfix(tree);
}

// ─── DQR clause splitting ──────────────────────────────────────────
//
// A Data Quality Rule clause packs a main expression, an optional
// "WHEN <condition>" guard, and an optional trailing "[Constraint]"
// marker into one string, e.g.:
//   [Color].[Code]="Hello" WHEN [Name]="Name" [Constraint]

export interface ParsedDqrClause {
    main: string;
    when: string | null;
    isConstraint: boolean;
}

/** Index of a whole-word keyword outside quoted strings, or -1 */
function findTopLevelKeyword(text: string, keyword: string): number {
    const upper = text.toUpperCase();
    let inQuotes = false;
    for (let i = 0; i <= text.length - keyword.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (inQuotes) continue;
        const isWordStart = i === 0 || /\s/.test(text[i - 1]);
        const isWordEnd =
            i + keyword.length === text.length ||
            /\s/.test(text[i + keyword.length]);
        if (isWordStart && isWordEnd && upper.startsWith(keyword, i)) {
            return i;
        }
    }
    return -1;
}

export function splitDqrClause(raw: string): ParsedDqrClause {
    let text = raw.trim();
    const constraintMatch = /\[constraint\]\s*$/i.exec(text);
    const isConstraint = !!constraintMatch;
    if (constraintMatch) {
        text = text.slice(0, constraintMatch.index).trim();
    }

    const whenIdx = findTopLevelKeyword(text, "WHEN");
    if (whenIdx === -1) {
        return { main: text, when: null, isConstraint };
    }
    return {
        main: text.slice(0, whenIdx).trim(),
        when: text.slice(whenIdx + "WHEN".length).trim(),
        isConstraint,
    };
}
