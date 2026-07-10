import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { and, eq, lit, or } from "./index.js";
import { fromEffectSchema } from "./effect.js";
import { run } from "./run.js";
import { createZ3Compiler, z3Sorts } from "./z3.js";

const AccountSchema = Schema.Struct({
    id: Schema.String,
    plan: Schema.Union([
        Schema.Literal("free"),
        Schema.Literal("team"),
        Schema.Literal("enterprise"),
    ]),
    disabled: Schema.Boolean,
});

const UserSchema = Schema.Struct({
    id: Schema.String,
    role: Schema.Union([
        Schema.Literal("guest"),
        Schema.Literal("member"),
        Schema.Literal("admin"),
    ]),
    orgId: Schema.String,
    suspended: Schema.Boolean,
    account: Schema.Struct({
        id: Schema.String,
        disabled: Schema.Boolean,
    }),
});

const DocumentSchema = Schema.Struct({
    orgId: Schema.String,
    ownerId: Schema.String,
    visibility: Schema.Union([
        Schema.Literal("private"),
        Schema.Literal("org"),
        Schema.Literal("public"),
    ]),
    status: Schema.Union([
        Schema.Literal("draft"),
        Schema.Literal("published"),
        Schema.Literal("archived"),
    ]),
    locked: Schema.Boolean,
});

const RequestSchema = Schema.Struct({
    userId: Schema.String,
    action: Schema.Union([
        Schema.Literal("read"),
        Schema.Literal("write"),
        Schema.Literal("delete"),
    ]),
    mfa: Schema.Boolean,
});

const Account = fromEffectSchema("account", AccountSchema);
const User = fromEffectSchema("user", UserSchema);
const Document = fromEffectSchema("document", DocumentSchema);
const Request = fromEffectSchema("request", RequestSchema);

const canAccessDocument = and(
    eq(User.suspended, lit(false)),
    eq(User.account.disabled, lit(false)),
    eq(Document.status, lit("published")),
    or(
        eq(User.role, lit("admin")),
        and(
            eq(Document.orgId, User.orgId),
            or(
                eq(Document.visibility, lit("org")),
                eq(Document.visibility, lit("public")),
                and(
                    eq(Document.visibility, lit("private")),
                    eq(Document.ownerId, Request.userId),
                ),
            ),
            or(
                eq(Request.action, lit("read")),
                and(
                    eq(Request.action, lit("write")),
                    eq(Document.locked, lit(false)),
                ),
            ),
        ),
    ),
);

describe("predicate DSL", () => {
    const canAccess = run(canAccessDocument);

    const baseEnv = {
        account: {
            id: "acct_1",
            plan: "team",
            disabled: false,
        },
        user: {
            id: "user_1",
            role: "member",
            orgId: "org_1",
            suspended: false,
            account: {
                id: "acct_1",
                disabled: false,
            },
        },
        document: {
            orgId: "org_1",
            ownerId: "user_1",
            visibility: "private",
            status: "published",
            locked: false,
        },
        request: {
            userId: "user_1",
            action: "read",
            mfa: false,
        },
    };

    it("evaluates a complex nested domain model as normal JavaScript", () => {
        expect(canAccess(baseEnv)).toBe(true);

        expect(
            canAccess({
                ...baseEnv,
                request: { ...baseEnv.request, userId: "user_2" },
            }),
        ).toBe(false);

        expect(
            canAccess({
                ...baseEnv,
                document: {
                    ...baseEnv.document,
                    visibility: "org",
                    ownerId: "user_2",
                },
            }),
        ).toBe(true);

        expect(
            canAccess({
                ...baseEnv,
                document: { ...baseEnv.document, locked: true },
                request: { ...baseEnv.request, action: "write" },
            }),
        ).toBe(false);

        expect(
            canAccess({
                ...baseEnv,
                user: { ...baseEnv.user, role: "admin" },
                document: {
                    ...baseEnv.document,
                    orgId: "org_2",
                    ownerId: "user_2",
                    visibility: "private",
                    locked: true,
                },
                request: { ...baseEnv.request, userId: "user_3", action: "delete" },
            }),
        ).toBe(true);

        expect(
            canAccess({
                ...baseEnv,
                user: { ...baseEnv.user, role: "admin", suspended: true },
            }),
        ).toBe(false);
    });

    it("converts Effect schemas to predicate models with field references", () => {
        expect(User.account.disabled).toEqual({
            _tag: "Ref",
            name: "user",
            path: ["account", "disabled"],
        });

        expect(Document.status).toEqual({
            _tag: "Ref",
            name: "document",
            path: ["status"],
        });

        expect(User.fields.role).toEqual({
            _tag: "EnumSchema",
            values: ["guest", "member", "admin"],
        });
    });

    it("derives z3 sorts from Effect-backed domain models", () => {
        expect(
            z3Sorts({
                account: Account,
                user: User,
                document: Document,
                request: Request,
            }),
        ).toEqual({
            "account.id": "string",
            "account.plan": "string",
            "account.disabled": "boolean",
            "user.id": "string",
            "user.role": "string",
            "user.orgId": "string",
            "user.suspended": "boolean",
            "user.account.id": "string",
            "user.account.disabled": "boolean",
            "document.orgId": "string",
            "document.ownerId": "string",
            "document.visibility": "string",
            "document.status": "string",
            "document.locked": "boolean",
            "request.userId": "string",
            "request.action": "string",
            "request.mfa": "boolean",
        });
    });

    it("compiles the complex predicate to z3", async () => {
        const z3 = await createZ3Compiler(
            z3Sorts({
                account: Account,
                user: User,
                document: Document,
                request: Request,
            }),
        );

        const solver = z3.solver(canAccessDocument);

        expect(await solver.check()).toBe("sat");
    });

    it("rejects predicates that compare incompatible z3 sorts", async () => {
        const z3 = await createZ3Compiler(
            z3Sorts({
                account: Account,
                user: User,
                document: Document,
                request: Request,
            }),
        );

        expect(() => z3.compile(eq(User.orgId, lit(false)))).toThrow(
            "Cannot compare Z3 values of different sorts: string and boolean",
        );
    });
});
