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

        case "And":
            return Boolean(evaluate(expr.left, env)) && Boolean(evaluate(expr.right, env));

        case "Or":
            return Boolean(evaluate(expr.left, env)) || Boolean(evaluate(expr.right, env));
    }
};

export const toPredicate =
    <E extends Expr>(expr: E) =>
        (env: EnvOf<E>): boolean =>
            Boolean(evaluate(expr, env as Env));

export const run = toPredicate;

