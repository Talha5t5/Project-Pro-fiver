import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

// Questa è una pagina semplificata di benvenuto che reindirizza a /mobile/welcome
export default function WelcomeRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Reindirizza a /mobile/welcome
    setLocation("/mobile/welcome");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Reindirizzamento...</span>
    </div>
  );
}