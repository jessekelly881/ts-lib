import { Context, Effect } from "effect";

// vc backing - git, etc.
export class Backing extends Context.Tag("Backing")<Backing, {
    save: Effect.Effect<void>
}>() {
} 
