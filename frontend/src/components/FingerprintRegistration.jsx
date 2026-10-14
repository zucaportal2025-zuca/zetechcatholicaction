// components/FingerprintRegistration.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BASE_URL from '../api';
import { FaFingerprint, FaPiedPiper } from 'react-icons/fa';

const FingerprintRegistration = ({ onRegistered }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCurrentDeviceRegistered, setIsCurrentDeviceRegistered] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
          
          if (available) {
            const token = localStorage.getItem('token');
            if (token) {
              const res = await fetch(`${BASE_URL}/api/biometric/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              setIsRegistered(data.registered);
              
              if (data.credentials && data.credentials.length > 0) {
                setRegisteredDevices(data.credentials);
                
                // ✅ Check if current device is already registered
                // We'll check by looking at the device name or just count
                // Since we don't have a unique device ID, we check if there's at least one
                // For now, assume if there are devices, this might be one of them
                // User can always register again if needed
                setIsCurrentDeviceRegistered(false); // Allow registration on new device
              }
            }
          }
        }
      } catch (err) {
        console.error('Biometric support check failed:', err);
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  const registerFingerprint = async () => {
    if (!isSupported) {
      setError('Fingerprint not supported on this device');
      return;
    }

    setIsRegistering(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      const challengeRes = await fetch(`${BASE_URL}/api/biometric/register-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const challengeData = await challengeRes.json();
      
      if (!challengeData.success) {
        throw new Error(challengeData.error || 'Failed to get challenge');
      }

      const challengeBuffer = Uint8Array.from(
        atob(challengeData.challenge.replace(/-/g, '+').replace(/_/g, '/')), 
        c => c.charCodeAt(0)
      );

      let userIdBuffer;
      if (typeof challengeData.userId === 'string') {
        userIdBuffer = Uint8Array.from(challengeData.userId, c => c.charCodeAt(0));
      } else if (Array.isArray(challengeData.userId)) {
        userIdBuffer = Uint8Array.from(challengeData.userId);
      } else {
        userIdBuffer = new Uint8Array([1, 2, 3, 4, 5]);
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBuffer,
          rp: {
            name: challengeData.rpName || 'ZUCA Portal',
            id: challengeData.rpId || window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: challengeData.userName || 'user@zuca.com',
            displayName: challengeData.userDisplayName || 'ZUCA Member'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required'
          },
          timeout: 60000,
          attestation: 'none'
        }
      });

      if (!credential) {
        throw new Error('Fingerprint registration cancelled');
      }

      const credentialId = credential.id;
      
      let publicKey = '';
      try {
        const pubKeyBuffer = credential.response.getPublicKey();
        publicKey = btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)));
      } catch (err) {
        console.warn('Could not extract public key:', err);
        publicKey = '';
      }
      
      const attestationObject = btoa(
        String.fromCharCode(...new Uint8Array(credential.response.attestationObject))
      );
      
      const clientDataJSON = btoa(
        String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))
      );

      const registerRes = await fetch(`${BASE_URL}/api/biometric/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credentialId,
          publicKey,
          attestationObject,
          clientDataJSON,
          transports: JSON.stringify(['internal', 'hybrid'])
        })
      });

      const registerData = await registerRes.json();

      if (registerRes.ok) {
        setIsRegistered(true);
        setSuccess(`✅ Fingerprint registered on this device!`);
        
        if (registerData.credentials) {
          setRegisteredDevices(registerData.credentials);
        }
        
        if (onRegistered) onRegistered();
      } else {
        throw new Error(registerData.error || 'Registration failed');
      }

    } catch (err) {
      console.error('Registration error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled. Please try again.');
      } else if (err.name === 'NotSupportedError') {
        setError('Fingerprint not supported on this device.');
      } else if (err.name === 'ConstraintError') {
        setError('Fingerprint already registered or device issue.');
      } else {
        setError(err.message || 'Failed to register fingerprint');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const removeFingerprint = async (credentialId = null) => {
    const message = credentialId 
      ? 'Remove fingerprint from this device?'
      : 'Remove ALL fingerprints?';
      
    if (!window.confirm(message)) return;

    setIsRemoving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/biometric/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credentialId })
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.remaining === 0) {
          setIsRegistered(false);
          setRegisteredDevices([]);
          setSuccess('🗑️ All fingerprints removed!');
        } else {
          // Refetch updated list
          const statusRes = await fetch(`${BASE_URL}/api/biometric/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const statusData = await statusRes.json();
          if (statusData.credentials) {
            setRegisteredDevices(statusData.credentials);
          }
          setIsRegistered(data.remaining > 0);
          setSuccess('🗑️ Fingerprint removed from this device!');
        }
        
        if (onRegistered) onRegistered();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove fingerprint');
      }
    } catch (err) {
      setError(err.message || 'Failed to remove fingerprint');
    } finally {
      setIsRemoving(false);
    }
  };

  if (!isSupported) {
    return (
      <div style={styles.container}>
        <div style={styles.icon}>🔒</div>
        <p style={styles.message}>Fingerprint not supported on this device</p>
        <p style={styles.subMessage}>Your device does not have a fingerprint sensor</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}><FaFingerprint color="white" /></span>
        <h3 style={styles.title}>Fingerprint Login</h3>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.errorBox}
          >
            ❌ {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.successBox}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.statusContainer}>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Status:</span>
          <span style={{
            ...styles.statusValue,
            color: isRegistered ? '#10b981' : '#f53a0b'
          }}>
            {isRegistered ? ' Registered' : ' Not Registered'}
          </span>
        </div>
        
        {registeredDevices.length > 0 && (
          <div style={styles.devicesContainer}>
            <div style={styles.devicesTitle}><FaPiedPiper></FaPiedPiper> Registered Devices ({registeredDevices.length}):</div>
            {registeredDevices.map((device, index) => (
              <div key={index} style={styles.deviceItem}>
                <span style={styles.deviceName}>
                  {device.deviceName || 'Unknown Device'}
                </span>
                <span style={styles.deviceDate}>
                  {device.registeredAt ? new Date(device.registeredAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
            <div style={styles.deviceNote}>
               Register separately on each device you use
            </div>
          </div>
        )}
      </div>

      <div style={styles.buttonContainer}>
        {/* ✅ ALWAYS show Register button when supported */}
        <motion.button
          onClick={registerFingerprint}
          disabled={isRegistering}
          style={{
            ...styles.registerButton,
            opacity: isRegistering ? 0.7 : 1,
            marginBottom: '10px'
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isRegistering ? (
            <span style={styles.loadingText}>
              <span style={styles.spinner}>⟳</span> Registering...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FaFingerprint size={16} /> 
              {isRegistered ? 'Add This Device' : 'Register Fingerprint'}
            </span>
          )}
        </motion.button>

        {/* ✅ Show Remove button only if registered */}
        {isRegistered && (
          <motion.button
            onClick={() => removeFingerprint(null)}
            disabled={isRemoving}
            style={{
              ...styles.removeButton,
              opacity: isRemoving ? 0.7 : 1
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isRemoving ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner}>⟳</span> Removing...
              </span>
            ) : (
              `🗑️ Remove All Fingerprints`
            )}
          </motion.button>
        )}
      </div>

      <p style={styles.helpText}>
        {isRegistered && registeredDevices.length > 0 
          ? ` Registered on ${registeredDevices.length} device(s). Click "Add This Device" to register another device.`
          : '💡 Register your fingerprint for faster login next time.'
        }
      </p>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  icon: {
    fontSize: '28px'
  },
  title: {
    color: '#f1f5f9',
    fontSize: '18px',
    margin: 0,
    fontWeight: 600
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '16px'
  },
  successBox: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#10b981',
    fontSize: '13px',
    marginBottom: '16px'
  },
  statusContainer: {
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusLabel: {
    color: '#94a3b8',
    fontSize: '14px'
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  devicesContainer: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  devicesTitle: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '8px'
  },
  deviceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  deviceName: {
    color: '#e2e8f0',
    fontSize: '13px'
  },
  deviceDate: {
    color: '#64748b',
    fontSize: '11px'
  },
  deviceNote: {
    color: '#64748b',
    fontSize: '11px',
    marginTop: '8px',
    fontStyle: 'italic'
  },
  buttonContainer: {
    marginBottom: '16px'
  },
  registerButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '40px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffffff, #fcfdff)',
    color: 'black',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  removeButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '40px',
    border: '1px solid rgba(239,68,68,0.5)',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  },
  helpText: {
    color: '#94a3b8',
    fontSize: '12px',
    textAlign: 'center',
    margin: 0
  },
  message: {
    color: '#f1f5f9',
    fontSize: '16px',
    textAlign: 'center',
    margin: '8px 0'
  },
  subMessage: {
    color: '#64748b',
    fontSize: '13px',
    textAlign: 'center',
    margin: 0
  }
};

// Add spin animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default FingerprintRegistration;