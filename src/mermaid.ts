import type { Expr, Primitive } from "./ast.js";

export type MermaidDirection = "TD" | "TB" | "BT" | "RL" | "LR";

export type MermaidChart = "flowchart" | "mindmap" | "factor";

export type ToMermaidOptions = {
    readonly chart?: MermaidChart;
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

const toMermaidFlowchart = (expr: Expr, options: ToMermaidOptions): string => {
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

const mindmapLabel = (value: string): string => label(value).replace(/[()]/g, "");

const flattenAssociative = (expr: Expr): readonly Expr[] => {
    if (expr._tag !== "And" && expr._tag !== "Or") {
        return children(expr);
    }

    const flattened: Expr[] = [];
    const visit = (current: Expr): void => {
        if (current._tag === expr._tag) {
            visit(current.left);
            visit(current.right);
            return;
        }

        flattened.push(current);
    };

    visit(expr);
    return flattened;
};

const toMermaidMindmap = (expr: Expr): string => {
    const lines = ["mindmap"];

    const visit = (current: Expr, depth: number): void => {
        const indentation = "  ".repeat(depth);
        const text = mindmapLabel(nodeLabel(current));
        lines.push(`${indentation}${depth === 1 ? `root((${text}))` : text}`);

        if (shouldExpand(current)) {
            for (const child of flattenAssociative(current)) {
                visit(child, depth + 1);
            }
        }
    };

    visit(expr, 1);
    return lines.join("\n");
};

const collectRefs = (expr: Expr): readonly string[] => {
    const refs = new Set<string>();

    const visit = (current: Expr): void => {
        if (current._tag === "Ref") {
            refs.add(refLabel(current));
            return;
        }

        for (const child of childrenForTraversal(current)) {
            visit(child);
        }
    };

    visit(expr);
    return [...refs].sort();
};

const childrenForTraversal = (expr: Expr): readonly Expr[] => {
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

const topLevelFactors = (expr: Expr): readonly Expr[] =>
    expr._tag === "And" ? flattenAssociative(expr) : [expr];

const toMermaidFactorGraph = (expr: Expr): string => {
    const lines = ["flowchart LR"];
    const variableIds = new Map<string, string>();
    let nextVariableId = 0;

    const variableId = (ref: string): string => {
        const cached = variableIds.get(ref);
        if (cached !== undefined) {
            return cached;
        }

        const id = `v${nextVariableId}`;
        nextVariableId += 1;
        variableIds.set(ref, id);
        lines.push(`  ${id}["${label(ref)}"]`);
        return id;
    };

    topLevelFactors(expr).forEach((factor, index) => {
        const factorId = `f${index}`;
        lines.push(`  ${factorId}(("${label(nodeLabel(factor))}"))`);

        for (const ref of collectRefs(factor)) {
            lines.push(`  ${factorId} --- ${variableId(ref)}`);
        }
    });

    return lines.join("\n");
};

export const toMermaid = (expr: Expr, options: ToMermaidOptions = {}): string => {
    switch (options.chart) {
        case "mindmap":
            return toMermaidMindmap(expr);
        case "factor":
            return toMermaidFactorGraph(expr);
        default:
            return toMermaidFlowchart(expr, options);
    }
};
