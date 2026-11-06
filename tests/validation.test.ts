import { describe, expect, it } from "vitest";
import { changePasswordInput, tankDipInput } from "@/lib/validation/schemas";
import { duplicateMessage } from "@/lib/actions/helpers";

describe("tankDipInput", () => {
  it("accepts a closing dip above the opening dip (delivery day)", () => {
    const result = tankDipInput.safeParse({ date: "2026-11-05", tankId: "t1", openingDip: "8000", closingDip: "19500" });
    expect(result.success).toBe(true);
  });

  it("still rejects negative dips", () => {
    const result = tankDipInput.safeParse({ date: "2026-11-05", tankId: "t1", openingDip: "-1", closingDip: "100" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordInput", () => {
  it("requires matching passwords of at least 10 characters", () => {
    expect(changePasswordInput.safeParse({ currentPassword: "x", newPassword: "short", confirmPassword: "short" }).success).toBe(false);
    expect(
      changePasswordInput.safeParse({ currentPassword: "x", newPassword: "longenough1", confirmPassword: "different11" }).success,
    ).toBe(false);
    expect(
      changePasswordInput.safeParse({ currentPassword: "x", newPassword: "longenough1", confirmPassword: "longenough1" }).success,
    ).toBe(true);
  });
});

describe("duplicateMessage", () => {
  it("names the duplicated field when Prisma reports it", () => {
    expect(duplicateMessage(["branchId", "invoice"])).toBe("This invoice number is already recorded.");
    expect(duplicateMessage(["branchId", "date", "shiftSlot"])).toBe("This shift is already open for that date.");
    expect(duplicateMessage("NozzleReading_daily_no_shift_key")).toBe("This entry has already been saved.");
    expect(duplicateMessage(undefined)).toBe("This entry has already been saved.");
  });
});
