import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Check, CreditCard, Landmark, ArrowLeft, ShoppingCart, Clock, AlertCircle } from 'lucide-react';
import { SiPaypal } from 'react-icons/si';
import { DesktopNavbar } from './components/DesktopNavbar';
import { CompanyProfileForm } from './components/CompanyProfileForm';
import { apiRequest } from '../../lib/queryClient';

// Interfacce
interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string | null;
  isActive: boolean | null;
  isFree: boolean | null;
}

export default function CheckoutPage() {
  const { planId, billingType } = useParams<{planId: string, billingType: string}>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Stati del form
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'creditcard' | 'banktransfer' | 'paypal'>('creditcard');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  
  // Query per ottenere i dati del piano
  const { data: plan, isLoading, error } = useQuery<Plan>({
    queryKey: [`/api/subscription-plans/${planId}`],
    queryFn: () => 
      apiRequest('GET', `/api/subscription-plans/${planId}`)
        .then(res => {
          if (!res.ok) throw new Error(t('errors.planNotFound', 'Piano non trovato'));
          return res.json();
        }),
    enabled: !!planId
  });
  
  // Verifica se stiamo con un piano gratuito
  const isFreeSubscription = plan?.isFree;
  
  // Calcola il prezzo in base al tipo di fatturazione
  const subscriptionPrice = billingType === 'annual' ? plan?.yearlyPrice : plan?.monthlyPrice;
  const formattedPrice = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(subscriptionPrice || 0);
  
  // Gestisci il cambio di metodo di pagamento
  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value as 'creditcard' | 'banktransfer' | 'paypal');
  };
  
  // Funzione per validare i dati della carta
  const validateCardDetails = (cardNumber: string, expiryDate: string, cvc: string, nameOnCard: string) => {
    // Rimuovi spazi dal numero di carta
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    // Validazione numero di carta (almeno 13 cifre, massimo 19)
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      return { isValid: false, error: 'Numero di carta non valido' };
    }
    
    // Validazione data di scadenza (formato MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(expiryDate)) {
      return { isValid: false, error: 'Data di scadenza non valida (formato MM/YY)' };
    }
    
    // Controlla se la carta è scaduta
    const [month, year] = expiryDate.split('/');
    const expiryDateObj = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    if (expiryDateObj < now) {
      return { isValid: false, error: 'La carta è scaduta' };
    }
    
    // Validazione CVC (3-4 cifre)
    if (cvc.length < 3 || cvc.length > 4) {
      return { isValid: false, error: 'CVC non valido' };
    }
    
    // Validazione nome intestatario
    if (nameOnCard.trim().length < 2) {
      return { isValid: false, error: 'Nome intestatario non valido' };
    }
    
    return { isValid: true };
  };

  // Gestisci la sottoscrizione
  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione di base
    if (!email || !fullName || !password || !confirmPassword) {
      toast({
        title: t('errors.fillRequiredFields', 'Compila tutti i campi obbligatori'),
        description: t('errors.fillRequiredFieldsDesc', 'Assicurati di aver inserito tutti i dati richiesti'),
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: t('errors.passwordsDontMatch', 'Le password non coincidono'),
        description: t('errors.passwordsDontMatchDesc', 'Verifica che le password inserite siano identiche'),
        variant: "destructive"
      });
      return;
    }
    
    // Validazione pagamento solo per piani a pagamento
    if (!isFreeSubscription) {
      if (paymentMethod === 'creditcard') {
        if (!cardNumber || !expiryDate || !cvc || !nameOnCard) {
          toast({
            title: t('errors.incompletePaymentInfo', 'Informazioni di pagamento incomplete'),
            description: t('errors.incompletePaymentInfoDesc', 'Inserisci tutti i dati della carta di credito'),
            variant: "destructive"
          });
          return;
        }
        
        // Validazione dettagli carta
        const cardValidation = validateCardDetails(cardNumber, expiryDate, cvc, nameOnCard);
        if (!cardValidation.isValid) {
          toast({
            title: t('errors.invalidCardDetails', 'Dati carta non validi'),
            description: cardValidation.error,
            variant: "destructive"
          });
          return;
        }
      }
    }
    
    if (!acceptedTerms) {
      toast({
        title: t('errors.termsAndConditions', 'Termini e condizioni'),
        description: t('errors.termsAndConditionsDesc', 'Devi accettare i termini e le condizioni per procedere'),
        variant: "destructive"
      });
      return;
    }
    
    // Richiedi dati aziendali solo per piani a pagamento
    if (!isFreeSubscription && !companyData && !showCompanyProfile) {
      setShowCompanyProfile(true);
      toast({
        title: t('checkout.companyProfileInfoTitle', 'Informazioni aziendali'),
        description: t('checkout.companyProfileInfoDesc', 'Prima di procedere, compila le informazioni relative alla tua azienda'),
      });
      return;
    }
    
    // Esegui la sottoscrizione
    try {
      setIsProcessing(true);
      
      // Dati per la registrazione e sottoscrizione
      const subscriptionData = {
        email,
        fullName,
        password,
        planId: parseInt(planId),
        billingType,
        paymentMethod,
        company: companyData,
        // Se è un pagamento con carta, invia anche i dati della carta
        ...(paymentMethod === 'creditcard' && !isFreeSubscription ? {
          payment: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiryDate,
            cvc,
            nameOnCard
          }
        } : {})
      };
      
      // Chiamata API reale per la registrazione e sottoscrizione
      const response = await apiRequest('POST', '/api/checkout/subscribe', subscriptionData);
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: t('checkout.subscriptionSuccessTitle', 'Abbonamento completato'),
          description: t('checkout.subscriptionSuccessDesc', 'La tua sottoscrizione è stata attivata con successo!'),
        });
        
        // Redirect alla pagina di conferma
        setLocation('/desktop/payment-success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la registrazione');
      }
      
    } catch (error) {
      console.error('Errore durante la sottoscrizione:', error);
      toast({
        title: t('errors.subscriptionError', 'Errore'),
        description: t('errors.subscriptionErrorDesc', 'Si è verificato un errore durante l\'elaborazione del pagamento. Riprova più tardi.'),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Funzione per formattare automaticamente il numero di carta
  const formatCardNumber = (value: string) => {
    // Rimuovi tutti gli spazi e mantieni solo le cifre
    const v = value.replace(/\s+/g, '').replace(/\D/g, '');
    
    // Raggruppa in blocchi da 4 cifre
    const matches = v.match(/\d{1,4}/g);
    const formatted = matches ? matches.join(' ') : '';
    
    return formatted;
  };
  
  // Funzione per formattare la data di scadenza (MM/YY)
  const formatExpiryDate = (value: string) => {
    // Rimuovi tutti i caratteri non numerici
    const v = value.replace(/\D/g, '');
    
    // Formatta come MM/YY
    if (v.length <= 2) return v;
    return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
  };
  
  // Gestisci il salvataggio dei dati aziendali
  const handleCompanyProfileSubmit = (data: any) => {
    setCompanyData(data);
    setShowCompanyProfile(false);
    
    toast({
      title: t('checkout.companyProfileSavedTitle', 'Informazioni aziendali salvate'),
      description: t('checkout.companyProfileSavedDesc', 'I dati dell\'azienda sono stati salvati correttamente'),
    });
  };
  
  // Se si sta caricando o c'è un errore, mostra un messaggio
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <DesktopNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (error || !plan) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <DesktopNavbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
                          <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle size={20} />
              {t('checkout.error', 'Errore')}
            </CardTitle>
            <CardDescription>
              {t('checkout.planNotFound', 'Non è stato possibile trovare il piano selezionato. Verifica il link o torna alla pagina dei piani.')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/desktop#pricing">{t('checkout.returnToPlans', 'Torna ai Piani')}</Link>
            </Button>
          </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  // Se stiamo visualizzando il form per i dati aziendali
  if (showCompanyProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <DesktopNavbar />
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setShowCompanyProfile(false)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('checkout.backToCheckout', 'Torna al checkout')}
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('companyProfile.title', 'Dati Aziendali')}</CardTitle>
              <CardDescription>
                {t('companyProfile.description', 'Inserisci i dati della tua azienda per completare la registrazione')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyProfileForm 
                onSubmit={handleCompanyProfileSubmit} 
                defaultValues={companyData}
                onCancel={() => setShowCompanyProfile(false)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <DesktopNavbar />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" asChild className="gap-1 text-sm">
            <Link href="/desktop#pricing">
              <ArrowLeft className="h-4 w-4" />
              {t('checkout.backToPlans', 'Torna ai piani')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{t('checkout.title', 'Checkout')}</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonna sinistra: form pagamento */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('checkout.createAccount', 'Crea il tuo account')}</CardTitle>
                <CardDescription>
                  {t('checkout.createAccountDesc', 'Inserisci i tuoi dati per creare un account e completare la sottoscrizione')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitSubscription} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('checkout.personalInfo', 'Informazioni personali')}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">{t('checkout.fullName', 'Nome completo')}*</Label>
                        <Input 
                          id="fullName" 
                          placeholder={t('checkout.fullNamePlaceholder', 'Nome e cognome')} 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('checkout.email', 'Email')}*</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder={t('checkout.email', 'La tua email')} 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-500">
                          {t('checkout.emailConfirmation', 'Riceverai una email di conferma a questo indirizzo')}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">{t('checkout.password', 'Password')}*</Label>
                          <Input 
                            id="password" 
                            type="password" 
                            placeholder={t('checkout.password', 'Password')} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">{t('checkout.confirmPassword', 'Conferma Password')}*</Label>
                          <Input 
                            id="confirmPassword" 
                            type="password" 
                            placeholder={t('checkout.confirmPasswordPlaceholder', 'Conferma password')} 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    {!isFreeSubscription && (
                      <>
                        <Separator className="my-4" />
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">{t('checkout.companyInfo', 'Informazioni aziendali')}</h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowCompanyProfile(true)}
                            >
                              {companyData ? t('common.edit', 'Modifica') : t('checkout.addCompanyData', 'Aggiungi')} {t('checkout.companyInfo', 'dati aziendali')}
                            </Button>
                          </div>
                      
                      {companyData ? (
                        <div className="bg-gray-50 p-4 rounded-md">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium">Azienda</p>
                              <p className="text-sm">{companyData.name}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Partita IVA</p>
                              <p className="text-sm">{companyData.vatNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Indirizzo</p>
                              <p className="text-sm">{companyData.address}, {companyData.city}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Contatto</p>
                              <p className="text-sm">{companyData.email}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">{t('checkout.companyDataRequired', 'Informazioni aziendali richieste')}</p>
                              <p className="text-sm text-amber-700 mt-1">
                                {t('checkout.companyDataRequiredDesc', 'Prima di completare la sottoscrizione, è necessario inserire i dati della tua azienda.')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                        </div>
                      </>
                    )}
                    
                    {!isFreeSubscription ? (
                      <>
                        <Separator className="my-4" />
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Metodo di pagamento</h3>
                          
                          <RadioGroup 
                            value={paymentMethod} 
                            onValueChange={handlePaymentMethodChange}
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="creditcard" id="creditcard" className="mt-1" />
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="creditcard" className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Carta di Credito/Debito
                                </Label>
                                <p className="text-sm text-gray-500">
                                  Pagamento sicuro tramite carta di credito o debito
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="paypal" className="flex items-center gap-2">
                                  <SiPaypal className="h-4 w-4 text-[#0070ba]" />
                                  PayPal
                                </Label>
                                <p className="text-sm text-gray-500">
                                  Verrai reindirizzato su PayPal per completare il pagamento
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="banktransfer" id="banktransfer" className="mt-1" />
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="banktransfer" className="flex items-center gap-2">
                                  <Landmark className="h-4 w-4" />
                                  Bonifico Bancario
                                </Label>
                                <p className="text-sm text-gray-500">
                                  Riceverai le istruzioni per il pagamento via email
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                          
                          {paymentMethod === 'creditcard' && (
                            <div className="space-y-4 mt-4 p-4 border rounded-md">
                              <div className="space-y-2">
                                <Label htmlFor="cardNumber">Numero carta*</Label>
                                <Input 
                                  id="cardNumber" 
                                  placeholder="1234 5678 9012 3456" 
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                  maxLength={19}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="expiryDate">Scadenza (MM/YY)*</Label>
                                  <Input 
                                    id="expiryDate" 
                                    placeholder="MM/YY" 
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                                    maxLength={5}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="cvc">CVC/CVV*</Label>
                                  <Input 
                                    id="cvc" 
                                    placeholder="123" 
                                    value={cvc}
                                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="nameOnCard">Intestatario carta*</Label>
                                <Input 
                                  id="nameOnCard" 
                                  placeholder="Nome come appare sulla carta" 
                                  value={nameOnCard}
                                  onChange={(e) => setNameOnCard(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                          
                          {paymentMethod === 'banktransfer' && (
                            <div className="bg-gray-50 p-4 rounded-md space-y-2 mt-2">
                              <p className="font-medium flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Il tuo account sarà attivato dopo la ricezione del pagamento
                              </p>
                              <p className="text-sm text-gray-500">
                                Riceverai un'email con tutte le istruzioni per effettuare il bonifico.
                                Il servizio sarà attivato non appena riceveremo la conferma del pagamento.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Separator className="my-4" />
                        
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-green-800">Piano Gratuito</p>
                                <p className="text-sm text-green-700 mt-1">
                                  Questo piano è completamente gratuito. Non sono richiesti dati di pagamento.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-2">
                        <input 
                          type="checkbox" 
                          id="terms" 
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <div>
                          <label htmlFor="terms" className="font-medium text-sm">
                            {t('checkout.termsAndPrivacy', 'Accetto i Termini di Servizio e l\'Informativa sulla Privacy*')}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('checkout.termsDeclaration', 'Dichiaro di aver letto e accettato i Termini di Servizio e l\' Informativa sulla Privacy.')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            {t('common.loading', 'Elaborazione in corso...')}
                          </>
                        ) : (
                          <>
                            {isFreeSubscription ? 
                              t('checkout.continue', 'Attiva Piano Gratuito') : 
                              `${t('checkout.continue', 'Effettua il Pagamento')} (${formattedPrice})`
                            }
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        {t('checkout.paymentSecure', 'Il tuo pagamento è protetto da una connessione sicura')}
                      </p>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          
          {/* Colonna destra: riepilogo ordine */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t('checkout.orderSummary', 'Riepilogo Ordine')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{plan.name}</span>
                    <span>{formattedPrice}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {billingType === 'monthly' ? t('checkout.monthlyBilling', 'Fatturazione mensile') : t('checkout.yearlyBilling', 'Fatturazione annuale (risparmio di 2 mesi)')}
                  </div>
                  <div className="text-sm">
                    {plan.description}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{t('checkout.planIncludes', 'Il tuo piano include:')}</h4>
                  <ul className="space-y-2 mt-2">
                    {(() => {
                      let features = [];
                      try {
                        if (plan.features) {
                          const parsed = JSON.parse(plan.features);
                          // Estrai i limiti
                          const limits = parsed.limits || {};
                          if (limits.maxClients) {
                            features.push(limits.maxClients === -1 
                              ? 'Clienti illimitati' 
                              : `Fino a ${limits.maxClients} clienti`);
                          }
                          if (limits.maxJobs) {
                            features.push(limits.maxJobs === -1 
                              ? 'Lavori illimitati' 
                              : `Fino a ${limits.maxJobs} lavori`);
                          }
                          if (limits.maxCollaborators) {
                            features.push(limits.maxCollaborators === -1 
                              ? 'Collaboratori illimitati' 
                              : `Fino a ${limits.maxCollaborators} collaboratori`);
                          }
                          
                          // Estrai moduli
                          const modules = parsed.modules || {};
                          if (modules.collaborators) features.push('Gestione collaboratori');
                          if (modules.jobActivities) features.push('Gestione attività');
                          
                          // Altri features
                          if (parsed.reporting) features.push('Reportistica avanzata');
                          if (parsed.invoicing) features.push('Gestione fatturazione');
                          if (parsed.custom_branding) features.push('Personalizzazione branding');
                        }
                      } catch (e) {
                        console.error('Errore nel parsing delle caratteristiche:', e);
                      }
                      
                      // Se non ci sono feature, usa alcuni valori predefiniti
                      if (features.length === 0) {
                        if (plan.monthlyPrice === 0) {
                          features = [
                            'Gestione clienti base',
                            'Gestione lavori base',
                            'Funzionalità limitate',
                            'Supporto via email'
                          ];
                        } else if (plan.monthlyPrice < 30) {
                          features = [
                            'Gestione clienti completa',
                            'Gestione lavori avanzata',
                            'Calendario integrato',
                            'Reportistica base',
                            'Supporto via email'
                          ];
                        } else {
                          features = [
                            'Tutte le funzionalità',
                            'Utenti illimitati',
                            'Supporto prioritario',
                            'Personalizzazione avanzata',
                            'Integrazioni API'
                          ];
                        }
                      }
                      
                      return features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
                
                <Separator />
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t('checkout.subtotal', 'Subtotale')}</span>
                    <span>{formattedPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('checkout.vatIncluded', 'IVA (22%) Inclusa')}</span>
                    <span>{t('common.included', 'Inclusa')}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2">
                    <span>{t('checkout.total', 'Totale')}</span>
                    <span>{formattedPrice}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  {billingType === 'monthly' ? (
                    <p>{t('checkout.subscriptionNote', 'Il tuo abbonamento si rinnoverà automaticamente ogni mese. Puoi disdire in qualsiasi momento.')}</p>
                  ) : (
                    <p>{t('checkout.subscriptionNote', 'Il tuo abbonamento si rinnoverà automaticamente ogni anno. Puoi disdire in qualsiasi momento.')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" asChild>
                <Link href="/desktop#pricing">{t('checkout.changePlan', 'Cambia piano')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/desktop">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('checkout.backToHome', 'Torna alla home')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}