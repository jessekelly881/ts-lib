import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
// import * as Flag from "effect/unstable/cli/Flag"
import * as Command from "effect/unstable/cli/Command"
import { gitBacking } from "./git"
import { runner } from "./runner"

/*
const vc = Flag.choice("vc", ["git"] as const).pipe(
    Flag.withDefault("git"),
)
*/

const root = Command.make("redgreen", {}).pipe(
    Command.withHandler(() => 
        runner.pipe(Effect.provide(gitBacking({})))
    )
)

const run = Command.run(root, {
    version: "0.0.1",
})

const Env = Layer.mergeAll(NodeServices.layer)

run.pipe(Effect.provide(Env), NodeRuntime.runMain) 
