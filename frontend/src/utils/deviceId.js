// Generate or get saved device ID (persists across logouts)
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const getDeviceName = () => {
  return navigator.userAgent || 'Web Browser';
};