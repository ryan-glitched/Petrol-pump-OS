import { describe, expect, it } from "vitest";
import { voidEntryInput } from "@/lib/validation/schemas";

describe("voidEntryInput", () => {
  it("splits the entry into kind and id", () => {
    const r = voidEntryInput.safeParse({ entry: "reading:abc123", reason: "wrong closing meter" });
    expect(r.success && r.data.entry).toEqual({ kind: "reading", id: "abc123" });
  });
  it("rejects unknown kinds and a missing reason", () => {
    expect(voidEntryInput.safeParse({ entry: "shift:abc", reason: "wrong closing meter" }).success).toBe(false);
    expect(voidEntryInput.safeParse({ entry: "dip:abc", reason: "  " }).success).toBe(false);
  });
});
