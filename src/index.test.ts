import { describe, expect, it } from "vitest";
import { Houses, einsteinRiddleExpr } from "./example.js";
import { createZ3Compiler, z3Sorts } from "./z3.js";

describe("Einstein riddle example", () => {
    it("finds the solution", async () => {
        const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

        await expect(z3.findExample(einsteinRiddleExpr)).resolves.toMatchInlineSnapshot(`
          {
            "env": {
              "houses": {
                "0": {
                  "animal": "Fish",
                  "color": "",
                  "nationality": "A",
                  "sport": "Football",
                },
                "1": {
                  "animal": "Cat",
                  "color": "Green",
                  "nationality": "",
                  "sport": "",
                },
                "2": {
                  "animal": "Dog",
                  "color": "Red",
                  "nationality": "German",
                  "sport": "Basketball",
                },
              },
            },
            "status": "sat",
          }
        `);
    });
});
