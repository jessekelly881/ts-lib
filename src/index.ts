// mini-predicate-ast.ts

export type Primitive = string | number | boolean | null;

declare const EnvTypeId: unique symbol;

export type Expr<A = unknown> = (
    | { _tag: "Ref"; name: string; path: readonly string[] }
    | { _tag: "Literal"; value: Primitive }
    | { _tag: "Eq"; left: Expr; right: Expr }
    | { _tag: "Neq"; left: Expr; right: Expr }
    | { _tag: "Lt"; left: Expr; right: Expr }
    | { _tag: "Lte"; left: Expr; right: Expr }
    | { _tag: "Gt"; left: Expr; right: Expr }
    | { _tag: "Gte"; left: Expr; right: Expr }
    | { _tag: "Contains"; self: Expr; search: Expr }
    | { _tag: "StartsWith"; self: Expr; prefix: Expr }
    | { _tag: "EndsWith"; self: Expr; suffix: Expr }
    | { _tag: "Not"; expr: Expr }
    | { _tag: "And"; left: Expr; right: Expr }
    | { _tag: "Or"; left: Expr; right: Expr }
    | { _tag: "Xor"; left: Expr; right: Expr }
    | { _tag: "Eqv"; left: Expr; right: Expr }
    | { _tag: "Implies"; antecedent: Expr; consequent: Expr }
) & { readonly [EnvTypeId]?: A };

export type Simplify<A> = { readonly [K in keyof A]: A[K] } & {};

export type EnvOf<E> = E extends Expr<infer A> ? Simplify<A> : unknown;

type ExprInput = Expr | Primitive;
type EnvOfInput<I> = I extends Expr<infer A> ? A : unknown;
type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
    value: infer I,
) => void
    ? I
    : never;
type EnvOfInputs<Items extends readonly ExprInput[]> = UnionToIntersection<
    EnvOfInput<Items[number]>
>;

export type PrimitiveOf<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends null
          ? null
          : Primitive;

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

export type ObjectModel<Fields extends Readonly<Record<string, Schema>>, A = unknown> = ObjectSchema<Fields> & {
    readonly [K in keyof Fields]: Fields[K] extends ObjectSchema<infer NestedFields>
        ? ObjectModel<NestedFields, A>
        : Expr<A>;
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

const refFromParts = <A>(name: string, path: readonly string[]): Expr<A> => ({
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

export const lit = <A extends Primitive>(value: A): Expr<unknown> => ({
    _tag: "Literal",
    value,
});

const isExpr = (value: unknown): value is Expr =>
    typeof value === "object" &&
    value !== null &&
    "_tag" in value;

const expr = <A extends ExprInput>(value: A): Expr<EnvOfInput<A>> =>
    (isExpr(value) ? value : lit(value)) as Expr<EnvOfInput<A>>;

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

const binaryValue = <
    Tag extends "Eq" | "Neq" | "Lt" | "Lte" | "Gt" | "Gte",
    Left extends ExprInput,
    Right extends ExprInput,
>(
    tag: Tag,
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => ({
    _tag: tag,
    left: expr(left),
    right: expr(right),
});

export const eq = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Eq", left, right);

export const neq = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Neq", left, right);

export const lt = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Lt", left, right);

export const lte = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Lte", left, right);

export const gt = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Gt", left, right);

export const gte = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryValue("Gte", left, right);

export const between = <Value extends ExprInput, Min extends ExprInput, Max extends ExprInput>(
    value: Value,
    min: Min,
    max: Max,
): Expr<Simplify<EnvOfInput<Value> & EnvOfInput<Min> & EnvOfInput<Max>>> =>
    and(gte(value, min), lte(value, max)) as Expr<
        Simplify<EnvOfInput<Value> & EnvOfInput<Min> & EnvOfInput<Max>>
    >;

const binaryString = <
    Tag extends "Contains" | "StartsWith" | "EndsWith",
    Self extends ExprInput,
    Search extends ExprInput,
>(
    tag: Tag,
    self: Self,
    search: Search,
): Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Search>>> => ({
    _tag: tag,
    self: expr(self),
    ...(tag === "Contains"
        ? { search: expr(search) }
        : tag === "StartsWith"
          ? { prefix: expr(search) }
          : { suffix: expr(search) }),
} as Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Search>>>);

export const contains = <Self extends ExprInput, Search extends ExprInput>(
    self: Self,
    search: Search,
): Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Search>>> => binaryString("Contains", self, search);

export const startsWith = <Self extends ExprInput, Prefix extends ExprInput>(
    self: Self,
    prefix: Prefix,
): Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Prefix>>> => binaryString("StartsWith", self, prefix);

export const endsWith = <Self extends ExprInput, Suffix extends ExprInput>(
    self: Self,
    suffix: Suffix,
): Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Suffix>>> => binaryString("EndsWith", self, suffix);

export const oneOf = <Value extends ExprInput, Values extends readonly [Primitive, ...Primitive[]]>(
    value: Value,
    values: Values,
): Expr<Simplify<EnvOfInput<Value>>> =>
    or(...values.map((item) => eq(value, lit(item)))) as Expr<Simplify<EnvOfInput<Value>>>;

export const notOneOf = <Value extends ExprInput, Values extends readonly [Primitive, ...Primitive[]]>(
    value: Value,
    values: Values,
): Expr<Simplify<EnvOfInput<Value>>> => not(oneOf(value, values));

export const not = <Self extends ExprInput>(self: Self): Expr<Simplify<EnvOfInput<Self>>> => ({
    _tag: "Not",
    expr: expr(self),
});

export const and = <Items extends readonly ExprInput[]>(...items: Items): Expr<Simplify<EnvOfInputs<Items>>> => {
    if (items.length === 0) {
        return lit(true) as Expr<Simplify<EnvOfInputs<Items>>>;
    }

    return items.map(expr).reduce((left, right) => ({
        _tag: "And",
        left,
        right,
    })) as Expr<Simplify<EnvOfInputs<Items>>>;
};

export const or = <Items extends readonly ExprInput[]>(...items: Items): Expr<Simplify<EnvOfInputs<Items>>> => {
    if (items.length === 0) {
        return lit(false) as Expr<Simplify<EnvOfInputs<Items>>>;
    }

    return items.map(expr).reduce((left, right) => ({
        _tag: "Or",
        left,
        right,
    })) as Expr<Simplify<EnvOfInputs<Items>>>;
};

const binaryBoolean = <Tag extends "Xor" | "Eqv", Left extends ExprInput, Right extends ExprInput>(
    tag: Tag,
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => ({
    _tag: tag,
    left: expr(left),
    right: expr(right),
});

export const xor = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryBoolean("Xor", left, right);

export const eqv = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> => binaryBoolean("Eqv", left, right);

export const implies = <Antecedent extends ExprInput, Consequent extends ExprInput>(
    antecedent: Antecedent,
    consequent: Consequent,
): Expr<Simplify<EnvOfInput<Antecedent> & EnvOfInput<Consequent>>> => ({
    _tag: "Implies",
    antecedent: expr(antecedent),
    consequent: expr(consequent),
});

export const nand = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> =>
    not(and(left, right)) as Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>>;

export const nor = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: Right,
): Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>> =>
    not(or(left, right)) as Expr<Simplify<EnvOfInput<Left> & EnvOfInput<Right>>>;

