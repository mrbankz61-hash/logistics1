import { brand } from "./brand";

/** Uppercase letters and digits without the look-alikes I, O, 0 and 1 (easier to read out on the phone). */
export const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 8;
const PATTERN = /^[A-Z0-9]{2,6}-[A-Z0-9]{8}$/;

/** e.g. "XXX-7KQ4M2TZ". Uses crypto randomness; the caller checks uniqueness. */
export function generateTrackingNumber(prefix: string = brand.trackingPrefix): string {
  const bytes = new Uint8Array(SUFFIX_LENGTH);
  crypto.getRandomValues(bytes);
  // 256 is a multiple of 32, so the modulo is unbiased.
  const suffix = Array.from(bytes, (b) => TRACKING_ALPHABET[b % TRACKING_ALPHABET.length]).join("");
  return `${prefix.toUpperCase()}-${suffix}`;
}

/** Accepts sloppy input ("xxx 7kq4m2tz", "XXX7KQ4M2TZ") and returns the canonical form. */
export function normalizeTrackingNumber(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = /^([A-Z0-9]{2,6})([A-Z0-9]{8})$/.exec(compact);
  return match ? `${match[1]}-${match[2]}` : input.trim().toUpperCase();
}

export function isValidTrackingNumber(value: string): boolean {
  return PATTERN.test(value);
}
