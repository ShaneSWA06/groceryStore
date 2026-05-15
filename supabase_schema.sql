-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  base_price NUMERIC(10,2),
  category TEXT,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction items table
CREATE TABLE IF NOT EXISTS transaction_items (
  id BIGSERIAL PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
  item_id BIGINT REFERENCES items(id),
  barcode TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to safely decrement stock (prevents negative stock)
CREATE OR REPLACE FUNCTION decrement_stock(item_id BIGINT, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE items
  SET stock = GREATEST(0, stock - qty)
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Seed default admin user (password: admin123)
INSERT INTO users (username, password, role, full_name)
VALUES ('admin', 'admin123', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- Disable Row Level Security (RLS) so the anon key can read/write all tables
-- (You are using the anon key on a private app, so this is fine)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
