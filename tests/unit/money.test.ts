import { test } from "node:test";
import assert from "node:assert/strict";
import {
  r2,
  paymentStatus,
  formatDocNo,
  applyMovement,
  closingStock,
  isShortStock,
  toPaise,
  fromPaise,
  sumMoney,
  lineAmount,
  invoiceTotal,
  addMoney,
  subMoneyClamped,
} from "../../lib/money";

test("r2 rounds to two decimals", () => {
  assert.equal(r2(1.005), 1.0); // IEEE-754: 1.005 stored as 1.00499… → rounds down
  assert.equal(r2(1.014), 1.01);
  assert.equal(r2(1.015 + 1e-9), 1.02);
  assert.equal(r2(2.675 + 1e-9), 2.68);
  assert.equal(r2(0), 0);
  assert.equal(r2(-1.236), -1.24);
});

test("paymentStatus: unpaid when nothing paid", () => {
  assert.equal(paymentStatus(100, 0), "unpaid");
  assert.equal(paymentStatus(100, -5), "unpaid");
});

test("paymentStatus: paid when settled to the paisa", () => {
  assert.equal(paymentStatus(100, 100), "paid");
  assert.equal(paymentStatus(100, 99.995), "paid"); // rounds up to 10000 paise = total
  assert.equal(paymentStatus(100, 150), "paid"); // overpay still counts as paid
});

test("paymentStatus: partial between zero and total", () => {
  assert.equal(paymentStatus(100, 50), "partial");
  assert.equal(paymentStatus(100, 99.98), "partial"); // 9998 paise < 10000
  assert.equal(paymentStatus(100, 99.99), "partial"); // one paisa short
  assert.equal(paymentStatus(100, 0.01), "partial");
});

test("paymentStatus: zero-total invoice reads as paid once anything is applied", () => {
  assert.equal(paymentStatus(0, 0), "unpaid");
  assert.equal(paymentStatus(0, 0.01), "paid");
});

test("formatDocNo zero-pads to four digits with prefix", () => {
  assert.equal(formatDocNo("INV", 1), "INV0001");
  assert.equal(formatDocNo("LPO", 42), "LPO0042");
  assert.equal(formatDocNo("GRN", 9999), "GRN9999");
  assert.equal(formatDocNo("INV", 12345), "INV12345"); // no truncation past 4 digits
});

test("applyMovement adds inflow and subtracts outflow", () => {
  assert.equal(applyMovement(100, "in", 25.5), 125.5);
  assert.equal(applyMovement(100, "out", 40), 60);
  assert.equal(applyMovement(10.1, "out", 10.1), 0);
});

test("applyMovement can drive balance negative (over-dispatch is detectable)", () => {
  assert.equal(applyMovement(5, "out", 8), -3);
});

test("closingStock = opening + inflow − outflow, rounded", () => {
  assert.equal(closingStock(100, 50, 30), 120);
  assert.equal(closingStock(0, 0, 0), 0);
  assert.equal(closingStock(10.11, 0.004, 0), 10.11);
  assert.equal(closingStock(100, 0, 150), -50);
});

test("isShortStock flags over-dispatch beyond tolerance", () => {
  assert.equal(isShortStock(100, 99), true); // short by 1
  assert.equal(isShortStock(100, 100), false); // exact match allowed
  assert.equal(isShortStock(100, 99.995), false); // within 0.01 float tolerance
  assert.equal(isShortStock(100, 99.98), true); // beyond tolerance
  assert.equal(isShortStock(0, 0), false); // nothing requested
  assert.equal(isShortStock(50, 120), false); // plenty of stock
});

test("toPaise / fromPaise round-trip exactly", () => {
  assert.equal(toPaise(1), 100);
  assert.equal(toPaise(10.1), 1010);
  assert.equal(toPaise(0.1 + 0.2), 30); // float 0.30000000000000004 → 30 paise
  assert.equal(fromPaise(1010), 10.1);
  assert.equal(fromPaise(toPaise(1234.56)), 1234.56);
});

test("sumMoney adds without float drift", () => {
  // The classic failure: 0.1 + 0.2 !== 0.3 in IEEE-754.
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
  // Summing 10 line amounts of 0.1 each: naive float gives 0.9999999999999999.
  assert.equal(sumMoney(Array(10).fill(0.1)), 1);
  assert.equal(sumMoney([100.05, 200.1, 50.25]), 350.4);
  assert.equal(sumMoney([]), 0);
});

test("lineAmount = qty × rate to the paisa", () => {
  assert.equal(lineAmount(3, 10.1), 30.3);
  assert.equal(lineAmount(2.5, 4.4), 11);
  assert.equal(lineAmount(0, 99), 0);
});

test("invoiceTotal = subtotal − discount + tax without stacked rounding", () => {
  assert.equal(invoiceTotal(1000, 50, 52.5), 1002.5);
  assert.equal(invoiceTotal(0.1, 0, 0.2), 0.3);
  assert.equal(invoiceTotal(100, 100, 0), 0);
});

test("addMoney / subMoneyClamped are exact in paise", () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
  // Accumulating many small receipts against one invoice must not drift.
  let paid = 0;
  for (let i = 0; i < 100; i++) paid = addMoney(paid, 0.01);
  assert.equal(paid, 1); // naive float would give 1.0000000000000007
  assert.equal(subMoneyClamped(100, 30.5), 69.5);
  assert.equal(subMoneyClamped(50, 80), 0); // clamped at zero
});
