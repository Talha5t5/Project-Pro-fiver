import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';

/**
 * Componente wrapper che gestisce tutti gli spot promozionali per l'app mobile.
 * Include header, footer, sidebar e popup.
 */
export default function PromoSpotWrapper() {
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();

  // Stato per tracciare gli spot intermittenti
  const [hiddenSpots, setHiddenSpots] = useState<Record<number, boolean>>({});

  // Carica gli spot promozionali all'avvio
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        console.log("Recupero spot promozionali...");
        
        // Prima prova il nuovo endpoint API dedicato
        let response;
        try {
          console.log("Tentativo endpoint dedicato /api/spots...");
          response = await fetch('/api/spots');
          if (!response.ok) {
            throw new Error(`Errore API spots: ${response.status}`);
          }
        } catch (apiError) {
          console.log("Fallback all'endpoint originale:", apiError);
          response = await fetch('/api/mobile/promotional-spots');
          if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
          }
        }
        
        // Creiamo uno spot di test forzato sul lato client
        const demoSpot = {
          id: 888,
          title: "Spot Demo Client-Side",
          position: "top",
          content: "Questo è uno spot di test creato sul client",
          status: "active",
          images: ["https://via.placeholder.com/300x100?text=Test+Client"],
          visiblePages: "all",
          height: 100,
          width: 300,
          displayDuration: 10,
          displayInterval: 20 // Intervallo tra ogni visualizzazione in secondi
        };
        
        // Tenta di analizzare la risposta come JSON
        let data;
        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error("Errore nell'analisi JSON:", jsonError);
          console.log("Risposta non JSON:", responseText.substring(0, 100) + "...");
          data = [];
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log("Nessuno spot ricevuto dall'API, aggiungo spot demo client-side");
          data = [demoSpot];
        } else {
          console.log("Spot ricevuti dall'API:", data.length);
        }
        
        console.log("Spot promozionali da mostrare:", data);
        setSpots(data);
      } catch (err) {
        console.error("Errore nel caricamento degli spot:", err);
        
        // In caso di errore, utilizziamo comunque lo spot demo con intervallo
        const demoSpot = {
          id: 999,
          title: "Spot Demo (Fallback)",
          position: "top",
          content: "Questo è uno spot di test usato come fallback",
          status: "active",
          images: ["https://via.placeholder.com/300x100?text=Fallback+Spot"],
          visiblePages: "all",
          height: 100,
          width: 300,
          displayDuration: 8,
          displayInterval: 15 // Intervallo tra le visualizzazioni in secondi
        };
        
        console.log("Utilizzo spot demo fallback");
        setSpots([demoSpot]);
        setError(null); // Evitiamo di mostrare errori all'utente
      } finally {
        setLoading(false);
      }
    };

    fetchSpots();
  }, []);
  
  // Gestisce l'intermittenza degli spot
  useEffect(() => {
    if (!spots || spots.length === 0) return;
    
    // Crea un timer per ogni spot con proprietà di intermittenza
    const timers: NodeJS.Timeout[] = [];
    
    spots.forEach(spot => {
      // Se lo spot ha proprietà di visualizzazione intermittente
      if (spot.displayDuration && spot.displayInterval) {
        console.log(`Configuro intermittenza per spot ${spot.id}: ${spot.displayDuration}s ogni ${spot.displayInterval}s`);
        
        // Funzione per alternare visualizzazione e nascondimento
        const toggleVisibility = () => {
          setHiddenSpots(prev => {
            const isCurrentlyHidden = prev[spot.id];
            
            // Se lo spot è attualmente nascosto, lo rendiamo visibile per displayDuration secondi
            if (isCurrentlyHidden) {
              const hideTimer = setTimeout(() => {
                setHiddenSpots(prev => ({ ...prev, [spot.id]: true }));
              }, spot.displayDuration * 1000);
              
              timers.push(hideTimer);
              return { ...prev, [spot.id]: false };
            } 
            // Se lo spot è attualmente visibile, lo manteniamo tale
            else {
              return prev;
            }
          });
        };
        
        // Inizializza lo stato iniziale (visibile)
        setHiddenSpots(prev => ({ ...prev, [spot.id]: false }));
        
        // Dopo displayDuration, nascondi lo spot
        const initialHideTimer = setTimeout(() => {
          setHiddenSpots(prev => ({ ...prev, [spot.id]: true }));
          
          // Imposta un intervallo per alternare la visibilità
          const intervalTimer = setInterval(toggleVisibility, spot.displayInterval * 1000);
          timers.push(intervalTimer);
        }, spot.displayDuration * 1000);
        
        timers.push(initialHideTimer);
      }
    });
    
    // Pulizia dei timer al dismount
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [spots]);

  // Stato per tracciare quali spot sono stati chiusi
  const [closedSpots, setClosedSpots] = useState<Record<number, boolean>>({});

  // Filtra gli spot per posizione e controlla se sono visibili nella pagina corrente
  const filterSpotsByPosition = (position: string) => {
    // Debug - stampa posizione e tutti gli spot disponibili
    console.log(`Filtraggio spot per posizione "${position}". Spot disponibili:`, spots);
    
    if (!spots || spots.length === 0) {
      console.log(`Nessuno spot disponibile per posizione "${position}"`);
      return null;
    }
    
    const filtered = spots.filter(spot => {
      // Controlla se lo spot è stato chiuso o nascosto (per intermittenza)
      if (closedSpots[spot.id]) {
        console.log(`Spot ${spot.id} chiuso dall'utente`);
        return false;
      }
      
      if (hiddenSpots[spot.id]) {
        console.log(`Spot ${spot.id} temporaneamente nascosto (intermittenza)`);
        return false;
      }
      
      // Controlla la posizione
      const positionMatch = spot.position === position;
      console.log(`Spot ${spot.id} - posizione ${spot.position} corrisponde a "${position}"? ${positionMatch}`);
      if (!positionMatch) return false;
      
      // Controlla status (attivo/inattivo)
      const isActive = spot.status === 'active';
      console.log(`Spot ${spot.id} - status: ${spot.status}, attivo? ${isActive}`);
      if (!isActive) return false;
      
      // Controlla le date di inizio e fine
      const now = new Date();
      const startDate = spot.startDate ? new Date(spot.startDate) : null;
      const endDate = spot.endDate ? new Date(spot.endDate) : null;
      
      const isInDateRange = 
        (!startDate || now >= startDate) && 
        (!endDate || now <= endDate);
        
      console.log(`Spot ${spot.id} - date: ora=${now}, inizio=${startDate}, fine=${endDate}, in range? ${isInDateRange}`);
      if (!isInDateRange) return false;
      
      // Controlla orari
      let isInTimeRange = true;
      if (spot.timeRanges && spot.timeRanges.length > 0) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        isInTimeRange = spot.timeRanges.some((range: { startTime?: string, endTime?: string }) => {
          if (!range || !range.startTime || !range.endTime) return false;
          
          const [startHour, startMinute] = range.startTime.split(':').map(Number);
          const [endHour, endMinute] = range.endTime.split(':').map(Number);
          
          const startTimeMinutes = startHour * 60 + startMinute;
          const endTimeMinutes = endHour * 60 + endMinute;
          
          return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
        });
        
        console.log(`Spot ${spot.id} - ora corrente: ${now.getHours()}:${now.getMinutes()}, in range orario? ${isInTimeRange}`);
        if (!isInTimeRange) return false;
      }
      
      // Controlla le pagine visibili
      let isOnVisiblePage = true;
      if (spot.visiblePages) {
        // Considera 'all' come valore predefinito
        if (spot.visiblePages === 'all' || spot.visiblePages === '' || !spot.visiblePages) {
          console.log(`Spot ${spot.id} - visibile su tutte le pagine`);
          isOnVisiblePage = true;
        } 
        // Se è una stringa che contiene una virgola, potrebbe essere un elenco separato da virgole
        else if (typeof spot.visiblePages === 'string' && spot.visiblePages.includes(',')) {
          const pages = spot.visiblePages.split(',').map(p => p.trim());
          isOnVisiblePage = pages.some(page => location.startsWith(page));
          console.log(`Spot ${spot.id} - pagina corrente: ${location}, pagine visibili: ${pages}, visibile? ${isOnVisiblePage}`);
        }
        // Se è un array
        else if (Array.isArray(spot.visiblePages)) {
          // Gestisci l'array vuoto come "tutte le pagine"
          if (spot.visiblePages.length === 0) {
            isOnVisiblePage = true;
            console.log(`Spot ${spot.id} - array vuoto, visibile su tutte le pagine`);
          } else {
            isOnVisiblePage = spot.visiblePages.some((page: string) => {
              if (!page) return false;
              return location.startsWith(page);
            });
            console.log(`Spot ${spot.id} - pagina corrente: ${location}, pagine visibili: ${spot.visiblePages}, visibile? ${isOnVisiblePage}`);
          }
        }
        // Singola stringa
        else if (typeof spot.visiblePages === 'string') {
          isOnVisiblePage = location.startsWith(spot.visiblePages);
          console.log(`Spot ${spot.id} - pagina corrente: ${location}, pagina visibile: ${spot.visiblePages}, visibile? ${isOnVisiblePage}`);
        }
        // Se non è nessuno dei formati sopra, considera visibile ovunque (per sicurezza)
        else {
          isOnVisiblePage = true;
          console.log(`Spot ${spot.id} - formato visiblePages non riconosciuto, mostrato per sicurezza:`, spot.visiblePages);
        }
        
        if (!isOnVisiblePage) return false;
      }
      
      // Se tutte le condizioni sono soddisfatte, questo spot dovrebbe essere mostrato
      console.log(`Spot ${spot.id} - TUTTE LE CONDIZIONI SODDISFATTE, mostro lo spot`);
      return true;
    });
    
    console.log(`Spot filtrati per posizione ${position}:`, filtered);
    // Prendi solo il primo spot per ogni posizione
    return filtered.length > 0 ? filtered[0] : null;
  };

  // Handler per chiudere uno spot
  const handleClose = (spotId: number) => {
    setClosedSpots(prev => ({ ...prev, [spotId]: true }));
  };

  // Componenti per le posizioni degli spot
  const headerSpot = filterSpotsByPosition('top');
  const footerSpot = filterSpotsByPosition('bottom');
  const sidebarSpot = filterSpotsByPosition('left');
  const popupSpot = filterSpotsByPosition('popup');

  // Funzione per creare un spot
  const createSpot = (spot: any, styleClass: string) => {
    if (!spot) return null;
    
    return (
      <div className={`bg-white rounded-md overflow-hidden shadow-lg ${styleClass}`}>
        <button 
          onClick={() => handleClose(spot.id)}
          className="absolute top-1 right-1 bg-white/80 rounded-full p-1 z-10"
          aria-label="Chiudi"
        >
          <X size={16} />
        </button>
        
        <div 
          className="flex h-full w-full" 
          onClick={() => {
            if (spot.enableRedirect && spot.redirectUrl) {
              console.log(`Reindirizzamento a ${spot.redirectUrl}`);
              window.location.href = spot.redirectUrl;
            }
          }}
          style={{ cursor: spot.enableRedirect && spot.redirectUrl ? 'pointer' : 'default' }}
        >
          {spot.images && spot.images.length > 0 ? (
            <div className="relative w-full h-full">
              <img 
                src={spot.images[0]} 
                alt={spot.title} 
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.error(`Errore caricamento immagine: ${spot.images[0]}`);
                  e.currentTarget.src = "https://via.placeholder.com/300x100?text=Errore+Immagine";
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                <h3 className="font-bold text-sm text-white">{spot.title}</h3>
                {spot.content && (
                  <div className="text-xs text-white/80">
                    {spot.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 flex-1 flex flex-col justify-center">
              <h3 className="font-bold text-sm mb-1">{spot.title}</h3>
              {spot.content && (
                <div className="text-xs text-gray-700">
                  {spot.content}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Se ci sono errori o sta caricando, non mostrare nulla
  if (loading || error) {
    return null;
  }

  // Helper per creare lo stile in base alle dimensioni dello spot
  const getSpotStyle = (spot: any, baseClass: string) => {
    const position = spot.position;
    let dynamicStyle = "";

    // Dimensioni specifiche per pixel
    const width = spot.width ? `w-[${spot.width}px]` : 
      (position === 'top' || position === 'bottom' ? 'w-full' : 'w-[300px]');
    
    const height = spot.height ? `h-[${spot.height}px]` : 
      (position === 'top' || position === 'bottom' ? 'h-[100px]' : 'h-[300px]');

    return `${baseClass} ${width} ${height}`;
  };

  return (
    <>
      {/* Header spot (top) */}
      {headerSpot && createSpot(headerSpot, getSpotStyle(headerSpot, 'fixed top-0 left-0 right-0 z-50'))}
      
      {/* Footer spot (bottom) */}
      {footerSpot && createSpot(footerSpot, getSpotStyle(footerSpot, 'fixed bottom-16 left-0 right-0 z-50'))}
      
      {/* Sidebar spot (left) */}
      {sidebarSpot && createSpot(sidebarSpot, getSpotStyle(sidebarSpot, 'fixed top-1/4 left-0 z-50'))}
      
      {/* Popup spot */}
      {popupSpot && createSpot(popupSpot, getSpotStyle(popupSpot, 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 shadow-xl'))}
    </>
  );
}