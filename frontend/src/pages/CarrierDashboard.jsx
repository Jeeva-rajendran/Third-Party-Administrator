import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, TextField, Grid, Card, CardContent, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment } from '@mui/material';
import { Add } from '@mui/icons-material';

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
      const [claimRes, polRes] = await Promise.all([
        axios.get(`${API}/carrier/claims`, { headers }),
        axios.get(`${API}/policies`, { headers }),
      ]);
      setClaims(claimRes.data);
      setPolicies(polRes.data);
    } catch (err) { console.error(err); }
  };

  const createPolicy = async () => {
    try {
      await axios.post(`${API}/policies`, newPolicy, { headers });
      setSuccess('Policy created successfully!');
      setPolicyDialog(false);
      setNewPolicy({ policyName: '', policyType: 'HEALTH', coverageAmount: '', premium: '', validFrom: '', validTo: '', description: '' });
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create policy'); }
  };

  const openAction = (type, claimId) => {
    setActionType(type); setActionClaimId(claimId); setSettlementAmount(''); setRemarks(''); setActionDialog(true);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant={tab === 'claims' ? 'contained' : 'outlined'} onClick={() => setTab('claims')}>Pending Claims ({claims.length})</Button>
        <Button variant={tab === 'policies' ? 'contained' : 'outlined'} onClick={() => setTab('policies')}>My Policies ({policies.length})</Button>
        <Button variant="contained" color="success" startIcon={<Add />} onClick={() => setPolicyDialog(true)}>Create Policy</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {tab === 'claims' && (
        <Box>
          <Typography variant="h6" gutterBottom>FMG-Approved Claims (Awaiting Final Decision)</Typography>
          {claims.map(c => (
            <Paper key={c.id} sx={{ p: 2, mb: 2, borderLeft: '4px solid #4caf50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/claims/${c.id}`)}>
                    Claim: {c.id.substring(0, 8)}...
                  </Typography>
                  <Typography variant="body2">Customer: {c.customer?.name} | Policy: {c.customerPolicy?.policyNumber}</Typography>
                  {c.extractedData && <Typography variant="body2">Claimed: ₹{c.extractedData.claimedAmount} | Bill: ₹{c.extractedData.totalBillAmount}</Typography>}
                  <Typography variant="caption">Decision: {c.decisionReason}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={c.status} color="primary" size="small" />
                  <Button variant="contained" color="success" size="small" onClick={() => openAction('approve', c.id)}>Approve Payment</Button>
                  <Button variant="outlined" color="error" size="small" onClick={() => openAction('reject', c.id)}>Reject</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {claims.length === 0 && <Typography color="text.secondary">No claims awaiting carrier decision.</Typography>}
        </Box>
      )}

      {tab === 'policies' && (
        <Grid container spacing={2}>
          {policies.map(p => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6">{p.policyName}</Typography>
                  <Chip label={p.policyType} size="small" color="primary" sx={{ my: 1 }} />
                  <Typography variant="body2">Coverage: ₹{p.coverageAmount?.toLocaleString()}</Typography>
                  <Typography variant="body2">Premium: ₹{p.premium?.toLocaleString()}/yr</Typography>
                  <Typography variant="caption">Valid: {p.validFrom} to {p.validTo}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Policy Dialog */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Policy</DialogTitle>
        <DialogContent>
          <TextField label="Policy Name" fullWidth margin="normal" value={newPolicy.policyName} onChange={e => setNewPolicy({...newPolicy, policyName: e.target.value})} />
          <TextField label="Policy Type" fullWidth margin="normal" select value={newPolicy.policyType}
            onChange={e => setNewPolicy({...newPolicy, policyType: e.target.value})}
            SelectProps={{ native: true }}>
            <option value="HEALTH">Health Insurance</option>
            <option value="AD_D">AD&D (Accidental Death & Dismemberment)</option>
            <option value="ACCIDENT">Accident Coverage</option>
          </TextField>
          <TextField label="Coverage Amount" type="number" fullWidth margin="normal" value={newPolicy.coverageAmount}
            onChange={e => setNewPolicy({...newPolicy, coverageAmount: e.target.value})}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
          <TextField label="Annual Premium" type="number" fullWidth margin="normal" value={newPolicy.premium}
            onChange={e => setNewPolicy({...newPolicy, premium: e.target.value})}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
          <TextField label="Valid From" type="date" fullWidth margin="normal" value={newPolicy.validFrom}
            onChange={e => setNewPolicy({...newPolicy, validFrom: e.target.value})} InputLabelProps={{ shrink: true }} />
          <TextField label="Valid To" type="date" fullWidth margin="normal" value={newPolicy.validTo}
            onChange={e => setNewPolicy({...newPolicy, validTo: e.target.value})} InputLabelProps={{ shrink: true }} />
          <TextField label="Description" fullWidth multiline rows={2} margin="normal" value={newPolicy.description}
            onChange={e => setNewPolicy({...newPolicy, description: e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createPolicy}>Create Policy</Button>
        </DialogActions>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'approve' ? 'Approve Payment' : 'Reject Claim'}</DialogTitle>
        <DialogContent>
          {actionType === 'approve' && (
            <TextField label="Settlement Amount" type="number" fullWidth margin="normal" value={settlementAmount}
              onChange={e => setSettlementAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
          )}
          <TextField label="Remarks" fullWidth multiline rows={3} margin="normal" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>Cancel</Button>
          <Button variant="contained" color={actionType === 'approve' ? 'success' : 'error'} onClick={executeAction}>
            {actionType === 'approve' ? 'Approve Payment' : 'Reject Claim'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CarrierDashboard;
