import { expect, it } from "vitest";
import { Schema } from "effect";
import { and, eq, or } from "../index.js";
import * as Arr from "../array.js";
import { fromEffectSchema } from "../effect.js";
import { createZ3Compiler, z3Sorts } from "../z3.js";

const Color = Schema.Literals(["Blue", "Green", "Red", "White", "Yellow"]);
const Nationality = Schema.Literals(["Brit", "Dane", "German", "Norwegian", "Swede"]);
const Drink = Schema.Literals(["Beer", "Coffee", "Milk", "Tea", "Water"]);
const Cigarette = Schema.Literals(["Blends", "BlueMaster", "Dunhill", "PallMall", "Prince"]);
const Pet = Schema.Literals(["Bird", "Cat", "Dog", "Fish", "Horses"]);

export class House extends Schema.Class<House>("House")({
  color: Color,
  nationality: Nationality,
  drink: Drink,
  cigarette: Cigarette,
  pet: Pet,
}) {
}

export const Houses = fromEffectSchema("houses", Schema.Tuple([House, House, House, House, House] as const));

const allColorsDifferentExpr = Arr.unique([Houses[0].color, Houses[1].color, Houses[2].color, Houses[3].color, Houses[4].color]);
const allNationalitiesDifferentExpr = Arr.unique([
  Houses[0].nationality,
  Houses[1].nationality,
  Houses[2].nationality,
  Houses[3].nationality,
  Houses[4].nationality,
]);
const allDrinksDifferentExpr = Arr.unique([Houses[0].drink, Houses[1].drink, Houses[2].drink, Houses[3].drink, Houses[4].drink]);
const allCigarettesDifferentExpr = Arr.unique([
  Houses[0].cigarette,
  Houses[1].cigarette,
  Houses[2].cigarette,
  Houses[3].cigarette,
  Houses[4].cigarette,
]);
const allPetsDifferentExpr = Arr.unique([Houses[0].pet, Houses[1].pet, Houses[2].pet, Houses[3].pet, Houses[4].pet]);

const Fields = {
  color: [Houses[0].color, Houses[1].color, Houses[2].color, Houses[3].color, Houses[4].color],
  nationality: [Houses[0].nationality, Houses[1].nationality, Houses[2].nationality, Houses[3].nationality, Houses[4].nationality],
  drink: [Houses[0].drink, Houses[1].drink, Houses[2].drink, Houses[3].drink, Houses[4].drink],
  cigarette: [Houses[0].cigarette, Houses[1].cigarette, Houses[2].cigarette, Houses[3].cigarette, Houses[4].cigarette],
  pet: [Houses[0].pet, Houses[1].pet, Houses[2].pet, Houses[3].pet, Houses[4].pet],
};

type Field = keyof typeof Fields;

const fieldEq = (houseIndex: 0 | 1 | 2 | 3 | 4, field: Field, value: string) => eq(Fields[field][houseIndex], value);

const sameHouse = (field: Field, value: string, otherField: Field, otherValue: string) => or(
  and(fieldEq(0, field, value), fieldEq(0, otherField, otherValue)),
  and(fieldEq(1, field, value), fieldEq(1, otherField, otherValue)),
  and(fieldEq(2, field, value), fieldEq(2, otherField, otherValue)),
  and(fieldEq(3, field, value), fieldEq(3, otherField, otherValue)),
  and(fieldEq(4, field, value), fieldEq(4, otherField, otherValue)),
);

const nextTo = (field: Field, value: string, otherField: Field, otherValue: string) => or(
  and(fieldEq(0, field, value), fieldEq(1, otherField, otherValue)),
  and(fieldEq(1, field, value), fieldEq(0, otherField, otherValue)),
  and(fieldEq(1, field, value), fieldEq(2, otherField, otherValue)),
  and(fieldEq(2, field, value), fieldEq(1, otherField, otherValue)),
  and(fieldEq(2, field, value), fieldEq(3, otherField, otherValue)),
  and(fieldEq(3, field, value), fieldEq(2, otherField, otherValue)),
  and(fieldEq(3, field, value), fieldEq(4, otherField, otherValue)),
  and(fieldEq(4, field, value), fieldEq(3, otherField, otherValue)),
);

// The Brit lives in the Red house.
const britLivesInRedExpr = sameHouse("nationality", "Brit", "color", "Red");

// The Swede keeps Dogs.
const swedeKeepsDogsExpr = sameHouse("nationality", "Swede", "pet", "Dog");

// The Dane drinks Tea.
const daneDrinksTeaExpr = sameHouse("nationality", "Dane", "drink", "Tea");

// The Green house is directly to the left of the White house.
const greenDirectlyLeftOfWhiteExpr = or(
  and(eq(Houses[0].color, "Green"), eq(Houses[1].color, "White")),
  and(eq(Houses[1].color, "Green"), eq(Houses[2].color, "White")),
  and(eq(Houses[2].color, "Green"), eq(Houses[3].color, "White")),
  and(eq(Houses[3].color, "Green"), eq(Houses[4].color, "White")),
);

// The Green house owner drinks Coffee.
const greenOwnerDrinksCoffeeExpr = sameHouse("color", "Green", "drink", "Coffee");

// The PallMall smoker keeps Birds.
const pallMallSmokerKeepsBirdsExpr = sameHouse("cigarette", "PallMall", "pet", "Bird");

// The Yellow house owner smokes Dunhill.
const yellowOwnerSmokesDunhillExpr = sameHouse("color", "Yellow", "cigarette", "Dunhill");

// The person in the center house drinks Milk.
const centerHouseDrinksMilkExpr = eq(Houses[2].drink, "Milk");

// The Norwegian lives in the first house.
const norwegianLivesInFirstHouseExpr = eq(Houses[0].nationality, "Norwegian");

// The Blends smoker lives next to the person who keeps Cats.
const blendsSmokerNextToCatsExpr = nextTo("cigarette", "Blends", "pet", "Cat");

// The person who keeps Horses lives next to the Dunhill smoker.
const horsesNextToDunhillExpr = nextTo("pet", "Horses", "cigarette", "Dunhill");

// The BlueMaster smoker drinks Beer.
const blueMasterSmokerDrinksBeerExpr = sameHouse("cigarette", "BlueMaster", "drink", "Beer");

// The German smokes Prince.
const germanSmokesPrinceExpr = sameHouse("nationality", "German", "cigarette", "Prince");

// The Norwegian lives next to the Blue house.
const norwegianNextToBlueExpr = nextTo("nationality", "Norwegian", "color", "Blue");

// The Blends smoker has a neighbor who drinks Water.
const blendsNextToWaterExpr = nextTo("cigarette", "Blends", "drink", "Water");

export const einsteinExpr = and(
  britLivesInRedExpr,
  swedeKeepsDogsExpr,
  daneDrinksTeaExpr,
  greenDirectlyLeftOfWhiteExpr,
  greenOwnerDrinksCoffeeExpr,
  pallMallSmokerKeepsBirdsExpr,
  yellowOwnerSmokesDunhillExpr,
  centerHouseDrinksMilkExpr,
  norwegianLivesInFirstHouseExpr,
  blendsSmokerNextToCatsExpr,
  horsesNextToDunhillExpr,
  blueMasterSmokerDrinksBeerExpr,
  germanSmokesPrinceExpr,
  norwegianNextToBlueExpr,
  blendsNextToWaterExpr,
  allColorsDifferentExpr,
  allNationalitiesDifferentExpr,
  allDrinksDifferentExpr,
  allCigarettesDifferentExpr,
  allPetsDifferentExpr,
);

it("einstein", async () => {
  const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

  await expect(z3.findExample(einsteinExpr)).resolves.toMatchInlineSnapshot(`
    {
      "env": {
        "houses": {
          "0": {
            "cigarette": "Dunhill",
            "color": "Yellow",
            "drink": "Water",
            "nationality": "Norwegian",
            "pet": "Cat",
          },
          "1": {
            "cigarette": "Blends",
            "color": "Blue",
            "drink": "Tea",
            "nationality": "Dane",
            "pet": "Horses",
          },
          "2": {
            "cigarette": "PallMall",
            "color": "Red",
            "drink": "Milk",
            "nationality": "Brit",
            "pet": "Bird",
          },
          "3": {
            "cigarette": "Prince",
            "color": "Green",
            "drink": "Coffee",
            "nationality": "German",
            "pet": "Fish",
          },
          "4": {
            "cigarette": "BlueMaster",
            "color": "White",
            "drink": "Beer",
            "nationality": "Swede",
            "pet": "Dog",
          },
        },
      },
      "status": "sat",
    }
  `);
});
