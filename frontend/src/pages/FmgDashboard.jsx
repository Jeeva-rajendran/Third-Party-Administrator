import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, Grid, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent } from '@mui/material';

const API = 'http://localhost:8080/api';

function FmgDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    await Promise.all([fetchClaims(), fetchCustomers()]);
  };

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API}/fmg/claims`, { headers });
      setClaims(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch claims.');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API}/fmg/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customers.');
    }
  };

  const processClaim = async (id) => {
    try {
      await axios.post(`${API}/fmg/claims/${id}/process`, {}, { headers });
      setSuccess('Claim processed successfully (OCR, Rules, AI applied)');
      fetchClaims();
    } catch (err) { setError(err.response?.data?.error || 'Processing failed'); }
  };

  const openCustomerDetails = async (customer) => {
    setCustomerDetailsOpen(true);
    setSelectedCustomer(null);
    setCustomerDetailsLoading(true);
    try {
      const res = await axios.get(`${API}/fmg/customers/${customer.id}`, { headers });
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customer details.');
      setCustomerDetailsOpen(false);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const formatCurrency = (value) => value !== null && value !== undefined
    ? `₹${Number(value).toLocaleString()}`
    : 'N/A';

  const statusColor = (s) => {
    if (s === 'FMG_REJECTED') return 'error';
    if (s === 'MANUAL_REVIEW') return 'warning';
    if (s === 'READY_FOR_CARRIER') return 'success';
    if (s === 'SUBMITTED') return 'info';
    return 'default';
  };

  const statusLabel = (s) => ({
    SUBMITTED: 'Awaiting FMG Validation',
    READY_FOR_CARRIER: 'Rules Passed - Sent to Carrier',
    MANUAL_REVIEW: 'Manual Review - Sent to Carrier',
    FMG_REJECTED: 'Rejected by Validation Rules',
  }[s] || s);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FMG Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">TPA Automated Claim Processing Queue</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant={tab === 'claims' ? 'contained' : 'outlined'} onClick={() => setTab('claims')} sx={{ fontWeight: 600 }}>
          Claims ({claims.length})
        </Button>
        <Button variant={tab === 'customers' ? 'contained' : 'outlined'} onClick={() => setTab('customers')} sx={{ fontWeight: 600 }}>
          Customers ({customers.length})
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {tab === 'claims' && (
        <Box>
      <Typography variant="h6" gutterBottom>Pending Claims ({claims.length})</Typography>
      {claims.map(c => (
        <Paper key={c.id} sx={{ p: 2, mb: 2, borderLeft: `4px solid ${c.status === 'SUBMITTED' ? '#2196f3' : '#ff9800'}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography fontWeight={700} sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate(`/claims/${c.id}`)}>
                Claim ID: {c.id.substring(0, 8)}...
              </Typography>
              <Typography variant="body2">Customer: {c.customer?.name} | Policy: {c.customerPolicy?.policyNumber}</Typography>
              <Typography variant="caption" color="text.secondary">Submitted: {new Date(c.createdAt).toLocaleString()}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={statusLabel(c.status)} color={statusColor(c.status)} size="small" sx={{ fontWeight: 600 }} />
              
              {c.status === 'SUBMITTED' && (
                <Button variant="contained" size="small" onClick={() => processClaim(c.id)} sx={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)' }}>
                  Run AI Validation
                </Button>
              )}
            </Box>
          </Box>

          {/* Quick OCR & AI Preview if processed */}
          {c.status !== 'SUBMITTED' && c.extractedData && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>OCR Extraction Summary</Typography>
                  <Typography variant="caption" display="block">Patient: {c.extractedData.claimFormPatientName}</Typography>
                  <Typography variant="caption" display="block">Claimed Amount: ₹{c.extractedData.claimedAmount}</Typography>
                  <Typography variant="caption" display="block">Total Bill: ₹{c.extractedData.totalBillAmount}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="secondary" gutterBottom>AI & Rule Status</Typography>
                  <Typography variant="caption" display="block" color={c.ruleResults?.some(r => r.triggered) ? "error.main" : "success.main"}>
                    Rules Triggered: {c.ruleResults?.filter(r => r.triggered).length || 0}
                  </Typography>
                  {c.decisionReason && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                      Result: {c.decisionReason}
                    </Typography>
                  )}
                  {c.aiExplanation && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      AI: {c.aiExplanation}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              {c.ruleResults?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  {c.ruleResults.filter(r => r.triggered).map(rule => (
                    <Chip key={rule.ruleId} label={`${rule.ruleId}: ${rule.description}`} color={rule.ruleId === 'R1' || rule.ruleId === 'R2' || rule.ruleId === 'R3' ? 'error' : 'warning'} size="small" sx={{ mr: 1, mb: 1 }} />
                  ))}
                </Box>
              )}
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/claims/${c.id}`)}>View Full Details</Button>
            </Box>
          )}
        </Paper>
      ))}

      {claims.length === 0 && <Typography color="text.secondary">No claims pending FMG action.</Typography>}
        </Box>
      )}

      {tab === 'customers' && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Registered Customers</Typography>
            <Typography variant="body2" color="text.secondary">All registered customers, including active, inactive, and no-policy customers.</Typography>
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
                        label={customer.status.replace('_', ' ')}
                        color={customer.status === 'ACTIVE' ? 'success' : customer.status === 'INACTIVE' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleString() : 'No policies yet'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => openCustomerDetails(customer)}>Details</Button>
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
                        <TableCell><Chip size="small" label={claim.status} color={statusColor(claim.status)} /></TableCell>
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
    </Box>
  );
}

export default FmgDashboard;
