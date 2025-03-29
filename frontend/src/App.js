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

function App() {
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Food'
  });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [loading, setLoading] = useState(true);

  // API base URL - points to your backend
  const API_URL = 'http://localhost:5111/api/expenses';

  // Fetch expenses on component mount
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
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
        showAlert('success', 'Expense updated successfully');
      } else {
        await axios.post(API_URL, formData);
        showAlert('success', 'Expense added successfully');
      }
      // Refresh expenses
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
      // Refresh expenses
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
      category: expense.category
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', category: 'Food' });
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

      <Card className="mb-4 shadow">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Total Expenses</h5>
              <h2 className="text-primary">
                ${expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0).toFixed(2)}
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
                  <Button 
                    variant="outline-warning" 
                    onClick={() => handleEdit(expense)}
                    className="me-2"
                  >
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    onClick={() => handleDelete(expense.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center text-muted py-4">
                No expenses found. Add your first expense!
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit' : 'Add'} Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {Object.keys(categoryColors).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingId ? 'Update' : 'Save'} Expense
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;