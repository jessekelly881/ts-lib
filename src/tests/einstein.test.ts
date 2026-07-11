import { expect, it } from "vitest";
import { Schema } from "effect";
import { allDifferent, and, eq, or } from "../index.js";
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

const allColorsDifferentExpr = allDifferent([Houses[0].color, Houses[1].color, Houses[2].color, Houses[3].color, Houses[4].color]);
const allNationalitiesDifferentExpr = allDifferent([
  Houses[0].nationality,
  Houses[1].nationality,
  Houses[2].nationality,
  Houses[3].nationality,
  Houses[4].nationality,
]);
const allDrinksDifferentExpr = allDifferent([Houses[0].drink, Houses[1].drink, Houses[2].drink, Houses[3].drink, Houses[4].drink]);
const allCigarettesDifferentExpr = allDifferent([
  Houses[0].cigarette,
  Houses[1].cigarette,
  Houses[2].cigarette,
  Houses[3].cigarette,
  Houses[4].cigarette,
]);
const allPetsDifferentExpr = allDifferent([Houses[0].pet, Houses[1].pet, Houses[2].pet, Houses[3].pet, Houses[4].pet]);

const sameHouse = <Field extends keyof House, Value extends House[Field]>(field: Field, value: Value, otherField: Field, otherValue: Value) => or(
  and(eq(Houses[0][field] as never, value as never), eq(Houses[0][otherField] as never, otherValue as never)),
  and(eq(Houses[1][field] as never, value as never), eq(Houses[1][otherField] as never, otherValue as never)),
  and(eq(Houses[2][field] as never, value as never), eq(Houses[2][otherField] as never, otherValue as never)),
  and(eq(Houses[3][field] as never, value as never), eq(Houses[3][otherField] as never, otherValue as never)),
  and(eq(Houses[4][field] as never, value as never), eq(Houses[4][otherField] as never, otherValue as never)),
);

const nextTo = <Field extends keyof House, Value extends House[Field]>(field: Field, value: Value, otherField: Field, otherValue: Value) => or(
  and(eq(Houses[0][field] as never, value as never), eq(Houses[1][otherField] as never, otherValue as never)),
  and(eq(Houses[1][field] as never, value as never), eq(Houses[0][otherField] as never, otherValue as never)),
  and(eq(Houses[1][field] as never, value as never), eq(Houses[2][otherField] as never, otherValue as never)),
  and(eq(Houses[2][field] as never, value as never), eq(Houses[1][otherField] as never, otherValue as never)),
  and(eq(Houses[2][field] as never, value as never), eq(Houses[3][otherField] as never, otherValue as never)),
  and(eq(Houses[3][field] as never, value as never), eq(Houses[2][otherField] as never, otherValue as never)),
  and(eq(Houses[3][field] as never, value as never), eq(Houses[4][otherField] as never, otherValue as never)),
  and(eq(Houses[4][field] as never, value as never), eq(Houses[3][otherField] as never, otherValue as never)),
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
