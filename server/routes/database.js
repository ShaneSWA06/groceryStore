const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const DB_PATH = path.join(__dirname, "../grocery_store.db");

// Download database file (admin only)
router.get("/download", authenticateToken, requireAdmin, (req, res) => {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: "Database file not found" });
    }

    // Get database file stats
    const stats = fs.statSync(DB_PATH);
    const filename = `grocery_store_${
      new Date().toISOString().split("T")[0]
    }.db`;

    // Set headers for file download
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", stats.size);

    // Stream the file to the response
    const fileStream = fs.createReadStream(DB_PATH);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      console.error("Error streaming database file:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading database file" });
      }
    });
  } catch (err) {
    console.error("Error downloading database:", err);
    res.status(500).json({ error: "Failed to download database file" });
  }
});

// Get database info (admin only)
router.get("/info", authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: "Database file not found" });
    }

    const stats = fs.statSync(DB_PATH);
    res.json({
      path: DB_PATH,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      message:
        "Database file is located on the server. You can download it using the download endpoint or access it via SSH/FTP.",
    });
  } catch (err) {
    console.error("Error getting database info:", err);
    res.status(500).json({ error: "Failed to get database info" });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Reset transactions (keep inventory items) - admin only
router.post(
  "/reset-transactions",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { getDatabase } = require("../database");
    const db = getDatabase();

    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to start transaction" });
        }

        // Delete all transaction items first (due to foreign key constraints)
        db.run("DELETE FROM transaction_items", (err) => {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({
              error: `Failed to delete transaction items: ${err.message}`,
            });
          }

          // Delete all transactions
          db.run("DELETE FROM transactions", (err) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({
                error: `Failed to delete transactions: ${err.message}`,
              });
            }

            // Commit the transaction
            db.run("COMMIT", (err) => {
              if (err) {
                return res
                  .status(500)
                  .json({ error: `Failed to commit: ${err.message}` });
              }

              res.json({
                success: true,
                message:
                  "All transactions and transaction items have been deleted. Inventory items, users, and categories are preserved.",
              });
            });
          });
        });
      });
    });
  }
);

module.exports = router;
