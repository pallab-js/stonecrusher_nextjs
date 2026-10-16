import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidGstin, isValidPhone } from "../../lib/validate";

test("isValidGstin accepts a well-formed GSTIN", () => {
  assert.equal(isValidGstin("18ABCDE1234F1Z5"), true); // the app's default unit GSTIN
  assert.equal(isValidGstin("27AAPFU0939F1ZV"), true);
  assert.equal(isValidGstin("18abcde1234f1z5"), true); // case-insensitive
});

test("isValidGstin treats empty/whitespace as optional (valid)", () => {
  assert.equal(isValidGstin(""), true);
  assert.equal(isValidGstin("   "), true);
  assert.equal(isValidGstin(null), true);
  assert.equal(isValidGstin(undefined), true);
});

test("isValidGstin rejects malformed values", () => {
  assert.equal(isValidGstin("18ABCDE1234F1Z"), false); // 14 chars
  assert.equal(isValidGstin("18ABCDE1234F1Z55"), false); // 16 chars
  assert.equal(isValidGstin("1XABCDE1234F1Z5"), false); // non-digit state code
  assert.equal(isValidGstin("18ABCD12345F1Z5"), false); // PAN block shape wrong
  assert.equal(isValidGstin("18ABCDE1234F1X5"), false); // 13th char must be 'Z'
  assert.equal(isValidGstin("random text"), false);
});

test("isValidPhone accepts common Indian formats", () => {
  assert.equal(isValidPhone("+91 98640 12345"), true);
  assert.equal(isValidPhone("9864012345"), true);
  assert.equal(isValidPhone("+91-98640-12345"), true);
  assert.equal(isValidPhone("(0361) 2345678"), true);
});

test("isValidPhone treats empty as optional (valid)", () => {
  assert.equal(isValidPhone(""), true);
  assert.equal(isValidPhone("   "), true);
  assert.equal(isValidPhone(null), true);
  assert.equal(isValidPhone(undefined), true);
});

test("isValidPhone rejects malformed values", () => {
  assert.equal(isValidPhone("12345"), false); // too few digits
  assert.equal(isValidPhone("98640 12345 67890 123"), false); // too many digits
  assert.equal(isValidPhone("98640ABCDE"), false); // letters not allowed
  assert.equal(isValidPhone("call me"), false);
});
