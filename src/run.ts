import type { EnvOf, Expr, Primitive } from "./index.js";

type Env = Record<string, unknown>;
type ToPredicateOptions = { readonly mode?: "safe" | "fast" };

const getPath = (value: unknown, path: readonly string[]): unknown =>
    path.reduce(
        (current, key) =>
            typeof current === "object" && current !== null
                ? (current as Record<string, unknown>)[key]
                : undefined,
        value,
    );

const evaluate = (expr: Expr, env: Env): Primitive => {
    switch (expr._tag) {
        case "Literal":
            return expr.value;

        case "Ref":
            return getPath(env[expr.name], expr.path) as Primitive;

        case "Eq":
            return evaluate(expr.left, env) === evaluate(expr.right, env);

        case "Neq":
            return evaluate(expr.left, env) !== evaluate(expr.right, env);

        case "In": {
            const value = evaluate(expr.value, env);
            return expr.values.some((item) => evaluate(item, env) === value);
        }

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

        case "Mod":
            return Number(evaluate(expr.left, env)) % Number(evaluate(expr.right, env));

        case "Not":
            return !Boolean(evaluate(expr.expr, env));

        case "And":
            return Boolean(evaluate(expr.left, env)) && Boolean(evaluate(expr.right, env));

        case "Or":
            return Boolean(evaluate(expr.left, env)) || Boolean(evaluate(expr.right, env));

        case "Xor":
            return Boolean(evaluate(expr.left, env)) !== Boolean(evaluate(expr.right, env));

        case "Eqv":
            return Boolean(evaluate(expr.left, env)) === Boolean(evaluate(expr.right, env));

        case "Implies":
            return !Boolean(evaluate(expr.antecedent, env)) || Boolean(evaluate(expr.consequent, env));
    }
};

const js = (value: unknown): string => JSON.stringify(value);

const refToJavaScript = (name: string, path: readonly string[]): string =>
    [`env[${js(name)}]`, ...path.map((key) => `?.[${js(key)}]`)].join("");

const expressionSourceCache = new WeakMap<Expr, string>();
const fastPredicateCache = new WeakMap<Expr, (env: Env) => boolean>();
const safePredicateCache = new WeakMap<Expr, (env: Env) => boolean>();

const exprToJavaScript = (expr: Expr): string => {
    const cached = expressionSourceCache.get(expr);
    if (cached !== undefined) {
        return cached;
    }

    const source = (() => {
        switch (expr._tag) {
            case "Literal":
                return js(expr.value);

            case "Ref":
                return refToJavaScript(expr.name, expr.path);

            case "Eq":
                return `(${exprToJavaScript(expr.left)} === ${exprToJavaScript(expr.right)})`;

            case "Neq":
                return `(${exprToJavaScript(expr.left)} !== ${exprToJavaScript(expr.right)})`;

            case "In": {
                const value = exprToJavaScript(expr.value);
                if (expr.values.length === 0) {
                    return "false";
                }

                return `(${expr.values.map((item) => `${value} === ${exprToJavaScript(item)}`).join(" || ")})`;
            }

            case "Lt":
                return `(Number(${exprToJavaScript(expr.left)}) < Number(${exprToJavaScript(expr.right)}))`;

            case "Lte":
                return `(Number(${exprToJavaScript(expr.left)}) <= Number(${exprToJavaScript(expr.right)}))`;

            case "Gt":
                return `(Number(${exprToJavaScript(expr.left)}) > Number(${exprToJavaScript(expr.right)}))`;

            case "Gte":
                return `(Number(${exprToJavaScript(expr.left)}) >= Number(${exprToJavaScript(expr.right)}))`;

            case "Contains":
                return `(String(${exprToJavaScript(expr.self)}).includes(String(${exprToJavaScript(expr.search)})))`;

            case "StartsWith":
                return `(String(${exprToJavaScript(expr.self)}).startsWith(String(${exprToJavaScript(expr.prefix)})))`;

            case "EndsWith":
                return `(String(${exprToJavaScript(expr.self)}).endsWith(String(${exprToJavaScript(expr.suffix)})))`;

            case "StringLength":
                return `(String(${exprToJavaScript(expr.self)}).length)`;

            case "Concat":
                return `(String(${exprToJavaScript(expr.left)}) + String(${exprToJavaScript(expr.right)}))`;

            case "Substring": {
                const self = exprToJavaScript(expr.self);
                const offset = exprToJavaScript(expr.offset);
                const length = exprToJavaScript(expr.length);
                return `(((_offset) => String(${self}).slice(_offset, _offset + Number(${length})))(Number(${offset})))`;
            }

            case "Add":
                return `(Number(${exprToJavaScript(expr.left)}) + Number(${exprToJavaScript(expr.right)}))`;

            case "Sub":
                return `(Number(${exprToJavaScript(expr.left)}) - Number(${exprToJavaScript(expr.right)}))`;

            case "Mul":
                return `(Number(${exprToJavaScript(expr.left)}) * Number(${exprToJavaScript(expr.right)}))`;

            case "Div":
                return `(Number(${exprToJavaScript(expr.left)}) / Number(${exprToJavaScript(expr.right)}))`;

            case "Mod":
                return `(Number(${exprToJavaScript(expr.left)}) % Number(${exprToJavaScript(expr.right)}))`;

            case "Not":
                return `(!Boolean(${exprToJavaScript(expr.expr)}))`;

            case "And":
                return `(Boolean(${exprToJavaScript(expr.left)}) && Boolean(${exprToJavaScript(expr.right)}))`;

            case "Or":
                return `(Boolean(${exprToJavaScript(expr.left)}) || Boolean(${exprToJavaScript(expr.right)}))`;

            case "Xor":
                return `(Boolean(${exprToJavaScript(expr.left)}) !== Boolean(${exprToJavaScript(expr.right)}))`;

            case "Eqv":
                return `(Boolean(${exprToJavaScript(expr.left)}) === Boolean(${exprToJavaScript(expr.right)}))`;

            case "Implies":
                return `(!Boolean(${exprToJavaScript(expr.antecedent)}) || Boolean(${exprToJavaScript(expr.consequent)}))`;
        }
    })();

    expressionSourceCache.set(expr, source);
    return source;
};

const toFastPredicate = <E extends Expr>(expr: E): ((env: EnvOf<E>) => boolean) => {
    const cached = fastPredicateCache.get(expr);
    if (cached !== undefined) {
        return cached as (env: EnvOf<E>) => boolean;
    }

    const predicate = new Function("env", `return Boolean(${exprToJavaScript(expr)});`) as (env: Env) => boolean;
    fastPredicateCache.set(expr, predicate);
    return predicate as (env: EnvOf<E>) => boolean;
};

const toSafePredicate = <E extends Expr>(expr: E): ((env: EnvOf<E>) => boolean) => {
    const cached = safePredicateCache.get(expr);
    if (cached !== undefined) {
        return cached as (env: EnvOf<E>) => boolean;
    }

    const predicate = (env: Env): boolean => Boolean(evaluate(expr, env));
    safePredicateCache.set(expr, predicate);
    return predicate as (env: EnvOf<E>) => boolean;
};

export const toPredicate = <E extends Expr>(
    expr: E,
    options: ToPredicateOptions = {},
): ((env: EnvOf<E>) => boolean) =>
    options.mode === "safe" ? toSafePredicate(expr) : toFastPredicate(expr);

export const run = toPredicate;
