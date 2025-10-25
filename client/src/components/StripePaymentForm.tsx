import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { CreditCard, Loader2 } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe('pk_test_51SLOsz0tBEbSl2OOitSdeD3U8EP4DVNpaH4pMni7SwgsOrBji4KmUpxn7URadVr26Y86JjH1PEIeytDNC0AYb5M500X0lliBsR');

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

function PaymentForm({ amount, currency = 'eur', onSuccess, onError, disabled }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    console.log('🚀 StripePaymentForm: handleSubmit called');
    console.log('Stripe available:', !!stripe);
    console.log('Elements available:', !!elements);
    console.log('Amount:', amount);
    console.log('Currency:', currency);
    
    // Show alert for debugging
    alert('Payment form submitted! Check console for details.');

    if (!stripe || !elements) {
      console.log('❌ Stripe or Elements not available');
      return;
    }

    setIsProcessing(true);
    console.log('✅ Starting payment process...');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Elemento carta non trovato');
      setIsProcessing(false);
      return;
    }

    try {
      // Create payment method
      console.log('Creating payment method...');
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      console.log('Payment method result:', { pmError, paymentMethod });

      if (pmError) {
        console.error('Payment method error:', pmError);
        onError(pmError.message || 'Errore nella creazione del metodo di pagamento');
        setIsProcessing(false);
        return;
      }

      // Create payment intent on server
      console.log('Creating payment intent on server...');
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          paymentMethodId: paymentMethod.id,
        }),
      });

      console.log('Payment intent response status:', response.status);
      const { clientSecret, error: serverError } = await response.json();
      console.log('Payment intent response:', { clientSecret, serverError });

      if (serverError) {
        console.error('Server error:', serverError);
        onError(serverError);
        setIsProcessing(false);
        return;
      }

      // Confirm payment intent
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        onError(confirmError.message || 'Errore nella conferma del pagamento');
        setIsProcessing(false);
        return;
      }

      console.log('Payment Intent result:', paymentIntent);
      
      if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded, calling onSuccess');
        onSuccess(paymentIntent);
      } else if (paymentIntent.status === 'requires_action') {
        console.log('Payment requires action, status:', paymentIntent.status);
        onError('Pagamento richiede autenticazione aggiuntiva');
      } else {
        console.log('Payment not succeeded, status:', paymentIntent.status);
        onError('Pagamento non completato');
      }
    } catch (error) {
      onError('Errore durante il pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement options={cardElementOptions} />
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing || disabled}
        className="w-full"
        onClick={(e) => {
          console.log('🔴 Button clicked!');
          e.preventDefault();
          handleSubmit(e);
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Elaborazione pagamento...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Paga €{amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function StripePaymentForm({ amount, currency, onSuccess, onError, disabled }: StripePaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        amount={amount} 
        currency={currency} 
        onSuccess={onSuccess} 
        onError={onError} 
        disabled={disabled} 
      />
    </Elements>
  );
}
