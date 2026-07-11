import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Schema } from "effect";
import { and, eq, or } from "../index.js";
import * as Arr from "../array.js";
import { fromEffectSchema } from "../effect.js";

export class House extends Schema.Class<House>("House")({
  color: Schema.Literals(["Black", "Blue", "Red", "White"]),
  nationality: Schema.Literals(["American", "British", "Canadian", "Irish"]),
  animal: Schema.Literals(["Butterflies", "Dolphins", "Horses", "Turtles"]),
  sport: Schema.Literals(["Bowling", "Handball", "Swimming", "Tennis"]),
}) {
}

export const Houses = fromEffectSchema("houses", Schema.Tuple([House, House, House, House] as const));

const allColorsDifferentExpr = Arr.unique(Houses.items.map((house) => house.color));
const allNationalitiesDifferentExpr = Arr.unique(Houses.items.map((house) => house.nationality));
const allAnimalsDifferentExpr = Arr.unique(Houses.items.map((house) => house.animal));
const allSportsDifferentExpr = Arr.unique(Houses.items.map((house) => house.sport));

// There are two houses between the person who likes Bowling and the person who likes Swimming.
const bowlingTwoHousesFromSwimmingExpr = or(
  and(eq(Houses[0].sport, "Bowling"), eq(Houses[3].sport, "Swimming")),
  and(eq(Houses[3].sport, "Bowling"), eq(Houses[0].sport, "Swimming")),
);

// There is one house between the Irish and the person who likes Handball on the left.
const handballOneHouseLeftOfIrishExpr = or(
  and(eq(Houses[0].sport, "Handball"), eq(Houses[2].nationality, "Irish")),
  and(eq(Houses[1].sport, "Handball"), eq(Houses[3].nationality, "Irish")),
);

// The second house is Black.
const secondHouseIsBlackExpr = eq(Houses[1].color, "Black");

// There is one house between the person who likes Horses and the Red house on the right.
const horsesOneHouseLeftOfRedExpr = or(
  and(eq(Houses[0].animal, "Horses"), eq(Houses[2].color, "Red")),
  and(eq(Houses[1].animal, "Horses"), eq(Houses[3].color, "Red")),
);

// The American lives directly to the left of the person who likes Turtles.
const americanDirectlyLeftOfTurtlesExpr = or(
  and(eq(Houses[0].nationality, "American"), eq(Houses[1].animal, "Turtles")),
  and(eq(Houses[1].nationality, "American"), eq(Houses[2].animal, "Turtles")),
  and(eq(Houses[2].nationality, "American"), eq(Houses[3].animal, "Turtles")),
);

// There are two houses between the person who likes Horses and the person who likes Butterflies on the right.
const horsesTwoHousesLeftOfButterfliesExpr = and(eq(Houses[0].animal, "Horses"), eq(Houses[3].animal, "Butterflies"));

// The person who likes Bowling lives somewhere to the right of the person who likes Tennis.
const bowlingRightOfTennisExpr = or(
  and(eq(Houses[0].sport, "Tennis"), eq(Houses[1].sport, "Bowling")),
  and(eq(Houses[0].sport, "Tennis"), eq(Houses[2].sport, "Bowling")),
  and(eq(Houses[0].sport, "Tennis"), eq(Houses[3].sport, "Bowling")),
  and(eq(Houses[1].sport, "Tennis"), eq(Houses[2].sport, "Bowling")),
  and(eq(Houses[1].sport, "Tennis"), eq(Houses[3].sport, "Bowling")),
  and(eq(Houses[2].sport, "Tennis"), eq(Houses[3].sport, "Bowling")),
);

// There is one house between the person who likes Handball and the White house on the right.
const handballOneHouseLeftOfWhiteExpr = or(
  and(eq(Houses[0].sport, "Handball"), eq(Houses[2].color, "White")),
  and(eq(Houses[1].sport, "Handball"), eq(Houses[3].color, "White")),
);

// The British lives in the first house.
const britishLivesInFirstHouseExpr = eq(Houses[0].nationality, "British");

export const zebraThreeExpr = and(
  bowlingTwoHousesFromSwimmingExpr,
  handballOneHouseLeftOfIrishExpr,
  secondHouseIsBlackExpr,
  horsesOneHouseLeftOfRedExpr,
  americanDirectlyLeftOfTurtlesExpr,
  horsesTwoHousesLeftOfButterfliesExpr,
  bowlingRightOfTennisExpr,
  handballOneHouseLeftOfWhiteExpr,
  britishLivesInFirstHouseExpr,
  allColorsDifferentExpr,
  allNationalitiesDifferentExpr,
  allAnimalsDifferentExpr,
  allSportsDifferentExpr,
);

it("zebra-3", async () => {
  const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

  await expect(z3.findExample(zebraThreeExpr)).resolves.toMatchInlineSnapshot(`
    {
      "env": {
        "houses": {
          "0": {
            "animal": "Horses",
            "color": "Blue",
            "nationality": "British",
            "sport": "Swimming",
          },
          "1": {
            "animal": "Dolphins",
            "color": "Black",
            "nationality": "American",
            "sport": "Handball",
          },
          "2": {
            "animal": "Turtles",
            "color": "Red",
            "nationality": "Canadian",
            "sport": "Tennis",
          },
          "3": {
            "animal": "Butterflies",
            "color": "White",
            "nationality": "Irish",
            "sport": "Bowling",
          },
        },
      },
      "status": "sat",
    }
  `);
});
