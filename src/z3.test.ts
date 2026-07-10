import { describe, expect, it } from "vitest";
import { and, eqv, implies, lit, nand, nor, not, or, xor } from "./index.js";
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
});
