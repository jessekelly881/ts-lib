import type { BooleanInput, EnvOfInputs, Expr, ExprInput, Simplify } from "./ast.js";
import { and, neq, or } from "./predicate.js";

export const unique = <Items extends readonly ExprInput[]>(
    items: Items,
): Expr<Simplify<EnvOfInputs<Items>>, "boolean"> =>
    and(
        ...items.flatMap((item, index) =>
            items.slice(index + 1).map((other) => neq(item as never, other as never)),
        ),
    ) as Expr<Simplify<EnvOfInputs<Items>>, "boolean">;

export const some = <Items extends readonly unknown[]>(
    items: Items,
    predicate: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean"> => or(...items.map(predicate));

export const every = <Items extends readonly unknown[]>(
    items: Items,
    predicate: (item: Items[number], index: number) => BooleanInput,
): Expr<unknown, "boolean"> => and(...items.map(predicate));
