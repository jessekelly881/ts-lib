import { Schema } from "effect";
import { and, eq, implies, lit, nor, not, or } from "./index.js";
import { fromEffectSchema } from "./effect.js";
import { toPredicate } from "./run.js";

export class User extends Schema.Class<User>("User")({
    id: Schema.String,
    role: Schema.Literals(["guest", "member", "admin"]),
    orgId: Schema.String,
    suspended: Schema.Boolean,
    account: Schema.Struct({
        id: Schema.String,
        disabled: Schema.Boolean,
    }),
}) {}

export class Document extends Schema.Class<Document>("Document")({
    orgId: Schema.String,
    ownerId: Schema.String,
    visibility: Schema.Literals(["private", "org", "public"]),
    status: Schema.Literals(["draft", "published", "archived"]),
    locked: Schema.Boolean,
}) {}

export class Request extends Schema.Class<Request>("Request")({
    userId: Schema.String,
    action: Schema.Literals(["read", "write", "delete"]),
    mfa: Schema.Boolean,
}) {}

export const ObjUser = fromEffectSchema("user", User);
export const ObjDocument = fromEffectSchema("document", Document);
export const ObjRequest = fromEffectSchema("request", Request);

export const userIsSuspendedExpr = eq(ObjUser.suspended, lit(true));
export const userAccountIsDisabledExpr = eq(ObjUser.account.disabled, lit(true));
export const userIsActiveExpr = nor(userIsSuspendedExpr, userAccountIsDisabledExpr);

export const documentIsPublishedExpr = eq(ObjDocument.status, lit("published"));
export const documentIsLockedExpr = eq(ObjDocument.locked, lit(true));
export const documentIsWritableExpr = not(documentIsLockedExpr);

export const userIsGuestExpr = eq(ObjUser.role, lit("guest"));
export const userIsAdminExpr = eq(ObjUser.role, lit("admin"));
export const userIsAuthenticatedExpr = not(userIsGuestExpr);

export const documentBelongsToUsersOrgExpr = eq(ObjDocument.orgId, ObjUser.orgId);
export const documentIsOrgVisibleExpr = eq(ObjDocument.visibility, lit("org"));
export const documentIsPublicExpr = eq(ObjDocument.visibility, lit("public"));
export const documentIsPrivateExpr = eq(ObjDocument.visibility, lit("private"));
export const requesterOwnsDocumentExpr = eq(ObjDocument.ownerId, ObjRequest.userId);

export const userOwnsPrivateDocumentExpr = and(
    documentIsPrivateExpr,
    requesterOwnsDocumentExpr,
);

export const userCanSeeDocumentExpr = or(
    documentIsOrgVisibleExpr,
    documentIsPublicExpr,
    userOwnsPrivateDocumentExpr,
);

export const requestIsReadExpr = eq(ObjRequest.action, lit("read"));
export const requestIsWriteExpr = eq(ObjRequest.action, lit("write"));
export const requestIsDeleteExpr = eq(ObjRequest.action, lit("delete"));

export const requestIsUnlockedWriteExpr = and(
    requestIsWriteExpr,
    documentIsWritableExpr,
);

export const requestedActionIsAllowedExpr = or(
    requestIsReadExpr,
    requestIsUnlockedWriteExpr,
);

export const authenticatedUsersCannotDeleteWithoutMfaExpr = implies(
    and(userIsAuthenticatedExpr, requestIsDeleteExpr),
    eq(ObjRequest.mfa, lit(true)),
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
    authenticatedUsersCannotDeleteWithoutMfaExpr,
    userHasDocumentAccessExpr,
);

export const userCanSeeDocument = toPredicate(userCanSeeDocumentExpr);
export const canAccessDocument = toPredicate(canAccessDocumentExpr);
