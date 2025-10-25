import { Express } from "express";
import { storage } from "./storage";

export function registerMobileSpotEndpoints(app: Express) {
  // Endpoint dedicato per ottenere gli spot promozionali per l'app mobile
  app.get("/api/spots", async (req, res) => {
    try {
      console.log("API Spots - Richiesto endpoint /api/spots");
      
      // Usa la funzione già implementata in storage per filtrare gli spot attivi
      const activeSpots = await storage.getActivePromotionalSpots();
      console.log("API Spots - Spot promozionali attivi:", JSON.stringify(activeSpots, null, 2));

      // Se non ci sono spot attivi dal database, crea uno spot demo temporaneo per il test
      let spotsToReturn = activeSpots;
      if (!activeSpots || activeSpots.length === 0) {
        console.log("API Spots - Nessuno spot attivo trovato nel database. Creazione spot demo per test...");
        
        // Crea uno spot demo temporaneo che sarà sicuramente visibile
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        
        const demoSpot = {
          id: 999,
          title: "Spot Demo API Dedicata",
          position: "top",
          content: "Questo è uno spot promozionale creato tramite API dedicata",
          redirectUrl: "https://example.com",
          enableRedirect: true,
          status: "active",
          textAnimationType: "fixed",
          imageDisplayType: "single",
          images: ["https://via.placeholder.com/300x100?text=API+Dedicata"],
          startDate: now,
          endDate: tomorrow,
          timeRanges: [{ startTime: "00:00", endTime: "23:59" }],
          visiblePages: "all",
          height: 100,
          width: 300,
          displayDuration: 10,
          displayInterval: 30
        };
        
        console.log("API Spots - Spot demo creato:", JSON.stringify(demoSpot, null, 2));
        spotsToReturn = [demoSpot as any];
      }
      
      // Assicuriamoci che le immagini abbiano URL completi e siano un array
      const spotsWithFullImageUrls = spotsToReturn.map(spot => {
        // Garantisci che images sia sempre un array
        if (!spot.images) {
          return { ...spot, images: [] };
        }
        
        // Se è una stringa singola, convertila in array
        if (typeof spot.images === 'string') {
          const imagesArray = spot.images.split(',').map(img => img.trim());
          return { ...spot, images: imagesArray };
        }
        
        // Se è già un array, garantisci URL completi
        if (Array.isArray(spot.images)) {
          // Per ogni immagine, se non è un URL completo, aggiungi il dominio
          const fullImages = (spot.images as any).map((img: any) => {
            if (!img) return '';
            if (typeof img !== 'string') return '';
            
            if (img.startsWith('http')) {
              return img; // già un URL completo
            }
            // Altrimenti aggiungi il dominio base
            return img;
          }).filter((img: any) => img); // Rimuovi stringhe vuote
          
          return { ...spot, images: fullImages };
        }
        
        // Fallback se è di tipo sconosciuto
        return { ...spot, images: [] };
      });
      
      console.log("API Spots - Spot promozionali da restituire:", JSON.stringify(spotsWithFullImageUrls, null, 2));
      
      // Imposta esplicitamente gli header per JSON
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(spotsWithFullImageUrls));
    } catch (error) {
      console.error("API Spots - Errore nel recupero degli spot promozionali attivi:", error);
      res.status(500).json({ error: "Errore nel recupero degli spot promozionali attivi" });
    }
  });
}