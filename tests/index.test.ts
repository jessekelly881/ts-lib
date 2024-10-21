import { it } from "@effect/vitest";
import { Schema } from "effect";
import { describe } from "vitest";

describe("tests", () => {
	it.prop("add", [Schema.Int, Schema.Int], ([a, b]) => a + b === b + a);
});
