// Mobile App Logger Utility
export const mobileLogger = {
  log: (message: string, data?: any) => {
    console.log(`[MOBILE] ${message}`, data || '');
    // Also try to show in UI if possible
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      // This will show in Android logcat
      console.log(`[MOBILE DEBUG] ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(`[MOBILE ERROR] ${message}`, error || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[MOBILE WARN] ${message}`, data || '');
  },
  
  info: (message: string, data?: any) => {
    console.info(`[MOBILE INFO] ${message}`, data || '');
  }
};

// Global debug function
export const debugLog = (component: string, action: string, data?: any) => {
  mobileLogger.log(`${component}: ${action}`, data);
}; 