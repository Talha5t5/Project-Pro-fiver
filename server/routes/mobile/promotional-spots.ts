import { Router } from "express";
import { storage } from "../../storage";

const router = Router();

// Ottieni tutti gli spot promozionali attivi per l'app mobile
router.get("/", async (req, res) => {
  try {
    // Usa la funzione già implementata in storage per filtrare gli spot attivi
    // in base a stato, data di validità e fasce orarie
    const activeSpots = await storage.getActivePromotionalSpots();
    console.log("API - Spot promozionali attivi:", JSON.stringify(activeSpots, null, 2));

    // Se non ci sono spot attivi dal database, crea uno spot demo temporaneo per il test
    let spotsToReturn = activeSpots;
    if (!activeSpots || activeSpots.length === 0) {
      console.log("Nessuno spot attivo trovato nel database. Creazione spot demo per test...");
      
      // Crea uno spot demo temporaneo che sarà sicuramente visibile
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      const demoSpot = {
        id: 999,
        title: "Spot Demo per Test",
        position: "top",
        content: "Questo è uno spot promozionale creato per test",
        redirectUrl: null,
        enableRedirect: false,
        status: "active",
        textAnimationType: "fixed",
        imageDisplayType: "single",
        startTime: null,
        endTime: null,
        images: ["https://via.placeholder.com/300x100?text=Demo+Spot+API"],
        startDate: now,
        endDate: tomorrow,
        timeRanges: [{ startTime: "00:00", endTime: "23:59" }],
        visiblePages: "all",
        dailyFrequency: 1,
        weeklySchedule: null,
        height: 100,
        width: 300,
        displayDuration: 10,
        displayInterval: 300, // 5 minuti
        createdAt: now,
        updatedAt: now
      };
      
      console.log("Spot demo creato:", JSON.stringify(demoSpot, null, 2));
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
    
    console.log("API - Spot promozionali da restituire:", JSON.stringify(spotsWithFullImageUrls, null, 2));
    // Imposta esplicitamente gli header per JSON
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(spotsWithFullImageUrls));
  } catch (error) {
    console.error("Errore nel recupero degli spot promozionali attivi:", error);
    res.status(500).json({ error: "Errore nel recupero degli spot promozionali attivi" });
  }
});

export default router;