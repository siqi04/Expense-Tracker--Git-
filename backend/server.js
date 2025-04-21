require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware
app.use(cors({
  origin: 'https://expense-tracker-1it2jlvz6-siqi04s-projects.vercel.app/', // your Vercel frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // if you're using cookies, add this
}));
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

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses', details: err.message });
  }
});

// Get expense by UUID
app.get('/api/expenses/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await pool.query('SELECT * FROM expenses WHERE uuid = ?', [uuid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error retrieving expense:", err.message);
    res.status(500).json({ error: 'Failed to fetch expense', details: err.message });
  }
});

// Add new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Description, amount, and category are required' });
    }

    const uuid = uuidv4();
    await pool.query(
      'INSERT INTO expenses (uuid, description, amount, category) VALUES (?, ?, ?, ?)',
      [uuid, description, amount, category]
    );

    res.status(201).json({ uuid, description, amount, category });
  } catch (err) {
    console.error("Error adding expense:", err.message);
    res.status(500).json({ error: 'Failed to add expense', details: err.message });
  }
});

// Update expense by UUID
app.put('/api/expenses/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { description, amount, category } = req.body;

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Description, amount, and category are required' });
    }

    const [result] = await pool.query(
      'UPDATE expenses SET description = ?, amount = ?, category = ? WHERE uuid = ?',
      [description, amount, category, uuid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ uuid, description, amount, category });
  } catch (err) {
    console.error("Error updating expense:", err.message);
    res.status(500).json({ error: 'Failed to update expense', details: err.message });
  }
});

// Delete expense by UUID
app.delete('/api/expenses/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const [result] = await pool.query('DELETE FROM expenses WHERE uuid = ?', [uuid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.status(204).end();
  } catch (err) {
    console.error("Error deleting expense:", err.message);
    res.status(500).json({ error: 'Failed to delete expense', details: err.message });
  }
});

// Get expenses by category
app.get('/api/expenses/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await pool.query('SELECT * FROM expenses WHERE category = ? ORDER BY date DESC', [category]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses by category:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses by category', details: err.message });
  }
});

// Root route for Render health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
