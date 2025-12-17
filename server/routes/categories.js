const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get all categories (public for item forms, but protected)
router.get("/", authenticateToken, (req, res) => {
  const db = getDatabase();
  db.all(
    "SELECT id, name, description, created_at FROM categories ORDER BY name ASC",
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Create new category (admin only)
router.post("/", authenticateToken, requireAdmin, (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const db = getDatabase();
  db.run(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    [name.trim(), description?.trim() || null],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res
            .status(400)
            .json({ error: "Category name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        name: name.trim(),
        description: description?.trim() || null,
        message: "Category created successfully",
      });
    }
  );
});

// Update category (admin only)
router.put("/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const db = getDatabase();
  db.run(
    "UPDATE categories SET name = ?, description = ? WHERE id = ?",
    [name.trim(), description?.trim() || null, id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res
            .status(400)
            .json({ error: "Category name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category updated successfully" });
    }
  );
});

// Delete category (admin only)
router.delete("/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  // Check if any items are using this category
  db.get(
    "SELECT COUNT(*) as count FROM items WHERE category = (SELECT name FROM categories WHERE id = ?)",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row.count > 0) {
        return res.status(400).json({
          error: `Cannot delete category. ${row.count} item(s) are using this category. Please update or remove those items first.`,
        });
      }

      // Delete the category
      db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: "Category not found" });
        }
        res.json({ message: "Category deleted successfully" });
      });
    }
  );
});

module.exports = router;
