import type { Expr, StringInput, MergeEnv } from "./ast.js";
import { contains, eq, gt, startsWith as startsWithPredicate, endsWith as endsWithPredicate, stringLength } from "./predicate.js";

export function includes<Search extends StringInput>(
    search: Search,
): <Self extends StringInput>(self: Self) => Expr<MergeEnv<Self, Search>, "boolean">;
export function includes<Self extends StringInput, Search extends StringInput>(
    self: Self,
    search: Search,
): Expr<MergeEnv<Self, Search>, "boolean">;
export function includes<Self extends StringInput, Search extends StringInput>(
    selfOrSearch: Self | Search,
    maybeSearch?: Search,
): Expr<MergeEnv<Self, Search>, "boolean"> | (<Self2 extends StringInput>(self: Self2) => Expr<MergeEnv<Self2, Search>, "boolean">) {
    if (maybeSearch === undefined) {
        return (self) => contains(self, selfOrSearch as Search);
    }

    return contains(selfOrSearch as Self, maybeSearch);
}

export function startsWith<Prefix extends StringInput>(
    prefix: Prefix,
): <Self extends StringInput>(self: Self) => Expr<MergeEnv<Self, Prefix>, "boolean">;
export function startsWith<Self extends StringInput, Prefix extends StringInput>(
    self: Self,
    prefix: Prefix,
): Expr<MergeEnv<Self, Prefix>, "boolean">;
export function startsWith<Self extends StringInput, Prefix extends StringInput>(
    selfOrPrefix: Self | Prefix,
    maybePrefix?: Prefix,
): Expr<MergeEnv<Self, Prefix>, "boolean"> | (<Self2 extends StringInput>(self: Self2) => Expr<MergeEnv<Self2, Prefix>, "boolean">) {
    if (maybePrefix === undefined) {
        return (self) => startsWithPredicate(self, selfOrPrefix as Prefix);
    }

    return startsWithPredicate(selfOrPrefix as Self, maybePrefix);
}

export function endsWith<Suffix extends StringInput>(
    suffix: Suffix,
): <Self extends StringInput>(self: Self) => Expr<MergeEnv<Self, Suffix>, "boolean">;
export function endsWith<Self extends StringInput, Suffix extends StringInput>(
    self: Self,
    suffix: Suffix,
): Expr<MergeEnv<Self, Suffix>, "boolean">;
export function endsWith<Self extends StringInput, Suffix extends StringInput>(
    selfOrSuffix: Self | Suffix,
    maybeSuffix?: Suffix,
): Expr<MergeEnv<Self, Suffix>, "boolean"> | (<Self2 extends StringInput>(self: Self2) => Expr<MergeEnv<Self2, Suffix>, "boolean">) {
    if (maybeSuffix === undefined) {
        return (self) => endsWithPredicate(self, selfOrSuffix as Suffix);
    }

    return endsWithPredicate(selfOrSuffix as Self, maybeSuffix);
}

export const isEmpty = <Self extends StringInput>(self: Self) => eq(stringLength(self), 0);

export const isNonEmpty = <Self extends StringInput>(self: Self) => gt(stringLength(self), 0);
