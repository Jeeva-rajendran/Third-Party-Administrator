import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Grid, Chip, Card, CardContent, CardActions, Alert, Divider } from '@mui/material';
import { Send, Policy, ShoppingCart, Assignment, TrendingUp } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function CustomerDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('policies');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [polRes, myPolRes, claimRes] = await Promise.all([
        axios.get(`${API}/policies`, { headers }),
        axios.get(`${API}/policies/my-policies`, { headers }),
        axios.get(`${API}/claims`, { headers }),
      ]);
      setPolicies(polRes.data);
      setMyPolicies(myPolRes.data);
      setClaims(claimRes.data);
    } catch (err) { console.error(err); }
  };

  const purchasePolicy = async (policyId) => {
    try {
      await axios.post(`${API}/policies/${policyId}/purchase`, {}, { headers });
      setSuccess('Policy purchased and activated successfully!');
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Purchase failed'); }
  };

  const activePolicies = myPolicies.filter(p => p.status === 'ACTIVE');
  const statusColor = (s) => ({
    SUBMITTED: 'info',
    FMG_PROCESSING: 'warning',
    MANUAL_REVIEW: 'warning',
    FMG_APPROVED: 'primary',
    FMG_REJECTED: 'error',
    CARRIER_APPROVED: 'success',
    CARRIER_REJECTED: 'error',
    COMPLETED: 'success',
  }[s] || 'default');

  const statusIcon = (s) => {
    if (s === 'COMPLETED' || s === 'CARRIER_APPROVED') return '✅';
    if (s?.includes('REJECTED')) return '❌';
    if (s?.includes('REVIEW') || s?.includes('PROCESSING')) return '⏳';
    if (s === 'SUBMITTED') return '📤';
    if (s === 'FMG_APPROVED') return '✔️';
    return '📋';
  };

  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Customer Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">Manage your policies and claims</Typography>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, rgba(21,101,192,0.08), rgba(66,165,245,0.08))' }}>
            <Typography variant="h4" fontWeight={700} color="primary.main">{myPolicies.length}</Typography>
            <Typography variant="body2" fontWeight={500}>My Policies</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, rgba(46,125,50,0.08), rgba(67,160,71,0.08))' }}>
            <Typography variant="h4" fontWeight={700} color="success.main">{activePolicies.length}</Typography>
            <Typography variant="body2" fontWeight={500}>Active Policies</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, rgba(124,77,255,0.08), rgba(179,136,255,0.08))' }}>
            <Typography variant="h4" fontWeight={700} color="secondary.main">{claims.length}</Typography>
            <Typography variant="body2" fontWeight={500}>Total Claims</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant={tab === 'policies' ? 'contained' : 'outlined'} startIcon={<ShoppingCart />} onClick={() => setTab('policies')}>
          Browse Policies
        </Button>
        <Button variant={tab === 'myPolicies' ? 'contained' : 'outlined'} startIcon={<Policy />} onClick={() => setTab('myPolicies')}>
          My Policies ({myPolicies.length})
        </Button>
        <Button variant={tab === 'claims' ? 'contained' : 'outlined'} startIcon={<Assignment />} onClick={() => setTab('claims')}>
          My Claims ({claims.length})
        </Button>
        <Button
          variant="contained" color="success" startIcon={<Send />}
          onClick={() => navigate('/submit-claim')}
          disabled={activePolicies.length === 0}
          sx={{
            ml: 'auto', fontWeight: 700,
            background: 'linear-gradient(135deg, #2e7d32, #43a047)',
            boxShadow: '0 4px 14px rgba(46,125,50,0.3)',
          }}
        >
          Submit New Claim
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Browse Policies */}
      {tab === 'policies' && (
        <Grid container spacing={2}>
          {policies.map(p => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={3} sx={{ borderRadius: 3, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>{p.policyName}</Typography>
                  <Chip label={p.policyType} size="small" color="primary" variant="outlined" sx={{ my: 1 }} />
                  <Typography variant="body2">Coverage: ₹{p.coverageAmount?.toLocaleString()}</Typography>
                  <Typography variant="body2">Premium: ₹{p.premium?.toLocaleString()}/yr</Typography>
                  <Typography variant="caption" color="text.secondary">Valid: {p.validFrom} to {p.validTo}</Typography>
                  {p.description && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>{p.description}</Typography>}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" variant="contained" onClick={() => purchasePolicy(p.id)} sx={{ fontWeight: 600 }}>Purchase Policy</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {policies.length === 0 && <Box sx={{ p: 3 }}><Typography color="text.secondary">No policies available yet. Carrier needs to create them.</Typography></Box>}
        </Grid>
      )}

      {/* My Policies */}
      {tab === 'myPolicies' && (
        <Grid container spacing={2}>
          {myPolicies.map(cp => (
            <Grid item xs={12} sm={6} key={cp.id}>
              <Card elevation={2} sx={{ borderRadius: 3, borderLeft: `4px solid ${cp.status === 'ACTIVE' ? '#43a047' : '#ef5350'}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>{cp.policy?.policyName}</Typography>
                    <Chip label={cp.status} color={cp.status === 'ACTIVE' ? 'success' : 'error'} size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>Policy #: <b>{cp.policyNumber}</b></Typography>
                  <Typography variant="body2">Coverage: ₹{cp.policy?.coverageAmount?.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Purchased: {cp.purchaseDate ? new Date(cp.purchaseDate).toLocaleDateString() : 'N/A'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {myPolicies.length === 0 && <Box sx={{ p: 3 }}><Typography color="text.secondary">No policies purchased yet.</Typography></Box>}
        </Grid>
      )}

      {/* My Claims */}
      {tab === 'claims' && (
        <Box>
          {claims.map(c => (
            <Paper key={c.id} sx={{
              p: 2.5, mb: 2, cursor: 'pointer',
              borderLeft: `4px solid`,
              borderLeftColor: `${statusColor(c.status)}.main`,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateX(4px)', boxShadow: 4 },
            }} onClick={() => navigate(`/claims/${c.id}`)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight={700}>
                    {statusIcon(c.status)} Claim: {c.id.substring(0, 8)}...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Policy: {c.customerPolicy?.policyNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">Created: {new Date(c.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip label={c.status} color={statusColor(c.status)} sx={{ fontWeight: 600 }} />
                  {c.settlementAmount && (
                    <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 0.5 }}>
                      ₹{c.settlementAmount.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
          {claims.length === 0 && <Typography color="text.secondary">No claims yet. Submit your first claim!</Typography>}
        </Box>
      )}
    </Box>
  );
}

export default CustomerDashboard;
