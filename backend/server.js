require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');  // Import uuid
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// CRUD Routes

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new expense with UUID
app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    const uuid = uuidv4();  // Generate a new UUID
    const [result] = await pool.query(
      'INSERT INTO expenses (uuid, description, amount, category) VALUES (?, ?, ?, ?)',
      [uuid, description, amount, category]
    );
    res.status(201).json({ uuid, id: result.insertId, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update expense by ID
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category } = req.body;
    await pool.query(
      'UPDATE expenses SET description = ?, amount = ?, category = ? WHERE id = ?',
      [description, amount, category, id]
    );
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete expense by ID
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retrieve an expense by UUID
app.get('/api/expenses/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await pool.query('SELECT * FROM expenses WHERE uuid = ?', [uuid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 6111;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
