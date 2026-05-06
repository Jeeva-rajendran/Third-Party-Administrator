import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Divider, Chip, Button, List, ListItem, ListItemIcon, ListItemText, Stepper, Step, StepLabel, StepContent, IconButton } from '@mui/material';
import { Download, CheckCircle, Error as ErrorIcon, Warning, Timeline, Person, LocalHospital, Gavel, ArrowBack, Visibility } from '@mui/icons-material';

const API = 'http://localhost:8080/api';

function ClaimDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [claim, setClaim] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [docUrls, setDocUrls] = useState({ claimForm: null, combinedDoc: null });

  useEffect(() => {
    const headers = { Authorization: `Bearer ${auth.token}` };
    Promise.all([
      axios.get(`${API}/claims/${id}`, { headers }),
      axios.get(`${API}/claims/${id}/timeline`, { headers }),
    ]).then(([claimRes, timelineRes]) => {
      setClaim(claimRes.data);
      setTimeline(timelineRes.data);
      
      // Load document URLs if available
      if (claimRes.data.documents) {
        claimRes.data.documents.forEach(doc => {
          axios.get(`${API}/claims/${id}/documents/${doc.documentType}`, { headers, responseType: 'blob' })
            .then(res => {
              const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
              if (doc.documentType === 'CLAIM_FORM') setDocUrls(prev => ({...prev, claimForm: url}));
              if (doc.documentType === 'COMBINED_DOC') setDocUrls(prev => ({...prev, combinedDoc: url}));
            }).catch(e => console.error(`Failed to load doc ${doc.documentType}`, e));
        });
      }
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

  if (!claim) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><Typography>Loading claim details...</Typography></Box>;

  const statusColor = (s) => {
    if (s === 'COMPLETED' || s === 'CARRIER_APPROVED') return 'success';
    if (s?.includes('REJECTED')) return 'error';
    if (s?.includes('REVIEW') || s?.includes('PROCESSING')) return 'warning';
    if (s === 'FMG_APPROVED') return 'primary';
    return 'info';
  };

  const roleIcon = (role) => {
    switch (role) {
      case 'CUSTOMER': return <Person color="primary" />;
      case 'FMG': return <LocalHospital color="warning" />;
      case 'CARRIER': return <Gavel color="success" />;
      default: return <Timeline />;
    }
  };

  const ed = claim.extractedData || {};

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}><ArrowBack /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={800}>Claim Details</Typography>
          <Typography variant="body2" color="text.secondary">ID: {claim.id}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={claim.status} color={statusColor(claim.status)} sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2, px: 1, borderRadius: 2 }} />
          <Button variant="contained" startIcon={<Download />} onClick={handleExport} sx={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)', fontWeight: 600 }}>
            Export PDF
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Details & Documents */}
        <Grid item xs={12} md={8}>
          
          {/* Customer & Policy */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" /> Customer & Policy Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                <Typography variant="body1" fontWeight={500}>{claim.customer?.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Policy Number</Typography>
                <Typography variant="body1" fontWeight={500}>{claim.customerPolicy?.policyNumber}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Policy Type</Typography>
                <Typography variant="body1" fontWeight={500}>{claim.customerPolicy?.policy?.policyName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Max Coverage</Typography>
                <Typography variant="body1" fontWeight={500}>₹{claim.customerPolicy?.policy?.coverageAmount?.toLocaleString()}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Uploaded Documents Preview */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Visibility color="primary" /> Uploaded Documents
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Claim Form</Typography>
                {docUrls.claimForm ? (
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', height: 400 }}>
                    <iframe src={docUrls.claimForm} width="100%" height="100%" style={{ border: 'none' }} title="Claim Form" />
                  </Box>
                ) : <Typography variant="body2" color="text.secondary">Document not available</Typography>}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Combined Document (Discharge/Bill)</Typography>
                {docUrls.combinedDoc ? (
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', height: 400 }}>
                    <iframe src={docUrls.combinedDoc} width="100%" height="100%" style={{ border: 'none' }} title="Combined Doc" />
                  </Box>
                ) : <Typography variant="body2" color="text.secondary">Document not available</Typography>}
              </Grid>
            </Grid>
          </Paper>

          {/* OCR Data */}
          {ed.policyNumber && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Extracted Data (OCR)</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Patient Name</Typography><Typography>{ed.claimFormPatientName || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Hospital</Typography><Typography>{ed.claimFormHospitalName || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Diagnosis</Typography><Typography>{ed.diagnosis || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Admission</Typography><Typography>{ed.claimFormAdmissionDate || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Discharge</Typography><Typography>{ed.claimFormDischargeDate || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Bill Date</Typography><Typography>{ed.billDate || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={6}><Typography variant="caption" color="text.secondary">Claimed Amount</Typography><Typography variant="h6" color="primary">₹{ed.claimedAmount || 'N/A'}</Typography></Grid>
                <Grid item xs={6} sm={6}><Typography variant="caption" color="text.secondary">Total Bill</Typography><Typography variant="h6">₹{ed.totalBillAmount || 'N/A'}</Typography></Grid>
              </Grid>
            </Paper>
          )}

          {/* AI Analysis - Hidden from Customer */}
          {claim.aiExplanation && auth.role !== 'ROLE_CUSTOMER' && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, rgba(124,77,255,0.05), rgba(66,165,245,0.05))', border: '1px solid rgba(124,77,255,0.2)' }}>
              <Typography variant="h6" fontWeight={700} color="secondary.main" gutterBottom>🤖 AI Validation Report</Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(124,77,255,0.2)' }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{claim.aiExplanation}</Typography>
            </Paper>
          )}

          {/* Rule Results - Hidden from Customer */}
          {claim.ruleResults && claim.ruleResults.length > 0 && auth.role !== 'ROLE_CUSTOMER' && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Rule Engine Validation Results</Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {claim.ruleResults.map(rule => (
                  <ListItem key={rule.id} sx={{ bgcolor: rule.triggered ? 'error.light' : 'success.light', borderRadius: 2, mb: 1, opacity: 0.9 }}>
                    <ListItemIcon>
                      {rule.triggered ? <ErrorIcon sx={{ color: '#d32f2f' }}/> : <CheckCircle sx={{ color: '#2e7d32' }} />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography fontWeight={600} color={rule.triggered ? '#c62828' : '#1b5e20'}>{`[${rule.ruleId}] ${rule.description}`}</Typography>} 
                      secondary={<Typography variant="caption" color={rule.triggered ? '#d32f2f' : '#2e7d32'}>{rule.triggered ? 'TRIGGERED - Review Required' : 'PASSED'}</Typography>} 
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Right: Summary & Timeline */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Final Decision Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            {claim.status === 'SUBMITTED' ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">Awaiting FMG processing...</Typography>
            ) : (
              <>
                {claim.decisions?.map((dec, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, borderLeft: `3px solid ${dec.decision === 'APPROVED' ? '#4caf50' : dec.decision === 'REJECTED' ? '#f44336' : '#ff9800'}` }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">{dec.role} Decision</Typography>
                    <Typography variant="body1" fontWeight={600} color={dec.decision === 'APPROVED' ? 'success.main' : dec.decision === 'REJECTED' ? 'error.main' : 'warning.main'}>
                      {dec.decision}
                    </Typography>
                    {dec.settlementAmount && <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>Settlement: ₹{dec.settlementAmount.toLocaleString()}</Typography>}
                    {dec.remarks && <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>"{dec.remarks}"</Typography>}
                  </Box>
                ))}
                
                {claim.status === 'COMPLETED' && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="#1b5e20" fontWeight={800}>CLAIM SETTLED</Typography>
                    <Typography variant="h5" color="#2e7d32" fontWeight={800} sx={{ my: 1 }}>₹{claim.settlementAmount?.toLocaleString()}</Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Audit Timeline</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stepper orientation="vertical" activeStep={timeline.length - 1} sx={{ '& .MuiStepConnector-line': { borderColor: 'primary.light' } }}>
              {timeline.map((entry, idx) => (
                <Step key={idx} completed>
                  <StepLabel 
                    icon={roleIcon(entry.role)} 
                    optional={<Typography variant="caption" color="text.secondary">{new Date(entry.timestamp).toLocaleString()}</Typography>}
                  >
                    <Typography variant="body2" fontWeight={700}>{entry.action.replace('_', ' ')}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="caption" sx={{ display: 'inline-block', bgcolor: 'rgba(0,0,0,0.05)', px: 1, py: 0.2, borderRadius: 1, mb: 1 }}>
                      By: {entry.role} ({entry.performedBy})
                    </Typography>
                    {entry.comments && <Typography variant="body2" color="text.secondary">{entry.comments}</Typography>}
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
