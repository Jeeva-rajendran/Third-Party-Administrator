import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, Grid, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, TextField, List, ListItem, ListItemText, Switch } from '@mui/material';
import { Settings, AccessTime, Timer, Warning, CheckCircle, Info } from '@mui/icons-material';

const API = '/api';

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
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [customerToBlock, setCustomerToBlock] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update clock every minute
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchClaims(), fetchCustomers(), fetchConfigs()]);
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
  const fetchConfigs = async () => {
    try {
      const res = await axios.get(`${API}/fmg/config`, { headers });
      setConfigs(res.data);
    } catch (err) { console.error(err); }
  };

  const handleUpdateConfig = async (key, value) => {
    try {
      await axios.put(`${API}/fmg/config`, { [key]: value }, { headers });
      setSuccess(`Setting ${key} updated.`);
      fetchConfigs();
    } catch (err) { setError('Update failed'); }
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

  const handleBlockCustomer = async () => {
    if (!blockReason.trim()) return setError('Please provide a reason for blocking.');
    try {
      await axios.put(`${API}/fmg/customers/${customerToBlock.id}/block`, { reason: blockReason }, { headers });
      setSuccess(`Customer ${customerToBlock.name} blocked successfully.`);
      setBlockDialogOpen(false);
      setBlockReason('');
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to block customer.');
    }
  };

  const unblockCustomer = async (customer) => {
    try {
      await axios.put(`${API}/fmg/customers/${customer.id}/unblock`, {}, { headers });
      setSuccess(`Customer ${customer.name} unblocked successfully.`);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unblock customer.');
    }
  };

  const formatCurrency = (value) => value !== null && value !== undefined
    ? `₹${Number(value).toLocaleString()}`
    : 'N/A';

  const statusColor = (s) => {
    if (s === 'FMG_REJECTED' || s === 'CARRIER_REJECTED') return 'error';
    if (s === 'MANUAL_REVIEW') return 'warning';
    if (s === 'READY_FOR_CARRIER' || s === 'CARRIER_APPROVED') return 'success';
    if (s === 'SUBMITTED') return 'info';
    if (s === 'COMPLETED') return 'success';
    return 'default';
  };

  const statusLabel = (s) => ({
    SUBMITTED: 'Awaiting Validation',
    READY_FOR_CARRIER: 'Sent to Carrier',
    MANUAL_REVIEW: 'Manual Review',
    FMG_REJECTED: 'FMG Rejected',
    CARRIER_APPROVED: 'Carrier Approved',
    CARRIER_REJECTED: 'Carrier Rejected',
    COMPLETED: 'Completed',
  }[s] || s);
  const getQueueAge = (queueAgeMs) => {
    const totalMins = Math.floor(queueAgeMs / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return { hours, mins };
  };

  const getSlaStatus = (hours) => {
    const amber = parseInt(configs.find(c => c.key === 'SLA_AMBER_HOURS')?.value || '12');
    const red = parseInt(configs.find(c => c.key === 'SLA_RED_HOURS')?.value || '24');
    if (hours >= red) return { color: 'error', label: 'SLA BREACHED', icon: <Warning fontSize="small" /> };
    if (hours >= amber) return { color: 'warning', label: 'URGENT', icon: <Timer fontSize="small" /> };
    return { color: 'success', label: 'ON TRACK', icon: <AccessTime fontSize="small" /> };
  };

  // Split claims into active queue and history
  const activeClaims = claims.filter(c => ['SUBMITTED', 'READY_FOR_CARRIER', 'MANUAL_REVIEW'].includes(c.status));
  const historyClaims = claims.filter(c => ['FMG_REJECTED', 'CARRIER_APPROVED', 'CARRIER_REJECTED', 'COMPLETED'].includes(c.status));

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
          Active Queue ({activeClaims.length})
        </Button>
        <Button variant={tab === 'history' ? 'contained' : 'outlined'} onClick={() => setTab('history')} sx={{ fontWeight: 600 }}>
          Claim History ({historyClaims.length})
        </Button>
        <Button variant={tab === 'customers' ? 'contained' : 'outlined'} onClick={() => setTab('customers')} sx={{ fontWeight: 600 }}>
          Customers ({customers.length})
        </Button>
        <Button variant={tab === 'settings' ? 'contained' : 'outlined'} onClick={() => setTab('settings')} startIcon={<Settings />} sx={{ fontWeight: 600 }}>
          Rule Settings
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {tab === 'claims' && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>Active Processing Queue</Typography>
          {activeClaims.map(c => (
            <Paper key={c.id} sx={{ p: 1.5, mb: 1.5, borderLeft: `4px solid ${c.status === 'SUBMITTED' ? '#2196f3' : c.status === 'READY_FOR_CARRIER' ? '#4caf50' : '#ff9800'}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ cursor: 'pointer', color: 'primary.main', whiteSpace: 'nowrap' }} onClick={() => navigate(`/claims/${c.id}`)}>
                    {c.id.substring(0, 8)}...
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{c.customer?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{c.customerPolicy?.policyNumber}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{new Date(c.createdAt).toLocaleDateString()}</Typography>
                  {c.status === 'SUBMITTED' && c.queueAgeMs > 0 && (() => {
                    const age = getQueueAge(c.queueAgeMs);
                    const sla = getSlaStatus(age.hours);
                    return (
                      <Chip icon={sla.icon} label={`${age.hours}h ${age.mins}m`} size="small" color={sla.color} variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                    );
                  })()}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                  <Chip label={statusLabel(c.status)} color={statusColor(c.status)} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                  {c.status === 'SUBMITTED' && (
                    <Button variant="contained" size="small" onClick={() => processClaim(c.id)} sx={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)', fontSize: '0.75rem', py: 0.5, whiteSpace: 'nowrap' }}>
                      Run AI Validation
                    </Button>
                  )}
                  <Button size="small" variant="text" onClick={() => navigate(`/claims/${c.id}`)} sx={{ fontSize: '0.75rem', minWidth: 'auto' }}>Details</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {activeClaims.length === 0 && <Typography color="text.secondary">No claims pending FMG action.</Typography>}
        </Box>
      )}

      {tab === 'history' && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" fontWeight={700}>Claim History</Typography>
            <Typography variant="body2" color="text.secondary">All processed claims with final outcomes</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Claim ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Policy</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Settlement</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyClaims.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/claims/${c.id}`)}>
                        {c.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{c.customer?.name}</TableCell>
                    <TableCell>{c.customerPolicy?.policyNumber}</TableCell>
                    <TableCell><Chip label={statusLabel(c.status)} color={statusColor(c.status)} size="small" sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell>{c.settlementAmount ? `₹${Number(c.settlementAmount).toLocaleString()}` : 'N/A'}</TableCell>
                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Button size="small" onClick={() => navigate(`/claims/${c.id}`)}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {historyClaims.length === 0 && <Typography sx={{ p: 3 }} color="text.secondary">No claim history available.</Typography>}
        </Paper>
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

      {tab === 'settings' && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>Interactive Rule Configuration</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Adjust rule thresholds and SLA limits. Changes take effect immediately for all new validations.</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings color="primary" /> Business Rule Thresholds
                </Typography>
                <List>
                  {configs.filter(c => c.key.startsWith('RULE_')).map(config => (
                    <ListItem key={config.key} divider>
                      <ListItemText 
                        primary={config.description} 
                        secondary={`Current Value: ${config.key.includes('THRESHOLD') ? '₹' : ''}${config.value}`} 
                      />
                      <TextField 
                        size="small" 
                        type="number"
                        defaultValue={config.value}
                        onBlur={(e) => handleUpdateConfig(config.key, e.target.value)}
                        sx={{ width: 120 }}
                        InputProps={{ startAdornment: config.key.includes('THRESHOLD') ? <Typography variant="caption" sx={{ mr: 1 }}>₹</Typography> : null }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime color="secondary" /> SLA Monitoring Limits
                </Typography>
                <List>
                  {configs.filter(c => c.key.startsWith('SLA_')).map(config => (
                    <ListItem key={config.key} divider>
                      <ListItemText 
                        primary={config.description} 
                        secondary={`Alert after ${config.value} hours`} 
                      />
                      <TextField 
                        size="small" 
                        type="number"
                        defaultValue={config.value}
                        onBlur={(e) => handleUpdateConfig(config.key, e.target.value)}
                        sx={{ width: 100 }}
                        InputProps={{ endAdornment: <Typography variant="caption" sx={{ ml: 1 }}>hrs</Typography> }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                  These limits determine when claims are flagged as **URGENT** or **BREACHED** on the dashboard.
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Box>
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

export default FmgDashboard;
