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

const inlineExprLabel = (expr: Expr): string => {
    switch (expr._tag) {
        case "Literal":
            return primitiveLabel(expr.value);
        case "Ref":
            return refLabel(expr);
        case "StringLength":
            return `length(${inlineExprLabel(expr.self)})`;
        case "Concat":
            return `(${inlineExprLabel(expr.left)} + ${inlineExprLabel(expr.right)})`;
        case "Substring":
            return `substring(${inlineExprLabel(expr.self)}, ${inlineExprLabel(expr.offset)}, ${inlineExprLabel(expr.length)})`;
        case "Add":
            return `(${inlineExprLabel(expr.left)} + ${inlineExprLabel(expr.right)})`;
        case "Sub":
            return `(${inlineExprLabel(expr.left)} - ${inlineExprLabel(expr.right)})`;
        case "Mul":
            return `(${inlineExprLabel(expr.left)} * ${inlineExprLabel(expr.right)})`;
        case "Div":
            return `(${inlineExprLabel(expr.left)} / ${inlineExprLabel(expr.right)})`;
        case "Mod":
            return `(${inlineExprLabel(expr.left)} % ${inlineExprLabel(expr.right)})`;
        default:
            return nodeLabel(expr);
    }
};

const nodeLabel = (expr: Expr): string => {
    switch (expr._tag) {
        case "Literal":
            return primitiveLabel(expr.value);
        case "Ref":
            return refLabel(expr);
        case "Eq":
            return `${inlineExprLabel(expr.left)} === ${inlineExprLabel(expr.right)}`;
        case "Neq":
            return `${inlineExprLabel(expr.left)} !== ${inlineExprLabel(expr.right)}`;
        case "In":
            return `${inlineExprLabel(expr.value)} in [${expr.values.map(inlineExprLabel).join(", ")}]`;
        case "Lt":
            return `${inlineExprLabel(expr.left)} < ${inlineExprLabel(expr.right)}`;
        case "Lte":
            return `${inlineExprLabel(expr.left)} <= ${inlineExprLabel(expr.right)}`;
        case "Gt":
            return `${inlineExprLabel(expr.left)} > ${inlineExprLabel(expr.right)}`;
        case "Gte":
            return `${inlineExprLabel(expr.left)} >= ${inlineExprLabel(expr.right)}`;
        case "Contains":
            return `${inlineExprLabel(expr.self)} contains ${inlineExprLabel(expr.search)}`;
        case "StartsWith":
            return `${inlineExprLabel(expr.self)} startsWith ${inlineExprLabel(expr.prefix)}`;
        case "EndsWith":
            return `${inlineExprLabel(expr.self)} endsWith ${inlineExprLabel(expr.suffix)}`;
        case "StringLength":
        case "Concat":
        case "Substring":
        case "Add":
        case "Sub":
        case "Mul":
        case "Div":
        case "Mod":
            return inlineExprLabel(expr);
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

const shouldExpand = (expr: Expr): boolean => {
    switch (expr._tag) {
        case "Not":
        case "And":
        case "Or":
        case "Xor":
        case "Eqv":
        case "Implies":
            return true;
        default:
            return false;
    }
};

const children = (expr: Expr): readonly Expr[] => {
    switch (expr._tag) {
        case "Not":
            return [expr.expr];
        case "And":
        case "Or":
        case "Xor":
        case "Eqv":
            return [expr.left, expr.right];
        case "Implies":
            return [expr.antecedent, expr.consequent];
        default:
            return [];
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

        if (shouldExpand(current)) {
            for (const child of children(current)) {
                const childId = visit(child);
                lines.push(`  ${id} --> ${childId}`);
            }
        }

        return id;
    };

    visit(expr);
    return lines.join("\n");
};
