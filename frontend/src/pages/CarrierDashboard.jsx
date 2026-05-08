import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, TextField, Grid, Card, CardContent, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Cancel, HourglassEmpty, VerifiedUser, Payments, CalendarMonth, HealthAndSafety } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function CarrierDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [customerToBlock, setCustomerToBlock] = useState(null);
  
  // Create Policy
  const [policyDialog, setPolicyDialog] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ policyName: '', policyType: 'HEALTH', coverageAmount: '', premium: '', validFrom: '', validTo: '', description: '' });
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  
  // Approve/Reject
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionClaimId, setActionClaimId] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const claimRes = await axios.get(`${API}/carrier/claims`, { headers });
      setClaims(claimRes.data);
    } catch (err) { 
      console.error("Error fetching claims:", err);
      setError("Failed to fetch claims data.");
    }
    
    try {
      const polRes = await axios.get(`${API}/policies`, { headers });
      setPolicies(polRes.data);
    } catch (err) { 
      console.error("Error fetching policies:", err);
      setError("Failed to fetch policies data.");
    }

    try {
      const customerRes = await axios.get(`${API}/carrier/customers`, { headers });
      setCustomers(customerRes.data);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to fetch customers data.");
    }
  };

  const createPolicy = async () => {
    try {
      if (editingPolicyId) {
        await axios.put(`${API}/policies/${editingPolicyId}`, newPolicy, { headers });
        setSuccess('Policy updated successfully!');
      } else {
        await axios.post(`${API}/policies`, newPolicy, { headers });
        setSuccess('Policy created successfully!');
      }
      setPolicyDialog(false);
      setTab('policies');
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save policy'); }
  };

  const handleEditPolicy = (p) => {
    setNewPolicy({ ...p, description: p.description || '' });
    setEditingPolicyId(p.id);
    setPolicyDialog(true);
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm('Are you sure you want to delete this policy? This will fail if there are active customers.')) return;
    try {
      await axios.delete(`${API}/policies/${id}`, { headers });
      setSuccess('Policy deleted successfully!');
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed to delete policy'); }
  };

  const openCreateDialog = () => {
    setEditingPolicyId(null);
    setNewPolicy({ policyName: '', policyType: 'HEALTH', coverageAmount: '', premium: '', validFrom: '', validTo: '', description: '' });
    setPolicyDialog(true);
  };

  const openAction = (type, claim) => {
    setActionType(type); 
    setActionClaimId(claim.id); 
    // Pre-fill settlement amount with claimed amount if approving
    setSettlementAmount(type === 'approve' && claim.extractedData?.claimedAmount ? claim.extractedData.claimedAmount : ''); 
    setRemarks(''); 
    setActionDialog(true);
  };

  const executeAction = async () => {
    try {
      if (actionType === 'approve') {
        await axios.put(`${API}/carrier/claims/${actionClaimId}/approve`, { settlementAmount, remarks }, { headers });
      } else {
        await axios.put(`${API}/carrier/claims/${actionClaimId}/reject`, { remarks }, { headers });
      }
      setSuccess(`Claim ${actionType}d successfully!`);
      setActionDialog(false);
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  };

  const openCustomerDetails = async (customer) => {
    setCustomerDetailsOpen(true);
    setSelectedCustomer(null);
    setCustomerDetailsLoading(true);
    try {
      const res = await axios.get(`${API}/carrier/customers/${customer.id}`, { headers });
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customer details.');
      setCustomerDetailsOpen(false);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const handleBlockCustomer = async () => {
    if (!blockReason.trim()) return setError('Please provide a reason for blocking.');
    try {
      await axios.put(`${API}/carrier/customers/${customerToBlock.id}/block`, { reason: blockReason }, { headers });
      setSuccess(`Customer ${customerToBlock.name} blocked successfully.`);
      setBlockDialogOpen(false);
      setBlockReason('');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to block customer.');
    }
  };

  const unblockCustomer = async (customer) => {
    try {
      await axios.put(`${API}/carrier/customers/${customer.id}/unblock`, {}, { headers });
      setSuccess(`Customer ${customer.name} unblocked successfully.`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unblock customer.');
    }
  };

  const formatCurrency = (value) => value !== null && value !== undefined
    ? `Rs. ${Number(value).toLocaleString()}`
    : 'N/A';

  const statusChip = (status) => {
    switch(status) {
      case 'READY_FOR_CARRIER': return <Chip icon={<HourglassEmpty />} label="Rules Passed - Awaiting Decision" color="info" size="small" />;
      case 'MANUAL_REVIEW': return <Chip icon={<HourglassEmpty />} label="Manual Review Required" color="warning" size="small" />;
      case 'COMPLETED': return <Chip icon={<CheckCircle />} label="Paid / Completed" color="success" size="small" />;
      case 'CARRIER_REJECTED': return <Chip icon={<Cancel />} label="Rejected" color="error" size="small" />;
      default: return <Chip label={status} color="default" size="small" />;
    }
  };

  const policyAccent = (type) => ({
    HEALTH: '#2e7d32',
    AD_D: '#7b1fa2',
    ACCIDENT: '#ef6c00',
  }[type] || '#2e7d32');

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

  // Split claims into pending and history
  const pendingClaims = claims.filter(c => c.status === 'READY_FOR_CARRIER' || c.status === 'MANUAL_REVIEW');
  const claimHistory = claims.filter(c => c.status !== 'READY_FOR_CARRIER' && c.status !== 'MANUAL_REVIEW');

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #2e7d32, #4caf50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Carrier Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">Policy Management & Final Adjudication</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant={tab === 'claims' ? 'contained' : 'outlined'} onClick={() => setTab('claims')} sx={{ fontWeight: 600 }}>
          Pending Approvals ({pendingClaims.length})
        </Button>
        <Button variant={tab === 'history' ? 'contained' : 'outlined'} onClick={() => setTab('history')} sx={{ fontWeight: 600 }}>
          Decision History ({claimHistory.length})
        </Button>
        <Button variant={tab === 'policies' ? 'contained' : 'outlined'} onClick={() => setTab('policies')} sx={{ fontWeight: 600 }}>
          Manage Policies ({policies.length})
        </Button>
        <Button variant={tab === 'customers' ? 'contained' : 'outlined'} onClick={() => setTab('customers')} sx={{ fontWeight: 600 }}>
          Customers ({customers.length})
        </Button>
        <Button variant="contained" color="success" startIcon={<Add />} onClick={openCreateDialog} sx={{ ml: 'auto', background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
          Create Policy
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Pending Claims */}
      {tab === 'claims' && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>Action Required: FMG-Validated Claims</Typography>
          {pendingClaims.map(c => (
            <Paper key={c.id} sx={{ p: 3, mb: 2, borderLeft: '4px solid #ff9800', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography fontWeight={700} sx={{ cursor: 'pointer', color: 'primary.main', fontSize: '1.1rem' }} onClick={() => navigate(`/claims/${c.id}`)}>
                    Claim ID: {c.id}
                  </Typography>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item>
                      <Typography variant="caption" color="text.secondary" display="block">Customer</Typography>
                      <Typography variant="body2" fontWeight={500}>{c.customer?.name}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="caption" color="text.secondary" display="block">Policy</Typography>
                      <Typography variant="body2" fontWeight={500}>{c.customerPolicy?.policyNumber}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="caption" color="text.secondary" display="block">Claimed Amount</Typography>
                      <Typography variant="body2" fontWeight={700} color="error.main">₹{c.extractedData?.claimedAmount?.toLocaleString() || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                  {c.decisions && c.decisions.length > 0 && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(25,118,210,0.04)', borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="primary">FMG Validation Result:</Typography>
                      <Typography variant="body2" fontStyle="italic">"{c.decisionReason || 'Rules passed. Carrier final decision required.'}"</Typography>
                    </Box>
                  )}
                  {!c.decisions?.length && c.decisionReason && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,152,0,0.08)', borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="warning.main">FMG Validation Result:</Typography>
                      <Typography variant="body2" fontStyle="italic">"{c.decisionReason}"</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
                  {statusChip(c.status)}
                  <Button variant="contained" color="success" onClick={() => openAction('approve', c)} fullWidth sx={{ fontWeight: 600, background: 'linear-gradient(135deg, #2e7d32, #4caf50)' }}>
                    Approve Payment
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => openAction('reject', c)} fullWidth sx={{ fontWeight: 600 }}>
                    Reject Claim
                  </Button>
                  <Button variant="text" size="small" onClick={() => navigate(`/claims/${c.id}`)}>View Full Details</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {pendingClaims.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)' }}>
              <CheckCircle color="success" sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
              <Typography color="text.secondary">All caught up! No claims awaiting your decision.</Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Claim History */}
      {tab === 'history' && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>Decision History</Typography>
          {claimHistory.map(c => (
            <Paper key={c.id} sx={{ p: 2, mb: 2, borderLeft: `4px solid ${c.status === 'COMPLETED' ? '#4caf50' : '#f44336'}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontWeight={700} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/claims/${c.id}`)}>
                    Claim: {c.id.substring(0, 8)}...
                  </Typography>
                  <Typography variant="body2">Customer: {c.customer?.name} | Policy: {c.customerPolicy?.policyNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">Processed: {new Date(c.processedAt || c.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  {statusChip(c.status)}
                  {c.status === 'COMPLETED' && (
                    <Typography variant="body2" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                      Settled: ₹{c.settlementAmount?.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
          {claimHistory.length === 0 && <Typography color="text.secondary">No decision history available.</Typography>}
        </Box>
      )}

      {/* Policies */}
      {tab === 'policies' && (
        <Grid container spacing={3}>
          {policies.map(p => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={0} sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
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
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{p.policyName}</Typography>
                      <Typography variant="caption" color="text.secondary">Managed policy</Typography>
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
                <CardActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Policy actions</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <IconButton size="small" color="primary" onClick={() => handleEditPolicy(p)} sx={{ bgcolor: 'rgba(25,118,210,0.08)', '&:hover': { bgcolor: 'rgba(25,118,210,0.16)' } }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeletePolicy(p.id)} sx={{ bgcolor: 'rgba(211,47,47,0.08)', '&:hover': { bgcolor: 'rgba(211,47,47,0.16)' } }}><Delete fontSize="small" /></IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {policies.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography color="text.secondary">No policies created yet. Click 'Create Policy' to get started.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 'customers' && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Registered Customers</Typography>
            <Typography variant="body2" color="text.secondary">All registered customers are visible here, including active, inactive, and no-policy customers.</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Customer ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Policies</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Inactive</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Purchase</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {customer.customerId || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.username}</TableCell>
                    <TableCell>{customer.email || 'N/A'}</TableCell>
                    <TableCell>{customer.totalPolicies}</TableCell>
                    <TableCell>{customer.activePolicies}</TableCell>
                    <TableCell>{customer.inactivePolicies}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={customer.blocked ? 'BLOCKED' : customer.status.replace('_', ' ')}
                        color={customer.blocked ? 'error' : (customer.status === 'ACTIVE' ? 'success' : customer.status === 'INACTIVE' ? 'warning' : 'default')}
                      />
                    </TableCell>
                    <TableCell>{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleString() : 'No policies yet'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => openCustomerDetails(customer)}>Details</Button>
                        {customer.blocked ? (
                          <Button size="small" variant="contained" color="success" onClick={() => unblockCustomer(customer)}>Unblock</Button>
                        ) : (
                          <Button size="small" variant="contained" color="error" onClick={() => { setCustomerToBlock(customer); setBlockDialogOpen(true); }}>Block</Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {customers.length === 0 && <Typography sx={{ p: 3 }} color="text.secondary">No registered customers found.</Typography>}
        </Paper>
      )}

      <Dialog open={customerDetailsOpen} onClose={() => setCustomerDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Customer Details {selectedCustomer?.customerId ? `- ${selectedCustomer.customerId}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          {customerDetailsLoading && <Typography color="text.secondary">Loading customer history...</Typography>}
          {selectedCustomer && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Name</Typography><Typography fontWeight={700}>{selectedCustomer.name}</Typography></Grid>
                <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Username</Typography><Typography>{selectedCustomer.username}</Typography></Grid>
                <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Email</Typography><Typography>{selectedCustomer.email || 'N/A'}</Typography></Grid>
                <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Customer ID</Typography><Typography fontWeight={700} color="primary.main">{selectedCustomer.customerId}</Typography></Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800}>{selectedCustomer.totalPolicies}</Typography><Typography variant="caption">Policies</Typography></Paper></Grid>
                <Grid item xs={6} sm={3}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800}>{selectedCustomer.totalClaims}</Typography><Typography variant="caption">Claims</Typography></Paper></Grid>
                <Grid item xs={6} sm={3}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800} color="success.main">{selectedCustomer.approvedClaims}</Typography><Typography variant="caption">Approved</Typography></Paper></Grid>
                <Grid item xs={6} sm={3}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800} color="error.main">{selectedCustomer.rejectedClaims}</Typography><Typography variant="caption">Rejected</Typography></Paper></Grid>
                <Grid item xs={6} sm={4}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800} color="warning.main">{selectedCustomer.pendingClaims}</Typography><Typography variant="caption">Pending</Typography></Paper></Grid>
                <Grid item xs={6} sm={4}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800}>{formatCurrency(selectedCustomer.totalClaimedAmount)}</Typography><Typography variant="caption">Total Claimed</Typography></Paper></Grid>
                <Grid item xs={12} sm={4}><Paper sx={{ p: 1.5 }}><Typography variant="h6" fontWeight={800} color="success.main">{formatCurrency(selectedCustomer.totalSettledAmount)}</Typography><Typography variant="caption">Total Settled</Typography></Paper></Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Policy History</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Policy #</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Coverage</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Purchased</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedCustomer.policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>{policy.policyNumber}</TableCell>
                        <TableCell>{policy.policyName || 'N/A'}</TableCell>
                        <TableCell>{policy.policyType || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(policy.coverageAmount)}</TableCell>
                        <TableCell><Chip size="small" label={policy.status} color={policy.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                        <TableCell>{policy.purchaseDate ? new Date(policy.purchaseDate).toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {selectedCustomer.policies.length === 0 && <Typography sx={{ mb: 3 }} color="text.secondary">No policy history yet.</Typography>}

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Claim History</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Claim</TableCell>
                      <TableCell>Policy</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Claimed</TableCell>
                      <TableCell>Settled</TableCell>
                      <TableCell>Approval Chance</TableCell>
                      <TableCell>Decision</TableCell>
                      <TableCell>Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedCustomer.claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell>{claim.id.substring(0, 8)}...</TableCell>
                        <TableCell>{claim.policyNumber || 'N/A'}</TableCell>
                        <TableCell>{statusChip(claim.status)}</TableCell>
                        <TableCell>{formatCurrency(claim.claimedAmount)}</TableCell>
                        <TableCell>{formatCurrency(claim.settlementAmount)}</TableCell>
                        <TableCell>{claim.approvalChancePercentage !== null && claim.approvalChancePercentage !== undefined ? `${claim.approvalChancePercentage}%` : 'N/A'}</TableCell>
                        <TableCell>{claim.decisionReason || 'N/A'}</TableCell>
                        <TableCell>{claim.createdAt ? new Date(claim.createdAt).toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {selectedCustomer.claims.length === 0 && <Typography sx={{ mt: 1 }} color="text.secondary">No claim history yet.</Typography>}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: actionType === 'approve' ? 'success.main' : 'error.main' }}>
          {actionType === 'approve' ? 'Approve Final Payment' : 'Reject Claim'}
        </DialogTitle>
        <DialogContent>
          {actionType === 'approve' && (
            <TextField label="Final Settlement Amount" type="number" fullWidth margin="normal" value={settlementAmount}
              onChange={e => setSettlementAmount(e.target.value)} required
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
          )}
          <TextField label="Carrier Remarks (Visible to Customer)" fullWidth multiline rows={3} margin="normal" value={remarks} onChange={e => setRemarks(e.target.value)} required={actionType === 'reject'} />
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setActionDialog(false)}>Cancel</Button>
          <Button variant="contained" color={actionType === 'approve' ? 'success' : 'error'} onClick={executeAction} sx={{ fontWeight: 600 }}>
            {actionType === 'approve' ? 'Confirm Payment & Complete' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPolicyId ? 'Edit Policy' : 'Create New Policy'}</DialogTitle>
        <DialogContent>
          <TextField label="Policy Name" fullWidth margin="normal" value={newPolicy.policyName} onChange={e => setNewPolicy({...newPolicy, policyName: e.target.value})} required />
          <TextField label="Policy Type" fullWidth margin="normal" select value={newPolicy.policyType} onChange={e => setNewPolicy({...newPolicy, policyType: e.target.value})} SelectProps={{ native: true }}>
            <option value="HEALTH">Health Insurance</option>
            <option value="AD_D">AD&D (Accidental Death & Dismemberment)</option>
            <option value="ACCIDENT">Accident Coverage</option>
          </TextField>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="Coverage Amount" type="number" fullWidth margin="normal" value={newPolicy.coverageAmount} onChange={e => setNewPolicy({...newPolicy, coverageAmount: e.target.value})} required InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Annual Premium" type="number" fullWidth margin="normal" value={newPolicy.premium} onChange={e => setNewPolicy({...newPolicy, premium: e.target.value})} required InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Valid From" type="date" fullWidth margin="normal" value={newPolicy.validFrom} onChange={e => setNewPolicy({...newPolicy, validFrom: e.target.value})} required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Valid To" type="date" fullWidth margin="normal" value={newPolicy.validTo} onChange={e => setNewPolicy({...newPolicy, validTo: e.target.value})} required InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
          <TextField label="Description" fullWidth multiline rows={2} margin="normal" value={newPolicy.description} onChange={e => setNewPolicy({...newPolicy, description: e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createPolicy}>{editingPolicyId ? 'Update Policy' : 'Create Policy'}</Button>
        </DialogActions>
      </Dialog>

      {/* Block Reason Dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
        <DialogTitle>Block Customer: {customerToBlock?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Please provide a reason for blocking this customer. They will see this reason when attempting to login.</Typography>
          <textarea
            style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }}
            placeholder="Enter reason for blocking..."
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBlockCustomer}>Block Customer</Button>
        </Box>
      </Dialog>
    </Box>
  );
}

export default CarrierDashboard;

