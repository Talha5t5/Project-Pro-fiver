import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function StatsPage() {
  const [, setLocation] = useLocation();
  
  // Reindirizza automaticamente alla versione mobile
  useEffect(() => {
    setLocation('/mobile/stats');
  }, [setLocation]);
  
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Reindirizzamento in corso...</h1>
        <p>Stai per essere reindirizzato alla versione mobile delle Statistiche.</p>
      </div>
    </div>
  );
}