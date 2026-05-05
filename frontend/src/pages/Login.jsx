import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, TextField, Typography, Paper, Tabs, Tab, Alert } from '@mui/material';

const API_URL = 'http://localhost:8080/api/auth';

function Login() {
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      login(response.data);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await axios.post(`${API_URL}/register`, { username, password, name, email });
      setSuccess('Registration successful! Please login.');
      setTab(0);
    } catch (err) {
      setError(err.response?.data || 'Registration failed');
    }
  };

  const testUsers = [
    { user: 'customer', pass: 'customer123', role: 'Customer' },
    { user: 'client', pass: 'client123', role: 'Client (Bank)' },
    { user: 'fmg', pass: 'fmg123', role: 'FMG (TPA)' },
    { user: 'carrier', pass: 'carrier123', role: 'Carrier' },
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Paper elevation={6} sx={{ p: 4, width: 440, borderRadius: 3, background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,248,255,0.95))' }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #1565c0, #0d47a1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TPA Claim System
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
          Multi-Role Insurance Workflow
        </Typography>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }} centered sx={{ mb: 2 }}>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {tab === 0 ? (
          <form onSubmit={handleLogin}>
            <TextField label="Username" fullWidth margin="normal" value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, py: 1.2, fontWeight: 600, background: 'linear-gradient(45deg, #1565c0, #1976d2)' }}>
              Sign In
            </Button>
            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={600}>Test Credentials:</Typography>
              {testUsers.map(u => (
                <Typography key={u.user} variant="caption" display="block" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                  onClick={() => { setUsername(u.user); setPassword(u.pass); }}>
                  {u.role}: {u.user} / {u.pass}
                </Typography>
              ))}
            </Box>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <TextField label="Full Name" fullWidth margin="normal" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Username" fullWidth margin="normal" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, py: 1.2, fontWeight: 600, background: 'linear-gradient(45deg, #2e7d32, #43a047)' }}>
              Register as Customer
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
}

export default Login;
