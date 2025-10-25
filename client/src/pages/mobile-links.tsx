import { Link } from "wouter";
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Phone } from "lucide-react";

export default function MobileLinks() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-blue-600/5">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">App Mobile - Accesso Diretto</CardTitle>
          </div>
          <CardDescription>
            Utilizza questi link per accedere direttamente alle pagine dell'app mobile senza passare dal flusso di autenticazione
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Pagine di Autenticazione</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/welcome">
                  Benvenuto / Piani di Abbonamento
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/login">
                  Login
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/activate/TESTCODE">
                  Attivazione Account
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Pagine Principali</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/dashboard">
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/calendar">
                  Calendario
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/jobs">
                  Lavori
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/activities">
                  Attività
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/stats">
                  Statistiche
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/report">
                  Report
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/profile">
                  Profilo
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/notifications">
                  Notifiche
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link href="/mobile/settings">
                  Impostazioni
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild>
          <Link href="/">Torna alla Home</Link>
        </Button>
      </div>
    </div>
  );
}