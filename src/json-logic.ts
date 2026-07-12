import type { Expr, Primitive } from "./ast.js";

export type JsonLogic = Primitive | readonly JsonLogic[] | { readonly [operator: string]: JsonLogic | readonly JsonLogic[] };

type Env = Record<string, unknown>;

const varPath = (expr: Extract<Expr, { _tag: "Ref" }>): string => [expr.name, ...expr.path].join(".");

export const toJsonLogic = (expr: Expr): JsonLogic => {
    switch (expr._tag) {
        case "Literal":
            return expr.value;

        case "Ref":
            return { var: varPath(expr) };

        case "Eq":
            return { "==": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Neq":
            return { "!=": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Lt":
            return { "<": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Lte":
            return { "<=": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Gt":
            return { ">": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Gte":
            return { ">=": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Contains":
            return { in: [toJsonLogic(expr.search), toJsonLogic(expr.self)] };

        case "StartsWith":
            return { startsWith: [toJsonLogic(expr.self), toJsonLogic(expr.prefix)] };

        case "EndsWith":
            return { endsWith: [toJsonLogic(expr.self), toJsonLogic(expr.suffix)] };

        case "StringLength":
            return { length: toJsonLogic(expr.self) };

        case "Concat":
            return { cat: [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Substring":
            return { substr: [toJsonLogic(expr.self), toJsonLogic(expr.offset), toJsonLogic(expr.length)] };

        case "Add":
            return { "+": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Sub":
            return { "-": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Mul":
            return { "*": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Div":
            return { "/": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Mod":
            return { "%": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Not":
            return { "!": toJsonLogic(expr.expr) };

        case "And":
            return { and: [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Or":
            return { or: [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Xor":
            return { xor: [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Eqv":
            return { "==": [toJsonLogic(expr.left), toJsonLogic(expr.right)] };

        case "Implies":
            return { or: [{ "!": toJsonLogic(expr.antecedent) }, toJsonLogic(expr.consequent)] };
    }
};

const getPath = (value: unknown, path: string): unknown =>
    path.split(".").reduce(
        (current, key) => typeof current === "object" && current !== null
            ? (current as Record<string, unknown>)[key]
            : undefined,
        value,
    );

const values = (value: JsonLogic | readonly JsonLogic[], env: Env): unknown[] =>
    Array.isArray(value) ? value.map((item) => evaluateJsonLogic(item, env)) : [evaluateJsonLogic(value, env)];

const first = (value: JsonLogic | readonly JsonLogic[], env: Env): unknown => values(value, env)[0];

export const evaluateJsonLogic = (logic: JsonLogic, env: Env): Primitive => {
    if (logic === null || typeof logic !== "object" || Array.isArray(logic)) {
        return logic as Primitive;
    }

    const entries = Object.entries(logic);
    if (entries.length !== 1) {
        throw new Error("JSON Logic expressions must have exactly one operator");
    }

    const [operator, rawArgs] = entries[0] as [string, JsonLogic | readonly JsonLogic[]];
    const args = values(rawArgs, env);

    switch (operator) {
        case "var":
            return getPath(env, String(first(rawArgs, env))) as Primitive;

        case "==":
            return args[0] === args[1];

        case "!=":
            return args[0] !== args[1];

        case "<":
            return Number(args[0]) < Number(args[1]);

        case "<=":
            return Number(args[0]) <= Number(args[1]);

        case ">":
            return Number(args[0]) > Number(args[1]);

        case ">=":
            return Number(args[0]) >= Number(args[1]);

        case "in":
            return String(args[1]).includes(String(args[0]));

        case "startsWith":
            return String(args[0]).startsWith(String(args[1]));

        case "endsWith":
            return String(args[0]).endsWith(String(args[1]));

        case "length":
            return String(args[0]).length;

        case "cat":
            return args.map(String).join("");

        case "substr":
            return String(args[0]).slice(Number(args[1]), Number(args[1]) + Number(args[2]));

        case "+":
            return Number(args[0]) + Number(args[1]);

        case "-":
            return Number(args[0]) - Number(args[1]);

        case "*":
            return Number(args[0]) * Number(args[1]);

        case "/":
            return Number(args[0]) / Number(args[1]);

        case "%":
            return Number(args[0]) % Number(args[1]);

        case "!":
            return !Boolean(args[0]);

        case "and":
            return args.every(Boolean);

        case "or":
            return args.some(Boolean);

        case "xor":
            return Boolean(args[0]) !== Boolean(args[1]);

        default:
            throw new Error(`Unsupported JSON Logic operator: ${operator}`);
    }
};
