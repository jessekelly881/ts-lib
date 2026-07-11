// Modeling schema and model-ref construction

import type { Expr, ExprSort } from "./ast.js";

export type ScalarSchema =
    | { readonly _tag: "StringSchema" }
    | { readonly _tag: "NumberSchema" }
    | { readonly _tag: "IntSchema" }
    | { readonly _tag: "BooleanSchema" }
    | { readonly _tag: "EnumSchema"; readonly values: readonly [string, ...string[]] };

export interface ObjectSchema<Fields extends Readonly<Record<string, Schema>> = Readonly<Record<string, Schema>>> {
    readonly _tag: "ObjectSchema";
    readonly fields: Fields;
}

export type Schema = ScalarSchema | ObjectSchema;

type SortOfSchema<S extends Schema> = S extends { readonly _tag: "StringSchema" }
    ? "string"
    : S extends { readonly _tag: "NumberSchema" }
      ? "number"
      : S extends { readonly _tag: "IntSchema" }
        ? "int"
        : S extends { readonly _tag: "BooleanSchema" }
          ? "boolean"
          : S extends { readonly _tag: "EnumSchema" }
            ? "string"
            : ExprSort;

export type ObjectModel<Fields extends Readonly<Record<string, Schema>>, A = unknown> = ObjectSchema<Fields> & {
    readonly [K in keyof Fields]: Fields[K] extends ObjectSchema<infer NestedFields>
        ? ObjectModel<NestedFields, A>
        : Expr<A, SortOfSchema<Fields[K]>>;
};

export type InferSchema<S extends Schema> = S extends { readonly _tag: "StringSchema" }
    ? string
    : S extends { readonly _tag: "NumberSchema" }
      ? number
      : S extends { readonly _tag: "IntSchema" }
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

export const int = (): ScalarSchema => ({ _tag: "IntSchema" });

export const boolean = (): ScalarSchema => ({ _tag: "BooleanSchema" });

export const enum_ = <Values extends readonly [string, ...string[]]>(
    values: Values,
): { readonly _tag: "EnumSchema"; readonly values: Values } => ({
    _tag: "EnumSchema",
    values,
});

export { enum_ as enum };

const refFromParts = <A, S extends ExprSort>(name: string, path: readonly string[]): Expr<A, S> => ({
    _tag: "Ref",
    name,
    path,
});

const attachRefs = <Fields extends Readonly<Record<string, Schema>>, A = unknown>(
    schema: ObjectSchema<Fields>,
    name: string,
    path: readonly string[] = [],
): ObjectModel<Fields, A> => {
    const model = schema as ObjectModel<Fields, A>;

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

