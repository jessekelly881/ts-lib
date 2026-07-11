import { drizzle } from "drizzle-orm/node-postgres";
import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { ObjDocument, ObjRequest, ObjUser, canAccessDocument, canAccessDocumentExpr } from "./example.js";
import { drizzleColumns, drizzleRow, toDrizzleSql } from "./drizzle.js";

const rows = pgTable("policy_rows", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    userRole: text("user_role").notNull(),
    userOrgId: text("user_org_id").notNull(),
    userSuspended: boolean("user_suspended").notNull(),
    userAge: integer("user_age").notNull(),
    userClearance: integer("user_clearance").notNull(),
    userEmail: text("user_email").notNull(),
    userAccountId: text("user_account_id").notNull(),
    userAccountDisabled: boolean("user_account_disabled").notNull(),
    userAccountPlan: text("user_account_plan").notNull(),
    documentOrgId: text("document_org_id").notNull(),
    documentOwnerId: text("document_owner_id").notNull(),
    documentTitle: text("document_title").notNull(),
    documentSlug: text("document_slug").notNull(),
    documentVisibility: text("document_visibility").notNull(),
    documentStatus: text("document_status").notNull(),
    documentLocked: boolean("document_locked").notNull(),
    documentRetentionHold: boolean("document_retention_hold").notNull(),
    documentSensitivity: integer("document_sensitivity").notNull(),
    requestUserId: text("request_user_id").notNull(),
    requestAction: text("request_action").notNull(),
    requestMfa: boolean("request_mfa").notNull(),
    requestJustification: text("request_justification").notNull(),
});

const columns = drizzleColumns(rows, {
    user: ObjUser,
    document: ObjDocument,
    request: ObjRequest,
}, { naming: "prefixCamel" });

type Env = Parameters<typeof canAccessDocument>[0];

const baseEnv: Env = {
    user: {
        id: "user_1",
        role: "member",
        orgId: "org_1",
        suspended: false,
        age: 34,
        clearance: 4,
        email: "person@example.com",
        account: { id: "acct_1", disabled: false, plan: "enterprise" },
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

const envs: Env[] = [
    baseEnv,
    { ...baseEnv, request: { ...baseEnv.request, userId: "user_2" } },
    { ...baseEnv, document: { ...baseEnv.document, visibility: "org", ownerId: "user_2" } },
    { ...baseEnv, document: { ...baseEnv.document, locked: true }, request: { ...baseEnv.request, action: "write" } },
    {
        ...baseEnv,
        user: { ...baseEnv.user, role: "admin" },
        document: { ...baseEnv.document, orgId: "org_2", ownerId: "user_2", visibility: "private", locked: true },
        request: { ...baseEnv.request, userId: "user_3", action: "delete", mfa: true },
    },
    { ...baseEnv, user: { ...baseEnv.user, suspended: true } },
    { ...baseEnv, document: { ...baseEnv.document, status: "draft" } },
    { ...baseEnv, user: { ...baseEnv.user, account: { ...baseEnv.user.account, disabled: true } } },
    { ...baseEnv, document: { ...baseEnv.document, sensitivity: 5 } },
    {
        ...baseEnv,
        user: { ...baseEnv.user, role: "auditor" },
        document: { ...baseEnv.document, visibility: "private", ownerId: "user_2" },
        request: { ...baseEnv.request, justification: "quarterly audit" },
    },
];

describe("Drizzle compile target", () => {
    let container: StartedTestContainer | undefined;
    let client: pg.Client | undefined;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({ POSTGRES_PASSWORD: "postgres", POSTGRES_USER: "postgres", POSTGRES_DB: "postgres" })
            .withExposedPorts(5432)
            .start();

        client = new pg.Client({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "postgres",
        });
        await client.connect();
        await client.query(`
            create table policy_rows (
                id serial primary key,
                user_id text not null,
                user_role text not null,
                user_org_id text not null,
                user_suspended boolean not null,
                user_age integer not null,
                user_clearance integer not null,
                user_email text not null,
                user_account_id text not null,
                user_account_disabled boolean not null,
                user_account_plan text not null,
                document_org_id text not null,
                document_owner_id text not null,
                document_title text not null,
                document_slug text not null,
                document_visibility text not null,
                document_status text not null,
                document_locked boolean not null,
                document_retention_hold boolean not null,
                document_sensitivity integer not null,
                request_user_id text not null,
                request_action text not null,
                request_mfa boolean not null,
                request_justification text not null
            )
        `);
    }, 60_000);

    afterAll(async () => {
        await client?.end();
        await container?.stop();
    });

    it("matches toPredicate results against Postgres rows", async () => {
        if (client === undefined) {
            throw new Error("Postgres client was not initialized");
        }

        const db = drizzle(client);
        await db.insert(rows).values(envs.map((env) => drizzleRow(env, { naming: "prefixCamel" })) as Array<typeof rows.$inferInsert>);

        const result = await db
            .select({ id: rows.id })
            .from(rows)
            .where(toDrizzleSql(canAccessDocumentExpr, columns));

        const drizzleIds = result.map((row) => row.id);
        const predicateIds = envs
            .map((env, index) => ({ env, id: index + 1 }))
            .filter(({ env }) => canAccessDocument(env))
            .map(({ id }) => id);

        expect(drizzleIds).toEqual(predicateIds);
    });
});
