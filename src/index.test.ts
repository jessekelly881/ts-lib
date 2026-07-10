import { describe, expect, it } from "vitest";
import { canAccessDocument } from "./example.js";

type CanAccessDocumentEnv = Parameters<typeof canAccessDocument>[0];

const baseEnv: CanAccessDocumentEnv = {
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

describe("canAccessDocument", () => {
    const cases: ReadonlyArray<readonly [string, CanAccessDocumentEnv, boolean]> = [
        ["allows the owner to read their published private document", baseEnv, true],
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
            "allows an admin regardless of org, ownership, visibility, or action",
            {
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
    ];

    it.each(cases)("%s", (_name, env, expected) => {
        expect(canAccessDocument(env)).toBe(expected);
    });
});
