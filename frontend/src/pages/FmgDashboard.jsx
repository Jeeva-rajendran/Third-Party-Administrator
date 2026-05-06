import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid } from '@mui/material';

const API = 'http://localhost:8080/api';

function FmgDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionClaimId, setActionClaimId] = useState('');
  const [comments, setComments] = useState('');

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => { fetchClaims(); }, []);

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API}/fmg/claims`, { headers });
      setClaims(res.data);
    } catch (err) { console.error(err); }
  };

  const processClaim = async (id) => {
    try {
      await axios.post(`${API}/fmg/claims/${id}/process`, {}, { headers });
      setSuccess('Claim processed successfully (OCR, Rules, AI applied)');
      fetchClaims();
    } catch (err) { setError(err.response?.data?.error || 'Processing failed'); }
  };

  const openAction = (type, claimId) => {
    setActionType(type); setActionClaimId(claimId); setComments(''); setActionDialog(true);
  };

  const executeAction = async () => {
    try {
      const url = `${API}/fmg/claims/${actionClaimId}/${actionType}`;
      await axios.put(url, { comments }, { headers });
      setSuccess(`Claim ${actionType} action successful`);
      setActionDialog(false);
      fetchClaims();
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  };

  const statusColor = (s) => {
    if (s === 'FMG_PROCESSING' || s === 'MANUAL_REVIEW') return 'warning';
    if (s === 'SUBMITTED') return 'info';
    return 'default';
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FMG Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">TPA Automated Claim Processing Queue</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

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
              <Chip label={c.status} color={statusColor(c.status)} size="small" sx={{ fontWeight: 600 }} />
              
              {c.status === 'SUBMITTED' && (
                <Button variant="contained" size="small" onClick={() => processClaim(c.id)} sx={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)' }}>
                  Start Auto-Processing
                </Button>
              )}
              
              {(c.status === 'FMG_PROCESSING' || c.status === 'MANUAL_REVIEW') && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" color="success" size="small" onClick={() => openAction('approve', c.id)}>Approve</Button>
                  {c.status !== 'MANUAL_REVIEW' && (
                    <Button variant="outlined" color="warning" size="small" onClick={() => openAction('manual-review', c.id)}>Flag Review</Button>
                  )}
                  <Button variant="outlined" color="error" size="small" onClick={() => openAction('reject', c.id)}>Reject</Button>
                </Box>
              )}
            </Box>
          </Box>

          {/* Quick OCR & AI Preview if processed */}
          {(c.status === 'FMG_PROCESSING' || c.status === 'MANUAL_REVIEW') && c.extractedData && (
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
                  {c.aiExplanation && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      AI: {c.aiExplanation}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/claims/${c.id}`)}>View Full Details</Button>
            </Box>
          )}
        </Paper>
      ))}

      {claims.length === 0 && <Typography color="text.secondary">No claims pending FMG action.</Typography>}

      {/* Action Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>{actionType.replace('-', ' ')} Claim</DialogTitle>
        <DialogContent>
          <TextField label="Comments/Reason" fullWidth multiline rows={3} margin="normal" value={comments} onChange={e => setComments(e.target.value)} required={actionType === 'reject'} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>Cancel</Button>
          <Button variant="contained" color={actionType === 'approve' ? 'success' : actionType === 'reject' ? 'error' : 'warning'} onClick={executeAction}>
            Confirm {actionType.replace('-', ' ')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FmgDashboard;
