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
    intLit,
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
import {
    booleanExprArb,
    refBooleanExprArb,
    testEnvArb,
    testEnvConstraints,
    testEnvSorts,
} from "./testing/expr-arb.js";
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
    ["substring", eq(substring(lit("security"), intLit(0), intLit(3)), lit("sec")), true],
    ["add", eq(add(lit(2), lit(3)), lit(5)), true],
    ["sub", eq(sub(lit(7), lit(2)), lit(5)), true],
    ["mul", eq(mul(lit(4), lit(3)), lit(12)), true],
    ["div", eq(div(lit(12), lit(3)), lit(4)), true],
    ["mod", eq(mod(intLit(13), intLit(5)), intLit(3)), true],
] as const;


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
            fc.asyncProperty(booleanExprArb(), async (expr) => {
                const jsResult = toPredicate(expr)({});
                const safeResult = toPredicate(expr, { mode: "safe" })({});
                const z3Result = await z3.solver(expr).check();

                expect(safeResult).toBe(jsResult);
                expect(z3Result).toBe(jsResult ? "sat" : "unsat");
            }),
            { numRuns: 100 },
        );
    });

    it("property: Z3 agrees with toPredicate for ref expressions under a concrete env", async () => {
        const z3 = await createZ3Compiler(testEnvSorts);

        await fc.assert(
            fc.asyncProperty(refBooleanExprArb(), testEnvArb(), async (expr, env) => {
                const jsResult = toPredicate(expr)(env);
                const safeResult = toPredicate(expr, { mode: "safe" })(env);
                const z3Result = await z3.solver(and(testEnvConstraints(env), expr)).check();

                expect(safeResult).toBe(jsResult);
                expect(z3Result).toBe(jsResult ? "sat" : "unsat");
            }),
            { numRuns: 100 },
        );
    });
});
