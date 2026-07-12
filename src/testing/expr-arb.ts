import fc from "fast-check";
import {
  add,
  and,
  concat,
  contains,
  div,
  endsWith,
  eq,
  eqv,
  gt,
  gte,
  intLit,
  lit,
  lt,
  lte,
  mod,
  mul,
  neq,
  not,
  oneOf,
  or,
  startsWith,
  stringLength,
  sub,
  substring,
  xor,
  type Expr,
  type Primitive,
} from "../index.js";

export const exprArb = (): fc.Arbitrary<Expr> => {
  const smallNumber = fc.integer({ min: -100, max: 100 });
  const smallString = fc.string({ minLength: 0, maxLength: 8 });
  const primitive = fc.oneof(smallNumber, smallString, fc.boolean(), fc.constant(null));

  return fc.letrec<{
    boolean: Expr<unknown, "boolean">;
    number: Expr<unknown, "number">;
    string: Expr<unknown, "string">;
    expr: Expr;
  }>((tie) => ({
    boolean: fc.oneof(
      fc.boolean().map(lit),
      fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => eq(left, right)),
      fc.tuple(tie("expr"), tie("expr")).map(([left, right]) => neq(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => lt(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => lte(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => gt(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => gte(left, right)),
      fc.tuple(tie("string"), tie("string")).map(([self, search]) => contains(self, search)),
      fc.tuple(tie("string"), tie("string")).map(([self, prefix]) => startsWith(self, prefix)),
      fc.tuple(tie("string"), tie("string")).map(([self, suffix]) => endsWith(self, suffix)),
      fc.tuple(tie("expr"), fc.array(primitive, { minLength: 1, maxLength: 4 })).map(([value, values]) =>
        oneOf(value, values as [Primitive, ...Primitive[]]),
      ),
      tie("boolean").map(not),
      fc.tuple(tie("boolean"), tie("boolean")).map(([left, right]) => and(left, right)),
      fc.tuple(tie("boolean"), tie("boolean")).map(([left, right]) => or(left, right)),
      fc.tuple(tie("boolean"), tie("boolean")).map(([left, right]) => xor(left, right)),
      fc.tuple(tie("boolean"), tie("boolean")).map(([left, right]) => eqv(left, right)),
    ).map((expr) => expr as Expr<unknown, "boolean">),
    number: fc.oneof(
      smallNumber.map(lit),
      smallNumber.map(intLit),
      tie("string").map(stringLength),
      fc.tuple(tie("string"), smallNumber.map(intLit), smallNumber.map((value) => intLit(Math.abs(value)))).map(
        ([self, offset, length]) => stringLength(substring(self, offset, length)),
      ),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => add(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => sub(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => mul(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => div(left, right)),
      fc.tuple(tie("number"), tie("number")).map(([left, right]) => mod(left, right)),
    ).map((expr) => expr as Expr<unknown, "number">),
    string: fc.oneof(
      smallString.map(lit),
      fc.tuple(tie("string"), tie("string")).map(([left, right]) => concat(left, right)),
      fc.tuple(tie("string"), smallNumber.map(intLit), smallNumber.map((value) => intLit(Math.abs(value)))).map(
        ([self, offset, length]) => substring(self, offset, length),
      ),
    ).map((expr) => expr as Expr<unknown, "string">),
    expr: fc.oneof(tie("boolean"), tie("number"), tie("string"), fc.constant(lit(null) as Expr)),
  })).expr;
};
