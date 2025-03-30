import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { 
  Container, 
  Table, 
  Button, 
  Form, 
  Modal, 
  Alert,
  Badge,
  Card
} from 'react-bootstrap';
import * as XLSX from 'xlsx'; // Importing the xlsx library

const ExportExcel = ({ data }) => {
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'expenses.xlsx');
  };

  return (
    <Button variant="success" onClick={exportToExcel}>
      Export to Excel
    </Button>
  );
};

function App() {
  const [expenses, setExpenses] = useState([]);
  const [previousExpenses, setPreviousExpenses] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Food',
  });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false); // Modal for email input when saving total expense

  const API_URL = 'http://localhost:5111/api/expenses';

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await axios.get(API_URL);
        setExpenses(response.data);
      } catch (error) {
        showAlert('danger', 'Failed to load expenses');
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ ...alert, show: false }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Add or update expense without email
    try {
      // If editing an expense, update it
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
        showAlert('success', 'Expense updated successfully');
      } else {
        // Add new expense
        await axios.post(API_URL, formData);
        showAlert('success', 'Expense added successfully');
      }

      // Refresh expenses list
      const response = await axios.get(API_URL);
      setExpenses(response.data);
      handleClose();
    } catch (error) {
      showAlert('danger', error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      showAlert('success', 'Expense deleted successfully');
      // Refresh expenses list
      const response = await axios.get(API_URL);
      setExpenses(response.data);
    } catch (error) {
      showAlert('danger', 'Failed to delete expense');
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', category: 'Food' });
  };

  const getTotalExpense = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0).toFixed(2);
  };

  const handleSaveTotalExpense = async () => {
    // Show modal to enter email before saving total expense
    setShowEmailModal(true);
  };

  const handleConfirmEmail = async () => {
    if (!email) {
      showAlert('danger', 'Please enter an email address');
      return;
    }

    const totalExpense = getTotalExpense();
    try {
      // Save total expense tied to the email address
      await axios.post(`${API_URL}/save-total`, { totalExpense, email });
      showAlert('success', 'Total expense saved successfully');
      setShowEmailModal(false); // Close email modal
    } catch (error) {
      showAlert('danger', 'Failed to save total expense');
    }
  };

  const handleRetrievePreviousExpenses = async () => {
    if (!email) {
      showAlert('danger', 'Please enter an email address');
      return;
    }
    setIsRetrieving(true);
    try {
      const response = await axios.post(`${API_URL}/retrieve`, { email });
      setPreviousExpenses(response.data);
      showAlert('success', 'Previous expenses retrieved successfully');
    } catch (error) {
      showAlert('danger', 'Failed to retrieve previous expenses');
    } finally {
      setIsRetrieving(false);
    }
  };

  const categoryColors = {
    Food: 'primary',
    Transport: 'success',
    Entertainment: 'warning',
    Bills: 'danger',
    Other: 'secondary'
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h1 className="text-center mb-4">
        <i className="bi bi-cash-stack me-2"></i> Expense Tracker
      </h1>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      {/* Export to Excel Button */}
      <div className="mb-4 d-flex justify-content-end">
        <ExportExcel data={expenses} /> {/* Pass expenses data to ExportExcel */}
      </div>

      {/* Save Total Expense Button */}
      <div className="mb-4 d-flex justify-content-end">
        <Button variant="info" onClick={handleSaveTotalExpense}>
          Save Total Expense
        </Button>
      </div>

      {/* Retrieve Previous Expenses Button */}
      <div className="mb-4 d-flex justify-content-end">
        <Form.Control
          type="email"
          placeholder="Enter email to retrieve expenses"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="me-2"
          disabled={isRetrieving}
        />
        <Button
          variant="warning"
          onClick={handleRetrievePreviousExpenses}
          disabled={isRetrieving}
        >
          {isRetrieving ? 'Retrieving...' : 'Retrieve Previous Expenses'}
        </Button>
      </div>

      <Card className="mb-4 shadow">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Total Expenses</h5>
              <h2 className="text-primary">
                ${getTotalExpense()}
              </h2>
            </div>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <i className="bi bi-plus-lg me-1"></i> Add Expense
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Table striped bordered hover responsive className="shadow">
        <thead className="table-dark">
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length > 0 ? (
            expenses.map(expense => (
              <tr key={expense.id}>
                <td>{expense.description}</td>
                <td>${parseFloat(expense.amount).toFixed(2)}</td>
                <td>
                  <Badge bg={categoryColors[expense.category] || 'secondary'}>
                    {expense.category}
                  </Badge>
                </td>
                <td>{new Date(expense.date).toLocaleDateString()}</td>
                <td>
                  <Button variant="warning" onClick={() => handleEdit(expense)} size="sm" className="me-2">
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(expense.id)} size="sm">
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">No expenses added yet</td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Modal for Adding/Editing Expense */}
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Expense' : 'Add New Expense'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formDescription" className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group controlId="formAmount" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group controlId="formCategory" className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Bills">Bills</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={handleClose} className="me-2">
                Close
              </Button>
              <Button variant="primary" type="submit">
                {editingId ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal for Email Input (Save Total Expense) */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Enter Your Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="formEmail" className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" onClick={() => setShowEmailModal(false)} className="me-2">
              Close
            </Button>
            <Button variant="primary" onClick={handleConfirmEmail}>
              Save Total Expense
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;
