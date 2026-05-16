import { Context, Effect } from "effect";

export class Backing extends Context.Service<Backing, {
    readonly save: Effect.Effect<void>
}>()("Backing") {
} 
