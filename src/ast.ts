// AST primitives and typed expression constructors

export type Primitive = string | number | boolean | null;

declare const EnvTypeId: unique symbol;
declare const SortTypeId: unique symbol;

export type ExprSort = "boolean" | "string" | "number" | "int" | "null";
export type NumericSort = "number" | "int";

export type PrimitiveSort<A extends Primitive> = A extends string
    ? "string"
    : A extends boolean
      ? "boolean"
      : A extends number
        ? "number"
        : A extends null
          ? "null"
          : ExprSort;

export type Expr<A = unknown, S extends ExprSort = ExprSort> = (
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
    | { _tag: "StringLength"; self: Expr }
    | { _tag: "Concat"; left: Expr; right: Expr }
    | { _tag: "Substring"; self: Expr; offset: Expr; length: Expr }
    | { _tag: "Add"; left: Expr; right: Expr }
    | { _tag: "Sub"; left: Expr; right: Expr }
    | { _tag: "Mul"; left: Expr; right: Expr }
    | { _tag: "Div"; left: Expr; right: Expr }
    | { _tag: "Mod"; left: Expr; right: Expr }
    | { _tag: "Not"; expr: Expr }
    | { _tag: "And"; left: Expr; right: Expr }
    | { _tag: "Or"; left: Expr; right: Expr }
    | { _tag: "Xor"; left: Expr; right: Expr }
    | { _tag: "Eqv"; left: Expr; right: Expr }
    | { _tag: "Implies"; antecedent: Expr; consequent: Expr }
) & { readonly [EnvTypeId]?: A; readonly [SortTypeId]?: S };

export type Simplify<A> = { readonly [K in keyof A]: A[K] } & {};

export type EnvOf<E> = E extends Expr<infer A, ExprSort> ? Simplify<A> : unknown;
export type SortOf<E> = E extends Expr<unknown, infer S> ? S : E extends Primitive ? PrimitiveSort<E> : never;

export type PrimitiveForSort<S extends ExprSort> = S extends "string"
    ? string
    : S extends "boolean"
      ? boolean
      : S extends "number"
        ? number
        : S extends "int"
          ? never
          : S extends "null"
            ? null
            : Primitive;
export type ExprInput<S extends ExprSort = ExprSort> = Expr<unknown, S> | Expr<any, ExprSort> | PrimitiveForSort<S>;
export type EnvOfInput<I> = I extends Expr<infer A, ExprSort> ? A : unknown;
export type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
    value: infer I,
) => void
    ? I
    : never;
export type EnvOfInputs<Items extends readonly ExprInput[]> = UnionToIntersection<
    EnvOfInput<Items[number]>
>;
export type MergeEnv<Left, Right> = Simplify<EnvOfInput<Left> & EnvOfInput<Right>>;
export type SameSortComparable<Left extends ExprInput, Right extends ExprInput> = SortOf<Left> extends SortOf<Right>
    ? Right
    : SortOf<Left> extends NumericSort
      ? SortOf<Right> extends NumericSort
        ? Right
        : never
      : never;
export type NumericInput = ExprInput<NumericSort>;
export type IntInput = ExprInput<"int">;
export type StringInput = ExprInput<"string">;
export type BooleanInput = ExprInput<"boolean">;

export type PrimitiveOf<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends null
          ? null
          : Primitive;

export const lit = <A extends Primitive>(value: A): Expr<unknown, PrimitiveSort<A>> => ({
    _tag: "Literal",
    value,
});

export const intLit = <A extends number>(value: A): Expr<unknown, "int"> => {
    if (!Number.isInteger(value)) {
        throw new TypeError(`Expected integer literal, received ${String(value)}`);
    }

    return {
        _tag: "Literal",
        value,
    };
};

export const isExpr = (value: unknown): value is Expr =>
    typeof value === "object" &&
    value !== null &&
    "_tag" in value;

export const expr = <A extends ExprInput>(value: A): Expr<EnvOfInput<A>, SortOf<A>> =>
    (isExpr(value) ? value : lit(value as Primitive)) as Expr<EnvOfInput<A>, SortOf<A>>;

export const ref = <S extends ExprSort = ExprSort>(path: string): Expr<unknown, S> => {
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
