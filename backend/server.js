require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000' // Restrict to your frontend
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

// Utility Functions
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// API Routes

// Save total expense and return an ID
app.post('/api/expenses/save-total', async (req, res) => {
  try {
    const { email, totalExpense } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const parsedTotal = parseFloat(totalExpense);
    if (Number.isNaN(parsedTotal)) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Save total expense and get the inserted ID
    const [result] = await pool.query(
      'INSERT INTO total_expenses (email, total_amount) VALUES (?, ?)',
      [email, parsedTotal]
    );

    // Return the inserted ID with the success message
    res.json({
      success: true,
      message: 'Expense summary saved successfully',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error saving total expense:', err);
    res.status(500).json({ error: 'Failed to process your request' });
  }
});

// Retrieve total expense using the ID
app.get('/api/expenses/total/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Query the total expense using the provided ID
    const [total] = await pool.query(
      'SELECT total_amount, email FROM total_expenses WHERE id = ?',
      [id]
    );

    if (total.length === 0) {
      return res.status(404).json({ error: 'Total expense not found for the given ID' });
    }

    res.json({
      success: true,
      totalExpense: total[0].total_amount,
      email: total[0].email
    });

  } catch (err) {
    console.error('Error retrieving total expense:', err);
    res.status(500).json({ error: 'Failed to retrieve total expense' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5111;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
