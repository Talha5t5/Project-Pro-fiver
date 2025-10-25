import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';

const router = Router();

// Get comprehensive analytics data
router.get('/', async (req: Request, res: Response) => {
  try {
    const analyticsData = await AnalyticsService.getAnalyticsData();
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati analitici' });
  }
});

// Get plan usage metrics
router.get('/plan-usage', async (req: Request, res: Response) => {
  try {
    const planUsage = await AnalyticsService.getPlanUsageMetrics();
    res.json(planUsage);
  } catch (error) {
    console.error('Error fetching plan usage metrics:', error);
    res.status(500).json({ error: 'Errore nel recupero delle metriche di utilizzo dei piani' });
  }
});

// Get user behavior metrics
router.get('/user-behavior', async (req: Request, res: Response) => {
  try {
    const userBehavior = await AnalyticsService.getUserBehaviorMetrics();
    res.json(userBehavior);
  } catch (error) {
    console.error('Error fetching user behavior metrics:', error);
    res.status(500).json({ error: 'Errore nel recupero delle metriche di comportamento degli utenti' });
  }
});

// Get revenue metrics
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const revenueMetrics = await AnalyticsService.getRevenueMetrics();
    res.json(revenueMetrics);
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Errore nel recupero delle metriche di ricavo' });
  }
});

// Get feature analytics
router.get('/features', async (req: Request, res: Response) => {
  try {
    const featureAnalytics = await AnalyticsService.getFeatureAnalytics();
    res.json(featureAnalytics);
  } catch (error) {
    console.error('Error fetching feature analytics:', error);
    res.status(500).json({ error: 'Errore nel recupero delle analisi delle funzionalità' });
  }
});

// Get system performance metrics
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const performanceMetrics = await AnalyticsService.getSystemPerformanceMetrics();
    res.json(performanceMetrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Errore nel recupero delle metriche di prestazioni' });
  }
});

export default router; 