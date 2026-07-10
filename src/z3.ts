import { init } from "z3-solver";
import type { Expr, Primitive, Schema } from "./index.js";

export type Z3Sort = "boolean" | "string" | "number";

/**
 * Keys correspond to the fully qualified paths produced by ref().
 *
 * Example:
 * {
 *   "user.role": "string",
 *   "user.orgId": "string",
 *   "project.orgId": "string",
 *   "project.active": "boolean"
 * }
 */
export type Z3Sorts = Readonly<Record<string, Z3Sort>>;

const refKey = (expr: Extract<Expr, { _tag: "Ref" }>): string =>
    [expr.name, ...expr.path].join(".");

const z3Symbol = (expr: Extract<Expr, { _tag: "Ref" }>): string =>
    refKey(expr).replace(/\./g, "__");

const scalarSort = (schema: Schema): Z3Sort | undefined => {
    switch (schema._tag) {
        case "BooleanSchema":
            return "boolean";
        case "EnumSchema":
        case "StringSchema":
            return "string";
        case "NumberSchema":
            return "number";
        case "ObjectSchema":
            return undefined;
    }
};

const collectSorts = (
    schema: Schema,
    path: readonly string[],
    output: Record<string, Z3Sort>,
): void => {
    if (schema._tag === "ObjectSchema") {
        for (const [key, value] of Object.entries(schema.fields)) {
            collectSorts(value, [...path, key], output);
        }
        return;
    }

    const sort = scalarSort(schema);

    if (sort !== undefined) {
        output[path.join(".")] = sort;
    }
};

export const z3Sorts = (
    schemas: Readonly<Record<string, Schema>>,
): Z3Sorts => {
    const output: Record<string, Z3Sort> = {};

    for (const [name, schema] of Object.entries(schemas)) {
        collectSorts(schema, [name], output);
    }

    return output;
};

export const createZ3Compiler = async (sorts: Z3Sorts) => {
    const { Context } = await init();
    const context = new Context("predicate-ast");

    /*
     * Z3 has several different expression types:
     * BoolExpr, ArithExpr, SeqExpr, and so on.
     *
     * The `unknown -> any` boundary is kept local to this compiler rather
     * than leaking Z3's heterogeneous expression types into the domain AST.
     */
    type Z3Value = any;
    type Z3Boolean = any;

    const sortOfRef = (
        expr: Extract<Expr, { _tag: "Ref" }>,
    ): Z3Sort => {
        const key = refKey(expr);
        const sort = sorts[key];

        if (sort === undefined) {
            throw new Error(`Missing Z3 sort for reference: ${key}`);
        }

        return sort;
    };

    const compileRef = (
        expr: Extract<Expr, { _tag: "Ref" }>,
    ): Z3Value => {
        const symbol = z3Symbol(expr);

        switch (sortOfRef(expr)) {
            case "boolean":
                return context.Bool.const(symbol);

            case "string":
                return context.String.const(symbol);

            case "number":
                // Real rather than Int allows both integral and decimal values.
                return context.Real.const(symbol);
        }
    };

    const compileLiteral = (
        value: Primitive,
        expectedSort?: Z3Sort,
    ): Z3Value => {
        if (value === null) {
            throw new Error(
                "Null is not supported yet. Add an Option-like encoding or nullable sort.",
            );
        }

        const actualSort: Z3Sort =
            expectedSort ??
            (() => {
                switch (typeof value) {
                    case "boolean":
                        return "boolean";
                    case "string":
                        return "string";
                    case "number":
                        return "number";
                    default:
                        throw new Error(`Unsupported literal: ${String(value)}`);
                }
            })();

        switch (actualSort) {
            case "boolean": {
                if (typeof value !== "boolean") {
                    throw new TypeError(
                        `Expected boolean literal, received ${typeof value}`,
                    );
                }

                return context.Bool.val(value);
            }

            case "string": {
                if (typeof value !== "string") {
                    throw new TypeError(
                        `Expected string literal, received ${typeof value}`,
                    );
                }

                return context.String.val(value);
            }

            case "number": {
                if (typeof value !== "number" || !Number.isFinite(value)) {
                    throw new TypeError(
                        `Expected finite number literal, received ${String(value)}`,
                    );
                }

                // Passing a string avoids unnecessary floating-point conversion
                // inside the Z3 binding.
                return context.Real.val(String(value));
            }
        }
    };

    const knownSort = (expr: Expr): Z3Sort | undefined => {
        switch (expr._tag) {
            case "Ref":
                return sortOfRef(expr);

            case "Literal": {
                if (expr.value === null) {
                    return undefined;
                }

                switch (typeof expr.value) {
                    case "boolean":
                        return "boolean";

                    case "string":
                        return "string";

                    case "number":
                        return "number";

                    default:
                        return undefined;
                }
            }

            case "Eq":
            case "Neq":
            case "Lt":
            case "Lte":
            case "Gt":
            case "Gte":
            case "Contains":
            case "StartsWith":
            case "EndsWith":
            case "Not":
            case "And":
            case "Or":
            case "Xor":
            case "Eqv":
            case "Implies":
                return "boolean";

            case "StringLength":
                return "number";

            case "Concat":
            case "Substring":
                return "string";

            case "Add":
            case "Sub":
            case "Mul":
            case "Div":
                return "number";
        }
    };

    const compileValue = (
        expr: Expr,
        expectedSort?: Z3Sort,
    ): Z3Value => {
        switch (expr._tag) {
            case "Ref":
                return compileRef(expr);

            case "Literal":
                return compileLiteral(expr.value, expectedSort);

            case "Eq":
            case "Neq":
            case "Lt":
            case "Lte":
            case "Gt":
            case "Gte":
            case "Contains":
            case "StartsWith":
            case "EndsWith":
            case "Not":
            case "And":
            case "Or":
            case "Xor":
            case "Eqv":
            case "Implies":
                return compileBoolean(expr);

            case "StringLength":
                return compileValue(expr.self, "string").length();

            case "Concat":
                return compileValue(expr.left, "string").concat(
                    compileValue(expr.right, "string"),
                );

            case "Substring": {
                const compileStringIndex = (index: Expr): number => {
                    if (index._tag !== "Literal" || typeof index.value !== "number" || !Number.isInteger(index.value)) {
                        throw new TypeError("Z3 substring indexes must be integer literals for now");
                    }

                    return index.value;
                };

                return compileValue(expr.self, "string").extract(
                    compileStringIndex(expr.offset),
                    compileStringIndex(expr.length),
                );
            }

            case "Add":
                return compileValue(expr.left, "number").add(compileValue(expr.right, "number"));

            case "Sub":
                return compileValue(expr.left, "number").sub(compileValue(expr.right, "number"));

            case "Mul":
                return compileValue(expr.left, "number").mul(compileValue(expr.right, "number"));

            case "Div":
                return compileValue(expr.left, "number").div(compileValue(expr.right, "number"));
        }
    };

    const compileEquality = (
        expr: Extract<Expr, { _tag: "Eq" }>,
    ): Z3Boolean => {
        const leftSort = knownSort(expr.left);
        const rightSort = knownSort(expr.right);

        if (
            leftSort !== undefined &&
            rightSort !== undefined &&
            leftSort !== rightSort
        ) {
            throw new TypeError(
                `Cannot compare Z3 values of different sorts: ${leftSort} and ${rightSort}`,
            );
        }

        const sort = leftSort ?? rightSort;

        if (sort === undefined) {
            throw new Error("Could not determine the sort of equality operands");
        }

        const left = compileValue(expr.left, sort);
        const right = compileValue(expr.right, sort);

        return left.eq(right);
    };

    const compileNumberComparison = (
        expr: Extract<Expr, { _tag: "Lt" | "Lte" | "Gt" | "Gte" }>,
    ): Z3Boolean => {
        const left = compileValue(expr.left, "number");
        const right = compileValue(expr.right, "number");

        switch (expr._tag) {
            case "Lt":
                return left.lt(right);
            case "Lte":
                return left.le(right);
            case "Gt":
                return left.gt(right);
            case "Gte":
                return left.ge(right);
        }
    };

    const compileStringPredicate = (
        expr: Extract<Expr, { _tag: "Contains" | "StartsWith" | "EndsWith" }>,
    ): Z3Boolean => {
        switch (expr._tag) {
            case "Contains":
                return compileValue(expr.self, "string").contains(
                    compileValue(expr.search, "string"),
                );

            case "StartsWith":
                return compileValue(expr.prefix, "string").prefixOf(
                    compileValue(expr.self, "string"),
                );

            case "EndsWith":
                return compileValue(expr.suffix, "string").suffixOf(
                    compileValue(expr.self, "string"),
                );
        }
    };

    const compileBoolean = (expr: Expr): Z3Boolean => {
        switch (expr._tag) {
            case "Literal": {
                if (typeof expr.value !== "boolean") {
                    throw new TypeError(
                        `Expected a boolean expression, received ${typeof expr.value}`,
                    );
                }

                return context.Bool.val(expr.value);
            }

            case "Ref": {
                if (sortOfRef(expr) !== "boolean") {
                    throw new TypeError(
                        `Reference ${refKey(expr)} is not boolean`,
                    );
                }

                return compileRef(expr);
            }

            case "Eq":
                return compileEquality(expr);

            case "Neq":
                return context.Not(compileEquality({
                    _tag: "Eq",
                    left: expr.left,
                    right: expr.right,
                }));

            case "Lt":
            case "Lte":
            case "Gt":
            case "Gte":
                return compileNumberComparison(expr);

            case "Contains":
            case "StartsWith":
            case "EndsWith":
                return compileStringPredicate(expr);

            case "Not":
                return context.Not(compileBoolean(expr.expr));

            case "And":
                return context.And(
                    compileBoolean(expr.left),
                    compileBoolean(expr.right),
                );

            case "Or":
                return context.Or(
                    compileBoolean(expr.left),
                    compileBoolean(expr.right),
                );

            case "Xor":
                return context.Xor(
                    compileBoolean(expr.left),
                    compileBoolean(expr.right),
                );

            case "Eqv":
                return compileBoolean(expr.left).eq(compileBoolean(expr.right));

            case "Implies":
                return context.Implies(
                    compileBoolean(expr.antecedent),
                    compileBoolean(expr.consequent),
                );
        }
    };

    return {
        context,

        compile(expr: Expr): Z3Boolean {
            return compileBoolean(expr);
        },

        solver(expr: Expr) {
            const solver = new context.Solver();
            solver.add(compileBoolean(expr));
            return solver;
        },
    };
}; 
