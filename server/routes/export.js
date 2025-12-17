const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const { getDatabase } = require("../database");
const { authenticateToken } = require("../middleware/auth");

// Export transactions to Excel (cashier and admin)
router.get("/transactions", authenticateToken, (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;

  let query = `
    SELECT 
      t.transaction_id,
      t.total_amount,
      t.created_at,
      GROUP_CONCAT(ti.item_name || ' (x' || ti.quantity || ')', ', ') as items
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
  `;

  const params = [];

  if (startDate && endDate) {
    query += ` WHERE DATE(t.created_at) BETWEEN DATE(?) AND DATE(?)`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY t.id ORDER BY t.created_at DESC`;

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get detailed transaction items
    db.all(
      `SELECT 
        t.transaction_id,
        t.created_at,
        t.total_amount as transaction_total,
        ti.item_name,
        ti.barcode,
        ti.quantity,
        ti.unit_price,
        ti.total_price
      FROM transactions t
      INNER JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      ${
        startDate && endDate
          ? "WHERE DATE(t.created_at) BETWEEN DATE(?) AND DATE(?)"
          : ""
      }
      ORDER BY t.created_at DESC, ti.item_name ASC`,
      params,
      (err, detailedItems) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Transaction Summary
        const summaryData = transactions.map((t) => ({
          "Transaction ID": t.transaction_id,
          Date: new Date(t.created_at).toLocaleDateString(),
          Time: new Date(t.created_at).toLocaleTimeString(),
          "Total Amount": parseFloat(t.total_amount).toFixed(2),
          Items: t.items || "",
        }));

        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          "Transaction Summary"
        );

        // Sheet 2: Detailed Items
        const itemsData = detailedItems.map((item) => ({
          "Transaction ID": item.transaction_id,
          Date: new Date(item.created_at).toLocaleDateString(),
          "Item Name": item.item_name,
          Barcode: item.barcode,
          Quantity: item.quantity,
          "Unit Price": parseFloat(item.unit_price).toFixed(2),
          "Total Price": parseFloat(item.total_price).toFixed(2),
          "Transaction Total": parseFloat(item.transaction_total).toFixed(2),
        }));

        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, "Detailed Items");

        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        // Set response headers
        const filename = `transactions_${startDate || "all"}_${
          endDate || "all"
        }_${Date.now()}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );

        // Send file
        res.send(excelBuffer);
      }
    );
  });
});

module.exports = router;
