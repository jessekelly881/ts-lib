// Predicate/value expression helpers

import { expr, lit, type BooleanInput, type EnvOfInput, type Expr, type ExprInput, type IntInput, type MergeEnv, type NumericInput, type Primitive, type SameSortComparable, type Simplify, type StringInput, type EnvOfInputs } from "./ast.js";

const binaryValue = <
    Tag extends "Eq" | "Neq" | "Lt" | "Lte" | "Gt" | "Gte",
    Left extends ExprInput,
    Right extends ExprInput,
>(
    tag: Tag,
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => ({
    _tag: tag,
    left: expr(left),
    right: expr(right),
});

export const eq = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: SameSortComparable<Left, Right>,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Eq", left, right);

export const neq = <Left extends ExprInput, Right extends ExprInput>(
    left: Left,
    right: SameSortComparable<Left, Right>,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Neq", left, right);

export const lt = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Lt", left, right);

export const lte = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Lte", left, right);

export const gt = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Gt", left, right);

export const gte = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryValue("Gte", left, right);

export const between = <Value extends NumericInput, Min extends NumericInput, Max extends NumericInput>(
    value: Value,
    min: Min,
    max: Max,
): Expr<Simplify<EnvOfInput<Value> & EnvOfInput<Min> & EnvOfInput<Max>>, "boolean"> =>
    and(gte(value, min), lte(value, max)) as Expr<
        Simplify<EnvOfInput<Value> & EnvOfInput<Min> & EnvOfInput<Max>>,
        "boolean"
    >;

const binaryString = <
    Tag extends "Contains" | "StartsWith" | "EndsWith",
    Self extends StringInput,
    Search extends StringInput,
>(
    tag: Tag,
    self: Self,
    search: Search,
): Expr<MergeEnv<Self, Search>, "boolean"> => ({
    _tag: tag,
    self: expr(self),
    ...(tag === "Contains"
        ? { search: expr(search) }
        : tag === "StartsWith"
          ? { prefix: expr(search) }
          : { suffix: expr(search) }),
} as Expr<MergeEnv<Self, Search>, "boolean">);

export const contains = <Self extends StringInput, Search extends StringInput>(
    self: Self,
    search: Search,
): Expr<MergeEnv<Self, Search>, "boolean"> => binaryString("Contains", self, search);

export const startsWith = <Self extends StringInput, Prefix extends StringInput>(
    self: Self,
    prefix: Prefix,
): Expr<MergeEnv<Self, Prefix>, "boolean"> => binaryString("StartsWith", self, prefix);

export const endsWith = <Self extends StringInput, Suffix extends StringInput>(
    self: Self,
    suffix: Suffix,
): Expr<MergeEnv<Self, Suffix>, "boolean"> => binaryString("EndsWith", self, suffix);

export const oneOf = <Value extends ExprInput, Values extends readonly [Primitive, ...Primitive[]]>(
    value: Value,
    values: Values,
): Expr<Simplify<EnvOfInput<Value>>, "boolean"> =>
    or(...values.map((item) => eq(value as never, lit(item) as never))) as Expr<
        Simplify<EnvOfInput<Value>>,
        "boolean"
    >;

export const notOneOf = <Value extends ExprInput, Values extends readonly [Primitive, ...Primitive[]]>(
    value: Value,
    values: Values,
): Expr<Simplify<EnvOfInput<Value>>, "boolean"> => not(oneOf(value, values));

export const stringLength = <Self extends StringInput>(self: Self): Expr<Simplify<EnvOfInput<Self>>, "int"> => ({
    _tag: "StringLength",
    self: expr(self),
});

export const concat = <Left extends StringInput, Right extends StringInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "string"> => ({
    _tag: "Concat",
    left: expr(left),
    right: expr(right),
});

export const substring = <Self extends StringInput, Offset extends IntInput, Length extends IntInput>(
    self: Self,
    offset: Offset,
    length: Length,
): Expr<Simplify<EnvOfInput<Self> & EnvOfInput<Offset> & EnvOfInput<Length>>, "string"> => ({
    _tag: "Substring",
    self: expr(self),
    offset: expr(offset),
    length: expr(length),
});

const binaryNumber = <
    Tag extends "Add" | "Sub" | "Mul" | "Div" | "Mod",
    Left extends NumericInput,
    Right extends NumericInput,
>(
    tag: Tag,
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, Tag extends "Mod" ? "int" : "number"> => ({
    _tag: tag,
    left: expr(left),
    right: expr(right),
});

export const add = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "number"> => binaryNumber("Add", left, right);

export const sub = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "number"> => binaryNumber("Sub", left, right);

export const mul = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "number"> => binaryNumber("Mul", left, right);

export const div = <Left extends NumericInput, Right extends NumericInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "number"> => binaryNumber("Div", left, right);

export const mod = <Left extends IntInput, Right extends IntInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "int"> => binaryNumber("Mod", left, right);

export const not = <Self extends BooleanInput>(self: Self): Expr<Simplify<EnvOfInput<Self>>, "boolean"> => ({
    _tag: "Not",
    expr: expr(self),
});

export const and = <Items extends readonly BooleanInput[]>(...items: Items): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> => {
    if (items.length === 0) {
        return lit(true) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
    }

    return items.map(expr).reduce((left, right) => ({
        _tag: "And",
        left,
        right,
    })) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
};

export const allDifferent = <Items extends readonly ExprInput[]>(
    items: Items,
): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> =>
    and(
        ...items.flatMap((item, index) =>
            items.slice(index + 1).map((other) => neq(item as never, other as never)),
        ),
    ) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;

export const or = <Items extends readonly BooleanInput[]>(...items: Items): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> => {
    if (items.length === 0) {
        return lit(false) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
    }

    return items.map(expr).reduce((left, right) => ({
        _tag: "Or",
        left,
        right,
    })) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
};

const binaryBoolean = <Tag extends "Xor" | "Eqv", Left extends BooleanInput, Right extends BooleanInput>(
    tag: Tag,
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => ({
    _tag: tag,
    left: expr(left),
    right: expr(right),
});

export const xor = <Left extends BooleanInput, Right extends BooleanInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryBoolean("Xor", left, right);

export const eqv = <Left extends BooleanInput, Right extends BooleanInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> => binaryBoolean("Eqv", left, right);

export const implies = <Antecedent extends BooleanInput, Consequent extends BooleanInput>(
    antecedent: Antecedent,
    consequent: Consequent,
): Expr<MergeEnv<Antecedent, Consequent>, "boolean"> => ({
    _tag: "Implies",
    antecedent: expr(antecedent),
    consequent: expr(consequent),
});

export const nand = <Left extends BooleanInput, Right extends BooleanInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> =>
    not(and(left, right)) as Expr<MergeEnv<Left, Right>, "boolean">;

export const nor = <Left extends BooleanInput, Right extends BooleanInput>(
    left: Left,
    right: Right,
): Expr<MergeEnv<Left, Right>, "boolean"> =>
    not(or(left, right)) as Expr<MergeEnv<Left, Right>, "boolean">;

