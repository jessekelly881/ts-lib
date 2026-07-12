import { expr, type BooleanInput, type EnvOfInputs, type Expr, type ExprInput, type Simplify } from "./ast.js";
import { and, neq, or } from "./predicate.js";

export const unique = <Items extends readonly ExprInput[]>(
    items: Items,
): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> =>
    and(
        ...items.flatMap((item, index) =>
            items.slice(index + 1).map((other) => neq(item as never, other as never)),
        ),
    ) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;

export function some<Item>(
    predicate: (item: Item, index: number) => BooleanInput,
): (items: readonly Item[]) => Expr<unknown, "boolean">;
export function some<Items extends readonly unknown[]>(
    items: Items,
    predicate: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean">;
export function some<Items extends readonly unknown[]>(
    itemsOrPredicate: Items | ((item: Items[number], index: number) => BooleanInput),
    maybePredicate?: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean"> | ((items: Items) => Expr<unknown, "boolean">) {
    if (typeof itemsOrPredicate === "function") {
        return (items: Items) => some(items, itemsOrPredicate);
    }

    return or(...itemsOrPredicate.map(maybePredicate!));
}

export function every<Item>(
    predicate: (item: Item, index: number) => BooleanInput,
): (items: readonly Item[]) => Expr<unknown, "boolean">;
export function every<Items extends readonly unknown[]>(
    items: Items,
    predicate: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean">;
export function every<Items extends readonly unknown[]>(
    itemsOrPredicate: Items | ((item: Items[number], index: number) => BooleanInput),
    maybePredicate?: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean"> | ((items: Items) => Expr<unknown, "boolean">) {
    if (typeof itemsOrPredicate === "function") {
        return (items: Items) => every(items, itemsOrPredicate);
    }

    return and(...itemsOrPredicate.map(maybePredicate!));
}

export function contains<Value extends ExprInput>(
    value: Value,
): <Items extends readonly ExprInput[]>(items: Items) => Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
export function contains<Items extends readonly ExprInput[], Value extends ExprInput>(
    items: Items,
    value: Value,
): Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
export function contains<Items extends readonly ExprInput[], Value extends ExprInput>(
    itemsOrValue: Items | Value,
    maybeValue?: Value,
): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> | ((items: Items) => Expr<Simplify<EnvOfInputs<Items>>, "boolean">) {
    if (maybeValue === undefined) {
        return (items: Items) => contains(items, itemsOrValue as Value);
    }

    return {
        _tag: "In",
        value: expr(maybeValue),
        values: (itemsOrValue as Items).map(expr),
    } as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;
}
