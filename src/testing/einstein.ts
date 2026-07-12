import { Array as A, Schema } from "effect";
import { and, eq } from "../index.js";
import * as Arr from "../array.js";
import { fromEffectSchema } from "../effect.js";

export class House extends Schema.Class<House>("House")({
  color: Schema.Literals(["Blue", "Green", "Red", "White", "Yellow"]),
  nationality: Schema.Literals(["Brit", "Dane", "German", "Norwegian", "Swede"]),
  drink: Schema.Literals(["Beer", "Coffee", "Milk", "Tea", "Water"]),
  cigarette: Schema.Literals(["Blends", "BlueMaster", "Dunhill", "PallMall", "Prince"]),
  pet: Schema.Literals(["Bird", "Cat", "Dog", "Fish", "Horses"]),
}) {
}

export const Houses = fromEffectSchema("houses", Schema.Tuple([House, House, House, House, House] as const));

const allColorsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.color));
const allNationalitiesDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.nationality));
const allDrinksDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.drink));
const allCigarettesDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.cigarette));
const allPetsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.pet));

const houseIndexes = A.range(0, Houses.items.length - 1);
const adjacentHouseIndexes = A.zip(
  A.range(0, Houses.items.length - 2),
  A.range(1, Houses.items.length - 1),
);
const neighboringHouseIndexes = A.flatMap(adjacentHouseIndexes, ([left, right]) => [[left, right], [right, left]] as const);

const Fields = {
  color: A.map(Houses.items, (house) => house.color),
  nationality: A.map(Houses.items, (house) => house.nationality),
  drink: A.map(Houses.items, (house) => house.drink),
  cigarette: A.map(Houses.items, (house) => house.cigarette),
  pet: A.map(Houses.items, (house) => house.pet),
};

type Field = keyof typeof Fields;

const fieldEq = (houseIndex: number, field: Field, value: string) => eq(Fields[field][houseIndex], value);

const sameHouse = (field: Field, value: string, otherField: Field, otherValue: string) =>
  Arr.some(houseIndexes, (index) =>
    and(fieldEq(index, field, value), fieldEq(index, otherField, otherValue))
  );

const nextTo = (field: Field, value: string, otherField: Field, otherValue: string) =>
  Arr.some(neighboringHouseIndexes, ([index, otherIndex]) =>
    and(fieldEq(index, field, value), fieldEq(otherIndex, otherField, otherValue))
  );

// The Brit lives in the Red house.
const britLivesInRedExpr = sameHouse("nationality", "Brit", "color", "Red");

// The Swede keeps Dogs.
const swedeKeepsDogsExpr = sameHouse("nationality", "Swede", "pet", "Dog");

// The Dane drinks Tea.
const daneDrinksTeaExpr = sameHouse("nationality", "Dane", "drink", "Tea");

// The Green house is directly to the left of the White house.
const greenDirectlyLeftOfWhiteExpr = Arr.some(adjacentHouseIndexes, ([left, right]) =>
  and(fieldEq(left, "color", "Green"), fieldEq(right, "color", "White"))
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

export const einsteinSolution = {
  houses: [
    { cigarette: "Dunhill", color: "Yellow", drink: "Water", nationality: "Norwegian", pet: "Cat" },
    { cigarette: "Blends", color: "Blue", drink: "Tea", nationality: "Dane", pet: "Horses" },
    { cigarette: "PallMall", color: "Red", drink: "Milk", nationality: "Brit", pet: "Bird" },
    { cigarette: "Prince", color: "Green", drink: "Coffee", nationality: "German", pet: "Fish" },
    { cigarette: "BlueMaster", color: "White", drink: "Beer", nationality: "Swede", pet: "Dog" },
  ],
} as const;
