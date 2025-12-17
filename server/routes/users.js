const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDatabase } = require("../database");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get all users (admin only)
router.get("/", authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();
  db.all(
    "SELECT id, username, role, full_name, created_at FROM users ORDER BY username",
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Register new user (admin only)
router.post("/", authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role, fullName } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (role && !["admin", "cashier"].includes(role)) {
    return res
      .status(400)
      .json({ error: "Invalid role. Must be admin or cashier" });
  }

  const db = getDatabase();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)",
    [username, hashedPassword, role || "cashier", fullName || null],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ error: "Username already exists" });
        }
        return res.status(500).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        username,
        role: role || "cashier",
        fullName: fullName || null,
        message: "User created successfully",
      });
    }
  );
});

// Delete user (admin only)
router.delete("/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  // Prevent deleting yourself
  const currentUser = req.user;
  if (parseInt(id) === currentUser.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  });
});

module.exports = router;
