require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuid
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
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No expenses found' });
    }
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses', details: err.message });
  }
});

// Add new expense with UUID
app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;

    // Log the request data to verify it's coming in properly
    console.log("Received data for adding expense:", req.body);

    // Basic validation
    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Description, amount, and category are required' });
    }

    // Validation passed, generate UUID
    const uuid = uuidv4();

    // Log the generated UUID
    console.log("Generated UUID:", uuid);

    // Insert expense into the database
    const [result] = await pool.query(
      'INSERT INTO expenses (uuid, description, amount, category) VALUES (?, ?, ?, ?)',
      [uuid, description, amount, category]
    );

    // Return the newly created expense data
    res.status(201).json({ uuid, id: result.insertId, description, amount, category });

  } catch (err) {
    console.error("Error adding expense:", err.message);
    res.status(500).json({ error: 'Failed to add expense', details: err.message });
  }
});

// Update expense by ID
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category } = req.body;

    // Log the request data for debugging
    console.log(`Received data for updating expense with ID: ${id}`, req.body);

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Description, amount, and category are required' });
    }

    const [result] = await pool.query(
      'UPDATE expenses SET description = ?, amount = ?, category = ? WHERE id = ?',
      [description, amount, category, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ id, description, amount, category });
  } catch (err) {
    console.error("Error updating expense:", err.message);
    res.status(400).json({ error: 'Failed to update expense', details: err.message });
  }
});

// Delete expense by ID
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.status(204).end();
  } catch (err) {
    console.error("Error deleting expense:", err.message);
    res.status(400).json({ error: 'Failed to delete expense', details: err.message });
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
    console.error("Error retrieving expense by UUID:", err.message);
    res.status(500).json({ error: 'Failed to fetch expense by UUID', details: err.message });
  }
});

// Get expenses by category
app.get('/api/expenses/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await pool.query('SELECT * FROM expenses WHERE category = ? ORDER BY date DESC', [category]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: `No expenses found for category ${category}` });
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses by category:", err.message);
    res.status(500).json({ error: 'Failed to fetch expenses by category', details: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
