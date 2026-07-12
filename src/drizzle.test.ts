import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Schema } from "effect";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { and, contains, eq, gt, lt, not, or, startsWith } from "./predicate.js";
import { drizzleColumns, toDrizzleSql } from "./drizzle.js";
import { fromEffectSchema } from "./effect.js";
import { toPredicate } from "./run.js";

const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    active: boolean("active").notNull(),
});

const User = Schema.Struct({
    name: Schema.String,
    age: Schema.Number,
    active: Schema.Boolean,
});

const UserModel = fromEffectSchema("user", User);

const rows = [
    { id: 1, name: "Ada", age: 36, active: true },
    { id: 2, name: "Alan", age: 17, active: true },
    { id: 3, name: "Grace", age: 85, active: false },
    { id: 4, name: "Linus", age: 54, active: true },
];

const expr = and(
    gt(UserModel.age, 18),
    lt(UserModel.age, 80),
    eq(UserModel.active, true),
    or(contains(UserModel.name, "a"), startsWith(UserModel.name, "Lin")),
    not(eq(UserModel.name, "Alan")),
);

const runIfDocker = process.env.DRIZZLE_TESTCONTAINERS === "1";

describe.skipIf(!runIfDocker)("drizzle postgres integration", () => {
    let container: StartedTestContainer;
    let pool: Pool;
    let db: NodePgDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_DB: "predicate_dsl",
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
            })
            .withExposedPorts(5432)
            .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
            .start();

        pool = new Pool({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "predicate_dsl",
            user: "postgres",
            password: "postgres",
        });

        for (let attempt = 0; attempt < 30; attempt += 1) {
            try {
                await pool.query("select 1");
                break;
            } catch (error) {
                if (attempt === 29) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        db = drizzle(pool);

        await db.execute(sql`
            create table users (
                id serial primary key,
                name text not null,
                age integer not null,
                active boolean not null
            )
        `);

        await db.insert(users).values(rows);
    }, 120_000);

    afterAll(async () => {
        await pool?.end();
        await container?.stop();
    });

    it("returns the same rows as the in-memory predicate", async () => {
        const columns = drizzleColumns(users, { user: UserModel as never });
        const sqlPredicate = toDrizzleSql(expr, columns);

        const drizzleRows = await db.select().from(users).where(sqlPredicate).orderBy(users.id);
        const drizzleIds = drizzleRows.map((row) => row.id);

        const predicate = toPredicate(expr);
        const expectedIds = rows
            .filter((row) => predicate({ user: row }))
            .map((row) => row.id);

        expect(drizzleIds).toEqual(expectedIds);
    });
});
