import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, TextField, Typography, Paper, Tabs, Tab, Alert, Divider } from '@mui/material';

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
      setError(err.response?.data?.error || err.response?.data || 'Registration failed');
    }
  };

  const testUsers = [
    { user: 'customer', pass: 'customer123', role: 'Customer' },
    { user: 'fmg', pass: 'fmg123', role: 'FMG / TPA' },
    { user: 'carrier', pass: 'carrier123', role: 'Carrier' },
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
      <Paper elevation={8} sx={{
        p: 4, width: 440, borderRadius: 4,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,248,255,0.97))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(21,101,192,0.1)',
        boxShadow: '0 8px 32px rgba(13,71,161,0.12)',
      }}>
        <Typography variant="h4" align="center" gutterBottom sx={{
          fontWeight: 800,
          background: 'linear-gradient(135deg, #0d47a1, #1976d2, #42a5f5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🏥 TPA Claim System
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          3-Role Insurance Claim Workflow
        </Typography>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }} centered sx={{ mb: 2 }}>
          <Tab label="Login" sx={{ fontWeight: 600 }} />
          <Tab label="Register" sx={{ fontWeight: 600 }} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

        {tab === 0 ? (
          <form onSubmit={handleLogin}>
            <TextField label="Username" fullWidth margin="normal" value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth sx={{
              mt: 2, py: 1.2, fontWeight: 700, fontSize: '1rem',
              background: 'linear-gradient(135deg, #0d47a1, #1976d2)',
              boxShadow: '0 4px 14px rgba(25,118,210,0.4)',
              '&:hover': { boxShadow: '0 6px 20px rgba(25,118,210,0.6)' },
            }}>
              Sign In
            </Button>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ p: 2, bgcolor: 'rgba(21,101,192,0.04)', borderRadius: 2, border: '1px solid rgba(21,101,192,0.08)' }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.main' }}>Demo Credentials:</Typography>
              {testUsers.map(u => (
                <Typography key={u.user} variant="caption" display="block" sx={{
                  cursor: 'pointer', py: 0.3,
                  '&:hover': { color: 'primary.main', fontWeight: 600 },
                  transition: 'all 0.2s',
                }}
                  onClick={() => { setUsername(u.user); setPassword(u.pass); }}>
                  🔑 {u.role}: <b>{u.user}</b> / {u.pass}
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
            <Button type="submit" variant="contained" fullWidth sx={{
              mt: 2, py: 1.2, fontWeight: 700,
              background: 'linear-gradient(135deg, #2e7d32, #43a047)',
              boxShadow: '0 4px 14px rgba(46,125,50,0.4)',
            }}>
              Register as Customer
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
}

export default Login;
