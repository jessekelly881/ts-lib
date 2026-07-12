import { expect, it } from "vitest";
import { createZ3Compiler, z3Sorts } from "../z3.js";
import { Houses, zebraOneExpr } from "../testing/zebra-1.js";

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
