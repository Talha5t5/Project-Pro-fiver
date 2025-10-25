import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const TestCapacitor: React.FC = () => {
  const [platform, setPlatform] = useState<string>('');
  const [isNative, setIsNative] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    // Test Capacitor integration
    setPlatform(Capacitor.getPlatform());
    setIsNative(Capacitor.isNativePlatform());
    
    // Get device info
    if (Capacitor.isNativePlatform()) {
      // This will work on mobile devices
      setDeviceInfo({
        platform: Capacitor.getPlatform(),
        isNative: true,
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      });
    } else {
      setDeviceInfo({
        platform: 'web',
        isNative: false,
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  const testCapacitorFeatures = () => {
    alert(`Capacitor Test Results:
Platform: ${platform}
Is Native: ${isNative}
User Agent: ${navigator.userAgent}
Screen: ${window.screen.width}x${window.screen.height}
Viewport: ${window.innerWidth}x${window.innerHeight}
    `);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">
          🚀 Capacitor.js Test
        </h1>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-800">Platform Info</h2>
            <p className="text-sm text-blue-700">
              <strong>Platform:</strong> {platform}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Is Native:</strong> {isNative ? '✅ Yes' : '❌ No'}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-semibold text-green-800">Device Info</h2>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Screen Size:</strong> {deviceInfo.screenSize}</p>
              <p><strong>Viewport:</strong> {deviceInfo.viewport}</p>
              <p><strong>User Agent:</strong> {deviceInfo.userAgent?.substring(0, 50)}...</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h2 className="font-semibold text-yellow-800">Capacitor Status</h2>
            <p className="text-sm text-yellow-700">
              {isNative 
                ? '🎉 Capacitor.js is working perfectly! This app can be installed on mobile devices.'
                : '🌐 Running in web browser. Install on mobile to test native features.'
              }
            </p>
          </div>

          <button
            onClick={testCapacitorFeatures}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Test Capacitor Features
          </button>

          <div className="text-center">
            <a 
              href="/mobile/dashboard"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCapacitor; 