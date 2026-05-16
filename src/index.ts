import { testResultsStream } from "./vitest"
import { Effect, Stream, Option } from "effect"
import { Backing } from "./backing"
import { gitBacking } from "./git"

Effect.gen(function*() {
    const backing = yield* Backing
    yield* testResultsStream.pipe(
        Stream.zipWithPrevious,
        Stream.runForEach(([prevOption, state]) => Effect.gen(function*() {
            const shouldSave = Option.isSome(prevOption) && prevOption.value === "failed" && state === "passed"
            if (shouldSave) {
                yield* Effect.log("Tests now passing. Saving")
                yield* backing.save 
            }
        }))
    )
}).pipe(
    Effect.provide(gitBacking({})),
    Effect.runPromise
)
