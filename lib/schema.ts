export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','operator','accountant')),
  pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('raw','aggregate','byproduct')),
  size_grade TEXT,
  unit TEXT NOT NULL DEFAULT 'tonne',
  rate REAL NOT NULL DEFAULT 0,
  opening_stock REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  state TEXT,
  lat REAL,
  lng REAL,
  opening_balance REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('raw_stone','fuel','spare','electricity','transport','service','other')),
  contact TEXT,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS production (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning','evening','night')),
  line TEXT NOT NULL DEFAULT 'Line 1',
  raw_consumed REAL NOT NULL DEFAULT 0,
  run_hours REAL NOT NULL DEFAULT 0,
  down_hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','stopped','maintenance')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS production_output (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  production_id INTEGER NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  vehicle_no TEXT,
  transporter TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty REAL NOT NULL DEFAULT 0,
  rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_no TEXT,
  date TEXT NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  category TEXT NOT NULL CHECK (category IN ('raw_stone','fuel','spare_parts','electricity','maintenance','transport','other')),
  product_id INTEGER REFERENCES products(id),
  description TEXT,
  qty REAL,
  unit TEXT,
  rate REAL,
  amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','bank','cheque')),
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('payroll','admin','transport','repair','misc')),
  payee TEXT,
  amount REAL NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','bank')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_tx (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id),
  dir TEXT NOT NULL CHECK (dir IN ('in','out')),
  qty REAL NOT NULL DEFAULT 0,
  ref_type TEXT NOT NULL DEFAULT 'manual' CHECK (ref_type IN ('production','sale','purchase','manual')),
  ref_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_production_date ON production(date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_invtx_date ON inventory_tx(date);
CREATE INDEX IF NOT EXISTS idx_invtx_product ON inventory_tx(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_prodout_production ON production_output(production_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  unit_name: "Shree Stone Crusher",
  unit_location: "Industrial Area, Guwahati, Assam",
  unit_address: "Plot 14, Industrial Area, Guwahati, Assam 781026",
  unit_gstin: "18ABCDE1234F1Z5",
  unit_phone: "+91 98640 12345",
  unit_lat: "26.1445",
  unit_lng: "91.7362",
  currency: "INR",
  invoice_prefix: "INV",
  next_invoice_no: "1",
  financial_year_start: "04-01",
  gst_rate: "5",
};
