import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Grid, Chip, Card, CardContent, CardActions, Alert, LinearProgress, Divider } from '@mui/material';
import { Send, Policy, ShoppingCart, Assignment, VerifiedUser, CalendarMonth, Payments, HealthAndSafety, ReceiptLong } from '@mui/icons-material';

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
    READY_FOR_CARRIER: 'primary',
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
    if (s === 'READY_FOR_CARRIER') return '✔️';
    if (s === 'SUBMITTED') return '📤';
    if (s === 'FMG_APPROVED') return '✔️';
    return '📋';
  };

  const approvalChanceColor = (value) => {
    if (value >= 75) return 'success';
    if (value >= 45) return 'warning';
    return 'error';
  };

  const formatCurrency = (value) => value !== null && value !== undefined
    ? `Rs. ${Number(value).toLocaleString()}`
    : 'N/A';

  const policyAccent = (type) => ({
    HEALTH: '#1976d2',
    AD_D: '#7b1fa2',
    ACCIDENT: '#ef6c00',
  }[type] || '#1976d2');

  const policyTypeLabel = (type) => ({
    HEALTH: 'Health',
    AD_D: 'AD&D',
    ACCIDENT: 'Accident',
  }[type] || type || 'Policy');

  const PolicyMetric = ({ icon, label, value, color = 'primary.main' }) => (
    <Box sx={{
      p: 1.25,
      borderRadius: 2,
      bgcolor: 'rgba(0,0,0,0.025)',
      border: '1px solid',
      borderColor: 'divider',
      minHeight: 74,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, color }}>
        {icon}
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={800}>{value}</Typography>
    </Box>
  );

  const ApprovalChance = ({ value }) => {
    if (value === null || value === undefined) return null;
    return (
      <Box sx={{ mt: 1, minWidth: { xs: '100%', sm: 190 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Approval chance</Typography>
          <Typography variant="caption" fontWeight={800} color={`${approvalChanceColor(value)}.main`}>{value}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={value}
          color={approvalChanceColor(value)}
          sx={{ height: 7, borderRadius: 1 }}
        />
      </Box>
    );
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
              <Card elevation={0} sx={{
                height: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 14px 34px rgba(17, 24, 39, 0.14)',
                  borderColor: policyAccent(p.policyType),
                },
              }}>
                <Box sx={{ height: 6, bgcolor: policyAccent(p.policyType) }} />
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{p.policyName}</Typography>
                      <Typography variant="caption" color="text.secondary">Coverage plan</Typography>
                    </Box>
                    <Chip
                      icon={<HealthAndSafety sx={{ fontSize: 16 }} />}
                      label={policyTypeLabel(p.policyType)}
                      size="small"
                      sx={{ bgcolor: `${policyAccent(p.policyType)}14`, color: policyAccent(p.policyType), fontWeight: 800 }}
                    />
                  </Box>
                  <Grid container spacing={1.25} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <PolicyMetric icon={<VerifiedUser fontSize="small" />} label="Coverage" value={formatCurrency(p.coverageAmount)} color="success.main" />
                    </Grid>
                    <Grid item xs={6}>
                      <PolicyMetric icon={<Payments fontSize="small" />} label="Premium/Yr" value={formatCurrency(p.premium)} color="warning.main" />
                    </Grid>
                  </Grid>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: p.description ? 1 : 0 }}>
                    <CalendarMonth fontSize="small" />
                    <Typography variant="caption">Valid {p.validFrom || 'N/A'} to {p.validTo || 'N/A'}</Typography>
                  </Box>
                  {p.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                  <Button fullWidth variant="contained" startIcon={<ShoppingCart />} onClick={() => purchasePolicy(p.id)} sx={{ fontWeight: 800, borderRadius: 2 }}>
                    Purchase Policy
                  </Button>
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
              <Card elevation={0} sx={{
                height: '100%',
                borderRadius: 2,
                border: '1px solid',
                borderColor: cp.status === 'ACTIVE' ? 'success.light' : 'error.light',
                overflow: 'hidden',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(17, 24, 39, 0.12)' },
              }}>
                <Box sx={{ height: 6, bgcolor: cp.status === 'ACTIVE' ? 'success.main' : 'error.main' }} />
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{cp.policy?.policyName}</Typography>
                      <Typography variant="caption" color="text.secondary">Policy #{cp.policyNumber}</Typography>
                    </Box>
                    <Chip label={cp.status} color={cp.status === 'ACTIVE' ? 'success' : 'error'} size="small" sx={{ fontWeight: 800 }} />
                  </Box>
                  <Grid container spacing={1.25}>
                    <Grid item xs={6}>
                      <PolicyMetric icon={<VerifiedUser fontSize="small" />} label="Coverage" value={formatCurrency(cp.policy?.coverageAmount)} color="success.main" />
                    </Grid>
                    <Grid item xs={6}>
                      <PolicyMetric icon={<ReceiptLong fontSize="small" />} label="Purchased" value={cp.purchaseDate ? new Date(cp.purchaseDate).toLocaleDateString() : 'N/A'} color="primary.main" />
                    </Grid>
                  </Grid>
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
                  <ApprovalChance value={c.approvalChancePercentage} />
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
