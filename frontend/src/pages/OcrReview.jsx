import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, Grid, TextField, Alert, CircularProgress,
  Stepper, Step, StepLabel, Divider, Card, CardContent, Select, MenuItem,
  FormControl, InputLabel, Chip
} from '@mui/material';
import { CloudUpload, Visibility, Edit, Send, ArrowBack, ArrowForward } from '@mui/icons-material';

const API = '/api';

function OcrReview() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${auth.token}` };

  // Step tracking
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Policy & Upload', 'Review Claim Form', 'Review Combined Document', 'Submit Claim'];

  // Files & Policy
  const [claimFormFile, setClaimFormFile] = useState(null);
  const [combinedDocFile, setCombinedDocFile] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [activePolicies, setActivePolicies] = useState([]);
  const [policiesLoaded, setPoliciesLoaded] = useState(false);

  // OCR data
  const [extracting, setExtracting] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [editedData, setEditedData] = useState({});

  // Preview URLs
  const [claimFormUrl, setClaimFormUrl] = useState(null);
  const [combinedDocUrl, setCombinedDocUrl] = useState(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load policies
  React.useEffect(() => {
    if (!policiesLoaded) {
      axios.get(`${API}/policies/my-policies`, { headers })
        .then(res => {
          setActivePolicies(res.data.filter(p => p.status === 'ACTIVE'));
          setPoliciesLoaded(true);
        })
        .catch(console.error);
    }
  }, [policiesLoaded]);

  const handleClaimFormSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setClaimFormFile(file);
      setClaimFormUrl(URL.createObjectURL(file));
    }
  };

  const handleCombinedDocSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCombinedDocFile(file);
      setCombinedDocUrl(URL.createObjectURL(file));
    }
  };

  const runOcrExtraction = async () => {
    if (!claimFormFile || !combinedDocFile) {
      setError('Please upload both documents first');
      return;
    }
    setExtracting(true); setError('');
    try {
      const formData = new FormData();
      formData.append('claimForm', claimFormFile);
      formData.append('combinedDoc', combinedDocFile);
      const res = await axios.post(`${API}/claims/ocr-extract`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setOcrData(res.data);
      setEditedData({
        policyNumber: res.data.policyNumber || '',
        customerName: res.data.customerName || '',
        carrierName: res.data.carrierName || '',
        policyName: res.data.policyName || '',
        claimFormPatientName: res.data.claimFormPatientName || '',
        claimFormHospitalName: res.data.claimFormHospitalName || '',
        claimFormAdmissionDate: res.data.claimFormAdmissionDate || '',
        claimFormDischargeDate: res.data.claimFormDischargeDate || '',
        claimedAmount: res.data.claimedAmount || '',
        claimType: res.data.claimType || '',
        dsPatientName: res.data.dsPatientName || '',
        dsHospitalName: res.data.dsHospitalName || '',
        dsAdmissionDate: res.data.dsAdmissionDate || '',
        dsDischargeDate: res.data.dsDischargeDate || '',
        diagnosis: res.data.diagnosis || '',
        billPatientName: res.data.billPatientName || '',
        billHospitalName: res.data.billHospitalName || '',
        billNumber: res.data.billNumber || '',
        billDate: res.data.billDate || '',
        totalBillAmount: res.data.totalBillAmount || '',
      });
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'OCR extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const submitClaim = async () => {
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('claimForm', claimFormFile);
      formData.append('combinedDoc', combinedDocFile);
      formData.append('customerPolicyId', selectedPolicyId);

      // Append edited OCR data
      Object.entries(editedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      const res = await axios.post(`${API}/claims`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Claim submitted successfully! Claim ID: ' + res.data.id);
      setTimeout(() => navigate(`/claims/${res.data.id}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Claim submission failed');
    } finally {
      setLoading(false);
    }
  };

  const renderDocViewer = (url, title) => (
    <Paper sx={{ height: '100%', minHeight: 500, overflow: 'hidden', border: '2px solid', borderColor: 'primary.main', borderRadius: 2 }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Visibility fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      </Box>
      {url ? (
        <iframe src={url} width="100%" height="480" style={{ border: 'none' }} title={title} />
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 480, bgcolor: 'grey.100' }}>
          <Typography color="text.secondary">No document uploaded yet</Typography>
        </Box>
      )}
    </Paper>
  );

  const renderEditableForm = (fields, sectionTitle) => (
    <Paper sx={{ p: 3, height: '100%', minHeight: 500, overflow: 'auto', border: '2px solid', borderColor: 'secondary.main', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Edit fontSize="small" color="secondary" />
        <Typography variant="subtitle1" fontWeight={700} color="secondary.main">{sectionTitle}</Typography>
        <Chip label="Editable" size="small" color="secondary" variant="outlined" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {fields.map(({ key, label, type }) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              label={label}
              type={type || 'text'}
              fullWidth
              size="small"
              value={editedData[key] || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              InputLabelProps={type === 'date' ? { shrink: true } : undefined}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  const claimFormFields = [
    { key: 'policyNumber', label: 'Policy Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'carrierName', label: 'Carrier Name' },
    { key: 'policyName', label: 'Policy Name' },
    { key: 'claimFormPatientName', label: 'Patient Name' },
    { key: 'claimFormHospitalName', label: 'Hospital Name' },
    { key: 'claimFormAdmissionDate', label: 'Admission Date', type: 'date' },
    { key: 'claimFormDischargeDate', label: 'Discharge Date', type: 'date' },
    { key: 'claimedAmount', label: 'Claimed Amount (₹)', type: 'number' },
    { key: 'claimType', label: 'Claim Type' },
  ];

  const combinedDocFields = [
    { key: 'dsPatientName', label: 'Patient Name (Discharge)' },
    { key: 'dsHospitalName', label: 'Hospital Name (Discharge)' },
    { key: 'dsAdmissionDate', label: 'Admission Date', type: 'date' },
    { key: 'dsDischargeDate', label: 'Discharge Date', type: 'date' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'billPatientName', label: 'Patient Name (Bill)' },
    { key: 'billHospitalName', label: 'Hospital Name (Bill)' },
    { key: 'billNumber', label: 'Bill Number' },
    { key: 'billDate', label: 'Bill Date', type: 'date' },
    { key: 'totalBillAmount', label: 'Total Bill Amount (₹)', type: 'number' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/')}>Back to Dashboard</Button>
        <Typography variant="h5" fontWeight={700}>Submit New Claim</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* Step 0: Select Policy & Upload Documents */}
      {activeStep === 0 && (
        <Paper sx={{ p: 4, maxWidth: 700, mx: 'auto' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Step 1: Select Policy & Upload Documents</Typography>
          <Divider sx={{ mb: 3 }} />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Active Policy</InputLabel>
            <Select value={selectedPolicyId} onChange={(e) => setSelectedPolicyId(e.target.value)} label="Select Active Policy">
              {activePolicies.map(cp => (
                <MenuItem key={cp.id} value={cp.id}>{cp.policy?.policyName} — {cp.policyNumber}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {activePolicies.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>No active policies found. Please purchase a policy first.</Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>📄 Document 1: Claim Form (PDF/Image)</Typography>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}>
              {claimFormFile ? `✅ ${claimFormFile.name}` : 'Select Claim Form'}
              <input type="file" hidden accept=".pdf,image/*" onChange={handleClaimFormSelect} />
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>📄 Document 2: Combined Document (Discharge Summary + Hospital Bill)</Typography>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}>
              {combinedDocFile ? `✅ ${combinedDocFile.name}` : 'Select Combined Document'}
              <input type="file" hidden accept=".pdf,image/*" onChange={handleCombinedDocSelect} />
            </Button>
          </Box>

          <Button
            variant="contained" fullWidth
            onClick={runOcrExtraction}
            disabled={!claimFormFile || !combinedDocFile || !selectedPolicyId || extracting}
            startIcon={extracting ? <CircularProgress size={18} color="inherit" /> : <Visibility />}
            sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg, #1565c0, #42a5f5)', boxShadow: '0 4px 14px rgba(25,118,210,0.4)' }}
          >
            {extracting ? 'Extracting Data via OCR...' : 'Extract & Review Data (OCR)'}
          </Button>
        </Paper>
      )}

      {/* Step 1: Review Claim Form — Split Screen */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Step 2: Review Claim Form Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review the OCR-extracted data on the right. Edit any incorrect fields before proceeding.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {renderDocViewer(claimFormUrl, 'Claim Form Document')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderEditableForm(claimFormFields, 'Extracted Claim Form Data')}
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setActiveStep(0)}>Back</Button>
            <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setActiveStep(2)} sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)' }}>
              Next: Review Combined Document
            </Button>
          </Box>
        </Box>
      )}

      {/* Step 2: Review Combined Document — Split Screen */}
      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Step 3: Review Combined Document Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review discharge summary and hospital bill data. Edit any incorrect fields.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {renderDocViewer(combinedDocUrl, 'Combined Document (Discharge + Bill)')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderEditableForm(combinedDocFields, 'Extracted Combined Document Data')}
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setActiveStep(1)}>Back</Button>
            <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setActiveStep(3)} sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)' }}>
              Next: Final Review & Submit
            </Button>
          </Box>
        </Box>
      )}

      {/* Step 3: Final Summary & Submit */}
      {activeStep === 3 && (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Step 4: Final Review & Submit</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>Claim Form Data</Typography>
            </Grid>
            {claimFormFields.map(f => (
              <Grid item xs={6} sm={4} key={f.key}>
                <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                <Typography variant="body2" fontWeight={500}>{editedData[f.key] || 'N/A'}</Typography>
              </Grid>
            ))}
            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} color="secondary.main" sx={{ mb: 1 }}>Combined Document Data</Typography>
            </Grid>
            {combinedDocFields.map(f => (
              <Grid item xs={6} sm={4} key={f.key}>
                <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                <Typography variant="body2" fontWeight={500}>{editedData[f.key] || 'N/A'}</Typography>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setActiveStep(2)}>Back to Edit</Button>
            <Button
              variant="contained" size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
              onClick={submitClaim}
              disabled={loading}
              sx={{
                py: 1.5, px: 4, fontWeight: 700,
                background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                boxShadow: '0 4px 14px rgba(46,125,50,0.4)',
                '&:hover': { boxShadow: '0 6px 20px rgba(46,125,50,0.6)' },
              }}
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default OcrReview;
