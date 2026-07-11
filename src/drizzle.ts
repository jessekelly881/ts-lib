import { and as drizzleAnd, eq as drizzleEq, gt as drizzleGt, gte as drizzleGte, ilike, inArray, like, lt as drizzleLt, lte as drizzleLte, ne as drizzleNe, not as drizzleNot, or as drizzleOr, sql, type SQL } from "drizzle-orm";
import type { Expr, Primitive } from "./ast.js";

export type DrizzleColumns = Readonly<Record<string, unknown>>;

export type DrizzleColumnNaming = "camel" | "prefixCamel";

export type DrizzleColumnsOptions = {
    readonly naming?: DrizzleColumnNaming;
    readonly overrides?: DrizzleColumns;
};

export type DrizzleRowOptions = {
    readonly naming?: DrizzleColumnNaming;
    readonly overrides?: Readonly<Record<string, unknown>>;
};

const capitalize = (value: string): string =>
    value.length === 0 ? value : `${value[0]?.toUpperCase()}${value.slice(1)}`;

const camel = (parts: readonly string[]): string =>
    parts.map((part, index) => index === 0 ? part : capitalize(part)).join("");

const columnProperty = (
    modelName: string,
    path: readonly string[],
    naming: DrizzleColumnNaming,
): string => {
    switch (naming) {
        case "camel":
            return camel(path);
        case "prefixCamel":
            return camel([modelName, ...path]);
    }
};

const collectModelColumns = (
    modelName: string,
    schema: { readonly fields: Readonly<Record<string, unknown>> },
    table: Record<string, unknown>,
    naming: DrizzleColumnNaming,
    output: Record<string, unknown>,
    path: readonly string[] = [],
): void => {
    for (const [fieldName, field] of Object.entries(schema.fields)) {
        const nextPath = [...path, fieldName];

        if (
            typeof field === "object" &&
            field !== null &&
            "_tag" in field &&
            field._tag === "ObjectSchema" &&
            "fields" in field
        ) {
            collectModelColumns(
                modelName,
                field as { readonly fields: Readonly<Record<string, unknown>> },
                table,
                naming,
                output,
                nextPath,
            );
            continue;
        }

        const property = columnProperty(modelName, nextPath, naming);
        const column = table[property];

        if (column !== undefined) {
            output[[modelName, ...nextPath].join(".")] = column;
        }
    }
};

type ModelWithFields = { readonly fields: Readonly<Record<string, unknown>> };
type ModelTables = Readonly<Record<string, readonly [ModelWithFields, object]>>;
type Models = Readonly<Record<string, ModelWithFields>>;

export const drizzleRow = (
    value: Readonly<Record<string, unknown>>,
    options: DrizzleRowOptions = {},
): Record<string, unknown> => {
    const naming = options.naming ?? "camel";
    const output: Record<string, unknown> = { ...(options.overrides ?? {}) };

    const visit = (current: unknown, path: readonly string[]): void => {
        if (
            typeof current === "object" &&
            current !== null &&
            !Array.isArray(current)
        ) {
            for (const [key, child] of Object.entries(current)) {
                visit(child, [...path, key]);
            }
            return;
        }

        if (path.length === 0) {
            return;
        }

        const modelName = path[0] ?? "";
        const fieldPath = path.slice(1);
        output[columnProperty(modelName, fieldPath.length === 0 ? path : fieldPath, naming)] = current;
    };

    visit(value, []);

    return output;
};

export function drizzleColumns<Definitions extends ModelTables>(
    definitions: Definitions,
    options?: DrizzleColumnsOptions,
): DrizzleColumns;
export function drizzleColumns<Table extends object, Definitions extends Models>(
    table: Table,
    definitions: Definitions,
    options?: DrizzleColumnsOptions,
): DrizzleColumns;
export function drizzleColumns(
    tableOrDefinitions: object,
    definitionsOrOptions: Models | DrizzleColumnsOptions = {},
    maybeOptions: DrizzleColumnsOptions = {},
): DrizzleColumns {
    const hasSharedTable = Object.values(tableOrDefinitions).some(
        (value) => !Array.isArray(value),
    );
    const definitions = hasSharedTable
        ? Object.fromEntries(
            Object.entries(definitionsOrOptions as Models).map(([name, model]) => [
                name,
                [model, tableOrDefinitions],
            ]),
        ) as ModelTables
        : tableOrDefinitions as ModelTables;
    const options = hasSharedTable ? maybeOptions : definitionsOrOptions as DrizzleColumnsOptions;
    const naming = options.naming ?? "camel";
    const output: Record<string, unknown> = { ...(options.overrides ?? {}) };

    for (const [modelName, [model, table]] of Object.entries(definitions)) {
        collectModelColumns(modelName, model, table as Record<string, unknown>, naming, output);
    }

    return output;
}

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
