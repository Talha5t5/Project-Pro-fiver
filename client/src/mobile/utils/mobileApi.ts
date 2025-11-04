// Mobile API utility functions
// This ensures all mobile API calls use absolute URLs to connect to the backend server

// Auto-detect environment: use localhost for web browser, IP address for mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window as any).Capacitor?.isNative;
};

const MOBILE_API_BASE_URL = isMobileDevice() 
  ? 'https://artigianofast.com'  // Use localhost for development
  : 'https://artigianofast.com';        // Use localhost for development


// Global fetch interceptor to catch ALL API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args);
};

export const mobileApiCall = async (method: string, endpoint: string, data?: any) => {
  // Handle different endpoint types
  let mobileEndpoint: string;
  if (endpoint.startsWith('/api/mobile')) {
    // Already a mobile endpoint
    mobileEndpoint = endpoint;
  } else if (endpoint.startsWith('/api/reports')) {
    // Reports endpoints go directly to /api/reports
    mobileEndpoint = endpoint;
  } else {
    // Other endpoints get /api/mobile prefix
    mobileEndpoint = `/api/mobile${endpoint}`;
  }
  const fullUrl = `${MOBILE_API_BASE_URL}${mobileEndpoint}`;
  
  // Get stored mobile session ID for mobile app
  const mobileSessionId = localStorage.getItem('mobileSessionId');
  
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(mobileSessionId && { 'x-mobile-session-id': mobileSessionId })
    },
    credentials: 'include',
    cache: 'no-store',
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(fullUrl, options);
  
  // Extract and store mobile session ID from response
  if (response.ok && method === 'POST' && (endpoint === '/login' || endpoint === '/api/mobile/login' || endpoint === '/register' || endpoint === '/api/mobile/register')) {
    try {
      const responseData = await response.clone().json();
      
      if (responseData.mobileSessionId) {
        localStorage.setItem('mobileSessionId', responseData.mobileSessionId);
        console.log('✅ Mobile session ID stored from', endpoint, ':', responseData.mobileSessionId);
      }
    } catch (e) {
      console.error('Could not parse response for session ID:', e);
    }
  }
  
  return response;
};

// Convenience functions for common HTTP methods
export const mobileGet = (endpoint: string) => mobileApiCall('GET', endpoint);
export const mobilePost = (endpoint: string, data?: any) => mobileApiCall('POST', endpoint, data);
export const mobilePut = (endpoint: string, data?: any) => mobileApiCall('PUT', endpoint, data);
export const mobileDelete = (endpoint: string) => mobileApiCall('DELETE', endpoint);
export const mobilePatch = (endpoint: string, data?: any) => mobileApiCall('PATCH', endpoint, data); 