import fc from "fast-check";
import { expect, it } from "vitest";
import { evaluateJsonLogic, toJsonLogic } from "./json-logic.js";
import { toPredicate } from "./run.js";
import { refBooleanExprArb, testEnvArb } from "./testing/expr-arb.js";

it("JSON Logic agrees with toPredicate for ref expressions", () => {
    fc.assert(
        fc.property(refBooleanExprArb(), testEnvArb(), (expr, env) => {
            const predicateResult = toPredicate(expr)(env);
            const jsonLogicResult = Boolean(evaluateJsonLogic(toJsonLogic(expr), env));

            expect(jsonLogicResult).toBe(predicateResult);
        }),
        { numRuns: 100 },
    );
});
