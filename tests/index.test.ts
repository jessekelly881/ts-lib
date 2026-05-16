import { describe, expect, it } from "@effect/vitest"
import { toRomanNumeral } from "@/x"

describe("WorkflowEngine", () => {
	it("works with TestClock", () => {
		expect(toRomanNumeral(1)).toEqual("I")
		expect(toRomanNumeral(2)).toEqual("II")
		expect(toRomanNumeral(5)).toEqual("V")
	})
}) 
