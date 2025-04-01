import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { v4 as uuidv4 } from 'uuid';
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
import * as XLSX from 'xlsx';

const ExportExcel = ({ data }) => {
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'expenses.xlsx');
  };
  return <Button variant="success" onClick={exportToExcel}><i className="bi bi-file-earmark-excel"></i> Export</Button>;
};

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

  const API_URL = 'http://localhost:5000/api/expenses';

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}`); 
      setExpenses(response.data);
    } catch (error) {
      showAlert('danger', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ ...alert, show: false }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { description, amount, category } = formData;
    if (!description || !amount || !category) {
      showAlert('danger', 'Please fill out all fields!');
      return;
    }

    const requestBody = { description, amount, category };

    try {
      if (editingId) {
        // Update expense (PUT request using uuid)
        await axios.put(`${API_URL}/${editingId}`, requestBody);
        showAlert('success', 'Expense updated successfully!');
      } else {
        // Create new expense (POST request)
        await axios.post(API_URL, requestBody);
        showAlert('success', 'Expense added successfully!');
      }
      fetchExpenses(); // Refresh the list after create/update
      handleClose(); // Close modal after submit
    } catch (error) {
      console.error('Error while saving expense:', error);
      showAlert('danger', 'Operation failed');
    }
  };

  const handleDelete = async (uuid) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`${API_URL}/${uuid}`); // Delete using uuid
        showAlert('success', 'Expense deleted');
        fetchExpenses(); // Refresh the list after deletion
      } catch (error) {
        showAlert('danger', 'Failed to delete');
      }
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category
    });
    setEditingId(expense.uuid); // Set uuid for editing
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', category: 'Food' });
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h1 className="text-center mb-4">
        <i className="bi bi-cash-stack me-2"></i> Expense Tracker
      </h1>

      {alert.show && <Alert variant={alert.variant} dismissible>{alert.message}</Alert>}

      <div className="d-flex justify-content-between mb-3">
        <ExportExcel data={expenses} />
        <Button variant="primary" onClick={() => setShowModal(true)}><i className="bi bi-plus-lg"></i> Add Expense</Button>
      </div>

      <Card className="mb-4 shadow">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <h5>Total Expenses: <span className="text-primary">${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}</span></h5>
          </div>
        </Card.Body>
      </Card>

      <Table striped bordered hover responsive className="shadow">
        <thead className="table-dark">
          <tr><th>Description</th><th>Amount</th><th>Category</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {expenses.length ? expenses.map((e) => (
            <tr key={e.uuid}>
              <td>{e.description}</td>
              <td>${parseFloat(e.amount).toFixed(2)}</td>
              <td><Badge bg="primary">{e.category}</Badge></td>
              <td>
                <Button variant="warning" onClick={() => handleEdit(e)}>✏</Button>{' '}
                <Button variant="danger" onClick={() => handleDelete(e.uuid)}>🗑</Button>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="4" className="text-center">No expenses found.</td></tr>
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit' : 'Add'} Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">{editingId ? 'Update' : 'Save'}</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;
