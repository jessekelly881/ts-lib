import { Schema } from "effect";
import {
    and,
    between,
    concat,
    contains,
    endsWith,
    eq,
    gte,
    implies,
    lit,
    nor,
    not,
    oneOf,
    or,
    startsWith,
    substring,
} from "./index.js";
import { fromEffectSchema, modelType } from "./effect.js";
import { toPredicate } from "./run.js";

export class User extends Schema.Class<User>("User")({
    id: Schema.String,
    role: Schema.Literals(["guest", "member", "admin", "auditor"]),
    orgId: Schema.String,
    suspended: Schema.Boolean,
    age: Schema.Number.pipe(modelType("int")),
    clearance: Schema.Number.pipe(modelType("int")),
    email: Schema.String,
    account: Schema.Struct({
        id: Schema.String,
        disabled: Schema.Boolean,
        plan: Schema.Literals(["free", "team", "enterprise"]),
    }),
}) {}

export class Document extends Schema.Class<Document>("Document")({
    orgId: Schema.String,
    ownerId: Schema.String,
    title: Schema.String,
    slug: Schema.String,
    visibility: Schema.Literals(["private", "org", "public"]),
    status: Schema.Literals(["draft", "published", "archived"]),
    locked: Schema.Boolean,
    retentionHold: Schema.Boolean,
    sensitivity: Schema.Number.pipe(modelType("int")),
}) {}

export class Request extends Schema.Class<Request>("Request")({
    userId: Schema.String,
    action: Schema.Literals(["read", "write", "delete"]),
    mfa: Schema.Boolean,
    justification: Schema.String,
}) {}

export const ObjUser = fromEffectSchema("user", User);
export const ObjDocument = fromEffectSchema("document", Document);
export const ObjRequest = fromEffectSchema("request", Request);

const userIsActiveExpr = nor(
    eq(ObjUser.suspended, lit(true)),
    eq(ObjUser.account.disabled, lit(true)),
);

const userIsEligibleEmployeeExpr = and(
    userIsActiveExpr,
    between(ObjUser.age, lit(18), lit(120)),
    endsWith(ObjUser.email, lit("@example.com")),
);

const documentIsEligibleForAccessExpr = and(
    oneOf(ObjDocument.status, ["published"]),
    contains(ObjDocument.title, lit("policy")),
    gte(ObjUser.clearance, ObjDocument.sensitivity),
);

const userCanSeeDocumentExpr = or(
    eq(ObjDocument.visibility, lit("org")),
    and(
        eq(ObjDocument.visibility, lit("public")),
        startsWith(ObjDocument.slug, concat(lit("docs"), lit("/"))),
        eq(substring(ObjDocument.slug, lit(0), lit(5)), lit("docs/")),
        between(ObjDocument.sensitivity, lit(0), lit(2)),
    ),
    and(
        eq(ObjDocument.visibility, lit("private")),
        eq(ObjDocument.ownerId, ObjRequest.userId),
    ),
    and(
        eq(ObjUser.role, lit("auditor")),
        contains(ObjRequest.justification, lit("audit")),
    ),
);

const requestSatisfiesActionPolicyExpr = and(
    implies(
        eq(ObjRequest.action, lit("write")),
        not(eq(ObjDocument.locked, lit(true))),
    ),
    implies(
        eq(ObjRequest.action, lit("delete")),
        and(
            eq(ObjUser.role, lit("admin")),
            eq(ObjRequest.mfa, lit(true)),
            not(eq(ObjDocument.retentionHold, lit(true))),
        ),
    ),
    implies(
        gte(ObjDocument.sensitivity, lit(4)),
        eq(ObjRequest.mfa, lit(true)),
    ),
);

const userHasAccessPathExpr = or(
    and(
        eq(ObjUser.role, lit("admin")),
        eq(ObjUser.account.plan, lit("enterprise")),
    ),
    and(
        eq(ObjDocument.orgId, ObjUser.orgId),
        userCanSeeDocumentExpr,
    ),
);

export const canAccessDocumentExpr = and(
    userIsEligibleEmployeeExpr,
    documentIsEligibleForAccessExpr,
    requestSatisfiesActionPolicyExpr,
    userHasAccessPathExpr,
);

export const canAccessDocument = toPredicate(canAccessDocumentExpr);
