import type { EnvOf, Expr } from "./index.js";

type Env = Record<string, unknown>;

const js = (value: unknown): string => JSON.stringify(value);

const refToJavaScript = (name: string, path: readonly string[]): string =>
    [`env[${js(name)}]`, ...path.map((key) => `?.[${js(key)}]`)].join("");

const expressionSourceCache = new WeakMap<Expr, string>();
const predicateCache = new WeakMap<Expr, (env: Env) => boolean>();

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

export const toPredicate = <E extends Expr>(expr: E): ((env: EnvOf<E>) => boolean) => {
    const cached = predicateCache.get(expr);
    if (cached !== undefined) {
        return cached as (env: EnvOf<E>) => boolean;
    }

    const predicate = new Function("env", `return Boolean(${exprToJavaScript(expr)});`) as (env: Env) => boolean;
    predicateCache.set(expr, predicate);
    return predicate as (env: EnvOf<E>) => boolean;
};

export const run = toPredicate;
