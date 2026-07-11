import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Array as A, Schema } from "effect";
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

const allColorsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.color));
const allNationalitiesDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.nationality));
const allAnimalsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.animal));
const allSportsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.sport));

const adjacentIndexes = A.zip(A.range(0, Houses.items.length - 2), A.range(1, Houses.items.length - 1));
const indexesSeparatedBy = (gap: number) => {
  const distance = gap + 1;
  return A.zip(A.range(0, Houses.items.length - distance - 1), A.range(distance, Houses.items.length - 1));
};
const indexesSeparatedByEitherSide = (gap: number) =>
  A.flatMap(indexesSeparatedBy(gap), ([left, right]) => [[left, right], [right, left]] as const);
const orderedIndexes = A.flatMap(A.range(0, Houses.items.length - 2), (left) =>
  A.map(A.range(left + 1, Houses.items.length - 1), (right) => [left, right] as const)
);

// There are two houses between the person who likes Bowling and the person who likes Swimming.
const bowlingTwoHousesFromSwimmingExpr = Arr.some(indexesSeparatedByEitherSide(2), ([bowling, swimming]) =>
  and(eq(Houses[bowling].sport, "Bowling"), eq(Houses[swimming].sport, "Swimming"))
);

// There is one house between the Irish and the person who likes Handball on the left.
const handballOneHouseLeftOfIrishExpr = Arr.some(indexesSeparatedBy(1), ([handball, irish]) =>
  and(eq(Houses[handball].sport, "Handball"), eq(Houses[irish].nationality, "Irish"))
);

// The second house is Black.
const secondHouseIsBlackExpr = eq(Houses[1].color, "Black");

// There is one house between the person who likes Horses and the Red house on the right.
const horsesOneHouseLeftOfRedExpr = Arr.some(indexesSeparatedBy(1), ([horses, red]) =>
  and(eq(Houses[horses].animal, "Horses"), eq(Houses[red].color, "Red"))
);

// The American lives directly to the left of the person who likes Turtles.
const americanDirectlyLeftOfTurtlesExpr = Arr.some(adjacentIndexes, ([american, turtles]) =>
  and(eq(Houses[american].nationality, "American"), eq(Houses[turtles].animal, "Turtles"))
);

// There are two houses between the person who likes Horses and the person who likes Butterflies on the right.
const horsesTwoHousesLeftOfButterfliesExpr = Arr.some(indexesSeparatedBy(2), ([horses, butterflies]) =>
  and(eq(Houses[horses].animal, "Horses"), eq(Houses[butterflies].animal, "Butterflies"))
);

// The person who likes Bowling lives somewhere to the right of the person who likes Tennis.
const bowlingRightOfTennisExpr = Arr.some(orderedIndexes, ([tennis, bowling]) =>
  and(eq(Houses[tennis].sport, "Tennis"), eq(Houses[bowling].sport, "Bowling"))
);

// There is one house between the person who likes Handball and the White house on the right.
const handballOneHouseLeftOfWhiteExpr = Arr.some(indexesSeparatedBy(1), ([handball, white]) =>
  and(eq(Houses[handball].sport, "Handball"), eq(Houses[white].color, "White"))
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
