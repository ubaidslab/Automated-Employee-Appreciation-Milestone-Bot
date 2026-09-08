import { describe, expect, it } from "vitest";
import { isValidationError } from "./types";
import { validateEmployeeInput } from "./employee";

const validBase = {
  name: "Jamie Rivera",
  email: "jamie@example.com",
  startDate: "2022-01-15",
};

describe("validateEmployeeInput", () => {
  it("accepts a minimal valid employee", () => {
    const result = validateEmployeeInput(validBase);
    expect(isValidationError(result)).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(isValidationError(validateEmployeeInput("nope"))).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(isValidationError(validateEmployeeInput({ ...validBase, name: "" }))).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(isValidationError(validateEmployeeInput({ ...validBase, email: "not-an-email" }))).toBe(true);
  });

  it("rejects a malformed startDate", () => {
    expect(isValidationError(validateEmployeeInput({ ...validBase, startDate: "01/15/2022" }))).toBe(true);
  });

  it("rejects an out-of-range birthday", () => {
    expect(isValidationError(validateEmployeeInput({ ...validBase, birthday: "13-40" }))).toBe(true);
  });

  it("accepts a valid birthday and normalizes optional fields", () => {
    const result = validateEmployeeInput({
      ...validBase,
      birthday: "07-22",
      shareBirthday: true,
      department: "  Engineering  ",
    });
    expect(result).toEqual({
      name: "Jamie Rivera",
      email: "jamie@example.com",
      department: "Engineering",
      startDate: "2022-01-15",
      birthday: "07-22",
      shareBirthday: true,
      slackUserId: null,
    });
  });

  it("treats an empty-string birthday as no birthday on file", () => {
    const result = validateEmployeeInput({ ...validBase, birthday: "" });
    expect(isValidationError(result)).toBe(false);
    if (!isValidationError(result)) {
      expect(result.birthday).toBeNull();
    }
  });
});
