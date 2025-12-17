const { getDatabase } = require("./database");

const db = getDatabase();

console.log("🗑️  Clearing all data from database...");

db.serialize(() => {
  db.run("BEGIN TRANSACTION");

  // Delete all data from tables (in correct order due to foreign keys)
  db.run("DELETE FROM transaction_items", (err) => {
    if (err) {
      console.error("Error deleting transaction_items:", err.message);
      db.run("ROLLBACK");
      process.exit(1);
    } else {
      console.log("✅ Cleared transaction_items");
    }
  });

  db.run("DELETE FROM transactions", (err) => {
    if (err) {
      console.error("Error deleting transactions:", err.message);
      db.run("ROLLBACK");
      process.exit(1);
    } else {
      console.log("✅ Cleared transactions");
    }
  });

  db.run("DELETE FROM items", (err) => {
    if (err) {
      console.error("Error deleting items:", err.message);
      db.run("ROLLBACK");
      process.exit(1);
    } else {
      console.log("✅ Cleared items");
    }
  });

  // Note: We keep the admin user, but you can uncomment below to delete all users except admin
  // db.run("DELETE FROM users WHERE role != 'admin'", (err) => {
  //   if (err) {
  //     console.error('Error deleting users:', err.message);
  //     db.run('ROLLBACK');
  //     process.exit(1);
  //   } else {
  //     console.log('✅ Cleared non-admin users');
  //   }
  // });

  db.run("COMMIT", (err) => {
    if (err) {
      console.error("Error committing transaction:", err.message);
      process.exit(1);
    } else {
      console.log("✅ All data cleared successfully!");
      console.log("📝 Note: Database structure and admin user are preserved.");
      db.close();
      process.exit(0);
    }
  });
});
