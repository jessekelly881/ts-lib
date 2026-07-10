import { describe, expect, it } from "vitest";
import {
    ObjDocument,
    ObjRequest,
    ObjUser,
    canAccessDocument,
    canAccessDocumentExpr,
} from "./example.js";
import { and, eq, lit, lt, not, or } from "./index.js";
import { createZ3Compiler, z3Sorts } from "./z3.js";

type CanAccessDocumentEnv = Parameters<typeof canAccessDocument>[0];

const baseEnv: CanAccessDocumentEnv = {
    user: {
        id: "user_1",
        role: "member",
        orgId: "org_1",
        suspended: false,
        age: 34,
        clearance: 4,
        email: "person@example.com",
        account: {
            id: "acct_1",
            disabled: false,
            plan: "enterprise",
        },
    },
    document: {
        orgId: "org_1",
        ownerId: "user_1",
        title: "security policy",
        slug: "docs/security-policy",
        visibility: "private",
        status: "published",
        locked: false,
        retentionHold: false,
        sensitivity: 3,
    },
    request: {
        userId: "user_1",
        action: "read",
        mfa: false,
        justification: "normal access",
    },
};

describe("canAccessDocument", () => {
    const cases: ReadonlyArray<readonly [string, CanAccessDocumentEnv, boolean]> = [
        ["allows the owner to read their published private policy document", baseEnv, true],
        [
            "denies a non-owner private document",
            {
                ...baseEnv,
                request: { ...baseEnv.request, userId: "user_2" },
            },
            false,
        ],
        [
            "allows an org member to read an org-visible document",
            {
                ...baseEnv,
                document: {
                    ...baseEnv.document,
                    slug: "internal/security-policy",
                    visibility: "org",
                    ownerId: "user_2",
                },
            },
            true,
        ],
        [
            "denies writing a locked document",
            {
                ...baseEnv,
                document: { ...baseEnv.document, locked: true },
                request: { ...baseEnv.request, action: "write" },
            },
            false,
        ],
        [
            "allows an enterprise admin to delete with mfa when no retention hold exists",
            {
                ...baseEnv,
                user: { ...baseEnv.user, role: "admin" },
                document: {
                    ...baseEnv.document,
                    orgId: "org_2",
                    ownerId: "user_2",
                    title: "incident response policy",
                    slug: "private/incident-response-policy",
                    visibility: "private",
                    locked: true,
                },
                request: {
                    ...baseEnv.request,
                    userId: "user_3",
                    action: "delete",
                    mfa: true,
                },
            },
            true,
        ],
        [
            "denies a suspended admin",
            {
                ...baseEnv,
                user: { ...baseEnv.user, role: "admin", suspended: true },
            },
            false,
        ],
        [
            "denies access to unpublished documents",
            {
                ...baseEnv,
                document: { ...baseEnv.document, status: "draft" },
            },
            false,
        ],
        [
            "denies users with a disabled account",
            {
                ...baseEnv,
                user: {
                    ...baseEnv.user,
                    account: { ...baseEnv.user.account, disabled: true },
                },
            },
            false,
        ],
        [
            "denies high sensitivity access without mfa",
            {
                ...baseEnv,
                document: { ...baseEnv.document, sensitivity: 5 },
            },
            false,
        ],
        [
            "allows an auditor with an audit justification",
            {
                ...baseEnv,
                user: { ...baseEnv.user, role: "auditor" },
                document: {
                    ...baseEnv.document,
                    visibility: "private",
                    ownerId: "user_2",
                },
                request: { ...baseEnv.request, justification: "quarterly audit" },
            },
            true,
        ],
    ];

    it.each(cases)("%s", (_name, env, expected) => {
        expect(canAccessDocument(env)).toBe(expected);
    });

    it("proves with z3 that delete access is impossible without admin + mfa + no retention hold", async () => {
        const z3 = await createZ3Compiler(z3Sorts({
            user: ObjUser,
            document: ObjDocument,
            request: ObjRequest,
        }));

        const counterexample = and(
            canAccessDocumentExpr,
            eq(ObjRequest.action, lit("delete")),
            or(
                not(eq(ObjUser.role, lit("admin"))),
                eq(ObjRequest.mfa, lit(false)),
                eq(ObjDocument.retentionHold, lit(true)),
            ),
        );

        expect(await z3.solver(counterexample).check()).toBe("unsat");
    });

    it("proves with z3 that access is impossible when clearance is below sensitivity", async () => {
        const z3 = await createZ3Compiler(z3Sorts({
            user: ObjUser,
            document: ObjDocument,
            request: ObjRequest,
        }));

        const counterexample = and(
            canAccessDocumentExpr,
            lt(ObjUser.clearance, ObjDocument.sensitivity),
        );

        expect(await z3.findExample(counterexample)).toEqual({ status: "unsat" });
    });

    it("finds a concrete z3 example for allowed admin delete access", async () => {
        const z3 = await createZ3Compiler(z3Sorts({
            user: ObjUser,
            document: ObjDocument,
            request: ObjRequest,
        }));

        const example = await z3.findExample(and(
            canAccessDocumentExpr,
            eq(ObjRequest.action, lit("delete")),
        ));

        expect(example.status).toBe("sat");

        if (example.status === "sat") {
            expect(canAccessDocument(example.env as CanAccessDocumentEnv)).toBe(true);
            expect(example.env).toMatchObject({
                user: { role: "admin", suspended: false, account: { disabled: false, plan: "enterprise" } },
                document: { status: "published", retentionHold: false },
                request: { action: "delete", mfa: true },
            });
        }
    });
});
