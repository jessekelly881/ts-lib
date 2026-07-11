import { Schema as EffectSchema } from "effect";
import {
    attachModelRefs,
    boolean,
    enum_,
    int,
    number,
    object,
    string,
    tuple,
    type Expr,
    type ObjectSchema,
    type Schema,
} from "./index.js";

type EffectTop = EffectSchema.Top;

type EffectAst = EffectTop["ast"];

export type ModelSchemaType = "boolean" | "int" | "number" | "string";

const annotationKey = "predicateDsl";

export const modelType = (type: ModelSchemaType) =>
    EffectSchema.annotate({
        meta: {
            [annotationKey]: { type },
        },
    } as never);

const annotatedModelType = (ast: EffectAst): ModelSchemaType | undefined => {
    const meta = ast.annotations?.meta;

    if (typeof meta !== "object" || meta === null || !(annotationKey in meta)) {
        return undefined;
    }

    const annotation = (meta as Record<string, unknown>)[annotationKey];

    if (typeof annotation !== "object" || annotation === null || !("type" in annotation)) {
        return undefined;
    }

    const type = (annotation as { readonly type: unknown }).type;

    return type === "boolean" || type === "int" || type === "number" || type === "string"
        ? type
        : undefined;
};

type SortOfTs<T> = T extends string
    ? "string"
    : T extends boolean
      ? "boolean"
      : T extends number
        ? "number" | "int"
        : never;

type ModelRefs<Name extends string, Root, T> = T extends readonly [infer First, infer Second, infer Third]
    ? readonly [
        ModelRefs<Name, Root, First>,
        ModelRefs<Name, Root, Second>,
        ModelRefs<Name, Root, Third>,
    ]
    : T extends [infer First, infer Second, infer Third]
      ? readonly [
        ModelRefs<Name, Root, First>,
        ModelRefs<Name, Root, Second>,
        ModelRefs<Name, Root, Third>,
      ]
      : T extends readonly (infer Element)[]
        ? ReadonlyArray<ModelRefs<Name, Root, Element>>
        : T extends (infer Element)[]
          ? ReadonlyArray<ModelRefs<Name, Root, Element>>
          : T extends object
            ? { readonly [K in keyof T]: ModelRefs<Name, Root, T[K]> }
            : Expr<{ readonly [K in Name]: Root }, SortOfTs<T>>;

export type EffectModel<Name extends string, S extends EffectTop> = Schema &
    ModelRefs<Name, EffectSchema.Schema.Type<S>, EffectSchema.Schema.Type<S>>;

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
    const modelType = annotatedModelType(ast);

    if (modelType !== undefined) {
        switch (modelType) {
            case "boolean":
                return boolean();
            case "int":
                return int();
            case "number":
                return number();
            case "string":
                return string();
        }
    }

    switch (ast._tag) {
        case "Declaration": {
            const [typeParameter] = ast.typeParameters;

            if (typeParameter === undefined) {
                return unsupported(ast);
            }

            return fromAst(typeParameter);
        }

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

        case "Arrays": {
            if (ast.rest.length > 0) {
                throw new Error("Effect tuple rest elements are not supported yet");
            }

            return tuple(ast.elements.map((element: EffectAst) => fromAst(element)));
        }

        default:
            return unsupported(ast);
    }
};

export function fromEffectSchema<const S extends EffectTop>(schema: S): ObjectSchema;
export function fromEffectSchema<const Name extends string, const S extends EffectTop>(name: Name, schema: S): EffectModel<Name, S>;
export function fromEffectSchema<const Name extends string, const S extends EffectTop>(
    nameOrSchema: Name | S,
    maybeSchema?: S,
): ObjectSchema | EffectModel<Name, S> {
    const name = typeof nameOrSchema === "string" ? nameOrSchema : undefined;
    const schema = typeof nameOrSchema === "string" ? maybeSchema : nameOrSchema;

    if (schema == null) {
        throw new Error("Missing Effect schema");
    }

    const model = fromAst(schema.ast);

    if (model._tag !== "ObjectSchema" && model._tag !== "TupleSchema") {
        throw new Error("Expected an Effect object or tuple schema at the model root");
    }

    if (name === undefined) {
        if (model._tag !== "ObjectSchema") {
            throw new Error("Expected an Effect object schema at the unnamed model root");
        }

        return model;
    }

    return attachModelRefs(model, name) as EffectModel<Name, S>;
}
