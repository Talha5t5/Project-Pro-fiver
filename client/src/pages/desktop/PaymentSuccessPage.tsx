import { Link } from 'wouter';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle, ArrowRight, FileText, Calendar, User } from 'lucide-react';
import { DesktopNavbar } from './components/DesktopNavbar';

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <DesktopNavbar />
      
      <div className="flex-1 bg-gray-50/40 py-12">
        <div className="container max-w-3xl mx-auto px-4">
          <Card className="shadow-lg border-green-200 bg-white">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-green-700">Pagamento Completato con Successo!</CardTitle>
              <CardDescription className="text-base mt-2">
                Grazie per aver scelto ProjectPro. Il tuo abbonamento è ora attivo.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-4">
              <div className="rounded-lg bg-gray-50 p-6 space-y-4">
                <h3 className="text-lg font-medium mb-4">Informazioni sull'Abbonamento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Numero Ordine</p>
                      <p className="font-medium">ORD-{Date.now().toString().slice(-6)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data Attivazione</p>
                      <p className="font-medium">{new Date().toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 mt-6">
                  <div className="mt-1 h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email di Accesso</p>
                    <p className="font-medium">admin@projectpro.it</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Abbiamo inviato i dettagli completi dell'ordine a questo indirizzo email.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-100 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-800 mb-2">Prossimi Passi</h3>
                <ul className="space-y-3 mt-4">
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                    <span>Accedi alla piattaforma con le credenziali ricevute via email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                    <span>Completa la configurazione del tuo profilo aziendale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                    <span>Inizia ad aggiungere i tuoi clienti e lavori</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                    <span>Esplora le guide e i tutorial per sfruttare al meglio la piattaforma</span>
                  </li>
                </ul>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                Per qualsiasi domanda o supporto, contatta il nostro servizio clienti all'indirizzo 
                <a href="mailto:support@projectpro.it" className="text-primary ml-1">support@projectpro.it</a>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/auth">
                  Accedi alla Piattaforma <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/desktop">
                  Torna alla Home
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}