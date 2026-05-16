import { testResultsStream } from "./vitest"
import { Effect, Stream, Option } from "effect"
import { Backing } from "./backing"
import { Console } from "effect"

export const runner = Effect.gen(function*() {
    const backing = yield* Backing
    yield* testResultsStream.pipe(
        Stream.zipWithPrevious,
        Stream.runForEach(([prevOption, state]) => Effect.gen(function*() {
            yield* Console.clear
            const shouldSave = Option.isSome(prevOption) && prevOption.value === "failed" && state === "passed"

            if (shouldSave) {
                yield* Console.log("✓ \e[42m SAVED")
                yield* backing.save 
            }

            if (state === "passed") {
                yield* Console.log("✓ \e[42m PASSING")
            }

            if (state === "failed") {
                yield* Console.log("❌ \e[41m FAILING")
            }

        }))
    )
})
