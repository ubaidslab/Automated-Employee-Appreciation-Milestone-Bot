import { describe, expect, it } from "vitest";
import { isValidationError } from "./types";
import { validateAchievementInput } from "./achievement";

describe("validateAchievementInput", () => {
  it("accepts a valid achievement", () => {
    const result = validateAchievementInput({
      employeeId: "emp-1",
      title: "Shipped the redesign",
      description: "New checkout flow, +12% conversion.",
    });
    expect(isValidationError(result)).toBe(false);
  });

  it("rejects a missing employeeId", () => {
    expect(isValidationError(validateAchievementInput({ title: "X" }))).toBe(true);
  });

  it("rejects a missing title", () => {
    expect(isValidationError(validateAchievementInput({ employeeId: "emp-1", title: "" }))).toBe(true);
  });

  it("allows an omitted description", () => {
    const result = validateAchievementInput({ employeeId: "emp-1", title: "Closed the deal" });
    expect(isValidationError(result)).toBe(false);
    if (!isValidationError(result)) {
      expect(result.description).toBeNull();
    }
  });
});
