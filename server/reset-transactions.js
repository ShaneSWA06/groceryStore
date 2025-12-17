const { getDatabase } = require("./database");

const db = getDatabase();

console.log("🔄 Resetting transactions while keeping inventory items...");

db.serialize(() => {
  db.run("BEGIN TRANSACTION", (err) => {
    if (err) {
      console.error("❌ Error starting transaction:", err.message);
      process.exit(1);
    }

    // Delete all transaction items first (due to foreign key constraints)
    db.run("DELETE FROM transaction_items", (err) => {
      if (err) {
        console.error("❌ Error deleting transaction_items:", err.message);
        db.run("ROLLBACK");
        process.exit(1);
      } else {
        console.log("✅ Cleared all transaction items");

        // Delete all transactions
        db.run("DELETE FROM transactions", (err) => {
          if (err) {
            console.error("❌ Error deleting transactions:", err.message);
            db.run("ROLLBACK");
            process.exit(1);
          } else {
            console.log("✅ Cleared all transactions");

            // Commit the transaction
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("❌ Error committing transaction:", err.message);
                process.exit(1);
              } else {
                console.log("✅ Database reset completed successfully!");
                console.log(
                  "📦 Inventory items, users, and categories are preserved."
                );
                console.log(
                  "🗑️  All transactions and transaction items have been deleted."
                );
                db.close();
                process.exit(0);
              }
            });
          }
        });
      }
    });
  });
});
