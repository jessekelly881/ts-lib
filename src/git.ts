import simpleGit from "simple-git"
import { Effect, Layer, Clock } from "effect"
import { Backing } from "./backing";

export interface GitBackingConfig {
    /**
     * Defaults to `${currentBranch}_${Date.now()}`
     */
    branchName?: (currentBranch: string) => string
}

/** @internal */
const defaultConfig: Required<GitBackingConfig> = {
    branchName: (currentBranch) => `${currentBranch}_${Date.now()}`
}

export type GitBacking = Layer.Layer<Backing, never, never>;

export const gitBacking = (userConfig: GitBackingConfig): GitBacking => Layer.effect(Backing, Effect.gen(function*() {
    const config = { ...defaultConfig, ...userConfig }

    const git = simpleGit()
    const currentBranch = yield* Effect.promise(() => git.revparse(["--abbrev-ref", "HEAD"]))
    const tempBranchName = config.branchName(currentBranch)
    yield* Effect.sync(() => git.checkoutBranch(tempBranchName, currentBranch))

    const save = Effect.gen(function*() {
        const now = yield* Clock.currentTimeMillis
        yield* Effect.sync(() => git.add('./*').commit(now.toString()))
    })


    return { save } 
})) 
