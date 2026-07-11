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

export interface TupleSchema<Elements extends readonly Schema[] = readonly Schema[]> {
    readonly _tag: "TupleSchema";
    readonly elements: Elements;
}

export type Schema = ScalarSchema | ObjectSchema | TupleSchema;

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

export type SchemaModel<S extends Schema, A = unknown> = S extends ObjectSchema<infer Fields>
    ? ObjectModel<Fields, A>
    : S extends TupleSchema<infer Elements>
      ? TupleModel<Elements, A>
      : Expr<A, SortOfSchema<S>>;

export type ObjectModel<Fields extends Readonly<Record<string, Schema>>, A = unknown> = ObjectSchema<Fields> & {
    readonly [K in keyof Fields]: SchemaModel<Fields[K], A>;
};

export type TupleModelItems<Elements extends readonly Schema[], A = unknown> = {
    readonly [K in keyof Elements]: Elements[K] extends Schema ? SchemaModel<Elements[K], A> : Elements[K];
};

export type TupleModel<Elements extends readonly Schema[], A = unknown> = TupleSchema<Elements> & TupleModelItems<Elements, A> & {
    readonly items: TupleModelItems<Elements, A>;
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
            : S extends { readonly _tag: "TupleSchema"; readonly elements: infer Elements extends readonly Schema[] }
              ? { readonly [K in keyof Elements]: InferSchema<Elements[K]> }
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

export const tuple = <Elements extends readonly Schema[]>(
    elements: Elements,
): TupleSchema<Elements> => ({
    _tag: "TupleSchema",
    elements,
});

const refFromParts = <A, S extends ExprSort>(name: string, path: readonly string[]): Expr<A, S> => ({
    _tag: "Ref",
    name,
    path,
});

const attachRefsInternal = (
    schema: Schema,
    name: string,
    path: readonly string[] = [],
): unknown => {
    if (schema._tag !== "ObjectSchema" && schema._tag !== "TupleSchema") {
        return refFromParts(name, path);
    }

    const model = schema as unknown;
    const entries = schema._tag === "ObjectSchema"
        ? Object.entries(schema.fields)
        : schema.elements.map((field, index) => [String(index), field] as const);

    for (const [key, field] of entries) {
        Object.defineProperty(model, key, {
            enumerable: true,
            configurable: false,
            value:
                field._tag === "ObjectSchema" || field._tag === "TupleSchema"
                    ? attachRefsInternal(field, name, [...path, key])
                    : refFromParts(name, [...path, key]),
        });
    }

    if (schema._tag === "TupleSchema") {
        Object.defineProperty(model, "items", {
            enumerable: false,
            configurable: false,
            value: schema.elements.map((_, index) => (model as Record<string, unknown>)[String(index)]),
        });
    }

    return model;
};

export const attachModelRefs = (
    schema: Schema,
    name: string,
    path: readonly string[] = [],
): unknown => attachRefsInternal(schema, name, path);

export function object<Fields extends Readonly<Record<string, Schema>>>(
    fields: Fields,
): ObjectSchema<Fields>;
export function object<Fields extends Readonly<Record<string, Schema>>>(
    name: string,
    fields: Fields,
): ObjectSchema<Fields>;
export function object<Fields extends Readonly<Record<string, Schema>>>(
    nameOrFields: string | Fields,
    maybeFields?: Fields,
): ObjectSchema<Fields> {
    const name = typeof nameOrFields === "string" ? nameOrFields : undefined;
    const fields = typeof nameOrFields === "string" ? maybeFields : nameOrFields;

    if (fields === undefined) {
        throw new Error("Missing object fields");
    }

    const schema: ObjectSchema<Fields> = {
        _tag: "ObjectSchema",
        fields,
    };

    return name === undefined ? schema : attachModelRefs(schema, name) as ObjectSchema<Fields>;
}

