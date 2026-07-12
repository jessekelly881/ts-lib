import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Houses, zebraTwoExpr } from "../testing/zebra-2.js";

it("zebra-2", async () => {
  const z3 = await createZ3Compiler(z3Sorts({ houses: Houses }));

  await expect(z3.findExample(zebraTwoExpr)).resolves.toMatchInlineSnapshot(`
          {
            "env": {
              "houses": {
                "0": {
                  "animal": "Fish",
                  "color": "Blue",
                  "nationality": "Brazilian",
                  "sport": "Football",
                },
                "1": {
                  "animal": "Cat",
                  "color": "Green",
                  "nationality": "Australian",
                  "sport": "Soccer",
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
