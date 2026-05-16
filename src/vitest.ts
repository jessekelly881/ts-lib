
import { startVitest } from "vitest/node"
import type { Reporter } from "vitest/node"
import { Effect, Stream } from "effect"

export const testResultsStream = Stream.asyncScoped<"failed" | "passed">((emit) => Effect.gen(function*() {
    const reporter: Reporter = {
        // onTestRunStart() { await console.log("RUNNING") },

        onTestRunEnd(modules, errors, reason) {
            // if (errors.length > 0) console.log(errors[0].message)
            if (reason === "interrupted") { return }
            emit.single(reason)
        },
    }


    const vitest = yield* Effect.promise(() => startVitest("test", [], {
        watch: true,
        reporters: [reporter],
    }))

    yield* Effect.addFinalizer(() => Effect.promise(() => vitest.close()))
}))
