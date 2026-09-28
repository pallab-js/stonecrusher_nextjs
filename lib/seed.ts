import { getDb } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/schema";
import {
  saveExpense,
  saveProduction,
  savePurchase,
  saveSale,
} from "@/lib/repo/operations";

/* deterministic PRNG so demo data is stable across loads */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRODUCTS = [
  { code: "ROM", name: "ROM Stone (boulders)", kind: "raw" as const, size_grade: "Run of mine", rate: 0, opening: 1200 },
  { code: "5MM", name: "Agg 5 mm", kind: "aggregate" as const, size_grade: "5 mm", rate: 34, opening: 260 },
  { code: "10MM", name: "Agg 10 mm", kind: "aggregate" as const, size_grade: "10 mm", rate: 32, opening: 420 },
  { code: "20MM", name: "Agg 20 mm", kind: "aggregate" as const, size_grade: "20 mm", rate: 30, opening: 650 },
  { code: "40MM", name: "Agg 40 mm", kind: "aggregate" as const, size_grade: "40 mm", rate: 27, opening: 310 },
  { code: "DUST", name: "Stone Dust", kind: "byproduct" as const, size_grade: "0–4.75 mm", rate: 24, opening: 480 },
  { code: "MSAND", name: "Manufactured Sand", kind: "aggregate" as const, size_grade: "0–2 mm", rate: 38, opening: 240 },
];

const CUSTOMERS: [string, string, string, string, number, number][] = [
  ["Agarwal Traders", "Rajesh Agarwal", "9864012345", "Guwahati, Assam", 26.1445, 91.7362],
  ["Buildwell RMC", "S. Kalita", "9435023456", "Amingaon, Assam", 26.2844, 91.6836],
  ["NE Infra Projects Pvt Ltd", "Ankur Jain", "9706034567", "Shillong, Meghalaya", 25.5788, 91.8933],
  ["Sunrise Builders", "M. Das", "9854045678", "Nagaon, Assam", 26.3467, 92.6841],
  ["Kamakhya Construction", "P. Bora", "9978056789", "Guwahati, Assam", 26.1881, 91.7686],
  ["Barak Valley Roads", "H. Ahmed", "9401067890", "Silchar, Assam", 24.8333, 92.7789],
  ["Green Valley Developers", "N. Sharma", "9612078901", "Tezpur, Assam", 26.6334, 92.7969],
  ["Brahmaputra Infra", "D. Konwar", "9864089012", "Dibrugarh, Assam", 27.4728, 94.912],
  ["Hills Concrete Co.", "T. Sangma", "9435090123", "Tura, Meghalaya", 25.5159, 90.2028],
  ["Tripura Cement Works", "A. Deb", "9706001234", "Agartala, Tripura", 23.8315, 91.2868],
  ["Paramount Estate", "V. Gupta", "9854011234", "Siliguri, West Bengal", 26.7271, 88.3953],
  ["New Line Contractors", "R. Singh", "9978022345", "Patna, Bihar", 25.5941, 85.1376],
  ["Brahmaputra Readymix", "K. Sarma", "9401033456", "Jorhat, Assam", 26.7509, 94.2164],
  ["Maji Infra Builders", "J. Pecho", "9612044567", "Itanagar, Arunachal", 27.0844, 93.6053],
  ["Elite Constructions", "S. Mehta", "9864055678", "Kolkata, West Bengal", 22.5726, 88.3639],
];

const SUPPLIERS: [string, string, string][] = [
  ["Lalung Quarry Co.", "raw_stone", "Rongia, Assam"],
  ["Khanij Stone Crushers", "raw_stone", "Morigaon, Assam"],
  ["HP Petrol Pump Dealer", "fuel", "Guwahati, Assam"],
  ["Indian Oil Distributor", "fuel", "Amingaon, Assam"],
  ["NE Bearing & Spares", "spare", "Guwahati, Assam"],
  ["Assam Power Distribution", "electricity", "Guwahati, Assam"],
  ["Own Fleet / Drivers", "transport", "Guwahati, Assam"],
  ["Krishna Fabricators", "service", "Narengi, Assam"],
  ["Ambica Enterprises", "spare", "Kolkata, WB"],
  ["Patel Transport", "transport", "Siliguri, WB"],
];

const VEHICLE_PREFIXES = ["AS01", "AS02", "AS03", "AS24", "WB24"];

export interface SeedResult {
  products: number;
  customers: number;
  suppliers: number;
  production: number;
  sales: number;
  purchases: number;
  expenses: number;
}

export function loadDemoData(): SeedResult {
  const db = getDb();
  const rnd = mulberry32(20260928);

  const wipe = () => {
    for (const t of [
      "inventory_tx",
      "sale_items",
      "sales",
      "production_output",
      "production",
      "purchases",
      "expenses",
      "products",
      "customers",
      "suppliers",
    ]) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  };

  const run = db.transaction((): SeedResult => {
    wipe();

    /* products */
    const productId = new Map<string, number>();
    const insProduct = db.prepare(
      "INSERT INTO products (code, name, kind, size_grade, unit, rate, opening_stock) VALUES (?, ?, ?, ?, 'tonne', ?, ?)"
    );
    for (const p of PRODUCTS) {
      const info = insProduct.run(p.code, p.name, p.kind, p.size_grade, p.rate, p.opening);
      productId.set(p.code, Number(info.lastInsertRowid));
    }

    /* customers */
    const customerIds: number[] = [];
    const insCustomer = db.prepare(
      "INSERT INTO customers (name, contact, phone, address, state, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const [name, contact, phone, address, lat, lng] of CUSTOMERS) {
      const state = address.split(",").pop()!.trim();
      customerIds.push(Number(insCustomer.run(name, contact, phone, address, state, lat, lng).lastInsertRowid));
    }

    /* suppliers */
    const supplierIdByCat: Record<string, number[]> = {};
    const insSupplier = db.prepare("INSERT INTO suppliers (name, category, address) VALUES (?, ?, ?)");
    for (const [name, category, address] of SUPPLIERS) {
      const id = Number(insSupplier.run(name, category, address).lastInsertRowid);
      (supplierIdByCat[category] ??= []).push(id);
    }
    const suppliersByCat = (cat: string) => supplierIdByCat[cat] ?? [];

    const aggregates = PRODUCTS.filter((p) => p.kind !== "raw");
    const aggregateIds = aggregates.map((p) => ({ id: productId.get(p.code)!, rate: p.rate, code: p.code }));
    const MIX_WEIGHTS = [0.1, 0.2, 0.35, 0.15, 0.12, 0.08];

    /* date range: last 10 months */
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 10, 1);

    let productionCount = 0;
    let salesCount = 0;
    let purchaseCount = 0;
    let expenseCount = 0;
    let invoiceSeq = 1;

    const rawStoneIds = [productId.get("ROM")!];
    const quarryIds = suppliersByCat("raw_stone");

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = iso(d);
      const dow = d.getDay();
      const weekend = dow === 0;
      const shiftCount = weekend ? 1 : rnd() > 0.12 ? 2 : 1;

      for (let si = 0; si < shiftCount; si++) {
        const shift = si === 0 ? "morning" : "evening";
        const runHours = Math.round((7 + rnd() * 4) * 2) / 2;
        const downHours = Math.round(rnd() * rnd() * 4 * 2) / 2;
        const rawConsumed = Math.round((110 + rnd() * 90) * 10) / 10;
        const status: "running" | "stopped" | "maintenance" =
          downHours > 2.5 ? (rnd() > 0.5 ? "maintenance" : "stopped") : "running";

        const ratios = [0.1, 0.2, 0.35, 0.15, 0.12, 0.08];
        const outputs = aggregateIds.map((a, i) => ({
          product_id: a.id,
          qty: Math.round(rawConsumed * ratios[i] * (0.85 + rnd() * 0.3) * 10) / 10,
        }));

        saveProduction(null, {
          date,
          shift,
          line: rnd() > 0.85 ? "Line 2" : "Line 1",
          raw_consumed: rawConsumed,
          run_hours: runHours,
          down_hours: downHours,
          status,
          outputs,
        });
        productionCount++;
      }

      /* raw stone purchase three times a week */
      if (dow === 1 || dow === 3 || dow === 5) {
        const qty = Math.round((480 + rnd() * 600) * 10) / 10;
        savePurchase(null, {
          date,
          supplier_id: quarryIds[Math.floor(rnd() * quarryIds.length)] ?? null,
          category: "raw_stone",
          product_id: rawStoneIds[0],
          qty,
          unit: "tonne",
          rate: 18,
          amount: Math.round(qty * 18),
          paid_amount: rnd() > 0.4 ? Math.round(qty * 18) : Math.round(qty * 18 * rnd()),
          description: "ROM boulders from quarry",
        });
        purchaseCount++;
      }

      /* monthly-ish bills */
      if (d.getDate() === 5) {
        const elec = Math.round(85000 + rnd() * 40000);
        savePurchase(null, {
          date,
          supplier_id: suppliersByCat("electricity")[0] ?? null,
          category: "electricity",
          description: "Monthly electricity bill",
          amount: elec,
          paid_amount: elec,
        });
        purchaseCount++;
      }
      if (d.getDate() === 10 || d.getDate() === 20) {
        const fuel = Math.round(45000 + rnd() * 25000);
        savePurchase(null, {
          date,
          supplier_id: suppliersByCat("fuel")[Math.floor(rnd() * 2)] ?? null,
          category: "fuel",
          description: "Diesel for genset & loaders",
          qty: Math.round(fuel / 95),
          unit: "litre",
          rate: 95,
          amount: fuel,
          paid_amount: fuel,
        });
        purchaseCount++;
      }
      if (d.getDate() === 15 && rnd() > 0.5) {
        const spare = Math.round(15000 + rnd() * 60000);
        savePurchase(null, {
          date,
          supplier_id: suppliersByCat("spare")[Math.floor(rnd() * suppliersByCat("spare").length)] ?? null,
          category: rnd() > 0.5 ? "spare_parts" : "maintenance",
          description: "Jaw plate / conveyor belt / bearing replacement",
          amount: spare,
          paid_amount: Math.round(spare * (rnd() > 0.5 ? 1 : 0.5)),
        });
        purchaseCount++;
      }

      /* expenses */
      if (d.getDate() === 1) {
        const payroll = 320000 + Math.round(rnd() * 40000);
        saveExpense(null, {
          date,
          category: "payroll",
          payee: "Plant staff (28 workers)",
          amount: payroll,
          mode: "bank",
          notes: "Monthly wages",
        });
        expenseCount++;
      }
      if (d.getDate() === 7) {
        saveExpense(null, {
          date,
          category: "admin",
          payee: "Office & misc",
          amount: Math.round(8000 + rnd() * 12000),
          mode: "upi",
        });
        expenseCount++;
      }
      if (rnd() > 0.86) {
        saveExpense(null, {
          date,
          category: rnd() > 0.5 ? "repair" : "transport",
          payee: rnd() > 0.5 ? "Welder / fitter" : "Crane hire",
          amount: Math.round(3000 + rnd() * 15000),
          mode: "cash",
        });
        expenseCount++;
      }

      /* sales: a few dispatches most weekdays */
      const invoicesToday = weekend ? 0 : 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < invoicesToday; k++) {
        const invoiceNo = `INV${String(invoiceSeq++).padStart(4, "0")}`;
        const customer = customerIds[Math.floor(rnd() * customerIds.length)];
        const itemCount = 1 + Math.floor(rnd() * 2);
        const items: { product_id: number; qty: number; rate: number }[] = [];
        for (let i = 0; i < itemCount; i++) {
          const pick = rnd();
          let cum = 0;
          let idx = 0;
          for (let j = 0; j < MIX_WEIGHTS.length; j++) {
            cum += MIX_WEIGHTS[j];
            if (pick <= cum) {
              idx = j;
              break;
            }
          }
          const agg = aggregateIds[idx];
          if (items.some((it) => it.product_id === agg.id)) continue;
          const qty = Math.round((45 + rnd() * 95) * 10) / 10;
          items.push({ product_id: agg.id, qty, rate: agg.rate + Math.round(rnd() * 6 - 2) });
        }
        if (items.length === 0) continue;
        const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;
        const paidRoll = rnd();
        const paid = paidRoll > 0.6 ? total : paidRoll > 0.3 ? total * rnd() : 0;
        saveSale(null, {
          invoice_no: invoiceNo,
          date,
          customer_id: customer,
          vehicle_no: `${VEHICLE_PREFIXES[Math.floor(rnd() * VEHICLE_PREFIXES.length)]}-${String(
            10 + Math.floor(rnd() * 89)
          )}${Math.floor(rnd() * 10)}-${String.fromCharCode(65 + Math.floor(rnd() * 26))}${String.fromCharCode(
            65 + Math.floor(rnd() * 26)
          )}${Math.floor(rnd() * 10)}${Math.floor(rnd() * 10)}`,
          transporter: rnd() > 0.6 ? "Own fleet" : SUPPLIERS[9][0],
          discount: 0,
          tax,
          paid_amount: Math.round(paid),
          items,
        });
        salesCount++;
      }
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (key === "next_invoice_no") continue;
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(key, value);
    }
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('next_invoice_no', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(String(invoiceSeq));

    return {
      products: PRODUCTS.length,
      customers: CUSTOMERS.length,
      suppliers: SUPPLIERS.length,
      production: productionCount,
      sales: salesCount,
      purchases: purchaseCount,
      expenses: expenseCount,
    };
  });

  return run();
}

export function clearAllData(): void {
  const db = getDb();
  const run = db.transaction(() => {
    for (const t of [
      "inventory_tx",
      "sale_items",
      "sales",
      "production_output",
      "production",
      "purchases",
      "expenses",
      "products",
      "customers",
      "suppliers",
    ]) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
    db.prepare("UPDATE settings SET value = '1' WHERE key = 'next_invoice_no'").run();
  });
  run();
}
