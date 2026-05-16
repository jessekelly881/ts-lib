import { startVitest } from "vitest/node"
import type { Reporter, TestRunEndReason } from "vitest/node"
import simpleGit from "simple-git"
import { nanoid } from 'nanoid'
import { Effect } from "effect"

const git = simpleGit()

const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"])
const tempBranchName = `${currentBranch}-${nanoid(6)}`

git.branch([tempBranchName]).checkout()

const reporter: Reporter = {
    onTestRunStart() {
        console.log("RUNNING")
    },

    onTestRunEnd(_modules, errors, reason: TestRunEndReason) {
        if (errors.length > 0) console.log(errors[0].message)
        console.log(reason === "passed" ? "GREEN" : "RED")
    },
}
/*
await startVitest("test", [], {
    watch: true,
    reporters: [reporter],
}) 
*/
