import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Houses, einsteinExpr } from "../testing/einstein.js";

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
