import { Request, Response, NextFunction } from 'express';
import { PlanEnforcementService } from '../services/planEnforcement';

/**
 * Middleware to check if a feature is enabled for the user
 */
export const requireFeature = (featureId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const isEnabled = await PlanEnforcementService.isFeatureEnabled(userId, featureId);
      if (!isEnabled) {
        return res.status(403).json({ 
          error: 'Funzionalità non disponibile nel tuo piano',
          feature: featureId,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  };
};

/**
 * Middleware to check page access permissions
 */
export const requirePageAccess = (pageId: string, requiredAccess: 'view' | 'edit' = 'view') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const userAccess = await PlanEnforcementService.getPageAccess(userId, pageId);
      
      if (userAccess === 'none') {
        return res.status(403).json({ 
          error: 'Pagina non accessibile nel tuo piano',
          page: pageId,
          upgrade: true
        });
      }

      if (requiredAccess === 'edit' && userAccess !== 'edit') {
        return res.status(403).json({ 
          error: 'Modifica non consentita nel tuo piano',
          page: pageId,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking page access:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  };
};

/**
 * Middleware to check operational permissions
 */
export const requirePermission = (permissionId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const hasPermission = await PlanEnforcementService.hasPermission(userId, permissionId);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Operazione non consentita nel tuo piano',
          permission: permissionId,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  };
};

/**
 * Middleware to check feature limits
 */
export const checkFeatureLimit = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const limitCheck = await PlanEnforcementService.checkFeatureLimit(userId, feature);
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          error: `Limite raggiunto per ${feature}`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature limit:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  };
};

/**
 * Middleware to filter response data based on plan restrictions
 */
export const filterResponseByPlan = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return next();
      }

      // Store original send method
      const originalSend = res.send;
      
      // Override send method to filter data
      res.send = function(data: any) {
        try {
          if (typeof data === 'string') {
            // Try to parse JSON
            const parsed = JSON.parse(data);
            const filtered = PlanEnforcementService.filterDataByPlan(userId, entity, parsed);
            return originalSend.call(this, JSON.stringify(filtered));
          } else if (typeof data === 'object') {
            // Filter object data
            const filtered = PlanEnforcementService.filterDataByPlan(userId, entity, data);
            return originalSend.call(this, filtered);
          }
        } catch (e) {
          // If filtering fails, send original data
          console.error('Error filtering response data:', e);
        }
        
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Error setting up response filter:', error);
      next();
    }
  };
};

/**
 * Middleware to add plan information to response headers
 */
export const addPlanInfo = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return next();
      }

      const config = await PlanEnforcementService.getUserPlanConfiguration(userId);
      if (config) {
        res.setHeader('X-Plan-ID', config.planId.toString());
        res.setHeader('X-Plan-Features', JSON.stringify(config.features));
      }

      next();
    } catch (error) {
      console.error('Error adding plan info:', error);
      next();
    }
  };
};

/**
 * Utility function to get user's plan configuration
 */
export const getUserPlanConfig = async (req: Request) => {
  const userId = (req.session as any).userId;
  if (!userId) return null;
  
  return await PlanEnforcementService.getUserPlanConfiguration(userId);
};

/**
 * Utility function to check if a field should be visible
 */
export const isFieldVisible = async (req: Request, entity: string, fieldId: string) => {
  const userId = (req.session as any).userId;
  if (!userId) return true;
  
  return await PlanEnforcementService.isFieldVisible(userId, entity, fieldId);
};

export default {
  requireFeature,
  requirePageAccess,
  requirePermission,
  checkFeatureLimit,
  filterResponseByPlan,
  addPlanInfo,
  getUserPlanConfig,
  isFieldVisible
}; 