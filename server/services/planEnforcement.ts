import { storage } from '../storage';

export interface PlanFeatures {
  // Functionality features
  client_management?: boolean;
  job_management?: boolean;
  invoice_generation?: boolean;
  collaborator_management?: boolean;
  activity_tracking?: boolean;
  activity_management?: boolean; // New: Controls activity-based job management
  materials_inventory?: boolean;
  reports?: boolean;
  calendar?: boolean;
  notifications?: boolean;
  
  // Page access control
  page_access?: {
    [pageId: string]: 'view' | 'edit' | 'none';
  };
  
  // Visible fields configuration
  visible_fields?: {
    [entity: string]: string[];
  };
  
  // Operational permissions
  permissions?: {
    [permissionId: string]: boolean;
  };
  
  // Feature limits
  limits?: {
    max_clients?: number;
    max_jobs?: number;
    max_collaborators?: number;
    max_invoices?: number;
    max_materials?: number;
  };
  
  // Index signature for dynamic access
  [key: string]: any;
}

export interface PlanConfiguration {
  planId: number;
  features: PlanFeatures;
  isActive: boolean;
}

/**
 * Plan Enforcement Service
 * Handles all plan-based restrictions and permissions
 */
export class PlanEnforcementService {
  
  /**
   * Get user's plan configuration
   */
  static async getUserPlanConfiguration(userId: number): Promise<PlanConfiguration | null> {
    try {
      // Get user subscription
      const userSubscriptions = await storage.getUserSubscriptions();
      const userActiveSubscriptions = userSubscriptions.filter(sub => 
        sub.userId === userId && sub.status === 'active'
      );
      
      // Get the latest subscription (highest ID = most recent)
      const userSubscription = userActiveSubscriptions.length > 0 
        ? userActiveSubscriptions.reduce((latest, current) => 
            current.id > latest.id ? current : latest
          )
        : null;
      
      if (!userSubscription) {
        return null;
      }
      
      // Get plan details
      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.id === userSubscription.planId);
      
      if (!plan) {
        return null;
      }
      
      // Parse plan features
      let features: PlanFeatures = {};
      if (plan.features) {
        try {
          features = typeof plan.features === 'string' 
            ? JSON.parse(plan.features) 
            : plan.features;
        } catch (e) {
          console.error('Error parsing plan features:', e);
          features = {};
        }
      }
      
      // Check for client-specific overrides
      const planConfigurations = await storage.getPlanConfigurations();
      const clientOverride = planConfigurations.find((config: any) => 
        config.userId === userId && config.isActive
      );
      
      if (clientOverride && clientOverride.features) {
        try {
          const overrideFeatures = typeof clientOverride.features === 'string'
            ? JSON.parse(clientOverride.features)
            : clientOverride.features;
          
          // Merge override features with base plan
          features = this.mergeFeatures(features, overrideFeatures);
        } catch (e) {
          console.error('Error parsing client override features:', e);
        }
      }
      
      return {
        planId: plan.id,
        features,
        isActive: true
      };
      
    } catch (error) {
      console.error('Error getting user plan configuration:', error);
      return null;
    }
  }
  
  /**
   * Check if a feature is enabled for a user
   */
  static async isFeatureEnabled(userId: number, featureId: string): Promise<boolean> {
    const config = await this.getUserPlanConfiguration(userId);
    if (!config) return false;
    
    return config.features[featureId] === true;
  }

  /**
   * Check if activity management is enabled for a user
   */
  static async isActivityManagementEnabled(userId: number): Promise<boolean> {
    return await this.isFeatureEnabled(userId, 'activity_management');
  }
  
  /**
   * Check if a page is accessible for a user
   */
  static async getPageAccess(userId: number, pageId: string): Promise<'view' | 'edit' | 'none'> {
    const config = await this.getUserPlanConfiguration(userId);
    if (!config) return 'none';
    
    const pageAccess = config.features.page_access || {};
    return pageAccess[pageId] || 'none';
  }
  
  /**
   * Check if a field is visible for a user
   */
  static async isFieldVisible(userId: number, entity: string, fieldId: string): Promise<boolean> {
    const config = await this.getUserPlanConfiguration(userId);
    if (!config) return true; // Default to visible if no config
    
    const visibleFields = config.features.visible_fields || {};
    const entityFields = visibleFields[entity] || [];
    
    // If no fields specified for entity, all fields are visible
    if (entityFields.length === 0) return true;
    
    return entityFields.includes(fieldId);
  }
  
  /**
   * Check if a permission is granted for a user
   */
  static async hasPermission(userId: number, permissionId: string): Promise<boolean> {
    console.log(`🔍 hasPermission called: userId=${userId}, permissionId=${permissionId}`);
    
    const config = await this.getUserPlanConfiguration(userId);
    console.log(`🔍 Plan config for user ${userId}:`, config ? {
      planId: config.planId,
      hasFeatures: !!config.features,
      hasPermissions: !!config.features?.permissions,
      permissions: config.features?.permissions
    } : null);
    
    if (!config) {
      console.log(`❌ No plan config found for user ${userId}`);
      return false;
    }

    const planPermissions = config.features.permissions || {};
    const planAllowed = planPermissions[permissionId] === true;
    console.log(`🔍 Plan permission check: ${permissionId} = ${planAllowed}`);

    // If plan allows, grant permission (plan permissions take priority)
    if (planAllowed) {
      console.log(`✅ Plan allows ${permissionId} for user ${userId}`);
      return true;
    }

    // If plan doesn't explicitly allow, check role capabilities as fallback
    const roleCaps = await this.getUserRoleCapabilities(userId);
    console.log(`🔍 Role capabilities for user ${userId}:`, roleCaps);
    
    if (!roleCaps) {
      console.log(`❌ No plan permission and no role for user ${userId}`);
      return false;
    }

    // Check if role grants the permission
    const roleAllowed = roleCaps[permissionId] === true;
    console.log(`🔍 Role permission check: ${permissionId} = ${roleAllowed}`);
    console.log(`🔍 Final permission result: ${permissionId} = ${roleAllowed}`);
    return roleAllowed;
  }

  /**
   * Map a role's boolean flags (canManageX, etc.) to route capability names (client.create, ...)
   * and return a capability map for quick checks.
   */
  private static async getUserRoleCapabilities(userId: number): Promise<Record<string, boolean> | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.roleId) {
        return null; // No role → do not restrict further
      }

      const role = await storage.getRole(user.roleId);
      if (!role || !role.permissions) return {};

      let roleFlags: any = {};
      try {
        roleFlags = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
      } catch {
        roleFlags = {};
      }

      const caps: Record<string, boolean> = {};

      // Handle both array and object formats
      if (Array.isArray(roleFlags)) {
        // If permissions are stored as an array of strings, convert to object
        roleFlags.forEach((permission: string) => {
          caps[permission] = true;
        });
      } else {
        // If permissions are stored as an object, map them directly
        Object.keys(roleFlags).forEach(key => {
          if (roleFlags[key] === true) {
            caps[key] = true;
          }
        });
      }

      return caps;
    } catch (e) {
      console.error('Error computing role capabilities:', e);
      return null;
    }
  }
  
  /**
   * Get feature limits for a user
   */
  static async getFeatureLimits(userId: number): Promise<Record<string, number>> {
    const config = await this.getUserPlanConfiguration(userId);
    if (!config) return {};
    
    return config.features.limits || {};
  }
  
  /**
   * Check if user has reached a feature limit
   */
  static async checkFeatureLimit(userId: number, feature: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limits = await this.getFeatureLimits(userId);
    const limit = limits[`max_${feature}`];
    
    if (limit === undefined || limit === -1) {
      return { allowed: true, current: 0, limit: -1 }; // No limit
    }
    
    // Get current count based on feature
    let current = 0;
    switch (feature) {
      case 'clients':
        const clients = await storage.getClients();
        // In current schema, all clients are shared
        current = clients.length;
        break;
      case 'jobs':
        const jobs = await storage.getJobs();
        // In current schema, all jobs are shared
        current = jobs.length;
        break;
      case 'collaborators':
        const collaborators = await storage.getCollaborators();
        // In current schema, all collaborators are shared
        current = collaborators.length;
        break;
      case 'invoices':
        // Assuming invoices table exists
        break;
      case 'materials':
        // Assuming materials table exists
        break;
    }
    
    return {
      allowed: current < limit,
      current,
      limit
    };
  }
  
  /**
   * Filter data based on plan restrictions
   */
  static async filterDataByPlan(userId: number, entity: string, data: any): Promise<any> {
    const config = await this.getUserPlanConfiguration(userId);
    if (!config) return data;
    
    const visibleFields = config.features.visible_fields || {};
    const entityFields = visibleFields[entity] || [];
    
    // If no fields specified, return all data
    if (entityFields.length === 0) return data;
    
    // Filter data to only include visible fields
    const filtered: any = {};
    entityFields.forEach(fieldId => {
      if (data.hasOwnProperty(fieldId)) {
        filtered[fieldId] = data[fieldId];
      }
    });
    
    return filtered;
  }
  
  /**
   * Filter array of data based on plan restrictions
   */
  static async filterDataArrayByPlan(userId: number, entity: string, dataArray: any[]): Promise<any[]> {
    if (!Array.isArray(dataArray)) return dataArray;
    
    return Promise.all(
      dataArray.map(data => this.filterDataByPlan(userId, entity, data))
    );
  }
  
  /**
   * Merge base plan features with client-specific overrides
   */
  private static mergeFeatures(baseFeatures: PlanFeatures, overrideFeatures: PlanFeatures): PlanFeatures {
    const merged: PlanFeatures = { ...baseFeatures };
    
    // Merge functionality features
    Object.keys(overrideFeatures).forEach(key => {
      if (key === 'page_access' || key === 'visible_fields' || key === 'permissions' || key === 'limits') {
        // Deep merge for complex objects
        if (overrideFeatures[key] && typeof overrideFeatures[key] === 'object') {
          if (key === 'page_access') {
            merged.page_access = {
              ...merged.page_access,
              ...overrideFeatures.page_access
            };
          } else if (key === 'visible_fields') {
            merged.visible_fields = {
              ...merged.visible_fields,
              ...overrideFeatures.visible_fields
            };
          } else if (key === 'permissions') {
            merged.permissions = {
              ...merged.permissions,
              ...overrideFeatures.permissions
            };
          } else if (key === 'limits') {
            merged.limits = {
              ...merged.limits,
              ...overrideFeatures.limits
            };
          }
        }
      } else {
        // Simple override for boolean features
        (merged as any)[key] = overrideFeatures[key];
      }
    });
    
    return merged;
  }
  
  /**
   * Validate plan configuration
   */
  static validatePlanConfiguration(features: PlanFeatures): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate page access values
    if (features.page_access) {
      Object.entries(features.page_access).forEach(([pageId, access]) => {
        if (!['view', 'edit', 'none'].includes(access)) {
          errors.push(`Invalid page access value for ${pageId}: ${access}`);
        }
      });
    }
    
    // Validate limits are positive numbers
    if (features.limits) {
      Object.entries(features.limits).forEach(([limitName, limitValue]) => {
        if (limitValue !== -1 && (typeof limitValue !== 'number' || limitValue < 0)) {
          errors.push(`Invalid limit value for ${limitName}: ${limitValue}`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default PlanEnforcementService; 