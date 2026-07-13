import React from 'react';
import { Box, Stepper, Step, StepLabel, StepContent, Typography, Chip } from '@mui/material';
import { CheckCircle, Pending, Error, Schedule, PlayCircleFilled } from '@mui/icons-material';

const ClaimTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return <Typography color="text.secondary">No history available for this claim.</Typography>;
  }

  const getIcon = (action) => {
    if (action.includes('SUBMITTED')) return <PlayCircleFilled color="primary" />;
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return <CheckCircle color="success" />;
    if (action.includes('REJECTED')) return <Error color="error" />;
    if (action.includes('PROCESSING')) return <Schedule color="warning" />;
    return <Pending color="action" />;
  };

  return (
    <Box sx={{ maxWidth: 600, mt: 2 }}>
      <Stepper orientation="vertical">
        {timeline.map((log, index) => (
          <Step key={index} active={true}>
            <StepLabel 
              icon={getIcon(log.action)}
              optional={
                <Typography variant="caption">
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
              }
            >
              <Typography fontWeight={700}>{log.action.replace(/_/g, ' ')}</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Performed by: <strong>{log.performedBy}</strong> ({log.role.replace('ROLE_', '')})
              </Typography>
              {log.comments && (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1, borderLeft: '3px solid #ccc' }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    "{log.comments}"
                  </Typography>
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default ClaimTimeline;
