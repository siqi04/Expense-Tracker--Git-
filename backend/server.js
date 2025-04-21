require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware
app.use(cors({
  origin: 'https://expense-tracker-git-six.vercel.app', // your Vercel frontend URL
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

// Test Database Connection
pool.query('SELECT 1')
  .then(() => {
    console.log('Database connection successful!');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
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

// Other routes...

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
