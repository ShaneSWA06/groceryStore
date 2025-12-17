const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get statistics (admin only)
router.get("/", authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();

  // Get stock statistics
  db.all(
    `SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END) as low_stock
    FROM items`,
    (err, stockStats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get low stock items (stock <= 10)
      db.all(
        `SELECT id, barcode, name, price, category, stock 
         FROM items 
         WHERE stock <= 10 AND stock >= 0
         ORDER BY stock ASC, name ASC`,
        (err, lowStockItems) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get today's transactions
          const today = new Date().toISOString().split("T")[0];
          db.all(
            `SELECT 
              COUNT(*) as transaction_count,
              COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(AVG(total_amount), 0) as avg_transaction
            FROM transactions 
            WHERE DATE(created_at) = DATE(?)`,
            [today],
            (err, todayStats) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Get weekly transactions (last 7 days)
              db.all(
                `SELECT 
                  DATE(created_at) as date,
                  COUNT(*) as transaction_count,
                  COALESCE(SUM(total_amount), 0) as revenue
                FROM transactions 
                WHERE DATE(created_at) >= DATE('now', '-7 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC`,
                (err, weeklyStats) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  // Get monthly transactions (last 30 days)
                  db.all(
                    `SELECT 
                      DATE(created_at) as date,
                      COUNT(*) as transaction_count,
                      COALESCE(SUM(total_amount), 0) as revenue
                    FROM transactions 
                    WHERE DATE(created_at) >= DATE('now', '-30 days')
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC`,
                    (err, monthlyStats) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      // Calculate today's profit: sell_price - base_price
                      db.all(
                        `SELECT 
                          COALESCE(SUM((i.price - COALESCE(i.base_price, 0)) * ti.quantity), 0) as total_profit
                        FROM transaction_items ti
                        INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
                        INNER JOIN items i ON ti.item_id = i.id
                        WHERE DATE(t.created_at) = DATE(?)`,
                        [today],
                        (err, profitStats) => {
                          if (err) {
                            return res.status(500).json({ error: err.message });
                          }

                          // Calculate total profit (last 30 days): sell_price - base_price
                          db.all(
                            `SELECT 
                              COALESCE(SUM((i.price - COALESCE(i.base_price, 0)) * ti.quantity), 0) as total_profit_30days
                            FROM transaction_items ti
                            INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
                            INNER JOIN items i ON ti.item_id = i.id
                            WHERE DATE(t.created_at) >= DATE('now', '-30 days')`,
                            (err, profit30Days) => {
                              if (err) {
                                return res
                                  .status(500)
                                  .json({ error: err.message });
                              }

                              res.json({
                                stock: stockStats[0] || {
                                  total_items: 0,
                                  in_stock: 0,
                                  out_of_stock: 0,
                                  low_stock: 0,
                                },
                                lowStockItems: lowStockItems || [],
                                today: {
                                  ...(todayStats[0] || {
                                    transaction_count: 0,
                                    total_revenue: 0,
                                    avg_transaction: 0,
                                  }),
                                  total_profit:
                                    profitStats[0]?.total_profit || 0,
                                },
                                weekly: weeklyStats || [],
                                monthly: monthlyStats || [],
                                profit_30days:
                                  profit30Days[0]?.total_profit_30days || 0,
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;
