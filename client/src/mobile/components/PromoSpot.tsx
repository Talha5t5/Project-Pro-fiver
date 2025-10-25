import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PromotionalSpot } from '@shared/schema';
import { X } from 'lucide-react';
import { useLocation } from 'wouter';

// Interfaccia per le proprietà del componente
interface PromoSpotProps {
  position: 'top' | 'bottom' | 'left' | 'popup';
}

export default function PromoSpot({ position }: PromoSpotProps) {
  // State per tenere traccia dello spot corrente e della sua visualizzazione
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSpot, setShowSpot] = useState(true);
  const [isVisible, setIsVisible] = useState(true); // Stato per l'intervallo di visualizzazione
  const [spotTimers, setSpotTimers] = useState<{ [key: number]: NodeJS.Timeout }>({});
  const [location] = useLocation();
  
  // Recupera gli spot promozionali attivi dall'API
  const { data: spots, isLoading, error } = useQuery({
    queryKey: ['/api/mobile/promotional-spots'],
    queryFn: async () => {
      console.log("Chiamata API per spot promozionali iniziata");
      const res = await fetch('/api/mobile/promotional-spots');
      if (!res.ok) {
        console.error("Errore API:", res.status, res.statusText);
        throw new Error('Errore nel caricamento degli spot promozionali');
      }
      const data = await res.json();
      console.log("Dati spot promozionali ricevuti:", JSON.stringify(data, null, 2));
      return data as PromotionalSpot[];
    }
  });
  
  console.log("Tutti gli spot disponibili:", spots);
  
  // Filtra gli spot per la posizione specificata e per le pagine visibili
  const filteredSpots = spots?.filter(spot => {
    // Prima filtra per posizione
    const positionMatch = spot.position === position;
    console.log(`Spot ${spot.id} - Posizione ${spot.position} corrisponde a ${position}? ${positionMatch}`);
    if (!positionMatch) return false;
    
    // Poi filtra per pagine visibili
    if (spot.visiblePages === 'all') {
      console.log(`Spot ${spot.id} - visiblePages = 'all', valido per tutte le pagine`);
      return true;
    }
    
    // Se visiblePages è un array, verifica se la pagina corrente è inclusa
    const pageMatch = Array.isArray(spot.visiblePages) && spot.visiblePages.some(page => location.startsWith(page));
    console.log(`Spot ${spot.id} - Verifica pagina corrente ${location} in visiblePages: ${pageMatch}`);
    return pageMatch;
  }) || [];
  
  console.log("Spot filtrati per posizione e pagina:", filteredSpots);
  
  // Se non ci sono spot per questa posizione o pagina, non mostrare nulla
  if (filteredSpots.length === 0 || !showSpot || !isVisible) {
    return null;
  }
  
  // Prendi lo spot corrente
  const currentSpot = filteredSpots[0];
  
  useEffect(() => {
    // Se è un popup, imposta un timer per chiuderlo automaticamente dopo il tempo specificato
    if (position === 'popup' && currentSpot?.displayDuration) {
      const timer = setTimeout(() => {
        setShowSpot(false);
      }, currentSpot.displayDuration * 1000);
      
      // Salva il timer
      setSpotTimers(prev => ({ ...prev, [currentSpot.id]: timer }));
      
      // Pulizia al dismount del componente
      return () => {
        clearTimeout(timer);
      };
    }
    
    // Per presentazioni, crea un intervallo per cambiare l'immagine mostrata
    if (currentSpot?.imageDisplayType === 'slideshow' && currentSpot.images && currentSpot.images.length > 1) {
      const slideInterval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % currentSpot.images!.length);
      }, 5000); // Cambia immagine ogni 5 secondi
      
      return () => {
        clearInterval(slideInterval);
      };
    }
  }, [currentSpot, position]);
  
  // Gestione dell'intermittenza dello spot basata su displayInterval
  useEffect(() => {
    if (!currentSpot || !currentSpot.displayInterval || currentSpot.displayInterval <= 0) {
      // Se non è impostato un intervallo o è 0, lo spot rimane sempre visibile
      setIsVisible(true);
      return;
    }
    
    // Mostra subito lo spot
    setIsVisible(true);
    
    // Imposta l'intervallo di visualizzazione
    const displayDuration = currentSpot.displayDuration || 10; // Durata predefinita: 10 secondi
    const intervalDuration = currentSpot.displayInterval; // Intervallo tra le visualizzazioni
    
    console.log(`Configurazione spot intermittente - ID: ${currentSpot.id}, Durata: ${displayDuration}s, Intervallo: ${intervalDuration}s`);
    
    // Timer per nascondere lo spot dopo la durata di visualizzazione
    const hideTimer = setTimeout(() => {
      console.log(`Nascondo spot ${currentSpot.id} dopo ${displayDuration} secondi`);
      setIsVisible(false);
      
      // Timer ciclico per mostrare/nascondere lo spot
      const intervalTimer = setInterval(() => {
        setIsVisible(true);
        console.log(`Mostro spot ${currentSpot.id}`);
        
        // Nascondi dopo la durata
        setTimeout(() => {
          console.log(`Nascondo spot ${currentSpot.id} dopo ${displayDuration} secondi`);
          setIsVisible(false);
        }, displayDuration * 1000);
      }, (displayDuration + intervalDuration) * 1000);
      
      // Pulizia
      return () => clearInterval(intervalTimer);
    }, displayDuration * 1000);
    
    return () => clearTimeout(hideTimer);
  }, [currentSpot]);
  
  // Gestisce la chiusura manuale dello spot
  const handleClose = () => {
    setShowSpot(false);
    
    // Se è un popup, cancella anche il timer
    if (position === 'popup' && currentSpot) {
      clearTimeout(spotTimers[currentSpot.id]);
    }
  };
  
  // Gestisce il click sullo spot (per reindirizzamenti)
  const handleSpotClick = () => {
    // Reindirizza solo se il flag enableRedirect è true e l'URL è specificato
    if (currentSpot.enableRedirect && currentSpot.redirectUrl) {
      window.location.href = currentSpot.redirectUrl;
    }
  };
  
  // Calcola le classi di stile in base alla posizione
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-0 left-0 right-0 z-50';
      case 'bottom':
        return 'fixed bottom-16 left-0 right-0 z-50'; // Lascia spazio per il menu di navigazione
      case 'left':
        return 'fixed top-1/4 left-0 z-50 h-auto';
      case 'popup':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 shadow-xl';
      default:
        return '';
    }
  };
  
  // Ottieni l'immagine corrente per lo slideshow o la singola immagine
  // Log più dettagliati per il debug delle immagini
  console.log("Spot corrente:", JSON.stringify(currentSpot, null, 2));
  
  const imagesArray = currentSpot.images && Array.isArray(currentSpot.images) 
    ? currentSpot.images 
    : (typeof currentSpot.images === 'string' 
        ? currentSpot.images.split(',').map(img => img.trim()) 
        : []);
  
  console.log("Immagini disponibili (processate):", imagesArray);
  
  // Assicuriamoci di avere sempre un array per le immagini, anche se vuoto
  const safeImagesArray = imagesArray.length > 0 ? imagesArray : [];
  
  // Selezioniamo l'immagine corrente in base al tipo di visualizzazione
  const currentImage = safeImagesArray.length > 0
    ? safeImagesArray[currentSpot.imageDisplayType === 'slideshow' 
        ? currentImageIndex % safeImagesArray.length 
        : 0]
    : null;
    
  console.log("Immagine corrente selezionata:", currentImage);
  
  if (currentImage) {
    // Verifichiamo l'URL dell'immagine
    console.log("URL completo dell'immagine:", window.location.origin + (currentImage.startsWith('/') ? '' : '/') + currentImage);
  } else {
    console.log("Nessuna immagine disponibile per questo spot");
  }
  
  // Determina le dimensioni in base alla posizione e ai valori dello spot
  const dimensionStyle = {
    width: position === 'top' || position === 'bottom' 
      ? '100%' 
      : `${currentSpot.width || 300}px`,
    height: `${currentSpot.height || (position === 'top' || position === 'bottom' ? 80 : 300)}px`,
  };
  
  // Aggiunge l'animazione per il testo se specificata
  const textAnimationClass = currentSpot.textAnimationType === 'scroll' 
    ? 'animate-marquee whitespace-nowrap' 
    : '';
  
  return (
    <div 
      className={`bg-white rounded-md overflow-hidden shadow-lg ${getPositionClasses()}`}
      style={dimensionStyle}
    >
      {/* Pulsante di chiusura */}
      <button 
        onClick={handleClose}
        className="absolute top-1 right-1 bg-white/80 rounded-full p-1 z-10"
        aria-label="Chiudi"
      >
        <X size={16} />
      </button>
      
      {/* Contenuto dello spot */}
      <div 
        className={`flex h-full w-full ${currentSpot.enableRedirect ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleSpotClick}
      >
        {/* Se c'è un'immagine, mostrala */}
        {currentImage && (
          <div className="relative h-full" style={{ 
            width: position === 'left' ? '40%' : position === 'popup' ? '100%' : '30%'
          }}>
            <img 
              src={currentImage} 
              alt={currentSpot.title} 
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error(`Errore caricamento immagine: ${currentImage}`);
                e.currentTarget.src = "https://via.placeholder.com/300x100?text=Immagine+non+disponibile";
              }}
            />
          </div>
        )}
        
        {/* Contenuto testuale */}
        <div className={`p-2 ${currentImage ? 'flex-1' : 'w-full'} flex flex-col justify-center`}>
          <h3 className="font-bold text-sm mb-1">{currentSpot.title}</h3>
          {currentSpot.content && (
            <div className={`text-xs text-gray-700 ${textAnimationClass}`}>
              {currentSpot.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}