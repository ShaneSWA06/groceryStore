const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const { initDatabase } = require("./database");
const {
  createBackup,
  listBackups,
  cleanupOldBackups,
  restoreBackup,
} = require("./utils/backup");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const categoriesRoutes = require("./routes/categories");
const itemsRoutes = require("./routes/items");
const transactionsRoutes = require("./routes/transactions");
const salesRoutes = require("./routes/sales");
const backupRoutes = require("./routes/backup");
const databaseRoutes = require("./routes/database");
const statisticsRoutes = require("./routes/statistics");
const exportRoutes = require("./routes/export");
const { authenticateToken, requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
initDatabase();

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/items", authenticateToken, itemsRoutes);
app.use("/api/transactions", authenticateToken, transactionsRoutes);
app.use("/api/sales", authenticateToken, salesRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/export", exportRoutes);

// Public mobile scan endpoint (no auth required for mobile devices)
const salesRoutesModule = require("./routes/sales");
app.post("/api/sales/mobile-scan", salesRoutesModule.mobileScan);

// Protected endpoint for desktop to get mobile scans
app.get(
  "/api/sales/mobile-scan/:sessionId",
  authenticateToken,
  salesRoutesModule.getMobileScan
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Grocery Billing System API is running" });
});

// Setup automated backups
// Daily backup at 2:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("🔄 Starting scheduled daily backup...");
  const result = createBackup();
  if (result.success) {
    console.log(`✅ Scheduled backup completed: ${result.filename}`);
    // Cleanup old backups (keep last 30 days)
    cleanupOldBackups(30);
  } else {
    console.error(`❌ Scheduled backup failed: ${result.error}`);
  }
});

// Weekly backup cleanup (every Sunday at 3:00 AM)
cron.schedule("0 3 * * 0", () => {
  console.log("🧹 Cleaning up old backups...");
  const result = cleanupOldBackups(30);
  console.log(result.message);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("📦 Automated backup system initialized:");
  console.log("   - Daily backups at 2:00 AM");
  console.log("   - Weekly cleanup on Sundays at 3:00 AM");
});
