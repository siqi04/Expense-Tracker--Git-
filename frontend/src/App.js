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
  Card,
  InputGroup
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
  const [uuid, setUuid] = useState('');

  const API_URL = 'https://expense-tracker-git.onrender.com';

  useEffect(() => {
    fetchExpenses();
  }, []);

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

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ ...alert, show: false }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const response = await axios.put(`${API_URL}/${editingId}`, { ...formData, uuid });
        console.log(response.data); // Log the response data for debugging
        showAlert('success', 'Expense updated successfully');
      } else {
        const response = await axios.post(API_URL, { ...formData, uuid: uuidv4() });
        console.log(response.data); // Log the response data for debugging
        showAlert('success', 'Expense added successfully');
      }
      fetchExpenses();
      handleClose();
    } catch (error) {
      console.error(error); // Log any error for debugging
      showAlert('danger', 'Operation failed');
    }
  };

  const handleDelete = async (uuid) => {
    try {
      await axios.delete(`${API_URL}/${uuid}`);
      showAlert('success', 'Expense deleted');
      fetchExpenses();
    } catch (error) {
      showAlert('danger', 'Failed to delete');
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category
    });
    setUuid(expense.uuid); // Set UUID from the selected expense
    setEditingId(expense.uuid); // Use UUID for editing
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', category: 'Food' });
  };

  const handleSave = () => {
    const newUuid = uuidv4();
    setUuid(newUuid);
    localStorage.setItem(newUuid, JSON.stringify(expenses));
    showAlert('success', `Saved with UUID: ${newUuid}`);
  };

  const handleRetrieve = () => {
    const data = localStorage.getItem(uuid);
    if (data) {
      setExpenses(JSON.parse(data));
      showAlert('success', 'Expenses retrieved successfully');
    } else {
      showAlert('danger', 'No data found for this UUID');
    }
  };

  if (loading) {
    return <Container className="text-center mt-5"><div className="spinner-border text-primary"></div></Container>;
  }

  return (
    <Container className="mt-4">
      <h1 className="text-center mb-4">
        <i className="bi bi-cash-stack me-2"></i> Expense Tracker
      </h1>

      {alert.show && <Alert variant={alert.variant} dismissible>{alert.message}</Alert>}

      <div className="d-flex justify-content-between mb-3">
        <ExportExcel data={expenses} />
        <div>
          <Button variant="info" className="me-2" onClick={handleSave}><i className="bi bi-save"></i> Save</Button>
          <InputGroup className="d-inline-flex w-auto">
            <Form.Control
              type="text"
              placeholder="Enter UUID"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
            />
            <Button variant="secondary" onClick={handleRetrieve}><i className="bi bi-upload"></i> Retrieve</Button>
          </InputGroup>
        </div>
      </div>

      <Card className="mb-4 shadow">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <h5>Total Expenses: <span className="text-primary">${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}</span></h5>
            <Button variant="primary" onClick={() => setShowModal(true)}><i className="bi bi-plus-lg"></i> Add Expense</Button>
          </div>
        </Card.Body>
      </Card>

      <Table striped bordered hover responsive className="shadow">
        <thead className="table-dark">
          <tr><th>Description</th><th>Amount</th><th>Category</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {expenses.length ? expenses.map(e => (
            <tr key={e.uuid}><td>{e.description}</td><td>${parseFloat(e.amount).toFixed(2)}</td><td><Badge bg="primary">{e.category}</Badge></td>
            <td><Button variant="warning" onClick={() => handleEdit(e)}>✏</Button> <Button variant="danger" onClick={() => handleDelete(e.uuid)}>🗑</Button></td></tr>
          )) : <tr><td colSpan="4" className="text-center">No expenses found.</td></tr>}
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
