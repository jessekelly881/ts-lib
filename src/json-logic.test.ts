import * as fc from "effect/testing/FastCheck";
import { Effect } from "effect";
import { expect, it } from "@effect/vitest";
import {
    and,
    between,
    contains,
    endsWith,
    eq,
    gt,
    gte,
    implies,
    lit,
    lt,
    lte,
    neq,
    not,
    or,
    ref,
    startsWith,
    type Expr,
} from "./index.js";
import { evaluateJsonLogic, toJsonLogic } from "./json-logic.js";
import { toPredicate } from "./run.js";

type TestEnv = {
    readonly user: {
        readonly age: number;
        readonly email: string;
        readonly suspended: boolean;
    };
    readonly document: {
        readonly sensitivity: number;
        readonly title: string;
        readonly published: boolean;
    };
};

const smallString = fc.string({ minLength: 0, maxLength: 8 });

const userAge = ref("user.age") as Expr<TestEnv, "int">;
const userEmail = ref("user.email") as Expr<TestEnv, "string">;
const userSuspended = ref("user.suspended") as Expr<TestEnv, "boolean">;
const documentSensitivity = ref("document.sensitivity") as Expr<TestEnv, "int">;
const documentTitle = ref("document.title") as Expr<TestEnv, "string">;
const documentPublished = ref("document.published") as Expr<TestEnv, "boolean">;

const envArbitrary: fc.Arbitrary<TestEnv> = fc.record({
    user: fc.record({
        age: fc.integer({ min: 0, max: 120 }),
        email: fc.oneof(
            smallString.map((value) => `${value}@example.com`),
            smallString.map((value) => `${value}@other.test`),
        ),
        suspended: fc.boolean(),
    }),
    document: fc.record({
        sensitivity: fc.integer({ min: 0, max: 10 }),
        title: smallString,
        published: fc.boolean(),
    }),
});

const refBooleanExpr = fc.letrec<{
    expr: Expr<TestEnv, "boolean">;
}>((tie) => ({
    expr: fc.oneof(
        fc.boolean().map((value) => lit(value) as Expr<TestEnv>),
        fc.tuple(fc.constant(userAge), fc.constant(documentSensitivity)).map(([left, right]) => gte(left, right)),
        fc.constant(between(userAge, lit(18), lit(65))),
        fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => lt(left, right)),
        fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => lte(left, right)),
        fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => gt(left, right)),
        fc.tuple(fc.constant(userEmail), fc.constantFrom("@example.com", "@other.test").map(lit)).map(([left, right]) => endsWith(left, right)),
        fc.tuple(fc.constant(userEmail), fc.constantFrom("user", "admin", "").map(lit)).map(([left, right]) => startsWith(left, right)),
        fc.tuple(fc.constant(documentTitle), smallString.map(lit)).map(([left, right]) => contains(left, right)),
        fc.constant(documentPublished),
        fc.constant(not(userSuspended)),
        fc.tuple(fc.constant(documentTitle), smallString.map(lit)).map(([left, right]) => eq(left, right)),
        fc.tuple(fc.constant(documentTitle), smallString.map(lit)).map(([left, right]) => neq(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => and(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => or(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => implies(left, right)),
    ).map((expr) => expr as Expr<TestEnv, "boolean">),
})).expr;

it.effect.prop(
    "JSON Logic agrees with toPredicate for ref expressions",
    [refBooleanExpr, envArbitrary],
    ([expr, env]) => Effect.sync(() => {
        const predicateResult = toPredicate(expr)(env);
        const jsonLogicResult = Boolean(evaluateJsonLogic(toJsonLogic(expr), env));

        expect(jsonLogicResult).toBe(predicateResult);
    }),
    { fastCheck: { numRuns: 100 } },
);
