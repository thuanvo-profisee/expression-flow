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
//   • Infix ops:      =, <>, >, <, >=, <=, +, -, *, /, IN
//   • Grouping:       (a, b, c)  → GROUP block
//   • Precedence:     *, / > +, - > comparisons > IN
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
        if ("=><+*/".includes(ch)) {
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
            // IN is a special infix operator
            if (word.toUpperCase() === "IN") {
                tokens.push({ type: "OP", value: "IN", pos: start });
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
        case "IN":
            return 1;
        case "=":
        case "<>":
        case ">":
        case "<":
        case ">=":
        case "<=":
            return 2;
        case "+":
        case "-":
            return 3;
        case "*":
        case "/":
            return 4;
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
    return parser.parse();
}
