import type { EnvOf, Expr, Primitive } from "./index.js";

type Env = Record<string, unknown>;

const getPath = (value: unknown, path: readonly string[]): unknown =>
    path.reduce(
        (current, key) =>
            typeof current === "object" && current !== null
                ? (current as Record<string, unknown>)[key]
                : undefined,
        value,
    );

export const evaluate = (expr: Expr, env: Env): Primitive => {
    switch (expr._tag) {
        case "Literal":
            return expr.value;

        case "Ref":
            return getPath(env[expr.name], expr.path) as Primitive;

        case "Eq":
            return evaluate(expr.left, env) === evaluate(expr.right, env);

        case "Neq":
            return evaluate(expr.left, env) !== evaluate(expr.right, env);

        case "Lt":
            return Number(evaluate(expr.left, env)) < Number(evaluate(expr.right, env));

        case "Lte":
            return Number(evaluate(expr.left, env)) <= Number(evaluate(expr.right, env));

        case "Gt":
            return Number(evaluate(expr.left, env)) > Number(evaluate(expr.right, env));

        case "Gte":
            return Number(evaluate(expr.left, env)) >= Number(evaluate(expr.right, env));

        case "Contains":
            return String(evaluate(expr.self, env)).includes(String(evaluate(expr.search, env)));

        case "StartsWith":
            return String(evaluate(expr.self, env)).startsWith(String(evaluate(expr.prefix, env)));

        case "EndsWith":
            return String(evaluate(expr.self, env)).endsWith(String(evaluate(expr.suffix, env)));

        case "StringLength":
            return String(evaluate(expr.self, env)).length;

        case "Concat":
            return `${String(evaluate(expr.left, env))}${String(evaluate(expr.right, env))}`;

        case "Substring":
            return String(evaluate(expr.self, env)).slice(
                Number(evaluate(expr.offset, env)),
                Number(evaluate(expr.offset, env)) + Number(evaluate(expr.length, env)),
            );

        case "Add":
            return Number(evaluate(expr.left, env)) + Number(evaluate(expr.right, env));

        case "Sub":
            return Number(evaluate(expr.left, env)) - Number(evaluate(expr.right, env));

        case "Mul":
            return Number(evaluate(expr.left, env)) * Number(evaluate(expr.right, env));

        case "Div":
            return Number(evaluate(expr.left, env)) / Number(evaluate(expr.right, env));

        case "Not":
            return !Boolean(evaluate(expr.expr, env));

        case "And":
            return Boolean(evaluate(expr.left, env)) && Boolean(evaluate(expr.right, env));

        case "Or":
            return Boolean(evaluate(expr.left, env)) || Boolean(evaluate(expr.right, env));

        case "Xor": {
            const left = Boolean(evaluate(expr.left, env));
            const right = Boolean(evaluate(expr.right, env));
            return left !== right;
        }

        case "Eqv": {
            const left = Boolean(evaluate(expr.left, env));
            const right = Boolean(evaluate(expr.right, env));
            return left === right;
        }

        case "Implies":
            return !Boolean(evaluate(expr.antecedent, env)) || Boolean(evaluate(expr.consequent, env));
    }
};

export const toPredicate =
    <E extends Expr>(expr: E) =>
        (env: EnvOf<E>): boolean =>
            Boolean(evaluate(expr, env as Env));

export const run = toPredicate;

