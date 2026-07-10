import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    add,
    and,
    between,
    concat,
    contains,
    div,
    endsWith,
    eq,
    eqv,
    gt,
    gte,
    implies,
    lit,
    lt,
    lte,
    mod,
    mul,
    nand,
    neq,
    nor,
    not,
    notOneOf,
    oneOf,
    or,
    startsWith,
    sub,
    stringLength,
    substring,
    ref,
    xor,
    type Expr,
    type Primitive,
} from "./index.js";
import { toPredicate } from "./run.js";
import { createZ3Compiler } from "./z3.js";

const cases = [
    ["not", not(lit(false)), true],
    ["and", and(lit(true), lit(true)), true],
    ["or", or(lit(false), lit(true)), true],
    ["xor", xor(lit(true), lit(false)), true],
    ["eqv", eqv(lit(true), lit(true)), true],
    ["implies", implies(lit(true), lit(false)), false],
    ["nand", nand(lit(true), lit(true)), false],
    ["nor", nor(lit(false), lit(false)), true],
    ["neq", neq(lit("a"), lit("b")), true],
    ["lt", lt(lit(1), lit(2)), true],
    ["lte", lte(lit(2), lit(2)), true],
    ["gt", gt(lit(3), lit(2)), true],
    ["gte", gte(lit(3), lit(3)), true],
    ["between", between(lit(2), lit(1), lit(3)), true],
    ["contains", contains(lit("security policy"), lit("policy")), true],
    ["startsWith", startsWith(lit("docs/security-policy"), lit("docs/")), true],
    ["endsWith", endsWith(lit("person@example.com"), lit("@example.com")), true],
    ["oneOf", oneOf(lit("published"), ["draft", "published"]), true],
    ["notOneOf", notOneOf(lit("archived"), ["draft", "published"]), true],
    ["stringLength", eq(stringLength(lit("policy")), lit(6)), true],
    ["concat", eq(concat(lit("sec"), lit("urity")), lit("security")), true],
    ["substring", eq(substring(lit("security"), lit(0), lit(3)), lit("sec")), true],
    ["add", eq(add(lit(2), lit(3)), lit(5)), true],
    ["sub", eq(sub(lit(7), lit(2)), lit(5)), true],
    ["mul", eq(mul(lit(4), lit(3)), lit(12)), true],
    ["div", eq(div(lit(12), lit(3)), lit(4)), true],
    ["mod", eq(mod(lit(13), lit(5)), lit(3)), true],
] as const;

const finiteNumber = fc.integer({ min: -100, max: 100 });
const smallString = fc.string({ minLength: 0, maxLength: 8 });
const booleanLiteral = fc.boolean().map(lit);
const numberLiteral = finiteNumber.map(lit);
const stringLiteral = smallString.map(lit);
const sameSortComparableLiterals = fc.oneof(
    fc.tuple(numberLiteral, numberLiteral),
    fc.tuple(stringLiteral, stringLiteral),
    fc.tuple(booleanLiteral, booleanLiteral),
);

const userAge = ref("user.age") as Expr<TestEnv>;
const userEmail = ref("user.email") as Expr<TestEnv>;
const userSuspended = ref("user.suspended") as Expr<TestEnv>;
const documentSensitivity = ref("document.sensitivity") as Expr<TestEnv>;
const documentTitle = ref("document.title") as Expr<TestEnv>;
const documentPublished = ref("document.published") as Expr<TestEnv>;

const testSorts = {
    "user.age": "int",
    "user.email": "string",
    "user.suspended": "boolean",
    "document.sensitivity": "int",
    "document.title": "string",
    "document.published": "boolean",
} as const;

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

const envConstraints = (env: TestEnv): Expr => and(
    eq(userAge, lit(env.user.age)),
    eq(userEmail, lit(env.user.email)),
    eq(userSuspended, lit(env.user.suspended)),
    eq(documentSensitivity, lit(env.document.sensitivity)),
    eq(documentTitle, lit(env.document.title)),
    eq(documentPublished, lit(env.document.published)),
);

const refBooleanExpr = fc.letrec<{
    expr: Expr<TestEnv>;
}>((tie) => ({
    expr: fc.oneof(
        fc.boolean().map((value) => lit(value) as Expr<TestEnv>),
        fc.tuple(fc.constant(userAge), fc.constant(documentSensitivity)).map(([left, right]) => gte(left, right)),
        fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => between(left, lit(18), right)),
        fc.tuple(fc.constant(userEmail), fc.constantFrom("@example.com", "@other.test").map(lit)).map(([left, right]) => endsWith(left, right)),
        fc.tuple(fc.constant(documentTitle), smallString.map(lit)).map(([left, right]) => contains(left, right)),
        fc.constant(documentPublished),
        fc.constant(not(userSuspended)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => and(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => or(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => implies(left, right)),
    ).map((expr) => expr as Expr<TestEnv>),
})).expr;

const booleanExpr = fc.letrec<{
    expr: Expr;
}>((tie) => ({
    expr: fc.oneof(
        booleanLiteral,
        sameSortComparableLiterals.map(([left, right]) => eq(left, right)),
        sameSortComparableLiterals.map(([left, right]) => neq(left, right)),
        fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => lt(left, right)),
        fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => lte(left, right)),
        fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => gt(left, right)),
        fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => gte(left, right)),
        fc.tuple(numberLiteral, numberLiteral, numberLiteral).map(([value, min, max]) =>
            between(value, min, max),
        ),
        fc.tuple(stringLiteral, stringLiteral).map(([self, search]) => contains(self, search)),
        fc.tuple(stringLiteral, stringLiteral).map(([self, prefix]) => startsWith(self, prefix)),
        fc.tuple(stringLiteral, stringLiteral).map(([self, suffix]) => endsWith(self, suffix)),
        fc.tuple(stringLiteral, fc.array(smallString, { minLength: 1, maxLength: 4 })).map(
            ([value, values]) => oneOf(value, values as [Primitive, ...Primitive[]]),
        ),
        fc.tuple(stringLiteral, fc.array(smallString, { minLength: 1, maxLength: 4 })).map(
            ([value, values]) => notOneOf(value, values as [Primitive, ...Primitive[]]),
        ),
        tie("expr").map(not),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => and(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => or(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => xor(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => eqv(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => implies(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => nand(left, right)),
        fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => nor(left, right)),
    ),
})).expr;

describe("z3-supported predicate combinators", () => {
    it.each(cases)("supports %s in the JavaScript interpreter", (_name, expr, expected) => {
        expect(toPredicate(expr)({})).toBe(expected);
    });

    it.each(cases)("supports %s in the Z3 compiler", async (_name, expr, expected) => {
        const z3 = await createZ3Compiler({});
        const solver = z3.solver(expected ? expr : not(expr));

        expect(await solver.check()).toBe("sat");
    });

    it("property: Z3 agrees with toPredicate for closed literal expressions", async () => {
        const z3 = await createZ3Compiler({});

        await fc.assert(
            fc.asyncProperty(booleanExpr, async (expr) => {
                const jsResult = toPredicate(expr)({});
                const z3Result = await z3.solver(expr).check();

                expect(z3Result).toBe(jsResult ? "sat" : "unsat");
            }),
            { numRuns: 100 },
        );
    });

    it("property: Z3 agrees with toPredicate for ref expressions under a concrete env", async () => {
        const z3 = await createZ3Compiler(testSorts);

        await fc.assert(
            fc.asyncProperty(refBooleanExpr, envArbitrary, async (expr, env) => {
                const jsResult = toPredicate(expr)(env);
                const z3Result = await z3.solver(and(envConstraints(env), expr)).check();

                expect(z3Result).toBe(jsResult ? "sat" : "unsat");
            }),
            { numRuns: 100 },
        );
    });
});
