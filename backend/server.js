require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware for CORS and JSON parsing
app.use(cors({
  origin: 'https://expense-tracker-git-six.vercel.app', // your Vercel frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
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
  queueLimit: 0,
});

// Test Database Connection
pool.query('SELECT 1')
  .then(() => {
    console.log('Database connection successful!');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'API is healthy' });
});

// Get all expenses (fixed ORDER BY `date`)
app.get('/api/expenses', async (req, res) => {
  console.log("GET request to /api/expenses received");
  try {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY `date` DESC');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses', details: err.message });
  }
});

// Get expense by UUID
app.get('/api/expenses/:uuid', async (req, res) => {
  console.log(`GET request to /api/expenses/${req.params.uuid} received`);
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
  console.log("POST request to /api/expenses received");
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
  console.log(`PUT request to /api/expenses/${req.params.uuid} received`);
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
  console.log(`DELETE request to /api/expenses/${req.params.uuid} received`);
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
  console.log(`GET request to /api/expenses/category/${req.params.category} received`);
  try {
    const { category } = req.params;
    const [rows] = await pool.query('SELECT * FROM expenses WHERE category = ? ORDER BY `date` DESC', [category]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses by category:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses by category', details: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
