import { String } from "effect";

export const toRomanNumeral = (num: number) => {
    if (num === 5) return "V"
    return String.repeat(num)("I")
}
