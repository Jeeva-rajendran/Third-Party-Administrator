import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, TextField, Grid, Card, CardContent, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton, Divider } from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function CarrierDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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

  const statusChip = (status) => {
    switch(status) {
      case 'FMG_APPROVED': return <Chip icon={<HourglassEmpty />} label="Awaiting Carrier Decision" color="warning" size="small" />;
      case 'COMPLETED': return <Chip icon={<CheckCircle />} label="Paid / Completed" color="success" size="small" />;
      case 'CARRIER_REJECTED': return <Chip icon={<Cancel />} label="Rejected" color="error" size="small" />;
      default: return <Chip label={status} color="default" size="small" />;
    }
  };

  // Split claims into pending and history
  const pendingClaims = claims.filter(c => c.status === 'FMG_APPROVED');
  const claimHistory = claims.filter(c => c.status !== 'FMG_APPROVED');

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
        <Button variant="contained" color="success" startIcon={<Add />} onClick={openCreateDialog} sx={{ ml: 'auto', background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
          Create Policy
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Pending Claims */}
      {tab === 'claims' && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>Action Required: FMG-Approved Claims</Typography>
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
                      <Typography variant="caption" fontWeight={700} color="primary">FMG Recommendation:</Typography>
                      <Typography variant="body2" fontStyle="italic">"{c.decisions[c.decisions.length-1].remarks || 'Approved for payment'}"</Typography>
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
              <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>{p.policyName}</Typography>
                  <Chip label={p.policyType} size="small" color="primary" sx={{ mb: 2, fontWeight: 600 }} />
                  
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Coverage</Typography>
                      <Typography variant="body2" fontWeight={600}>₹{p.coverageAmount?.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Premium/Yr</Typography>
                      <Typography variant="body2" fontWeight={600}>₹{p.premium?.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary">Valid: {p.validFrom} to {p.validTo}</Typography>
                  {p.description && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <IconButton color="primary" onClick={() => handleEditPolicy(p)}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDeletePolicy(p.id)}><Delete /></IconButton>
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
    </Box>
  );
}

export default CarrierDashboard;
