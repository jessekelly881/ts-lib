import { Schema } from "effect";
import { and, eq, lit, or } from "./index.js";
import { fromEffectSchema } from "./effect.js";
import { toPredicate } from "./run.js";

export const User = Schema.Struct({
    id: Schema.String,
    role: Schema.Literals(["guest", "member", "admin"]),
    orgId: Schema.String,
    suspended: Schema.Boolean,
    account: Schema.Struct({
        id: Schema.String,
        disabled: Schema.Boolean,
    }),
});

export const Document = Schema.Struct({
    orgId: Schema.String,
    ownerId: Schema.String,
    visibility: Schema.Literals(["private", "org", "public"]),
    status: Schema.Literals(["draft", "published", "archived"]),
    locked: Schema.Boolean,
});

export const Request = Schema.Struct({
    userId: Schema.String,
    action: Schema.Literals(["read", "write", "delete"]),
    mfa: Schema.Boolean,
});

export const ObjUser = fromEffectSchema("user", User);
export const ObjDocument = fromEffectSchema("document", Document);
export const ObjRequest = fromEffectSchema("request", Request);

export const userIsActiveExpr = and(
    eq(ObjUser.suspended, lit(false)),
    eq(ObjUser.account.disabled, lit(false)),
);

export const documentIsPublishedExpr = eq(ObjDocument.status, lit("published"));
export const userIsAdminExpr = eq(ObjUser.role, lit("admin"));
export const documentBelongsToUsersOrgExpr = eq(ObjDocument.orgId, ObjUser.orgId);
export const documentIsOrgVisibleExpr = eq(ObjDocument.visibility, lit("org"));
export const documentIsPublicExpr = eq(ObjDocument.visibility, lit("public"));

export const userOwnsPrivateDocumentExpr = and(
    eq(ObjDocument.visibility, lit("private")),
    eq(ObjDocument.ownerId, ObjRequest.userId),
);

export const userCanSeeDocumentExpr = or(
    documentIsOrgVisibleExpr,
    documentIsPublicExpr,
    userOwnsPrivateDocumentExpr,
);

export const requestIsReadExpr = eq(ObjRequest.action, lit("read"));

export const requestIsUnlockedWriteExpr = and(
    eq(ObjRequest.action, lit("write")),
    eq(ObjDocument.locked, lit(false)),
);

export const requestedActionIsAllowedExpr = or(
    requestIsReadExpr,
    requestIsUnlockedWriteExpr,
);

export const organizationMemberCanAccessDocumentExpr = and(
    documentBelongsToUsersOrgExpr,
    userCanSeeDocumentExpr,
    requestedActionIsAllowedExpr,
);

export const userHasDocumentAccessExpr = or(
    userIsAdminExpr,
    organizationMemberCanAccessDocumentExpr,
);

export const canAccessDocumentExpr = and(
    userIsActiveExpr,
    documentIsPublishedExpr,
    userHasDocumentAccessExpr,
);

export const userCanSeeDocument = toPredicate(userCanSeeDocumentExpr);
export const canAccessDocument = toPredicate(canAccessDocumentExpr);
