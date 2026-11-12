import { describe, expect, it } from "vitest";
import { nozzleUpdateInput, tankInput, tankUpdateInput, userInput, userUpdateInput } from "@/lib/validation/schemas";
import { duplicateMessage } from "@/lib/actions/helpers";

describe("station setup inputs", () => {
  it("rejects a low-stock level above the tank capacity", () => {
    const r = tankInput.safeParse({ name: "Tank 1", productId: "p1", capacityL: "21000", safeLevelL: "25000" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid tank", () => {
    const r = tankInput.safeParse({ name: "Tank 1", productId: "p1", capacityL: "42000", safeLevelL: "6000" });
    expect(r.success).toBe(true);
  });

  it("treats blank edit fields as 'keep as is'", () => {
    const r = tankUpdateInput.safeParse({ tankId: "t1", name: "", capacityL: "", safeLevelL: "", active: "" });
    expect(r.success && r.data).toEqual({ tankId: "t1" });
    const n = nozzleUpdateInput.safeParse({ nozzleId: "n1", label: "", tankId: "", active: "false" });
    expect(n.success && n.data).toEqual({ nozzleId: "n1", active: "false" });
  });

  it("normalises login emails and refuses Super Admin as a role", () => {
    const ok = userInput.safeParse({ name: "Ali", email: " Ali@Example.COM ", role: "Cashier" });
    expect(ok.success && ok.data.email).toBe("ali@example.com");
    expect(userInput.safeParse({ name: "Ali", email: "ali@example.com", role: "SuperAdmin" }).success).toBe(false);
    expect(userUpdateInput.safeParse({ userId: "u1", role: "SuperAdmin" }).success).toBe(false);
  });

  it("explains duplicate emails and names", () => {
    expect(duplicateMessage(["email"])).toMatch(/email already exists/);
    expect(duplicateMessage(["dispenserId", "label"])).toMatch(/already used/);
    expect(duplicateMessage(["branchId", "name"])).toMatch(/already used/);
  });
});
