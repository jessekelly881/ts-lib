import { Array as A, Schema } from "effect";
import { and, eq, neq, or } from "../index.js";
import * as Arr from "../array.js";
import { fromEffectSchema } from "../effect.js";

export class House extends Schema.Class<House>("House")({
  color: Schema.Literals(["Blue", "Green", "Red"]),
  nationality: Schema.Literals(["Australian", "Brazilian", "German"]),
  animal: Schema.Literals(["Cat", "Dog", "Fish"]),
  sport: Schema.Literals(["Basketball", "Football", "Soccer"]),
}) {
}

export const Houses = fromEffectSchema("houses", Schema.Tuple([House, House, House] as const));

const allColorsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.color));

const allNationalitiesDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.nationality));

const allAnimalsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.animal));

const allSportsDifferentExpr = Arr.unique(A.map(Houses.items, (house) => house.sport));

// The Brazilian does not live in house two.
const brazilianDoesNotLiveInHouseTwoExpr = neq(Houses[1].nationality, "Brazilian");

// The person with the Dogs plays Basketball.
const dogOwnerPlaysBasketballExpr = or(
  and(eq(Houses[0].animal, "Dog"), eq(Houses[0].sport, "Basketball")),
  and(eq(Houses[1].animal, "Dog"), eq(Houses[1].sport, "Basketball")),
  and(eq(Houses[2].animal, "Dog"), eq(Houses[2].sport, "Basketball")),
);

// There is one house between the house of the person who plays Football and the Red house on the right.
const footballOneHouseLeftOfRedExpr = and(
  eq(Houses[0].sport, "Football"),
  eq(Houses[2].color, "Red"),
);

// The person with the Fishes lives directly to the left of the person with the Cats.
const fishDirectlyLeftOfCatExpr = or(
  and(eq(Houses[0].animal, "Fish"), eq(Houses[1].animal, "Cat")),
  and(eq(Houses[1].animal, "Fish"), eq(Houses[2].animal, "Cat")),
);

// The person with the Dogs lives directly to the right of the Green house.
const dogDirectlyRightOfGreenExpr = or(
  and(eq(Houses[0].color, "Green"), eq(Houses[1].animal, "Dog")),
  and(eq(Houses[1].color, "Green"), eq(Houses[2].animal, "Dog")),
);

// The German lives in house three.
const germanLivesInHouseThreeExpr = eq(Houses[2].nationality, "German");

export const zebraTwoExpr = and(
  brazilianDoesNotLiveInHouseTwoExpr,
  dogOwnerPlaysBasketballExpr,
  footballOneHouseLeftOfRedExpr,
  fishDirectlyLeftOfCatExpr,
  dogDirectlyRightOfGreenExpr,
  germanLivesInHouseThreeExpr,
  allColorsDifferentExpr,
  allNationalitiesDifferentExpr,
  allAnimalsDifferentExpr,
  allSportsDifferentExpr,
);

export const zebraTwoSolution = {
  houses: [
    { animal: "Fish", color: "Blue", nationality: "Brazilian", sport: "Football" },
    { animal: "Cat", color: "Green", nationality: "Australian", sport: "Soccer" },
    { animal: "Dog", color: "Red", nationality: "German", sport: "Basketball" },
  ],
} as const;
