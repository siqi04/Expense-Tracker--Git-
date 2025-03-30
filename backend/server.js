require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');
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

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Utility Functions
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateEmailHtml = (totalAmount, expenses) => {
  return `<h1>Your Expense Summary</h1><p>Total: $${totalAmount.toFixed(2)}</p><ul>${expenses.map(expense => `<li>${expense.description} - $${expense.amount}</li>`).join('')}</ul>`;
};

const generateEmailText = (totalAmount, expenses) => {
  return `Your Expense Summary\nTotal: $${totalAmount.toFixed(2)}\n\n${expenses.map(expense => `${expense.description} - $${expense.amount}`).join('\n')}`;
};

const sendExpenseEmail = async (email, totalAmount, expenses) => {
  try {
    const mailOptions = {
      from: `Expense Tracker <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Expense Summary - Total: $${totalAmount.toFixed(2)}`,
      html: generateEmailHtml(totalAmount, expenses),
      text: generateEmailText(totalAmount, expenses)
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// API Routes

// Get all expenses (for demo purposes - consider removing in production)
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Add new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category, email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'Amount must be a number' });
    }

    const [result] = await pool.query(
      'INSERT INTO expenses (description, amount, category, email, date) VALUES (?, ?, ?, ?, NOW())',
      [description, parsedAmount, category, email]
    );

    res.status(201).json({
      id: result.insertId,
      description,
      amount: parsedAmount,
      category,
      email,
      date: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Save total expense and send email
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

    // Get expenses for this email
    const [expenses] = await pool.query(
      'SELECT description, amount, category, date FROM expenses WHERE email = ? ORDER BY date DESC',
      [email]
    );

    // Save/update total
    await pool.query(
      'INSERT INTO total_expenses (email, total_amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_amount = ?',
      [email, parsedTotal, parsedTotal]
    );

    // Send email
    const emailSent = await sendExpenseEmail(email, parsedTotal, expenses);

    res.json({
      success: true,
      message: emailSent
        ? 'Expense summary saved and email sent successfully'
        : 'Expense saved but email failed to send',
      emailSent
    });

  } catch (err) {
    console.error('Error saving total expense:', err);
    res.status(500).json({ error: 'Failed to process your request' });
  }
});

// Retrieve expenses by email
app.post('/api/expenses/retrieve', async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const [expenses] = await pool.query(
      'SELECT description, amount, category, date FROM expenses WHERE email = ? ORDER BY date DESC',
      [email]
    );

    const [total] = await pool.query(
      'SELECT total_amount FROM total_expenses WHERE email = ?',
      [email]
    );

    res.json({
      success: true,
      expenses,
      totalExpense: total[0]?.total_amount || 0
    });

  } catch (err) {
    console.error('Error retrieving expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses' });
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
  console.log(`Email service configured for: ${process.env.EMAIL_USER}`);
});
