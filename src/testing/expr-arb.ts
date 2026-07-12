import fc from "fast-check";
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
  ref,
  startsWith,
  stringLength,
  sub,
  substring,
  xor,
  type Expr,
  type Primitive,
} from "../index.js";

const smallNumber = fc.integer({ min: -100, max: 100 });
const smallString = fc.string({ minLength: 0, maxLength: 8 });
const primitive = fc.oneof(smallNumber, smallString, fc.boolean(), fc.constant(null));
const booleanLiteral = fc.boolean().map(lit);
const numberLiteral = smallNumber.map(lit);
const stringLiteral = smallString.map(lit);
const sameSortComparableLiterals = fc.oneof(
  fc.tuple(numberLiteral, numberLiteral),
  fc.tuple(stringLiteral, stringLiteral),
  fc.tuple(booleanLiteral, booleanLiteral),
);

export type TestEnv = {
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

export const userAge = ref("user.age") as Expr<TestEnv, "int">;
export const userEmail = ref("user.email") as Expr<TestEnv, "string">;
export const userSuspended = ref("user.suspended") as Expr<TestEnv, "boolean">;
export const documentSensitivity = ref("document.sensitivity") as Expr<TestEnv, "int">;
export const documentTitle = ref("document.title") as Expr<TestEnv, "string">;
export const documentPublished = ref("document.published") as Expr<TestEnv, "boolean">;

export const testEnvSorts = {
  "user.age": "int",
  "user.email": "string",
  "user.suspended": "boolean",
  "document.sensitivity": "int",
  "document.title": "string",
  "document.published": "boolean",
} as const;

export const testEnvArb = (): fc.Arbitrary<TestEnv> => fc.record({
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

export const testEnvConstraints = (env: TestEnv): Expr<unknown, "boolean"> => and(
  eq(userAge, lit(env.user.age)),
  eq(userEmail, lit(env.user.email)),
  eq(userSuspended, lit(env.user.suspended)),
  eq(documentSensitivity, lit(env.document.sensitivity)),
  eq(documentTitle, lit(env.document.title)),
  eq(documentPublished, lit(env.document.published)),
);

export const booleanExprArb = (): fc.Arbitrary<Expr<unknown, "boolean">> => fc.letrec<{
  expr: Expr<unknown, "boolean">;
}>((tie) => ({
  expr: fc.oneof(
    booleanLiteral,
    sameSortComparableLiterals.map(([left, right]) => eq(left, right)),
    sameSortComparableLiterals.map(([left, right]) => neq(left, right)),
    fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => lt(left, right)),
    fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => lte(left, right)),
    fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => gt(left, right)),
    fc.tuple(numberLiteral, numberLiteral).map(([left, right]) => gte(left, right)),
    fc.tuple(numberLiteral, numberLiteral, numberLiteral).map(([value, min, max]) => between(value, min, max)),
    fc.tuple(stringLiteral, stringLiteral).map(([self, search]) => contains(self, search)),
    fc.tuple(stringLiteral, stringLiteral).map(([self, prefix]) => startsWith(self, prefix)),
    fc.tuple(stringLiteral, stringLiteral).map(([self, suffix]) => endsWith(self, suffix)),
    fc.tuple(stringLiteral, fc.array(smallString, { minLength: 1, maxLength: 4 })).map(([value, values]) =>
      oneOf(value, values as [Primitive, ...Primitive[]]),
    ),
    fc.tuple(stringLiteral, fc.array(smallString, { minLength: 1, maxLength: 4 })).map(([value, values]) =>
      notOneOf(value, values as [Primitive, ...Primitive[]]),
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

export const refBooleanExprArb = (): fc.Arbitrary<Expr<TestEnv, "boolean">> => fc.letrec<{
  expr: Expr<TestEnv, "boolean">;
}>((tie) => ({
  expr: fc.oneof(
    fc.boolean().map((value) => lit(value) as Expr<TestEnv>),
    fc.tuple(fc.constant(userAge), fc.constant(documentSensitivity)).map(([left, right]) => gte(left, right)),
    fc.constant(between(userAge, lit(18), lit(65))),
    fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => lt(left, right)),
    fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => lte(left, right)),
    fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => gt(left, right)),
    fc.tuple(fc.constant(userAge), fc.integer({ min: 0, max: 120 }).map(lit)).map(([left, right]) => between(left, lit(18), right)),
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

export const exprArb = (): fc.Arbitrary<Expr> => fc.letrec<{
  boolean: Expr<unknown, "boolean">;
  number: Expr<unknown, "number">;
  string: Expr<unknown, "string">;
  expr: Expr;
}>((tie) => ({
  boolean: fc.oneof(
    booleanLiteral,
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
    numberLiteral,
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
    stringLiteral,
    fc.tuple(tie("string"), tie("string")).map(([left, right]) => concat(left, right)),
    fc.tuple(tie("string"), smallNumber.map(intLit), smallNumber.map((value) => intLit(Math.abs(value)))).map(
      ([self, offset, length]) => substring(self, offset, length),
    ),
  ).map((expr) => expr as Expr<unknown, "string">),
  expr: fc.oneof(tie("boolean"), tie("number"), tie("string"), fc.constant(lit(null) as Expr)),
})).expr;
