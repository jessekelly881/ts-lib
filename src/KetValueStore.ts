import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { kv } from '@vercel/kv';


/**
 * An implementation of the KeyValueStore layer that provides access to the Vercel KV store.
 */
export const layer = Layer.succeed(
    KeyValueStore.KeyValueStore,
    KeyValueStore.make({
        get: (key) => Effect.promise(() => kv.get(key)),
        set: (key, value) => Effect.promise(() => kv.set(key, value)),
        remove: (key) => Effect.promise(() => kv.del(key)),
        clear: Effect.promise(() => kv.keys("*").then((keys) => Promise.all(keys.map((k) => kv.del(k))))),
        size: Effect.promise(() => kv.keys("*").then((keys) => keys.length)),
    })
)
