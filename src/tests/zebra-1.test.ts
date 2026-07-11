import { expect, it } from "vitest";
import { Schema } from "effect";
import { and, eq, or } from "../index.js";
import * as Arr from "../array.js";
import { fromEffectSchema } from "../effect.js";
import { createZ3Compiler, z3Sorts } from "../z3.js";

const Color = Schema.Literals(["Red", "Blue", "White"]);
const Nationality = Schema.Literals(["Spanish", "Norwegian", "Italian"]);

export class House extends Schema.Class<House>("House")({
  color: Color,
  nationality: Nationality,
}) {
}

export const Houses = fromEffectSchema("houses", Schema.Tuple([House, House, House] as const));

const allColorsDifferentExpr = Arr.unique(Houses.items.map((house) => house.color));

const allNationalitiesDifferentExpr = Arr.unique(Houses.items.map((house) => house.nationality));

// The Spanish lives directly to the right of the Red house.
const spanishDirectlyRightOfRedExpr = or(
  and(eq(Houses[0].color, "Red"), eq(Houses[1].nationality, "Spanish")),
  and(eq(Houses[1].color, "Red"), eq(Houses[2].nationality, "Spanish")),
);

// The Norwegian lives in the Blue house.
const norwegianLivesInBlueExpr = or(
  and(eq(Houses[0].color, "Blue"), eq(Houses[0].nationality, "Norwegian")),
  and(eq(Houses[1].color, "Blue"), eq(Houses[1].nationality, "Norwegian")),
  and(eq(Houses[2].color, "Blue"), eq(Houses[2].nationality, "Norwegian")),
);

// The Italian lives in house two.
const italianLivesInHouseTwoExpr = eq(Houses[1].nationality, "Italian");

export const zebraOneExpr = and(
  spanishDirectlyRightOfRedExpr,
  norwegianLivesInBlueExpr,
  italianLivesInHouseTwoExpr,
  allNationalitiesDifferentExpr,
  allColorsDifferentExpr,
);

it("zebra-1", async () => {
  const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

  await expect(z3.findExample(zebraOneExpr)).resolves.toMatchInlineSnapshot(`
      {
        "env": {
          "houses": {
            "0": {
              "color": "Blue",
              "nationality": "Norwegian",
            },
            "1": {
              "color": "Red",
              "nationality": "Italian",
            },
            "2": {
              "color": "White",
              "nationality": "Spanish",
            },
          },
        },
        "status": "sat",
      }
    `);
});
