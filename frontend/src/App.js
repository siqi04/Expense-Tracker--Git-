import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Container, Table, Button, Form, Modal, Alert, Badge, Card, InputGroup } from 'react-bootstrap';
import * as XLSX from 'xlsx';

const API_URL = 'http://localhost:5111/api/expenses';

const ExportExcel = ({ data }) => {
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'expenses.xlsx');
  };
  return <Button variant="success" onClick={exportToExcel}>Export to Excel</Button>;
};

function App() {
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'Food' });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [uuid, setUuid] = useState('');

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
    setTimeout(() => setAlert({ show: false }), 3000);
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
      const response = await axios.get(API_URL);
      setExpenses(response.data);
      handleClose();
    } catch (error) {
      showAlert('danger', 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      showAlert('success', 'Expense deleted successfully');
      const response = await axios.get(API_URL);
      setExpenses(response.data);
    } catch (error) {
      showAlert('danger', 'Failed to delete expense');
    }
  };

  const handleEdit = (expense) => {
    setFormData(expense);
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', category: 'Food' });
  };

  const handleSave = () => {
    const newUuid = uuidv4();
    localStorage.setItem(newUuid, JSON.stringify(expenses));
    setUuid(newUuid);
    showAlert('success', `Data saved! UUID: ${newUuid}`);
  };

  const handleRetrieve = () => {
    const storedData = localStorage.getItem(uuid);
    if (storedData) {
      setExpenses(JSON.parse(storedData));
      showAlert('success', 'Data retrieved successfully');
    } else {
      showAlert('danger', 'Invalid UUID');
    }
  };

  return (
    <Container className="mt-4">
      <h1 className="text-center mb-4">Expense Tracker</h1>
      {alert.show && <Alert variant={alert.variant}>{alert.message}</Alert>}
      <div className="d-flex justify-content-end mb-3 gap-2">
        <ExportExcel data={expenses} />
        <Button variant="info" onClick={handleSave}>Save</Button>
        <InputGroup>
          <Form.Control placeholder="Enter UUID" value={uuid} onChange={(e) => setUuid(e.target.value)} />
          <Button variant="dark" onClick={handleRetrieve}>Retrieve</Button>
        </InputGroup>
      </div>
      <Card className="mb-4 shadow">
        <Card.Body>
          <h5>Total Expenses: ${expenses.reduce((sum, ex) => sum + parseFloat(ex.amount), 0).toFixed(2)}</h5>
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Add Expense</Button>
        </Card.Body>
      </Card>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(expense => (
            <tr key={expense.id}>
              <td>{expense.description}</td>
              <td>${parseFloat(expense.amount).toFixed(2)}</td>
              <td><Badge>{expense.category}</Badge></td>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>
                <Button variant="warning" onClick={() => handleEdit(expense)}>Edit</Button>
                <Button variant="danger" onClick={() => handleDelete(expense.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton><Modal.Title>{editingId ? 'Edit' : 'Add'} Expense</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label>
              <Form.Control type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3"><Form.Label>Amount</Form.Label>
              <Form.Control type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
            </Form.Group>
            <Button type="submit">Save</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
export default App;
