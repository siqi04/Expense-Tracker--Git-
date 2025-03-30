require('dotenv').config();  // Load environment variables from the .env file
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');  // Import UUID package
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

// MySQL Connection Pool using .env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,        // Database host (from .env)
  user: process.env.DB_USER,        // Database user (from .env)
  password: process.env.DB_PASSWORD, // Database password (from .env)
  database: process.env.DB_NAME,    // Database name (from .env)
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Utility Functions
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// API Routes

// Save total expense and return an ID with UUID
app.post('/api/expenses/save-total', async (req, res) => {
  try {
    const { email, totalExpense } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Parse the total expense and validate it's a number
    const parsedTotal = parseFloat(totalExpense);
    if (Number.isNaN(parsedTotal)) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Generate UUID for the total expense
    const expenseId = uuidv4();

    // Save the total expense in the database and get the inserted ID
    const [result] = await pool.query(
      'INSERT INTO total_expenses (expenseId, email, total_amount) VALUES (?, ?, ?)',
      [expenseId, email, parsedTotal]
    );

    // The inserted ID will be in result.insertId (not used, as we're using UUID)
    const insertedId = result.insertId;

    // Return the UUID and success message
    res.json({
      success: true,
      message: 'Expense summary saved successfully',
      expenseId: expenseId  // Return the UUID
    });

  } catch (err) {
    console.error('Error saving total expense:', err);
    res.status(500).json({ error: 'Failed to process your request' });
  }
});

// Retrieve total expense using the UUID
app.get('/api/expenses/total/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;

    // Query the total expense using the provided UUID
    const [total] = await pool.query(
      'SELECT total_amount, email FROM total_expenses WHERE expenseId = ?',
      [expenseId]
    );

    if (total.length === 0) {
      return res.status(404).json({ error: 'Total expense not found for the given UUID' });
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

// Start the server using the PORT from the .env file
const PORT = process.env.PORT || 6222;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
