import { and as drizzleAnd, eq as drizzleEq, gt as drizzleGt, gte as drizzleGte, ilike, inArray, like, lt as drizzleLt, lte as drizzleLte, ne as drizzleNe, not as drizzleNot, or as drizzleOr, sql, type SQL } from "drizzle-orm";
import type { Expr, Primitive } from "./ast.js";

export type DrizzleColumns = Readonly<Record<string, unknown>>;

const columnKey = (expr: Extract<Expr, { _tag: "Ref" }>): string =>
    [expr.name, ...expr.path].join(".");

const literal = (value: Primitive): SQL => sql`${value}`;

const bool = (expr: Expr): SQL => {
    const compiled = toDrizzleSql(expr);
    return compiled;
};

export const toDrizzleSql = (expr: Expr, columns: DrizzleColumns = {}): SQL => {
    switch (expr._tag) {
        case "Ref": {
            const key = columnKey(expr);
            const column = columns[key];

            if (column === undefined) {
                throw new Error(`Missing Drizzle column for reference: ${key}`);
            }

            return column as SQL;
        }

        case "Literal":
            return literal(expr.value);

        case "Eq":
            return drizzleEq(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Neq":
            return drizzleNe(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Lt":
            return drizzleLt(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Lte":
            return drizzleLte(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Gt":
            return drizzleGt(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Gte":
            return drizzleGte(toDrizzleSql(expr.left, columns), toDrizzleSql(expr.right, columns));

        case "Contains":
            return like(toDrizzleSql(expr.self, columns), sql`'%' || ${toDrizzleSql(expr.search, columns)} || '%'`);

        case "StartsWith":
            return like(toDrizzleSql(expr.self, columns), sql`${toDrizzleSql(expr.prefix, columns)} || '%'`);

        case "EndsWith":
            return like(toDrizzleSql(expr.self, columns), sql`'%' || ${toDrizzleSql(expr.suffix, columns)}`);

        case "StringLength":
            return sql`length(${toDrizzleSql(expr.self, columns)})`;

        case "Concat":
            return sql`${toDrizzleSql(expr.left, columns)} || ${toDrizzleSql(expr.right, columns)}`;

        case "Substring":
            return sql`substring(${toDrizzleSql(expr.self, columns)} from ${toDrizzleSql(expr.offset, columns)} + 1 for ${toDrizzleSql(expr.length, columns)})`;

        case "Add":
            return sql`(${toDrizzleSql(expr.left, columns)} + ${toDrizzleSql(expr.right, columns)})`;

        case "Sub":
            return sql`(${toDrizzleSql(expr.left, columns)} - ${toDrizzleSql(expr.right, columns)})`;

        case "Mul":
            return sql`(${toDrizzleSql(expr.left, columns)} * ${toDrizzleSql(expr.right, columns)})`;

        case "Div":
            return sql`(${toDrizzleSql(expr.left, columns)} / ${toDrizzleSql(expr.right, columns)})`;

        case "Mod":
            return sql`mod(${toDrizzleSql(expr.left, columns)}, ${toDrizzleSql(expr.right, columns)})`;

        case "Not":
            return drizzleNot(boolWithColumns(expr.expr, columns));

        case "And":
            return drizzleAnd(boolWithColumns(expr.left, columns), boolWithColumns(expr.right, columns)) as SQL;

        case "Or":
            return drizzleOr(boolWithColumns(expr.left, columns), boolWithColumns(expr.right, columns)) as SQL;

        case "Xor": {
            const left = boolWithColumns(expr.left, columns);
            const right = boolWithColumns(expr.right, columns);
            return drizzleOr(
                drizzleAnd(left, drizzleNot(right)),
                drizzleAnd(drizzleNot(left), right),
            ) as SQL;
        }

        case "Eqv":
            return drizzleEq(boolWithColumns(expr.left, columns), boolWithColumns(expr.right, columns));

        case "Implies":
            return drizzleOr(
                drizzleNot(boolWithColumns(expr.antecedent, columns)),
                boolWithColumns(expr.consequent, columns),
            ) as SQL;
    }
};

const boolWithColumns = (expr: Expr, columns: DrizzleColumns): SQL => toDrizzleSql(expr, columns);
