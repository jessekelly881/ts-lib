// mini-predicate-ast.ts

export type Primitive = string | number | boolean | null;

export type Expr =
    | { _tag: "Ref"; name: string; path: readonly string[] }
    | { _tag: "Literal"; value: Primitive }
    | { _tag: "Eq"; left: Expr; right: Expr }
    | { _tag: "And"; left: Expr; right: Expr }
    | { _tag: "Or"; left: Expr; right: Expr };

export type ScalarSchema =
    | { readonly _tag: "StringSchema" }
    | { readonly _tag: "NumberSchema" }
    | { readonly _tag: "BooleanSchema" }
    | { readonly _tag: "EnumSchema"; readonly values: readonly [string, ...string[]] };

export type Schema =
    | ScalarSchema
    | { readonly _tag: "ObjectSchema"; readonly fields: Readonly<Record<string, Schema>> };

export type InferSchema<S extends Schema> = S extends { readonly _tag: "StringSchema" }
    ? string
    : S extends { readonly _tag: "NumberSchema" }
      ? number
      : S extends { readonly _tag: "BooleanSchema" }
        ? boolean
        : S extends { readonly _tag: "EnumSchema"; readonly values: infer Values extends readonly string[] }
          ? Values[number]
          : S extends { readonly _tag: "ObjectSchema"; readonly fields: infer Fields extends Readonly<Record<string, Schema>> }
            ? { readonly [K in keyof Fields]: InferSchema<Fields[K]> }
            : never;

export const string = (): ScalarSchema => ({ _tag: "StringSchema" });

export const number = (): ScalarSchema => ({ _tag: "NumberSchema" });

export const boolean = (): ScalarSchema => ({ _tag: "BooleanSchema" });

export const enum_ = <Values extends readonly [string, ...string[]]>(
    values: Values,
): { readonly _tag: "EnumSchema"; readonly values: Values } => ({
    _tag: "EnumSchema",
    values,
});

export { enum_ as enum };

export const object = <Fields extends Readonly<Record<string, Schema>>>(
    fields: Fields,
): { readonly _tag: "ObjectSchema"; readonly fields: Fields } => ({
    _tag: "ObjectSchema",
    fields,
});

export const lit = (value: Primitive): Expr => ({
    _tag: "Literal",
    value,
});

const isExpr = (value: unknown): value is Expr =>
    typeof value === "object" &&
    value !== null &&
    "_tag" in value;

const expr = (value: Expr | Primitive): Expr =>
    isExpr(value) ? value : lit(value);

export const ref = (path: string): Expr => {
    const [name, ...rest] = path.split(".");

    if (name === undefined || name.length === 0 || rest.length === 0) {
        throw new Error(`Expected a dotted reference path like "user.role", received: ${path}`);
    }

    if (rest.some((part) => part.length === 0)) {
        throw new Error(`Reference path contains an empty segment: ${path}`);
    }

    return {
        _tag: "Ref",
        name,
        path: rest,
    };
};

export const eq = (left: Expr | Primitive, right: Expr | Primitive): Expr => ({
    _tag: "Eq",
    left: expr(left),
    right: expr(right),
});

export const and = (...items: Expr[]): Expr => {
    if (items.length === 0) {
        return lit(true);
    }

    return items.reduce((left, right) => ({
        _tag: "And",
        left,
        right,
    }));
};

export const or = (...items: Expr[]): Expr => {
    if (items.length === 0) {
        return lit(false);
    }

    return items.reduce((left, right) => ({
        _tag: "Or",
        left,
        right,
    }));
};
