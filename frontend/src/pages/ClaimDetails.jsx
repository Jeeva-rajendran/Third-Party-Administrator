import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Divider, Chip, Button, List, ListItem, ListItemIcon, ListItemText, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { Download, CheckCircle, Error as ErrorIcon, Warning, Timeline, Person, Business, LocalHospital, Gavel } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function ClaimDetails() {
  const { id } = useParams();
  const { auth } = useContext(AuthContext);
  const [claim, setClaim] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${auth.token}` };
    Promise.all([
      axios.get(`${API}/claims/${id}`, { headers }),
      axios.get(`${API}/claims/${id}/timeline`, { headers }),
    ]).then(([claimRes, timelineRes]) => {
      setClaim(claimRes.data);
      setTimeline(timelineRes.data);
    }).catch(console.error);
  }, [id, auth.token]);

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/claims/${id}/export`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `claim_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { console.error(err); }
  };

  if (!claim) return <Typography>Loading...</Typography>;

  const statusColor = (s) => {
    if (s?.includes('APPROVED') || s === 'COMPLETED') return 'success';
    if (s?.includes('REJECTED')) return 'error';
    if (s?.includes('REVIEW') || s?.includes('PROCESSING')) return 'warning';
    return 'info';
  };

  const roleIcon = (role) => {
    switch (role) {
      case 'CUSTOMER': return <Person color="primary" />;
      case 'CLIENT': return <Business color="secondary" />;
      case 'FMG': return <LocalHospital color="warning" />;
      case 'CARRIER': return <Gavel color="success" />;
      default: return <Timeline />;
    }
  };

  const ed = claim.extractedData || {};

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Claim Details</Typography>
          <Typography variant="body2" color="text.secondary">ID: {claim.id}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={claim.status} color={statusColor(claim.status)} sx={{ fontWeight: 600, fontSize: '0.9rem', py: 2 }} />
          <Button variant="contained" startIcon={<Download />} onClick={handleExport}>Export PDF</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Details */}
        <Grid item xs={12} md={8}>
          {/* Customer & Policy */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Customer & Policy Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="body2" color="text.secondary">Customer</Typography><Typography>{claim.customer?.name}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" color="text.secondary">Policy Number</Typography><Typography>{claim.customerPolicy?.policyNumber}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" color="text.secondary">Policy Name</Typography><Typography>{claim.customerPolicy?.policy?.policyName}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2" color="text.secondary">Coverage</Typography><Typography>₹{claim.customerPolicy?.policy?.coverageAmount?.toLocaleString()}</Typography></Grid>
            </Grid>
          </Paper>

          {/* OCR Data */}
          {ed.policyNumber && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Extracted Data (OCR)</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Policy Number</Typography><Typography>{ed.policyNumber || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Patient Name</Typography><Typography>{ed.claimFormPatientName || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Hospital</Typography><Typography>{ed.claimFormHospitalName || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Diagnosis</Typography><Typography>{ed.diagnosis || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Claimed Amount</Typography><Typography>₹{ed.claimedAmount || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Total Bill</Typography><Typography>₹{ed.totalBillAmount || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Admission</Typography><Typography>{ed.claimFormAdmissionDate || 'N/A'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Discharge</Typography><Typography>{ed.claimFormDischargeDate || 'N/A'}</Typography></Grid>
              </Grid>
            </Paper>
          )}

          {/* Rule Results */}
          {claim.ruleResults && claim.ruleResults.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Rule Engine Results</Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {claim.ruleResults.map(rule => (
                  <ListItem key={rule.id}>
                    <ListItemIcon>
                      {rule.triggered ?
                        (claim.status?.includes('REJECTED') ? <ErrorIcon color="error"/> : <Warning color="warning" />)
                        : <CheckCircle color="success" />}
                    </ListItemIcon>
                    <ListItemText primary={`[${rule.ruleId}] ${rule.description}`} secondary={rule.triggered ? 'TRIGGERED' : 'PASSED'} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* AI Analysis */}
          {claim.aiExplanation && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(25,118,210,0.03)' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>AI Validation Report</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{claim.aiExplanation}</Typography>
            </Paper>
          )}
        </Grid>

        {/* Right: Summary & Timeline */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Decision Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            {claim.decisionReason && (
              <Box sx={{ my: 1 }}><Typography variant="body2" color="text.secondary">Reason</Typography><Typography>{claim.decisionReason}</Typography></Box>
            )}
            {claim.settlementAmount && (
              <Box sx={{ my: 1 }}><Typography variant="body2" color="text.secondary">Settlement</Typography><Typography variant="h6" color="success.main">₹{claim.settlementAmount.toLocaleString()}</Typography></Box>
            )}
            {claim.carrierRemarks && (
              <Box sx={{ my: 1 }}><Typography variant="body2" color="text.secondary">Carrier Remarks</Typography><Typography>{claim.carrierRemarks}</Typography></Box>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Claim Timeline</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stepper orientation="vertical" activeStep={timeline.length - 1}>
              {timeline.map((entry, idx) => (
                <Step key={idx} completed>
                  <StepLabel icon={roleIcon(entry.role)} optional={<Typography variant="caption">{new Date(entry.timestamp).toLocaleString()}</Typography>}>
                    <Typography variant="body2" fontWeight={600}>{entry.action}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="caption" color="text.secondary">{entry.role} — {entry.performedBy}</Typography>
                    {entry.comments && <Typography variant="body2">{entry.comments}</Typography>}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {timeline.length === 0 && <Typography variant="body2" color="text.secondary">No timeline entries yet.</Typography>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ClaimDetails;
