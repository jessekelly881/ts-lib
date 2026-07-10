import { expect, it } from "vitest";
import { and, enum as enumeration, eq, lit, object, or, ref, string } from "./index";
import { run } from "./run";
import { createZ3Compiler, z3Sorts } from "./z3";

const User = object({
    role: enumeration(["guest", "member", "admin"]),
    orgId: string(),
});

const Project = object({
    orgId: string(),
    status: enumeration(["active", "archived"]),
});

const canEdit = or(
    eq(ref("user.role"), lit("admin")),
    and(
        eq(ref("user.orgId"), ref("project.orgId")),
        eq(ref("project.status"), lit("active")),
    ),
);

it("evaluates predicates as normal JavaScript", () => {
    const canEditProjectPredicate = run(canEdit);

    const result = canEditProjectPredicate({
        user: {
            role: "member",
            orgId: "org_1",
        },
        project: {
            orgId: "org_1",
            status: "active",
        },
    });

    expect(result).toBe(true);
});

it("derives z3 sorts from schemas and compiles predicates", async () => {
    const z3 = await createZ3Compiler(z3Sorts({
        user: User,
        project: Project,
    }));

    const solver = z3.solver(canEdit);
    const solverResult = await solver.check();

    expect(solverResult).toBe("sat");
});
