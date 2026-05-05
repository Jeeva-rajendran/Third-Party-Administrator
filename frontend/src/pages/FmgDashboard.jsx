import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Chip, Alert, CircularProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ExpandMore, CheckCircle, Error as ErrorIcon, Warning, Science } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function FmgDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogType, setDialogType] = useState('');
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
    setProcessing(id); setError('');
    try {
      await axios.post(`${API}/fmg/claims/${id}/process`, {}, { headers });
      setSuccess('Claim processed: OCR + Rules + AI completed!');
      fetchClaims();
    } catch (err) {
      setError(err.response?.data?.error || 'Processing failed');
    } finally { setProcessing(null); }
  };

  const openDialog = (type, action) => {
    setDialogType(type); setDialogAction(() => action); setComments(''); setDialogOpen(true);
  };

  const executeAction = async () => {
    try {
      await dialogAction(comments);
      setSuccess('Action completed!');
      setDialogOpen(false);
      fetchClaims();
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  };

  const statusColor = (s) => ({ CLIENT_APPROVED: 'info', FMG_PROCESSING: 'warning', MANUAL_REVIEW: 'warning', FMG_APPROVED: 'success', FMG_REJECTED: 'error' }[s] || 'default');

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>FMG / TPA Processing Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {claims.map(c => (
        <Accordion key={c.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', pr: 2 }}>
              <Box>
                <Typography fontWeight={600}>Claim: {c.id.substring(0, 8)}...</Typography>
                <Typography variant="caption">Customer: {c.customer?.name} | Policy: {c.customerPolicy?.policyNumber}</Typography>
              </Box>
              <Chip label={c.status} color={statusColor(c.status)} size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {c.status === 'CLIENT_APPROVED' && (
              <Button variant="contained" startIcon={processing === c.id ? <CircularProgress size={18} /> : <Science />}
                onClick={() => processClaim(c.id)} disabled={!!processing} sx={{ mb: 2 }}>
                {processing === c.id ? 'Processing...' : 'Run OCR + Rules + AI'}
              </Button>
            )}

            {c.extractedData && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography variant="subtitle2" fontWeight={600}>Extracted Data (OCR)</Typography>
                <Typography variant="body2">Policy: {c.extractedData.policyNumber} | Patient: {c.extractedData.claimFormPatientName}</Typography>
                <Typography variant="body2">Hospital: {c.extractedData.claimFormHospitalName} | Amount: ₹{c.extractedData.claimedAmount}</Typography>
                <Typography variant="body2">Bill: ₹{c.extractedData.totalBillAmount} | Diagnosis: {c.extractedData.diagnosis}</Typography>
              </Paper>
            )}

            {c.ruleResults && c.ruleResults.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography variant="subtitle2" fontWeight={600}>Rule Engine Results</Typography>
                <List dense>
                  {c.ruleResults.map(r => (
                    <ListItem key={r.id}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {r.triggered ? <Warning color="warning" fontSize="small" /> : <CheckCircle color="success" fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText primary={`[${r.ruleId}] ${r.description}`} secondary={r.triggered ? 'Triggered' : 'Passed'} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {c.aiExplanation && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(25,118,210,0.05)' }}>
                <Typography variant="subtitle2" fontWeight={600}>AI Analysis</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{c.aiExplanation}</Typography>
              </Paper>
            )}

            {(c.status === 'FMG_PROCESSING' || c.status === 'MANUAL_REVIEW') && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="contained" color="success" onClick={() => openDialog('Approve Claim', async (cmt) => {
                  await axios.put(`${API}/fmg/claims/${c.id}/approve`, { comments: cmt }, { headers });
                })}>Approve → Carrier</Button>
                <Button variant="outlined" color="error" onClick={() => openDialog('Reject Claim', async (cmt) => {
                  await axios.put(`${API}/fmg/claims/${c.id}/reject`, { comments: cmt }, { headers });
                })}>Reject</Button>
                {c.status === 'FMG_PROCESSING' && (
                  <Button variant="outlined" color="warning" onClick={() => openDialog('Flag Manual Review', async (cmt) => {
                    await axios.put(`${API}/fmg/claims/${c.id}/manual-review`, { comments: cmt }, { headers });
                  })}>Manual Review</Button>
                )}
              </Box>
            )}

            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/claims/${c.id}`)}>View Full Details →</Button>
          </AccordionDetails>
        </Accordion>
      ))}

      {claims.length === 0 && <Typography color="text.secondary">No claims awaiting FMG processing.</Typography>}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogType}</DialogTitle>
        <DialogContent>
          <TextField label="Comments" fullWidth multiline rows={3} value={comments} onChange={(e) => setComments(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={executeAction}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FmgDashboard;
