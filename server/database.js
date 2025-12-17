const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "grocery_store.db");

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
      } else {
        console.log("Connected to SQLite database");
      }
    });
  }
  return db;
}

function initDatabase() {
  const database = getDatabase();

  // Items table
  database.serialize(() => {
    database.run(
      `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        base_price REAL DEFAULT 0,
        category TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating items table:", err.message);
        } else {
          console.log("Items table ready");
          // Add base_price column if it doesn't exist (migration for existing databases)
          database.run(
            "ALTER TABLE items ADD COLUMN base_price REAL DEFAULT 0",
            (alterErr) => {
              // Ignore error if column already exists
              if (alterErr && !alterErr.message.includes("duplicate column")) {
                console.error("Error adding base_price column:", alterErr.message);
              }
            }
          );
        }
      }
    );

    // Transactions table
    database.run(
      `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating transactions table:", err.message);
        } else {
          console.log("Transactions table ready");
        }
      }
    );

    // Transaction items table (items sold in each transaction)
    database.run(
      `
      CREATE TABLE IF NOT EXISTS transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        barcode TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating transaction_items table:", err.message);
        } else {
          console.log("Transaction items table ready");
        }
      }
    );

    // Categories table
    database.run(
      `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating categories table:", err.message);
        } else {
          console.log("Categories table ready");
          // Insert default categories if table is empty
          database.get(
            "SELECT COUNT(*) as count FROM categories",
            (err, row) => {
              if (!err && row.count === 0) {
                const defaultCategories = [
                  "Fruits & Vegetables",
                  "Dairy & Eggs",
                  "Meat & Seafood",
                  "Bakery",
                  "Beverages",
                  "Snacks",
                  "Frozen Foods",
                  "Canned Goods",
                  "Cleaning Supplies",
                  "Personal Care",
                  "Other",
                ];
                const stmt = database.prepare(
                  "INSERT INTO categories (name) VALUES (?)"
                );
                defaultCategories.forEach((cat) => {
                  stmt.run(cat);
                });
                stmt.finalize();
                console.log("Default categories inserted");
              }
            }
          );
        }
      }
    );

    // Users table for authentication
    database.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating users table:", err.message);
        } else {
          console.log("Users table ready");
          // Create default admin user if not exists (async)
          const bcrypt = require("bcryptjs");
          bcrypt.hash("admin123", 10, (err, hash) => {
            if (err) {
              console.error("Error hashing default password:", err.message);
              return;
            }
            database.run(
              `
            INSERT OR IGNORE INTO users (username, password, role, full_name)
            VALUES ('admin', ?, 'admin', 'Administrator')
          `,
              [hash],
              (err) => {
                if (err) {
                  console.error("Error creating default admin:", err.message);
                } else {
                  console.log(
                    "Default admin user ready (username: admin, password: admin123)"
                  );
                }
              }
            );
          });
        }
      }
    );
  });
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed");
      }
    });
  }
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
};
