import type { BooleanInput, Expr } from "./ast.js";
import { and, or } from "./predicate.js";

export function has<Key extends string>(
    key: Key,
): (self: Readonly<Record<string, unknown>>) => self is Readonly<Record<Key, unknown>>;
export function has<Key extends string>(
    self: Readonly<Record<string, unknown>>,
    key: Key,
): self is Readonly<Record<Key, unknown>>;
export function has<Key extends string>(
    selfOrKey: Readonly<Record<string, unknown>> | Key,
    maybeKey?: Key,
): boolean | ((self: Readonly<Record<string, unknown>>) => self is Readonly<Record<Key, unknown>>) {
    if (typeof selfOrKey === "string") {
        return (self: Readonly<Record<string, unknown>>): self is Readonly<Record<Key, unknown>> => has(self, selfOrKey);
    }

    return Object.prototype.hasOwnProperty.call(selfOrKey, maybeKey!);
}

export function every<Value, Key extends string>(
    predicate: (value: Value, key: Key) => BooleanInput,
): (self: Readonly<Record<Key, Value>>) => Expr<unknown, "boolean">;
export function every<Value, Key extends string>(
    self: Readonly<Record<Key, Value>>,
    predicate: (value: Value, key: Key) => BooleanInput,
): Expr<unknown, "boolean">;
export function every<Value, Key extends string>(
    selfOrPredicate: Readonly<Record<Key, Value>> | ((value: Value, key: Key) => BooleanInput),
    maybePredicate?: (value: Value, key: Key) => BooleanInput,
): Expr<unknown, "boolean"> | ((self: Readonly<Record<Key, Value>>) => Expr<unknown, "boolean">) {
    if (typeof selfOrPredicate === "function") {
        return (self: Readonly<Record<Key, Value>>) => every(self, selfOrPredicate);
    }

    return and(
        ...Object.entries(selfOrPredicate).map(([key, value]) =>
            maybePredicate!(value as Value, key as Key),
        ),
    );
}

export function some<Value, Key extends string>(
    predicate: (value: Value, key: Key) => BooleanInput,
): (self: Readonly<Record<Key, Value>>) => Expr<unknown, "boolean">;
export function some<Value, Key extends string>(
    self: Readonly<Record<Key, Value>>,
    predicate: (value: Value, key: Key) => BooleanInput,
): Expr<unknown, "boolean">;
export function some<Value, Key extends string>(
    selfOrPredicate: Readonly<Record<Key, Value>> | ((value: Value, key: Key) => BooleanInput),
    maybePredicate?: (value: Value, key: Key) => BooleanInput,
): Expr<unknown, "boolean"> | ((self: Readonly<Record<Key, Value>>) => Expr<unknown, "boolean">) {
    if (typeof selfOrPredicate === "function") {
        return (self: Readonly<Record<Key, Value>>) => some(self, selfOrPredicate);
    }

    return or(
        ...Object.entries(selfOrPredicate).map(([key, value]) =>
            maybePredicate!(value as Value, key as Key),
        ),
    );
}
