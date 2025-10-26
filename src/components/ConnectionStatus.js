import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Chip, 
  IconButton, 
  Tooltip, 
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { 
  Wifi, 
  WifiOff, 
  Refresh, 
  ErrorOutline,
  CheckCircle
} from '@mui/icons-material';
import { addConnectionListener, getConnectionStatus, forceReconnect } from '../utils/connectionMonitor';

const ConnectionStatus = ({ showDetails = false }) => {
  const [status, setStatus] = useState(getConnectionStatus());
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const removeListener = addConnectionListener((newStatus) => {
      setStatus(getConnectionStatus());
    });

    return removeListener;
  }, []);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await forceReconnect();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'online':
        return <CheckCircle color="success" />;
      case 'offline':
        return <WifiOff color="error" />;
      case 'checking':
      case 'retrying':
      case 'reconnecting':
        return <CircularProgress size={16} />;
      case 'failed':
        return <ErrorOutline color="error" />;
      default:
        return <Wifi color="action" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'online':
        return 'Connected';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking connection...';
      case 'retrying':
        return `Retrying... (${status.retryCount}/3)`;
      case 'reconnecting':
        return 'Reconnecting...';
      case 'failed':
        return 'Connection failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'online':
        return 'success';
      case 'offline':
      case 'failed':
        return 'error';
      case 'checking':
      case 'retrying':
      case 'reconnecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (showDetails) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity={status.status === 'online' ? 'success' : 'warning'}
          action={
            status.status !== 'online' && (
              <Button
                size="small"
                onClick={handleReconnect}
                disabled={isReconnecting}
                startIcon={isReconnecting ? <CircularProgress size={16} /> : <Refresh />}
              >
                {isReconnecting ? 'Reconnecting...' : 'Retry'}
              </Button>
            )
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon()}
            <Box>
              <strong>Connection Status:</strong> {getStatusText()}
              {status.retryCount > 0 && (
                <div>Retry attempts: {status.retryCount}/3</div>
              )}
            </Box>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Tooltip title={getStatusText()}>
      <Chip
        icon={getStatusIcon()}
        label={getStatusText()}
        color={getStatusColor()}
        size="small"
        variant="outlined"
        onClick={status.status !== 'online' ? handleReconnect : undefined}
        disabled={isReconnecting}
        sx={{
          cursor: status.status !== 'online' ? 'pointer' : 'default',
          '&:hover': status.status !== 'online' ? {
            backgroundColor: 'action.hover'
          } : {}
        }}
      />
    </Tooltip>
  );
};

export default ConnectionStatus;
