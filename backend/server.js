require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
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
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    const [result] = await pool.query(
      'INSERT INTO expenses (description, amount, category) VALUES (?, ?, ?)',
      [description, amount, category]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5111;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));