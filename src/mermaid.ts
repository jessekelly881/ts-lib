import type { Expr, Primitive } from "./ast.js";

export type MermaidDirection = "TD" | "TB" | "BT" | "RL" | "LR";

export type ToMermaidOptions = {
    readonly direction?: MermaidDirection;
};

const label = (value: string): string => value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;")
    .replace(/\n/g, " ");

const primitiveLabel = (value: Primitive): string =>
    typeof value === "string" ? JSON.stringify(value) : String(value);

const refLabel = (expr: Extract<Expr, { _tag: "Ref" }>): string => [expr.name, ...expr.path].join(".");

const nodeLabel = (expr: Expr): string => {
    switch (expr._tag) {
        case "Literal":
            return primitiveLabel(expr.value);
        case "Ref":
            return refLabel(expr);
        case "Eq":
            return "===";
        case "Neq":
            return "!==";
        case "In":
            return "in";
        case "Lt":
            return "<";
        case "Lte":
            return "<=";
        case "Gt":
            return ">";
        case "Gte":
            return ">=";
        case "Contains":
            return "contains";
        case "StartsWith":
            return "startsWith";
        case "EndsWith":
            return "endsWith";
        case "StringLength":
            return "length";
        case "Concat":
            return "concat";
        case "Substring":
            return "substring";
        case "Add":
            return "+";
        case "Sub":
            return "-";
        case "Mul":
            return "*";
        case "Div":
            return "/";
        case "Mod":
            return "%";
        case "Not":
            return "not";
        case "And":
            return "and";
        case "Or":
            return "or";
        case "Xor":
            return "xor";
        case "Eqv":
            return "eqv";
        case "Implies":
            return "implies";
    }
};

const children = (expr: Expr): readonly Expr[] => {
    switch (expr._tag) {
        case "Literal":
        case "Ref":
            return [];
        case "Not":
            return [expr.expr];
        case "StringLength":
            return [expr.self];
        case "In":
            return [expr.value, ...expr.values];
        case "Contains":
            return [expr.self, expr.search];
        case "StartsWith":
            return [expr.self, expr.prefix];
        case "EndsWith":
            return [expr.self, expr.suffix];
        case "Substring":
            return [expr.self, expr.offset, expr.length];
        case "Implies":
            return [expr.antecedent, expr.consequent];
        default:
            return [expr.left, expr.right];
    }
};

export const toMermaid = (expr: Expr, options: ToMermaidOptions = {}): string => {
    const direction = options.direction ?? "TD";
    const lines = [`graph ${direction}`];
    let nextId = 0;

    const visit = (current: Expr): string => {
        const id = `n${nextId}`;
        nextId += 1;

        lines.push(`  ${id}["${label(nodeLabel(current))}"]`);

        for (const child of children(current)) {
            const childId = visit(child);
            lines.push(`  ${id} --> ${childId}`);
        }

        return id;
    };

    visit(expr);
    return lines.join("\n");
};
