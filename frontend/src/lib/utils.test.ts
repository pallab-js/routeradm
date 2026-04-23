import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges simple classnames", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("merges array classnames", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar")).toBe("foo");
    expect(cn("foo", true && "bar")).toBe("foo bar");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("handles multiple class strings", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });
});