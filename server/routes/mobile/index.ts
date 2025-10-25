import { Router } from "express";
import promotionalSpotsRouter from "./promotional-spots";

const router = Router();

// Registra i route per gli spot promozionali
router.use("/promotional-spots", promotionalSpotsRouter);

// Qui in futuro potranno essere aggiunti altri endpoint mobile

export default router;