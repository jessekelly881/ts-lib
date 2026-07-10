import { Schema as EffectSchema } from "effect";
import {
    boolean,
    enum_,
    number,
    object,
    string,
    type Expr,
    type ObjectSchema,
    type Schema,
} from "./index.js";

type EffectTop = EffectSchema.Top;

type EffectAst = EffectTop["ast"];

type ModelRefs<T> = {
    readonly [K in keyof T]: T[K] extends Record<string, unknown> ? ModelRefs<T[K]> : Expr;
};

export type EffectModel<S extends EffectTop> = ObjectSchema & ModelRefs<EffectSchema.Schema.Type<S>>;

const unsupported = (ast: EffectAst): never => {
    throw new Error(`Unsupported Effect schema AST node: ${ast._tag}`);
};

const literalValue = (ast: EffectAst): string | undefined => {
    if (ast._tag !== "Literal") {
        return undefined;
    }

    return typeof ast.literal === "string" ? ast.literal : undefined;
};

const enumValues = (ast: EffectAst): readonly [string, ...string[]] | undefined => {
    if (ast._tag === "Literal") {
        const value = literalValue(ast);
        return value === undefined ? undefined : [value];
    }

    if (ast._tag !== "Union") {
        return undefined;
    }

    const values = ast.types.map((type: EffectAst) => literalValue(type));

    if (values.some((value) => value === undefined)) {
        return undefined;
    }

    return values as [string, ...string[]];
};

const fromAst = (ast: EffectAst): Schema => {
    switch (ast._tag) {
        case "String":
            return string();

        case "Number":
            return number();

        case "Boolean":
            return boolean();

        case "Literal": {
            const values = enumValues(ast);

            if (values === undefined) {
                return unsupported(ast);
            }

            return enum_(values);
        }

        case "Union": {
            const values = enumValues(ast);

            if (values === undefined) {
                return unsupported(ast);
            }

            return enum_(values);
        }

        case "Objects": {
            if (ast.indexSignatures.length > 0) {
                throw new Error("Effect schemas with index signatures are not supported yet");
            }

            const fields: Record<string, Schema> = {};

            for (const property of ast.propertySignatures) {
                if (typeof property.name !== "string") {
                    throw new Error("Only string property names are supported");
                }

                fields[property.name] = fromAst(property.type);
            }

            return object(fields);
        }

        default:
            return unsupported(ast);
    }
};

export function fromEffectSchema<S extends EffectTop>(schema: S): ObjectSchema;
export function fromEffectSchema<S extends EffectTop>(name: string, schema: S): EffectModel<S>;
export function fromEffectSchema<S extends EffectTop>(
    nameOrSchema: string | S,
    maybeSchema?: S,
): ObjectSchema | EffectModel<S> {
    const name = typeof nameOrSchema === "string" ? nameOrSchema : undefined;
    const schema = typeof nameOrSchema === "string" ? maybeSchema : nameOrSchema;

    if (schema == null) {
        throw new Error("Missing Effect schema");
    }

    const model = fromAst(schema.ast);

    if (model._tag !== "ObjectSchema") {
        throw new Error("Expected an Effect object schema at the model root");
    }

    return name === undefined ? model : object(name, model.fields) as EffectModel<S>;
}
