import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  
  // Redirect to desktop welcome/auth
  useEffect(() => {
    setLocation('/desktop/auth');
  }, [setLocation]);
  
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Reindirizzamento in corso...</h1>
        <p>Stai per essere reindirizzato alla versione desktop.</p>
      </div>
    </div>
  );
}