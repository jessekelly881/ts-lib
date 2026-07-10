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

export interface ObjectSchema<Fields extends Readonly<Record<string, Schema>> = Readonly<Record<string, Schema>>> {
    readonly _tag: "ObjectSchema";
    readonly fields: Fields;
}

export type Schema = ScalarSchema | ObjectSchema;

export type ObjectModel<Fields extends Readonly<Record<string, Schema>>> = ObjectSchema<Fields> & {
    readonly [K in keyof Fields]: Fields[K] extends ObjectSchema<infer NestedFields>
        ? ObjectModel<NestedFields>
        : Expr;
};

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

const refFromParts = (name: string, path: readonly string[]): Expr => ({
    _tag: "Ref",
    name,
    path,
});

const attachRefs = <Fields extends Readonly<Record<string, Schema>>>(
    schema: ObjectSchema<Fields>,
    name: string,
    path: readonly string[] = [],
): ObjectModel<Fields> => {
    const model = schema as ObjectModel<Fields>;

    for (const [key, field] of Object.entries(schema.fields)) {
        Object.defineProperty(model, key, {
            enumerable: true,
            configurable: false,
            value:
                field._tag === "ObjectSchema"
                    ? attachRefs(field, name, [...path, key])
                    : refFromParts(name, [...path, key]),
        });
    }

    return model;
};

export function object<Fields extends Readonly<Record<string, Schema>>>(
    fields: Fields,
): ObjectSchema<Fields>;
export function object<Fields extends Readonly<Record<string, Schema>>>(
    name: string,
    fields: Fields,
): ObjectModel<Fields>;
export function object<Fields extends Readonly<Record<string, Schema>>>(
    nameOrFields: string | Fields,
    maybeFields?: Fields,
): ObjectSchema<Fields> | ObjectModel<Fields> {
    const name = typeof nameOrFields === "string" ? nameOrFields : undefined;
    const fields = typeof nameOrFields === "string" ? maybeFields : nameOrFields;

    if (fields === undefined) {
        throw new Error("Missing object fields");
    }

    const schema: ObjectSchema<Fields> = {
        _tag: "ObjectSchema",
        fields,
    };

    return name === undefined ? schema : attachRefs(schema, name);
}

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
