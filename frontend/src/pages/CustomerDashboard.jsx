import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Grid, Chip, Card, CardContent, CardActions, Alert, CircularProgress, TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CloudUpload, Policy, Send } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function CustomerDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('policies');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Claim submission
  const [claimForm, setClaimForm] = useState(null);
  const [combinedDoc, setCombinedDoc] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [submitDialog, setSubmitDialog] = useState(false);

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
      setSuccess('Policy purchase request submitted! Awaiting client approval.');
      fetchAll();
    } catch (err) { setError(err.response?.data?.error || 'Purchase failed'); }
  };

  const submitClaim = async () => {
    if (!claimForm || !combinedDoc || !selectedPolicyId) {
      setError('Please select a policy and upload both documents');
      return;
    }
    setLoading(true); setError('');
    const formData = new FormData();
    formData.append('claimForm', claimForm);
    formData.append('combinedDoc', combinedDoc);
    formData.append('customerPolicyId', selectedPolicyId);
    try {
      const res = await axios.post(`${API}/claims`, formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      setSuccess('Claim submitted successfully!');
      setSubmitDialog(false);
      setClaimForm(null); setCombinedDoc(null); setSelectedPolicyId('');
      fetchAll();
      navigate(`/claims/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Claim submission failed');
    } finally { setLoading(false); }
  };

  const activePolicies = myPolicies.filter(p => p.status === 'ACTIVE');
  const statusColor = (s) => ({ SUBMITTED: 'info', CLIENT_APPROVED: 'primary', FMG_PROCESSING: 'warning', MANUAL_REVIEW: 'warning', FMG_APPROVED: 'primary', CARRIER_APPROVED: 'success', CLIENT_REJECTED: 'error', FMG_REJECTED: 'error', CARRIER_REJECTED: 'error', COMPLETED: 'success' }[s] || 'default');

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant={tab === 'policies' ? 'contained' : 'outlined'} onClick={() => setTab('policies')}>Browse Policies</Button>
        <Button variant={tab === 'myPolicies' ? 'contained' : 'outlined'} onClick={() => setTab('myPolicies')}>My Policies ({myPolicies.length})</Button>
        <Button variant={tab === 'claims' ? 'contained' : 'outlined'} onClick={() => setTab('claims')}>My Claims ({claims.length})</Button>
        <Button variant="contained" color="success" startIcon={<Send />} onClick={() => setSubmitDialog(true)} disabled={activePolicies.length === 0}>
          Submit Claim
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {tab === 'policies' && (
        <Grid container spacing={2}>
          {policies.map(p => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={3} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>{p.policyName}</Typography>
                  <Chip label={p.policyType} size="small" color="primary" sx={{ my: 1 }} />
                  <Typography variant="body2">Coverage: ₹{p.coverageAmount?.toLocaleString()}</Typography>
                  <Typography variant="body2">Premium: ₹{p.premium?.toLocaleString()}/yr</Typography>
                  <Typography variant="caption" color="text.secondary">Valid: {p.validFrom} to {p.validTo}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" variant="contained" onClick={() => purchasePolicy(p.id)}>Purchase</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {policies.length === 0 && <Typography sx={{ p: 3 }}>No policies available yet. Carrier needs to create them.</Typography>}
        </Grid>
      )}

      {tab === 'myPolicies' && (
        <Grid container spacing={2}>
          {myPolicies.map(cp => (
            <Grid item xs={12} sm={6} key={cp.id}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6">{cp.policy?.policyName}</Typography>
                  <Typography variant="body2">Policy #: {cp.policyNumber}</Typography>
                  <Chip label={cp.status} color={cp.status === 'ACTIVE' ? 'success' : cp.status === 'PENDING' ? 'warning' : 'error'} size="small" sx={{ mt: 1 }} />
                  {cp.remarks && <Typography variant="caption" display="block" sx={{ mt: 1 }}>Remarks: {cp.remarks}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'claims' && (
        <Box>
          {claims.map(c => (
            <Paper key={c.id} sx={{ p: 2, mb: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => navigate(`/claims/${c.id}`)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight={600}>Claim: {c.id.substring(0, 8)}...</Typography>
                  <Typography variant="caption" color="text.secondary">Created: {new Date(c.createdAt).toLocaleString()}</Typography>
                </Box>
                <Chip label={c.status} color={statusColor(c.status)} />
              </Box>
            </Paper>
          ))}
          {claims.length === 0 && <Typography>No claims yet. Submit your first claim!</Typography>}
        </Box>
      )}

      {/* Submit Claim Dialog */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit New Claim</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Active Policy</InputLabel>
            <Select value={selectedPolicyId} onChange={(e) => setSelectedPolicyId(e.target.value)} label="Select Active Policy">
              {activePolicies.map(cp => (
                <MenuItem key={cp.id} value={cp.id}>{cp.policy?.policyName} — {cp.policyNumber}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">1. Claim Form (PDF/Image)</Typography>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ mt: 1 }}>
              {claimForm ? claimForm.name : 'Select File'}
              <input type="file" hidden accept=".pdf,image/*" onChange={e => setClaimForm(e.target.files[0])} />
            </Button>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">2. Combined Document (Discharge + Bill PDF)</Typography>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ mt: 1 }}>
              {combinedDoc ? combinedDoc.name : 'Select File'}
              <input type="file" hidden accept=".pdf" onChange={e => setCombinedDoc(e.target.files[0])} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitClaim} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Submit Claim'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomerDashboard;
