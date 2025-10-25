import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

export default function AdminLogout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout API
        const response = await fetch('/api/admin/logout', {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          toast({
            title: "Logout effettuato",
            description: "Sessione terminata con successo",
          });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Always redirect to login page
        setTimeout(() => {
          setLocation('/admin/login');
        }, 1000);
      }
    };

    performLogout();
  }, [setLocation, toast]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <LogOut className="h-12 w-12 text-gray-400" />
          </div>
          <CardTitle className="text-xl">Logout in corso...</CardTitle>
          <CardDescription>
            Stiamo terminando la tua sessione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Verrai reindirizzato alla pagina di login
          </p>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/login')}
            className="w-full"
          >
            Vai al Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 