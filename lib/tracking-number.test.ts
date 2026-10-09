import { describe, expect, it } from "vitest";
import {
  generateTrackingNumber,
  isValidTrackingNumber,
  normalizeTrackingNumber,
  TRACKING_ALPHABET,
} from "./tracking-number";

describe("tracking numbers", () => {
  it("generates PREFIX- plus 8 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const tn = generateTrackingNumber("ABC");
      expect(tn).toMatch(/^ABC-[A-Z0-9]{8}$/);
      expect(isValidTrackingNumber(tn)).toBe(true);
      for (const ch of tn.slice(4)) expect(TRACKING_ALPHABET).toContain(ch);
      expect(tn.slice(4)).not.toMatch(/[IO01]/);
    }
  });

  it("is random enough not to collide in a small batch", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateTrackingNumber("XXX")));
    expect(set.size).toBe(5000);
  });

  it("normalizes sloppy user input", () => {
    expect(normalizeTrackingNumber(" xxx-7kq4m2tz ")).toBe("XXX-7KQ4M2TZ");
    expect(normalizeTrackingNumber("XXX 7KQ4 M2TZ")).toBe("XXX-7KQ4M2TZ");
    expect(normalizeTrackingNumber("xxx7kq4m2tz")).toBe("XXX-7KQ4M2TZ");
    expect(normalizeTrackingNumber(" hello ")).toBe("HELLO");
  });

  it("validates the format", () => {
    expect(isValidTrackingNumber("XXX-7KQ4M2TZ")).toBe(true);
    expect(isValidTrackingNumber("XXX-7KQ4M2T")).toBe(false);
    expect(isValidTrackingNumber("xxx-7kq4m2tz")).toBe(false);
    expect(isValidTrackingNumber("../shipments")).toBe(false);
  });
});
