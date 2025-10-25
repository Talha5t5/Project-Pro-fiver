import { Router } from "express";
import promotionalSpotsRouter from "./promotional-spots";

const router = Router();

// Rotte per la gestione degli spot promozionali
router.use("/promotional-spots", promotionalSpotsRouter);

export default router;