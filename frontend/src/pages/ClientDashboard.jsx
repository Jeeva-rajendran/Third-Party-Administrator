import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, TextField, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const API = 'http://localhost:8080/api';

function ClientDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [pendingPolicies, setPendingPolicies] = useState([]);
  const [submittedClaims, setSubmittedClaims] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogTarget, setDialogTarget] = useState(null);
  const [dialogType, setDialogType] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [polRes, claimRes] = await Promise.all([
        axios.get(`${API}/policies/pending-purchases`, { headers }),
        axios.get(`${API}/client/claims`, { headers }),
      ]);
      setPendingPolicies(polRes.data);
      setSubmittedClaims(claimRes.data);
    } catch (err) { console.error(err); }
  };

  const openDialog = (type, target, action) => {
    setDialogType(type);
    setDialogTarget(target);
    setDialogAction(() => action);
    setRemarks('');
    setDialogOpen(true);
  };

  const executeAction = async () => {
    try {
      await dialogAction(remarks);
      setSuccess('Action completed successfully!');
      setDialogOpen(false);
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  };

  const approvePolicyPurchase = (id) => openDialog('Approve Policy Purchase', id, async (rmk) => {
    await axios.put(`${API}/policies/customer-policies/${id}/approve`, { remarks: rmk }, { headers });
  });

  const rejectPolicyPurchase = (id) => openDialog('Reject Policy Purchase', id, async (rmk) => {
    await axios.put(`${API}/policies/customer-policies/${id}/reject`, { remarks: rmk }, { headers });
  });

  const approveClaim = (id) => openDialog('Approve Claim', id, async (rmk) => {
    await axios.put(`${API}/client/claims/${id}/approve`, { comments: rmk }, { headers });
  });

  const rejectClaim = (id) => openDialog('Reject Claim', id, async (rmk) => {
    await axios.put(`${API}/client/claims/${id}/reject`, { comments: rmk }, { headers });
  });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Pending Policies (${pendingPolicies.length})`} />
        <Tab label={`Submitted Claims (${submittedClaims.length})`} />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {tab === 0 && (
        <Box>
          {pendingPolicies.map(cp => (
            <Paper key={cp.id} sx={{ p: 2, mb: 2, borderLeft: '4px solid #ff9800' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontWeight={600}>{cp.policy?.policyName} — {cp.policyNumber}</Typography>
                  <Typography variant="body2">Customer: {cp.customer?.name} ({cp.customer?.username})</Typography>
                  <Typography variant="caption">Requested: {new Date(cp.purchaseDate).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" color="success" size="small" onClick={() => approvePolicyPurchase(cp.id)}>Approve</Button>
                  <Button variant="outlined" color="error" size="small" onClick={() => rejectPolicyPurchase(cp.id)}>Reject</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {pendingPolicies.length === 0 && <Typography color="text.secondary">No pending policy purchases.</Typography>}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          {submittedClaims.map(c => (
            <Paper key={c.id} sx={{ p: 2, mb: 2, borderLeft: '4px solid #2196f3' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/claims/${c.id}`)}>
                    Claim: {c.id.substring(0, 8)}...
                  </Typography>
                  <Typography variant="body2">Customer: {c.customer?.name}</Typography>
                  <Typography variant="body2">Policy: {c.customerPolicy?.policyNumber}</Typography>
                  <Typography variant="caption">Submitted: {new Date(c.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={c.status} color="info" size="small" />
                  <Button variant="contained" color="success" size="small" onClick={() => approveClaim(c.id)}>Approve</Button>
                  <Button variant="outlined" color="error" size="small" onClick={() => rejectClaim(c.id)}>Reject</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {submittedClaims.length === 0 && <Typography color="text.secondary">No submitted claims awaiting verification.</Typography>}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogType}</DialogTitle>
        <DialogContent>
          <TextField label="Comments / Remarks" fullWidth multiline rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={executeAction}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ClientDashboard;
