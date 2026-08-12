// ─── Test helpers ────────────────────────────────────────────────
//
// Small factories for building Block trees the same way the UI does,
// plus a round-trip helper (text → blocks → text).

import type { Block } from "../types";
import { generateCode, uid } from "../store";
import { parseExpressionToBlock } from "../parser";

/** Attribute block, e.g. attr("[Class].[Name]") */
export function attr(path: string): Block {
    return { id: uid(), type: "ATTRIBUTE", name: path, args: [] };
}

/** Literal block — `raw` is emitted verbatim, so quote strings yourself */
export function lit(raw: string): Block {
    return {
        id: uid(),
        type: "LITERAL",
        name: "Literal",
        value: raw,
        args: [],
    };
}

/** Fixed-arity function / operator block */
export function fn(name: string, ...args: (Block | null)[]): Block {
    return { id: uid(), type: "FUNCTION", name, args };
}

/**
 * Variadic function / operator block. Appends the trailing empty slot the UI
 * always keeps for "add another argument" — generated code must ignore it.
 */
export function variadic(name: string, ...args: (Block | null)[]): Block {
    return { id: uid(), type: "FUNCTION", name, args: [...args, null] };
}

/** 0-arg function (NOW, TODAY, NEWGUID) */
export function nullary(name: string): Block {
    return { id: uid(), type: "FUNCTION", name, args: [] };
}

/** text → block tree → text, i.e. what the canvas would emit after a load */
export function roundTrip(text: string): string {
    return generateCode(parseExpressionToBlock(text));
}
