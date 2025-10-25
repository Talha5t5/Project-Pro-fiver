import { storage } from '../storage';
import { PlanFeatures } from './planEnforcement';

// Type definitions for database entities
interface User {
  id: number;
  username?: string;
  email: string;
  lastLogin?: Date;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  isActive: boolean;
  features?: string;
}

interface PlanConfiguration {
  id: number;
  userId: number;
  planId: number;
  features?: string;
  isActive: boolean;
}

// Type definitions for database entities
interface User {
  id: number;
  username?: string;
  email: string;
  lastLogin?: Date;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  isActive: boolean;
  features?: string;
}

interface PlanConfiguration {
  id: number;
  userId: number;
  planId: number;
  features?: string;
  isActive: boolean;
}

export interface AnalyticsData {
  planUsage: PlanUsageMetrics;
  userBehavior: UserBehaviorMetrics;
  systemPerformance: SystemPerformanceMetrics;
  revenueMetrics: RevenueMetrics;
  featureAnalytics: FeatureAnalytics;
}

export interface PlanUsageMetrics {
  totalPlans: number;
  activePlans: number;
  planDistribution: PlanDistribution[];
  mostPopularFeatures: string[];
  leastUsedFeatures: string[];
  upgradeRequests: number;
  downgradeRequests: number;
}

export interface PlanDistribution {
  planName: string;
  userCount: number;
  percentage: number;
  averageUsage: number;
}

export interface UserBehaviorMetrics {
  totalUsers: number;
  activeUsers: number;
  averageSessionDuration: number;
  mostUsedFeatures: FeatureUsage[];
  featureAdoptionRate: FeatureAdoption[];
  userEngagement: UserEngagement[];
}

export interface FeatureUsage {
  featureName: string;
  usageCount: number;
  uniqueUsers: number;
  averageUsagePerUser: number;
}

export interface FeatureAdoption {
  featureName: string;
  totalUsers: number;
  adoptedUsers: number;
  adoptionRate: number;
}

export interface UserEngagement {
  userId: number;
  username: string;
  lastActive: Date;
  featuresUsed: string[];
  sessionCount: number;
  totalTime: number;
}

export interface SystemPerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  systemUptime: number;
  peakUsageTimes: PeakUsage[];
  resourceUtilization: ResourceUtilization;
}

export interface PeakUsage {
  hour: number;
  requestCount: number;
  averageResponseTime: number;
}

export interface ResourceUtilization {
  cpuUsage: number;
  memoryUsage: number;
  databaseConnections: number;
  activeSessions: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  planRevenueBreakdown: PlanRevenue[];
  upgradeRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
}

export interface PlanRevenue {
  planName: string;
  monthlyRevenue: number;
  yearlyRevenue: number;
  userCount: number;
  totalRevenue: number;
}

export interface FeatureAnalytics {
  featurePerformance: FeaturePerformance[];
  userSatisfaction: UserSatisfaction[];
  featureRequests: FeatureRequest[];
  bugReports: BugReport[];
}

export interface FeaturePerformance {
  featureName: string;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  usageTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface UserSatisfaction {
  featureName: string;
  averageRating: number;
  totalRatings: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

export interface FeatureRequest {
  id: number;
  featureName: string;
  description: string;
  requestedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  requestCount: number;
}

export interface BugReport {
  id: number;
  featureName: string;
  description: string;
  reportedBy: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'fixed' | 'closed';
  affectedUsers: number;
}

export class AnalyticsService {
  
  // Get comprehensive analytics data
  static async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      const [
        planUsage,
        userBehavior,
        systemPerformance,
        revenueMetrics,
        featureAnalytics
      ] = await Promise.all([
        this.getPlanUsageMetrics(),
        this.getUserBehaviorMetrics(),
        this.getSystemPerformanceMetrics(),
        this.getRevenueMetrics(),
        this.getFeatureAnalytics()
      ]);

      return {
        planUsage,
        userBehavior,
        systemPerformance,
        revenueMetrics,
        featureAnalytics
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  }

  // Get plan usage metrics
  static async getPlanUsageMetrics(): Promise<PlanUsageMetrics> {
    try {
      const plans = await storage.getSubscriptionPlans() as SubscriptionPlan[];
      const planConfigs = await storage.getPlanConfigurations() as PlanConfiguration[];
      const users = await storage.getUsers() as User[];

      const totalPlans = plans.length;
      const activePlans = plans.filter((p: SubscriptionPlan) => p.isActive).length;

      // Calculate plan distribution
      const planDistribution: PlanDistribution[] = plans.map((plan: SubscriptionPlan) => {
        const usersOnPlan = planConfigs.filter((config: PlanConfiguration) => 
          config.planId === plan.id && config.isActive
        ).length;
        
        const percentage = users.length > 0 ? (usersOnPlan / users.length) * 100 : 0;
        
        return {
          planName: plan.name,
          userCount: usersOnPlan,
          percentage: Math.round(percentage * 100) / 100,
          averageUsage: this.calculateAveragePlanUsage(plan.id, planConfigs)
        };
      });

      // Get most/least used features
      const featureUsage = this.analyzeFeatureUsage(plans, planConfigs);
      const mostPopularFeatures = featureUsage
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(f => f.featureName);

      const leastUsedFeatures = featureUsage
        .sort((a, b) => a.usageCount - b.usageCount)
        .slice(0, 5)
        .map(f => f.featureName);

      return {
        totalPlans,
        activePlans,
        planDistribution,
        mostPopularFeatures,
        leastUsedFeatures,
        upgradeRequests: 0, // TODO: Implement upgrade tracking
        downgradeRequests: 0 // TODO: Implement downgrade tracking
      };
    } catch (error) {
      console.error('Error getting plan usage metrics:', error);
      throw error;
    }
  }

  // Get user behavior metrics
  static async getUserBehaviorMetrics(): Promise<UserBehaviorMetrics> {
    try {
      const users = await storage.getUsers() as User[];
      const planConfigs = await storage.getPlanConfigurations() as PlanConfiguration[];

      const totalUsers = users.length;
      const activeUsers = users.filter((u: User) => u.lastLogin && 
        new Date(u.lastLogin).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length;

      // Calculate feature usage
      const mostUsedFeatures = this.calculateMostUsedFeatures(planConfigs);
      
      // Calculate feature adoption rates
      const featureAdoption = this.calculateFeatureAdoption(planConfigs, totalUsers);

      // Calculate user engagement (simplified for now)
      const userEngagement: UserEngagement[] = users.map((user: User) => ({
        userId: user.id,
        username: user.username || user.email,
        lastActive: user.lastLogin || new Date(),
        featuresUsed: this.getUserFeatures(user.id, planConfigs),
        sessionCount: 0, // TODO: Implement session tracking
        totalTime: 0 // TODO: Implement time tracking
      }));

      return {
        totalUsers,
        activeUsers,
        averageSessionDuration: 0, // TODO: Implement session tracking
        mostUsedFeatures,
        featureAdoptionRate: featureAdoption,
        userEngagement
      };
    } catch (error) {
      console.error('Error getting user behavior metrics:', error);
      throw error;
    }
  }

  // Get system performance metrics
  static async getSystemPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    try {
      // For now, return mock data - in production, this would come from monitoring systems
      return {
        totalRequests: 0, // TODO: Implement request tracking
        averageResponseTime: 0, // TODO: Implement response time tracking
        errorRate: 0, // TODO: Implement error tracking
        systemUptime: 99.9, // TODO: Implement uptime tracking
        peakUsageTimes: [], // TODO: Implement usage time tracking
        resourceUtilization: {
          cpuUsage: 0, // TODO: Implement system monitoring
          memoryUsage: 0,
          databaseConnections: 0,
          activeSessions: 0
        }
      };
    } catch (error) {
      console.error('Error getting system performance metrics:', error);
      throw error;
    }
  }

  // Get revenue metrics
  static async getRevenueMetrics(): Promise<RevenueMetrics> {
    try {
      const plans = await storage.getSubscriptionPlans();
      const planConfigs = await storage.getPlanConfigurations();

      // Calculate revenue breakdown
      const planRevenueBreakdown: PlanRevenue[] = plans.map(plan => {
        const usersOnPlan = planConfigs.filter((config: any) => 
          config.planId === plan.id && config.isActive
        ).length;

        const monthlyRevenue = parseFloat(plan.monthlyPrice || '0') * usersOnPlan;
        const yearlyRevenue = parseFloat(plan.yearlyPrice || '0') * usersOnPlan;

        return {
          planName: plan.name,
          monthlyRevenue,
          yearlyRevenue,
          userCount: usersOnPlan,
          totalRevenue: monthlyRevenue + yearlyRevenue
        };
      });

      const totalRevenue = planRevenueBreakdown.reduce((sum, plan) => sum + plan.totalRevenue, 0);
      const monthlyRecurringRevenue = planRevenueBreakdown.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
      const totalUsers = planConfigs.filter((config: any) => config.isActive).length;
      const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      return {
        totalRevenue,
        monthlyRecurringRevenue,
        planRevenueBreakdown,
        upgradeRevenue: 0, // TODO: Implement upgrade tracking
        churnRate: 0, // TODO: Implement churn tracking
        averageRevenuePerUser
      };
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      throw error;
    }
  }

  // Get feature analytics
  static async getFeatureAnalytics(): Promise<FeatureAnalytics> {
    try {
      // For now, return mock data - in production, this would come from user feedback systems
      return {
        featurePerformance: [], // TODO: Implement performance tracking
        userSatisfaction: [], // TODO: Implement satisfaction tracking
        featureRequests: [], // TODO: Implement request tracking
        bugReports: [] // TODO: Implement bug tracking
      };
    } catch (error) {
      console.error('Error getting feature analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private static calculateAveragePlanUsage(planId: number, planConfigs: any[]): number {
    const usersOnPlan = planConfigs.filter(config => 
      config.planId === planId && config.isActive
    );
    
    if (usersOnPlan.length === 0) return 0;
    
    // Calculate average usage based on features enabled
    const totalFeatures = usersOnPlan.reduce((sum, config) => {
      try {
        const features = JSON.parse(config.features || '{}');
        const enabledFeatures = Object.values(features).filter(v => v === true).length;
        return sum + enabledFeatures;
      } catch {
        return sum;
      }
    }, 0);
    
    return Math.round((totalFeatures / usersOnPlan.length) * 100) / 100;
  }

  private static analyzeFeatureUsage(plans: any[], planConfigs: any[]): Array<{featureName: string, usageCount: number}> {
    const featureCounts: {[key: string]: number} = {};
    
    planConfigs.forEach(config => {
      if (config.isActive) {
        try {
          const features = JSON.parse(config.features || '{}');
          Object.entries(features).forEach(([feature, enabled]) => {
            if (enabled === true) {
              featureCounts[feature] = (featureCounts[feature] || 0) + 1;
            }
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });
    
    return Object.entries(featureCounts).map(([feature, count]) => ({
      featureName: feature,
      usageCount: count
    }));
  }

  private static calculateMostUsedFeatures(planConfigs: any[]): FeatureUsage[] {
    const featureCounts: {[key: string]: number} = {};
    const uniqueUsers: {[key: string]: Set<number>} = {};
    
    planConfigs.forEach(config => {
      if (config.isActive) {
        try {
          const features = JSON.parse(config.features || '{}');
          Object.entries(features).forEach(([feature, enabled]) => {
            if (enabled === true) {
              featureCounts[feature] = (featureCounts[feature] || 0) + 1;
              if (!uniqueUsers[feature]) uniqueUsers[feature] = new Set();
              uniqueUsers[feature].add(config.userId);
            }
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });
    
    return Object.entries(featureCounts).map(([feature, count]) => ({
      featureName: feature,
      usageCount: count,
      uniqueUsers: uniqueUsers[feature]?.size || 0,
      averageUsagePerUser: Math.round((count / (uniqueUsers[feature]?.size || 1)) * 100) / 100
    }));
  }

  private static calculateFeatureAdoption(planConfigs: any[], totalUsers: number): FeatureAdoption[] {
    const featureCounts: {[key: string]: number} = {};
    
    planConfigs.forEach(config => {
      if (config.isActive) {
        try {
          const features = JSON.parse(config.features || '{}');
          Object.entries(features).forEach(([feature, enabled]) => {
            if (enabled === true) {
              featureCounts[feature] = (featureCounts[feature] || 0) + 1;
            }
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });
    
    return Object.entries(featureCounts).map(([feature, count]) => ({
      featureName: feature,
      totalUsers,
      adoptedUsers: count,
      adoptionRate: Math.round((count / totalUsers) * 10000) / 100
    }));
  }

  private static getUserFeatures(userId: number, planConfigs: any[]): string[] {
    const userConfig = planConfigs.find(config => 
      config.userId === userId && config.isActive
    );
    
    if (!userConfig) return [];
    
    try {
      const features = JSON.parse(userConfig.features || '{}');
      return Object.entries(features)
        .filter(([_, enabled]) => enabled === true)
        .map(([feature, _]) => feature);
    } catch {
      return [];
    }
  }
} 