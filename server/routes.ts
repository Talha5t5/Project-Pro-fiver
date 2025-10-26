import type { Express, Request, Response, NextFunction } from "express";
import 'express-session';
import { createServer, type Server } from "http";

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: string;
    admin?: {
      isAuthenticated: boolean;
      username: string;
      role: string;
    };
  }
}
import { storage } from "./storage";
import { log } from "./vite";
import mysql from "mysql2/promise";
import mobileRoutes from "./routes/mobile";
import stripeRoutes from "./routes/stripe";
import { initDB } from "./db";
import { users, jobs, clients, jobTypes, userSubscriptions, subscriptionPlans } from "../shared/schema";
import { planConfigurations } from "../shared/schema-simple";
import { eq } from "drizzle-orm";
import adminRoutes from "./routes/admin";
import { 
  insertClientSchema, 
  insertJobSchema, 
  insertJobTypeSchema, 
  updateJobTypeSchema,
  insertActivitySchema, 
  insertRoleSchema, 
  insertCollaboratorSchema, 
  insertJobActivitySchema,
  insertSubscriptionPlanSchema,
  insertUserSubscriptionSchema,
  insertSectorSchema,
  insertWebPageSchema,
  insertPlanConfigurationSchema,
  insertGeneralSettingsSchema
} from "@shared/schema";
import crypto from "crypto";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to check if user is admin
  const isAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Per ora, autorizziamo tutte le richieste
    // In un'implementazione reale, controlleremmo qui se l'utente è amministratore
    next();
  };
  
  // Middleware to parse dates
  const parseDates = (req: Request, res: Response, next: NextFunction) => {
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }
    if (req.body.completedDate) {
      req.body.completedDate = new Date(req.body.completedDate);
    }
    next();
  };

  // prefix all routes with /api

  // STRIPE WEBHOOK ENDPOINT
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update subscription status if needed
        if (paymentIntent.metadata?.userId && paymentIntent.metadata?.planId) {
          try {
            // Find and update the subscription
            const subscription = await storage.getUserSubscriptionByUserId(parseInt(paymentIntent.metadata.userId));
            if (subscription) {
              await storage.updateUserSubscription(subscription.id, { status: 'active' });
              console.log('Subscription activated for user:', paymentIntent.metadata.userId);
            }
          } catch (error) {
            console.error('Error updating subscription:', error);
          }
        }
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // AUTHENTICATION ROUTES
  // User registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, fullName, phone, type = "client" } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash password (in production, use bcrypt)
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      // Create new user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName: fullName || username,
        phone,
        type,
        isActive: true,
        language: "it"
      });
      
      // Remove password from response
      const { password: _, ...userResponse } = newUser;
      
      // Set user session
      if (req.session) {
        (req.session as any).userId = newUser.id;
        (req.session as any).userType = newUser.type;
      }
      
      return res.status(201).json({
        message: "User registered successfully",
        user: userResponse
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Desktop checkout with registration and subscription
  app.post("/api/checkout/subscribe", async (req: Request, res: Response) => {
    try {
      const { 
        email, 
        fullName, 
        password, 
        planId, 
        billingType, 
        paymentMethod, 
        company, 
        payment 
      } = req.body;
      
      // Basic validation
      if (!email || !fullName || !planId) {
        return res.status(400).json({ error: "Email, nome completo e piano sono richiesti" });
      }
      
      // Get subscription plan first to check if it's free
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Piano non trovato" });
      }
      
      const isFreePlan = plan.isFree || parseFloat(plan.monthlyPrice) === 0;
      
      // For non-free plans, password is required
      if (!isFreePlan && !password) {
        return res.status(400).json({ error: "Password richiesta per piani a pagamento" });
      }
      
      // Check if user already exists
      let user;
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // User already exists, use existing user
        user = existingUser;
      } else {
        // For free plans with placeholder password, just use existing user or return error
        if (password === 'ALREADY_REGISTERED' || password === 'FREE_PLAN_AUTO' || password === 'TEMPORARY_PASSWORD_NOT_NEEDED') {
          return res.status(400).json({ error: "Utente non trovato. Per favore registrati prima di attivare un piano." });
        }
        
        // Create new user - password is required
        if (!password) {
          return res.status(400).json({ error: "Password richiesta per creare un nuovo utente" });
        }
        
        // Hash password
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        // Create new user
        user = await storage.createUser({
          username: email.split('@')[0],
          email,
          password: hashedPassword,
          fullName,
          type: "client",
          isActive: true,
          language: "it"
        });
      }
      
      // Validate payment for paid plans
      if (!isFreePlan) {
        if (!paymentMethod) {
          return res.status(400).json({ error: "Metodo di pagamento richiesto per piani a pagamento" });
        }
        
        // Process payment with Stripe for credit card payments
        if (paymentMethod === 'creditcard' && payment) {
          const { cardNumber, expiryDate, cvc, nameOnCard } = payment;
          
          if (!cardNumber || !expiryDate || !cvc || !nameOnCard) {
            return res.status(400).json({ error: "Dati carta di credito incompleti" });
          }

          try {
            // Calculate amount in cents
            const amount = billingType === "monthly" 
              ? Math.round(parseFloat(plan.monthlyPrice) * 100)
              : Math.round(parseFloat(plan.yearlyPrice) * 100);

            // Create payment method first
            const paymentMethod = await stripe.paymentMethods.create({
              type: 'card',
              card: {
                number: cardNumber.replace(/\s/g, ''),
                exp_month: parseInt(expiryDate.split('/')[0]),
                exp_year: parseInt('20' + expiryDate.split('/')[1]),
                cvc: cvc,
              },
              billing_details: {
                name: nameOnCard,
                email: email,
              },
            });

            // Create payment intent with the payment method
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: 'eur',
              payment_method: paymentMethod.id,
              confirm: true,
              return_url: `${process.env.APP_URL || 'http://localhost:3000'}/desktop/payment-success`,
              metadata: {
                email: email,
                planId: planId.toString(),
                billingType,
              },
            });

            if (paymentIntent.status !== 'succeeded') {
              return res.status(400).json({ 
                error: "Pagamento fallito", 
                details: paymentIntent.last_payment_error?.message || "Errore sconosciuto"
              });
            }
          } catch (stripeError: any) {
            console.error('Stripe payment error:', stripeError);
            return res.status(400).json({ 
              error: "Errore nel pagamento", 
              details: stripeError.message || "Errore sconosciuto"
            });
          }
        }
      }
      
      // Calculate subscription dates
      const startDate = new Date();
      let endDate = new Date();
      
      if (billingType === "monthly" && plan.monthlyDuration) {
        endDate.setDate(endDate.getDate() + plan.monthlyDuration);
      } else if (billingType === "yearly" && plan.yearlyDuration) {
        endDate.setDate(endDate.getDate() + plan.yearlyDuration);
      }
      
      // Determine status based on plan type and payment method
      let status = "active";
      if (!isFreePlan && paymentMethod === "banktransfer") {
        status = "pending"; // Waiting for payment
      }
      
      // Create subscription
      const subscription = await storage.createUserSubscription({
        userId: user.id,
        planId,
        billingFrequency: billingType,
        startDate,
        endDate,
        status
      });
      
      // Set user session
      if (req.session) {
        (req.session as any).userId = user.id;
        (req.session as any).userType = user.type;
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      return res.status(201).json({
        message: "Registrazione e abbonamento completati con successo",
        user: userResponse,
        subscription
      });
    } catch (error) {
      console.error("Checkout error:", error);
      return res.status(500).json({ error: "Errore durante la registrazione e l'abbonamento" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      
      if (!password || (!username && !email)) {
        return res.status(400).json({ message: "Username/email and password are required" });
      }
      
      // Find user by username or email
      let user;
      if (email) {
        user = await storage.getUserByEmail(email);
      } else {
        user = await storage.getUserByUsername(username);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check password
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }
      
      // Set user session
      if (req.session) {
        (req.session as any).userId = user.id;
        (req.session as any).userType = user.type;
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      return res.json({
        message: "Login successful",
        user: userResponse
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Failed to login" });
    }
  });

  // User logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        return res.json({ message: "Logout successful" });
      });
    } else {
      return res.json({ message: "No active session" });
    }
  });

  // Forgot password (generate reset token)
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ message: "If an account with this email exists, a reset link has been sent" });
      }
      
      // Generate reset token (in production, send email)
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Store reset token in user record (you might want to add this field to schema)
      // For now, we'll just return success
      
      return res.json({ 
        message: "If an account with this email exists, a reset link has been sent",
        // In production, remove this debug info
        debug: { resetToken, userId: user.id }
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      // In production, validate token and find user
      // For now, we'll return success
      
      return res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session || !(req.session as any).userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      return res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get all users (for admin)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (!req.session || !(req.session as any).userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.type !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Get specific user
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !(req.session as any).userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = Number(req.params.id);
      const currentUser = await storage.getUser((req.session as any).userId);
      
      // Users can only access their own data, unless they're admin
      if (currentUser?.type !== "admin" && currentUser?.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      return res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Update user
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !(req.session as any).userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = Number(req.params.id);
      const currentUser = await storage.getUser((req.session as any).userId);
      
      // Users can only update their own data, unless they're admin
      if (currentUser?.type !== "admin" && currentUser?.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = req.body;
      
      // Hash password if it's being updated
      if (updateData.password) {
        updateData.password = crypto.createHash('sha256').update(updateData.password).digest('hex');
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = updatedUser;
      
      return res.json(userResponse);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });

  // CLIENT ROUTES
  // Get all clients
  app.get("/api/clients", async (req: Request, res: Response) => {
    const clients = await storage.getClients();
    return res.json(clients);
  });

  // Get a specific client
  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.json(client);
  });

  // Create a new client
  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(clientData);
      return res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Update a client
  app.put("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      // Check if user has permission to edit clients
      const userId = (req.session as any).userId;
      if (userId) {
        const { PlanEnforcementService } = await import('./services/planEnforcement');
        const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
        
        // Check client edit permission
        const canEditClients = planConfig?.features?.permissions?.edit_clients !== false;
        if (!canEditClients) {
          return res.status(403).json({ 
            error: "Non hai il permesso di modificare clienti",
            permission: "edit_clients",
            required: true
          });
        }
      }

      const clientData = insertClientSchema.partial().parse(req.body);
      const updatedClient = await storage.updateClient(Number(req.params.id), clientData);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      return res.json(updatedClient);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Delete a client
  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      // Check if user has permission to delete clients
      const userId = (req.session as any).userId;
      if (userId) {
        const { PlanEnforcementService } = await import('./services/planEnforcement');
        const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
        
        // Check client delete permission
        const canDeleteClients = planConfig?.features?.permissions?.delete_clients !== false;
        if (!canDeleteClients) {
          return res.status(403).json({ 
            error: "Non hai il permesso di eliminare clienti",
            permission: "delete_clients",
            required: true
          });
        }
      }

    const result = await storage.deleteClient(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Get client subscription
  app.get("/api/clients/:id/subscription", async (req: Request, res: Response) => {
    try {
      const clientId = Number(req.params.id);
      const subscription = await storage.getUserSubscription(clientId);
      
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found for this client" });
      }
      
      return res.json(subscription);
    } catch (error) {
      console.error("Error fetching client subscription:", error);
      return res.status(500).json({ message: "Error fetching client subscription" });
    }
  });

  // Update client subscription
  app.put("/api/clients/:id/subscription", async (req: Request, res: Response) => {
    try {
      const clientId = Number(req.params.id);
      const { planId, customFeatures, customPricing, customMonthlyPrice, customYearlyPrice, customDuration, overrideDefaultSettings } = req.body;
      
      // Get current subscription
      const currentSubscription = await storage.getUserSubscription(clientId);
      if (!currentSubscription) {
        return res.status(404).json({ message: "No subscription found for this client" });
      }
      
      // Update subscription with new plan
      const updatedSubscription = await storage.updateUserSubscription(clientId, {
        planId: planId || currentSubscription.planId,
        // customFeatures: customFeatures || currentSubscription.customFeatures,
        // customPricing: customPricing || false, // These fields don't exist in the schema
        // customMonthlyPrice: customPricing ? customMonthlyPrice : null,
        // customYearlyPrice: customPricing ? customYearlyPrice : null,
        // customDuration: customDuration || null,
        // overrideDefaultSettings: overrideDefaultSettings || false // This field doesn't exist in the schema
      });
      
      return res.json(updatedSubscription);
    } catch (error) {
      console.error("Error updating client subscription:", error);
      return res.status(500).json({ message: "Error updating client subscription" });
    }
  });

  // JOB ROUTES
  // Get all jobs
  app.get("/api/jobs", async (req: Request, res: Response) => {
    const jobs = await storage.getJobs();
    const jobsWithClients = await Promise.all(
      jobs.map(async (job) => {
        const client = await storage.getClient(job.clientId);
        return {
          ...job,
          client: client ? { id: client.id, name: client.name } : { name: "Unknown Client" }
        };
      })
    );
    return res.json(jobsWithClients);
  });

  // Get jobs by client
  app.get("/api/clients/:clientId/jobs", async (req: Request, res: Response) => {
    const clientId = Number(req.params.clientId);
    const jobs = await storage.getJobsByClient(clientId);
    return res.json(jobs);
  });

  // Get jobs by date range
  app.get("/api/jobs/range", async (req: Request, res: Response) => {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: "Start and end dates are required" });
    }
    
    try {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      const jobs = await storage.getJobsByDateRange(startDate, endDate);
      
      // Get clients for jobs
      const jobsWithClients = await Promise.all(
        jobs.map(async (job) => {
          const client = await storage.getClient(job.clientId);
          return {
            ...job,
            client: client ? { id: client.id, name: client.name } : { name: "Unknown Client" }
          };
        })
      );
      
      return res.json(jobsWithClients);
    } catch (error) {
      return res.status(400).json({ message: "Invalid date format" });
    }
  });

  // Get a specific job
  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    const jobId = Number(req.params.id);
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Get client info
    const client = await storage.getClient(job.clientId);
    
    // Get job activities
    const activities = await storage.getJobActivitiesByJob(jobId);
    
    // Map activities with their collaborators
    const activitiesWithDetails = await Promise.all(
      activities.map(async (activity) => {
        const collaboratorIds = await storage.getCollaboratorsByActivity(activity.activityId);
        const collaborators = await Promise.all(
          collaboratorIds.map(async (id) => {
            return await storage.getCollaborator(id);
          })
        );
        
        return {
          ...activity,
          collaborators: collaborators.filter(Boolean)
        };
      })
    );
    
    return res.json({
      ...job,
      client,
      activities: activitiesWithDetails
    });
  });

  // Create a new job
  app.post("/api/jobs", async (req: Request, res: Response) => {
    try {
      const jobData = req.body;
      const newJob = await storage.createJob(jobData);
      res.status(201).json(newJob);
    } catch (error) {
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  // Update a job
  app.put("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const jobData = req.body;
      const updatedJob = await storage.updateJob(parseInt(id), jobData);
      res.json(updatedJob);
    } catch (error) {
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  // Delete a job
  app.delete("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteJob(parseInt(id));
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // COLLABORATORS API
  app.get("/api/collaborators", async (req: Request, res: Response) => {
    try {
      const collaborators = await storage.getCollaborators();
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch collaborators" });
    }
  });

  app.post("/api/collaborators", async (req: Request, res: Response) => {
    try {
      const collaboratorData = req.body;
      // Ensure activation token
      const activationToken = collaboratorData.activationToken || crypto.randomBytes(24).toString("hex");
      const newCollaborator = await storage.createCollaborator({ ...collaboratorData, activationToken });

      try {
        const baseUrl = process.env.APP_PUBLIC_URL || "http://localhost:3000";
        const activationUrl = `${baseUrl}/activate?token=${activationToken}`;
        const { notifyCollaboratorActivation } = await import("./services/notifications");
        await notifyCollaboratorActivation(newCollaborator as any, activationUrl);
      } catch (e) {
        log(`Failed to send collaborator activation: ${String(e)}`, "notifications");
      }

      res.status(201).json(newCollaborator);
    } catch (error) {
      res.status(500).json({ error: "Failed to create collaborator" });
    }
  });

  app.put("/api/collaborators/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const collaboratorData = req.body;
      const updatedCollaborator = await storage.updateCollaborator(parseInt(id), collaboratorData);
      res.json(updatedCollaborator);
    } catch (error) {
      res.status(500).json({ error: "Failed to update collaborator" });
    }
  });

  app.delete("/api/collaborators/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCollaborator(parseInt(id));
      res.json({ message: "Collaborator deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete collaborator" });
    }
  });

  // INVOICES API
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      // const invoices = await storage.getInvoices(); // Method doesn't exist
      const invoices: any[] = [];
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      const invoiceData = req.body;
      // const newInvoice = await storage.createInvoice(invoiceData); // Method doesn't exist
      const newInvoice = { id: 1, ...invoiceData };
      res.status(201).json(newInvoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invoiceData = req.body;
      // const updatedInvoice = await storage.updateInvoice(parseInt(id), invoiceData); // Method doesn't exist
      const updatedInvoice = { id: parseInt(id), ...invoiceData };
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // await storage.deleteInvoice(parseInt(id)); // Method doesn't exist
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Create a new job
  app.post("/api/jobs", parseDates, async (req: Request, res: Response) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      
      const client = await storage.getClient(jobData.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const newJob = await storage.createJob(jobData);
      // Fire-and-forget notifications
      (async () => {
        try {
          const { notifyJobCreated } = await import("./services/notifications");
          await notifyJobCreated(newJob as any, client as any);
        } catch (e) {
          log(`Failed to send job created notifications: ${String(e)}`, "notifications");
        }
      })();
      return res.status(201).json(newJob);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to create job" });
    }
  });

  // Update a job
  app.put("/api/jobs/:id", parseDates, async (req: Request, res: Response) => {
    try {
      const jobData = insertJobSchema.partial().parse(req.body);
      const updatedJob = await storage.updateJob(Number(req.params.id), jobData);
      
      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      return res.json(updatedJob);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to update job" });
    }
  });

  // Delete a job
  app.delete("/api/jobs/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteJob(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Job not found" });
    }
    return res.status(204).send();
  });

  // DEV: trigger reminder jobs manually
  app.post("/api/dev/run-job-reminders", async (_req: Request, res: Response) => {
    try {
      const { sendUpcomingJobReminders } = await import("./services/notifications");
      const count = await sendUpcomingJobReminders();
      return res.json({ sent: count });
    } catch (e) {
      log(`manual job reminders failed: ${String(e)}`, "notifications");
      return res.status(500).json({ message: "Failed to run job reminders" });
    }
  });

  app.post("/api/dev/run-renewal-reminders", async (_req: Request, res: Response) => {
    try {
      const { processPlanRenewalReminders } = await import("./services/notifications");
      const count = await processPlanRenewalReminders(7);
      return res.json({ sent: count });
    } catch (e) {
      log(`manual renewal reminders failed: ${String(e)}`, "notifications");
      return res.status(500).json({ message: "Failed to run renewal reminders" });
    }
  });

  // Complete a job (register job completion)
  app.post("/api/jobs/:id/complete", parseDates, async (req: Request, res: Response) => {
    try {
      const jobId = Number(req.params.id);
      const { completedDate, actualDuration, notes, photos } = req.body;
      
      // Validate required fields
      if (!completedDate || actualDuration === undefined) {
        return res.status(400).json({ message: "Completed date and actual duration are required" });
      }
      
      // Get the job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Update the job
      const updatedJob = await storage.updateJob(jobId, {
        status: "completed",
        completedDate: new Date(completedDate),
        actualDuration,
        notes: notes || job.notes,
        photos: photos || job.photos
      });
      
      return res.json(updatedJob);
    } catch (error) {
      console.error("Error completing job:", error);
      return res.status(500).json({ message: "Failed to complete job" });
    }
  });

  // JOB TYPE ROUTES
  // Get all job types
  app.get("/api/jobtypes", async (req: Request, res: Response) => {
    const jobTypes = await storage.getJobTypes();
    return res.json(jobTypes);
  });

  // Get a specific job type
  app.get("/api/jobtypes/:id", async (req: Request, res: Response) => {
    const jobType = await storage.getJobType(Number(req.params.id));
    if (!jobType) {
      return res.status(404).json({ message: "Job type not found" });
    }
    return res.json(jobType);
  });

  // Create a new job type
  app.post("/api/jobtypes", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Creating job type with data:', req.body);
      const jobTypeData = insertJobTypeSchema.parse(req.body);
      console.log('🔍 Validated job type data:', jobTypeData);
      const newJobType = await storage.createJobType(jobTypeData);
      console.log('✅ Job type created successfully:', newJobType);
      return res.status(201).json(newJobType);
    } catch (error) {
      console.error('❌ Error creating job type:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to create job type" });
    }
  });

  // Update a job type
  app.put("/api/jobtypes/:id", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Updating job type with data:', req.body);
      const jobTypeData = updateJobTypeSchema.parse(req.body);
      console.log('🔍 Validated job type data:', jobTypeData);
      const updatedJobType = await storage.updateJobType(Number(req.params.id), jobTypeData);
      if (!updatedJobType) {
        return res.status(404).json({ message: "Job type not found" });
      }
      console.log('✅ Job type updated successfully:', updatedJobType);
      return res.json(updatedJobType);
    } catch (error) {
      console.error('❌ Error updating job type:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to update job type" });
    }
  });

  // Delete a job type
  app.delete("/api/jobtypes/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteJobType(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Job type not found" });
    }
    return res.status(204).send();
  });

  // ACTIVITY ROUTES
  // Get all activities
  app.get("/api/activities", async (req: Request, res: Response) => {
    const activities = await storage.getActivities();
    return res.json(activities);
  });

  // Get activities by job type
  app.get("/api/jobtypes/:jobTypeId/activities", async (req: Request, res: Response) => {
    const jobTypeId = Number(req.params.jobTypeId);
    const activities = await storage.getActivitiesByJobType(jobTypeId);
    return res.json(activities);
  });

  // Get a specific activity
  app.get("/api/activities/:id", async (req: Request, res: Response) => {
    const activity = await storage.getActivity(Number(req.params.id));
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    return res.json(activity);
  });

  // Create a new activity
  app.post("/api/activities", async (req: Request, res: Response) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      
      // Check if primary job type exists
      if (activityData.jobTypeId) {
        const jobType = await storage.getJobType(activityData.jobTypeId);
        if (!jobType) {
          return res.status(400).json({ message: "Job type not found" });
        }
      }
      
      // Log the activity data for debugging
      log(`Creating activity: ${JSON.stringify(activityData)}`, "activities");
      
      // If jobTypeIds is provided as a string, try to parse it as JSON
      if (activityData.jobTypeIds && typeof activityData.jobTypeIds === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsedJobTypeIds = JSON.parse(activityData.jobTypeIds);
          // Validate that all job types exist
          if (Array.isArray(parsedJobTypeIds)) {
            for (const jobTypeId of parsedJobTypeIds) {
              const jobType = await storage.getJobType(Number(jobTypeId));
              if (!jobType) {
                return res.status(400).json({ message: `Job type with ID ${jobTypeId} not found` });
              }
            }
          }
        } catch (err) {
          // If parsing fails, it might be a comma-separated string or other format
          // We'll let the storage layer handle it
          log(`Error parsing jobTypeIds: ${err}`, "activities");
        }
      }
      
      const newActivity = await storage.createActivity(activityData);
      return res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error creating activity: ${error}`, "activities");
      return res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Update an activity
  app.put("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const activityData = insertActivitySchema.partial().parse(req.body);
      
      // If primary job type ID is provided, check if it exists
      if (activityData.jobTypeId) {
        const jobType = await storage.getJobType(activityData.jobTypeId);
        if (!jobType) {
          return res.status(400).json({ message: "Job type not found" });
        }
      }
      
      // Log the activity data for debugging
      log(`Updating activity ${req.params.id}: ${JSON.stringify(activityData)}`, "activities");
      
      // If jobTypeIds is provided as a string, try to parse it as JSON
      if (activityData.jobTypeIds && typeof activityData.jobTypeIds === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsedJobTypeIds = JSON.parse(activityData.jobTypeIds);
          // Validate that all job types exist
          if (Array.isArray(parsedJobTypeIds)) {
            for (const jobTypeId of parsedJobTypeIds) {
              const jobType = await storage.getJobType(Number(jobTypeId));
              if (!jobType) {
                return res.status(400).json({ message: `Job type with ID ${jobTypeId} not found` });
              }
            }
          }
        } catch (err) {
          // If parsing fails, it might be a comma-separated string or other format
          // We'll let the storage layer handle it
          log(`Error parsing jobTypeIds: ${err}`, "activities");
        }
      }
      
      const updatedActivity = await storage.updateActivity(Number(req.params.id), activityData);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      return res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error updating activity: ${error}`, "activities");
      return res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Delete an activity
  app.delete("/api/activities/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteActivity(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Activity not found" });
    }
    return res.status(204).send();
  });

  // ROLE ROUTES
  // Get all roles
  app.get("/api/roles", async (req: Request, res: Response) => {
    const roles = await storage.getRoles();
    return res.json(roles);
  });

  // Get a specific role
  app.get("/api/roles/:id", async (req: Request, res: Response) => {
    const role = await storage.getRole(Number(req.params.id));
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.json(role);
  });

  // Create a new role
  app.post("/api/roles", async (req: Request, res: Response) => {
    try {
      // Pre-process permissions to ensure they are properly formatted
      let { permissions, ...restData } = req.body;
      
      // Log the incoming data for debugging
      log(`Creating role with data: ${JSON.stringify(req.body)}`, "roles");
      
      // Handle different formats of permissions
      if (permissions) {
        // If permissions is a string, try to parse it as JSON
        if (typeof permissions === 'string') {
          try {
            permissions = JSON.parse(permissions);
          } catch (err) {
            log(`Failed to parse permissions JSON: ${err}`, "roles");
            return res.status(400).json({ message: "Invalid permissions format" });
          }
        }
        
        // Ensure permissions is an array
        if (!Array.isArray(permissions)) {
          permissions = Object.values(permissions);
        }
        
        // Validate that all permissions are strings
        if (!permissions.every((p: any) => typeof p === 'string')) {
          log(`Invalid permission types: ${JSON.stringify(permissions)}`, "roles");
          return res.status(400).json({ message: "All permissions must be strings" });
        }
      }
      
      // Transform sectorId from string to number if provided
      if (restData.sectorId !== undefined && restData.sectorId !== null) {
        restData.sectorId = restData.sectorId === "" ? null : Number(restData.sectorId);
      }
      
      // Prepare role data with properly formatted permissions
      const roleData = insertRoleSchema.parse({
        ...restData,
        permissions
      });
      
      const newRole = await storage.createRole(roleData);
      return res.status(201).json(newRole);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Role validation error: ${validationError.message}`, "roles");
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error creating role: ${error}`, "roles");
      return res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Update a role
  app.put("/api/roles/:id", async (req: Request, res: Response) => {
    try {
      // Pre-process permissions to ensure they are properly formatted
      let { permissions, ...restData } = req.body;
      
      // Log the incoming data for debugging
      log(`Updating role ${req.params.id} with data: ${JSON.stringify(req.body)}`, "roles");
      
      // If permissions is provided, handle different formats
      if (permissions !== undefined) {
        // If permissions is a string, try to parse it as JSON
        if (typeof permissions === 'string') {
          try {
            permissions = JSON.parse(permissions);
          } catch (err) {
            log(`Failed to parse permissions JSON: ${err}`, "roles");
            return res.status(400).json({ message: "Invalid permissions format" });
          }
        }
        
        // Ensure permissions is an array
        if (permissions && !Array.isArray(permissions)) {
          permissions = Object.values(permissions);
        }
        
        // Validate that all permissions are strings
        if (permissions && !permissions.every((p: any) => typeof p === 'string')) {
          log(`Invalid permission types: ${JSON.stringify(permissions)}`, "roles");
          return res.status(400).json({ message: "All permissions must be strings" });
        }
      }
      
      // Transform sectorId from string to number if provided
      if (restData.sectorId !== undefined && restData.sectorId !== null) {
        restData.sectorId = restData.sectorId === "" ? null : Number(restData.sectorId);
      }
      
      // Prepare role data with properly formatted permissions
      const roleData = insertRoleSchema.partial().parse({
        ...restData,
        permissions
      });
      
      const updatedRole = await storage.updateRole(Number(req.params.id), roleData);
      if (!updatedRole) {
        return res.status(404).json({ message: "Role not found" });
      }
      return res.json(updatedRole);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Role validation error: ${validationError.message}`, "roles");
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error updating role: ${error}`, "roles");
      return res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Delete a role
  app.delete("/api/roles/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteRole(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.status(204).send();
  });

  // COLLABORATOR ROUTES
  // Get all collaborators
  app.get("/api/collaborators", async (req: Request, res: Response) => {
    const collaborators = await storage.getCollaborators();
    
    // Get roles for each collaborator
    const collaboratorsWithRoles = await Promise.all(
      collaborators.map(async (collaborator) => {
        // Get primary role
        const primaryRole = collaborator.roleId ? await storage.getRole(collaborator.roleId) : null;
        
        // Get additional roles if roleIds field is present
        let additionalRoles: any[] = [];
        if (collaborator.roleIds) {
          try {
            // Try to parse roleIds as JSON
            const roleIdsArray = typeof collaborator.roleIds === 'string' 
              ? JSON.parse(collaborator.roleIds) 
              : collaborator.roleIds;
              
            if (Array.isArray(roleIdsArray)) {
              additionalRoles = await Promise.all(
                roleIdsArray
                  .filter(id => id !== collaborator.roleId) // Skip primary role
                  .map(async (roleId) => {
                    const role = await storage.getRole(Number(roleId));
                    return role ? { id: role.id, name: role.name } : null;
                  })
              );
              additionalRoles = additionalRoles.filter(Boolean); // Remove nulls
            }
          } catch (err) {
            log(`Error parsing roleIds for collaborator ${collaborator.id}: ${err}`, "collaborators");
          }
        }
        
        return {
          ...collaborator,
          primaryRole: primaryRole ? { id: primaryRole.id, name: primaryRole.name } : null,
          roles: [
            ...(primaryRole ? [{ id: primaryRole.id, name: primaryRole.name }] : []),
            ...additionalRoles
          ]
        };
      })
    );
    
    return res.json(collaboratorsWithRoles);
  });

  // Get collaborators by role
  app.get("/api/roles/:roleId/collaborators", async (req: Request, res: Response) => {
    const roleId = Number(req.params.roleId);
    
    // Get all collaborators
    const allCollaborators = await storage.getCollaborators();
    
    // Filter collaborators with this role (either as primary or additional)
    const collaborators = allCollaborators.filter(c => {
      // Check primary role
      if (c.roleId === roleId) return true;
      
      // Check additional roles
      if (c.roleIds) {
        try {
          const roleIdsArray = typeof c.roleIds === 'string' 
            ? JSON.parse(c.roleIds) 
            : c.roleIds;
            
          if (Array.isArray(roleIdsArray)) {
            return roleIdsArray.some(id => Number(id) === roleId);
          }
        } catch (err) {
          log(`Error parsing roleIds for collaborator ${c.id}: ${err}`, "collaborators");
        }
      }
      
      return false;
    });
    
    // Get roles for each collaborator
    const collaboratorsWithRoles = await Promise.all(
      collaborators.map(async (collaborator) => {
        const primaryRole = collaborator.roleId ? await storage.getRole(collaborator.roleId) : null;
        
        return {
          ...collaborator,
          primaryRole: primaryRole ? { id: primaryRole.id, name: primaryRole.name } : null
        };
      })
    );
    
    return res.json(collaboratorsWithRoles);
  });

  // Get a specific collaborator
  app.get("/api/collaborators/:id", async (req: Request, res: Response) => {
    const collaborator = await storage.getCollaborator(Number(req.params.id));
    if (!collaborator) {
      return res.status(404).json({ message: "Collaborator not found" });
    }
    
    // Get primary role info
    const primaryRole = collaborator.roleId ? await storage.getRole(collaborator.roleId) : null;
    
    // Get additional roles if roleIds field is present
    let additionalRoles: any[] = [];
    if (collaborator.roleIds) {
      try {
        // Try to parse roleIds as JSON
        const roleIdsArray = typeof collaborator.roleIds === 'string' 
          ? JSON.parse(collaborator.roleIds) 
          : collaborator.roleIds;
          
        if (Array.isArray(roleIdsArray)) {
          additionalRoles = await Promise.all(
            roleIdsArray
              .filter(id => id !== collaborator.roleId) // Skip primary role
              .map(async (roleId) => {
                const role = await storage.getRole(Number(roleId));
                return role ? { id: role.id, name: role.name } : null;
              })
          );
          additionalRoles = additionalRoles.filter(Boolean); // Remove nulls
        }
      } catch (err) {
        log(`Error parsing roleIds for collaborator ${collaborator.id}: ${err}`, "collaborators");
      }
    }
    
    return res.json({
      ...collaborator,
      primaryRole: primaryRole ? { id: primaryRole.id, name: primaryRole.name } : null,
      roles: [
        ...(primaryRole ? [{ id: primaryRole.id, name: primaryRole.name }] : []),
        ...additionalRoles
      ]
    });
  });

  // Create a new collaborator
  app.post("/api/collaborators", async (req: Request, res: Response) => {
    try {
      // Log incoming data for debugging
      log(`Creating collaborator with data: ${JSON.stringify(req.body)}`, "collaborators");
      
      // Handle numeric/formatted fields
      let { hourlyCost, roleIds, ...restData } = req.body;
      
      // Convert hourlyCost from string to number if needed
      if (hourlyCost && typeof hourlyCost === 'string') {
        hourlyCost = parseFloat(hourlyCost);
        if (isNaN(hourlyCost)) {
          hourlyCost = null;
        }
      }
      
      // Process roleIds (if provided)
      if (roleIds) {
        // If it's already an array, convert to JSON string
        if (Array.isArray(roleIds)) {
          roleIds = JSON.stringify(roleIds);
        } 
        // If it's a comma-separated string, convert to JSON array string
        else if (typeof roleIds === 'string' && roleIds.includes(',')) {
          const roleIdsArray = roleIds.split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
          roleIds = JSON.stringify(roleIdsArray);
        }
      }
      
      const collaboratorData = insertCollaboratorSchema.parse({
        ...restData,
        hourlyCost,
        roleIds
      });
      
      // Backward compatibility: estrai il primo ruolo dall'array roleIds come ruolo primario
      let primaryRoleId = null;
      try {
        if (collaboratorData.roleIds) {
          const roleIdsArray = JSON.parse(collaboratorData.roleIds);
          if (Array.isArray(roleIdsArray) && roleIdsArray.length > 0) {
            primaryRoleId = roleIdsArray[0];
          }
        }
      } catch (e) {
        log(`Error parsing roleIds: ${e}`, "collaborators");
      }
      
      // Check if roles exist (if provided)
      if (collaboratorData.roleIds) {
        try {
          const roleIdsArray = JSON.parse(collaboratorData.roleIds);
          if (Array.isArray(roleIdsArray)) {
            if (roleIdsArray.length === 0) {
              return res.status(400).json({ 
                message: "È necessario selezionare almeno un ruolo" 
              });
            }
            
            for (const roleId of roleIdsArray) {
              const role = await storage.getRole(Number(roleId));
              if (!role) {
                return res.status(400).json({ 
                  message: `Ruolo con ID ${roleId} non trovato` 
                });
              }
            }
          } else {
            return res.status(400).json({ 
              message: "Formato dei ruoli non valido" 
            });
          }
        } catch (err) {
          log(`Error validating roleIds: ${err}`, "collaborators");
          return res.status(400).json({ message: "Formato dei ruoli non valido" });
        }
      } else {
        return res.status(400).json({ 
          message: "È necessario selezionare almeno un ruolo" 
        });
      }
      
      // Generate a random activation token
      const activationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
      
      // Add the token to the collaborator data
      const collaboratorWithToken = {
        ...collaboratorData,
        activationToken,
        isActive: false
      };
      
      const newCollaborator = await storage.createCollaborator(collaboratorWithToken);
      
      // In a real application, we would send an email/WhatsApp with the activation link
      let activationLink = `${req.protocol}://${req.get('host')}/activate?token=${activationToken}`;
      
      let notificationSent = false;
      
      // Send notifications based on preferences
      if (collaboratorData.email && collaboratorData.notifyByEmail) {
        log(`MOCK EMAIL to ${collaboratorData.email}: Invito a unirti come collaboratore di ${newCollaborator.name}. Usa questo link per attivare il tuo account: ${activationLink}`, "collaborators");
        notificationSent = true;
      }
      
      if (collaboratorData.phone && collaboratorData.notifyByWhatsApp) {
        log(`MOCK WHATSAPP to ${collaboratorData.phone}: Sei stato invitato come collaboratore. Usa questo link per attivare il tuo account: ${activationLink}`, "collaborators");
        notificationSent = true;
      }
      
      return res.status(201).json({
        ...newCollaborator,
        activationLink,
        activationSent: notificationSent
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Collaborator validation error: ${validationError.message}`, "collaborators");
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error creating collaborator: ${error}`, "collaborators");
      return res.status(500).json({ message: "Failed to create collaborator" });
    }
  });

  // Update a collaborator
  app.put("/api/collaborators/:id", async (req: Request, res: Response) => {
    try {
      // Log incoming data for debugging
      log(`Updating collaborator ${req.params.id} with data: ${JSON.stringify(req.body)}`, "collaborators");
      
      // Handle numeric/formatted fields
      let { hourlyCost, roleIds, ...restData } = req.body;
      
      // Convert hourlyCost from string to number if needed
      if (hourlyCost !== undefined) {
        if (typeof hourlyCost === 'string') {
          hourlyCost = parseFloat(hourlyCost);
          if (isNaN(hourlyCost)) {
            hourlyCost = null;
          }
        }
      }
      
      // Process roleIds (if provided)
      if (roleIds !== undefined) {
        // If it's already an array, convert to JSON string
        if (Array.isArray(roleIds)) {
          roleIds = JSON.stringify(roleIds);
        } 
        // If it's a comma-separated string, convert to JSON array string
        else if (typeof roleIds === 'string' && roleIds.includes(',')) {
          const roleIdsArray = roleIds.split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
          roleIds = JSON.stringify(roleIdsArray);
        }
      }
      
      const collaboratorData = insertCollaboratorSchema.partial().parse({
        ...restData,
        hourlyCost,
        roleIds
      });
      
      // Check if roles exist (if provided)
      if (collaboratorData.roleIds) {
        try {
          const roleIdsArray = JSON.parse(collaboratorData.roleIds);
          if (Array.isArray(roleIdsArray)) {
            if (roleIdsArray.length === 0) {
              return res.status(400).json({ 
                message: "È necessario selezionare almeno un ruolo" 
              });
            }
            
            for (const roleId of roleIdsArray) {
              const role = await storage.getRole(Number(roleId));
              if (!role) {
                return res.status(400).json({ 
                  message: `Ruolo con ID ${roleId} non trovato` 
                });
              }
            }
          } else {
            return res.status(400).json({ 
              message: "Formato dei ruoli non valido" 
            });
          }
        } catch (err) {
          log(`Error validating roleIds: ${err}`, "collaborators");
          return res.status(400).json({ message: "Formato dei ruoli non valido" });
        }
      } else {
        // Verifica se è una modifica parziale (se il cliente non sta aggiornando i ruoli)
        const existingCollaborator = await storage.getCollaborator(Number(req.params.id));
        if (!existingCollaborator || !existingCollaborator.roleIds) {
          return res.status(400).json({ 
            message: "È necessario selezionare almeno un ruolo" 
          });
        }
      }
      
      const updatedCollaborator = await storage.updateCollaborator(Number(req.params.id), collaboratorData);
      if (!updatedCollaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }
      
      // Get roles info
      let allRoles: any[] = [];
      if (updatedCollaborator.roleIds) {
        try {
          // Try to parse roleIds as JSON
          const roleIdsArray = typeof updatedCollaborator.roleIds === 'string' 
            ? JSON.parse(updatedCollaborator.roleIds) 
            : updatedCollaborator.roleIds;
            
          if (Array.isArray(roleIdsArray)) {
            allRoles = await Promise.all(
              roleIdsArray.map(async (roleId) => {
                const role = await storage.getRole(Number(roleId));
                return role ? { id: role.id, name: role.name } : null;
              })
            );
            allRoles = allRoles.filter(Boolean); // Remove nulls
          }
        } catch (err) {
          log(`Error parsing roleIds for collaborator ${updatedCollaborator.id}: ${err}`, "collaborators");
        }
      }
      
      return res.json({
        ...updatedCollaborator,
        roles: allRoles
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Collaborator validation error: ${validationError.message}`, "collaborators");
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error updating collaborator: ${error}`, "collaborators");
      return res.status(500).json({ message: "Failed to update collaborator" });
    }
  });

  // Delete a collaborator
  app.delete("/api/collaborators/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteCollaborator(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Collaborator not found" });
    }
    return res.status(204).send();
  });
  
  // Activate a collaborator account
  app.post("/api/collaborators/activate", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Find collaborator by activation token
      const collaborators = await storage.getCollaborators();
      const collaborator = collaborators.find(c => c.activationToken === token);
      
      if (!collaborator) {
        return res.status(404).json({ message: "Invalid activation token" });
      }
      
      if (collaborator.isActive) {
        return res.status(400).json({ message: "Account already activated" });
      }
      
      // In a real application, we would hash the password
      // For this demo, we'll store it as is
      const updatedCollaborator = await storage.updateCollaborator(collaborator.id, {
        password,
        isActive: true,
        activationToken: null // Clear the token after activation
      });
      
      if (!updatedCollaborator) {
        return res.status(500).json({ message: "Failed to activate account" });
      }
      
      return res.json({
        message: "Account activated successfully",
        collaborator: {
          id: updatedCollaborator.id,
          name: updatedCollaborator.name,
          email: updatedCollaborator.email,
          phone: updatedCollaborator.phone,
          isActive: updatedCollaborator.isActive
        }
      });
    } catch (error) {
      console.error("Error activating account:", error);
      return res.status(500).json({ message: "Failed to activate account" });
    }
  });

  // JOB ACTIVITY ROUTES
  // Get activities for a job
  app.get("/api/jobs/:jobId/activities", async (req: Request, res: Response) => {
    const jobId = Number(req.params.jobId);
    const jobActivities = await storage.getJobActivitiesByJob(jobId);
    
    // Enhance with activity details and collaborators
    const enhancedActivities = await Promise.all(
      jobActivities.map(async (jobActivity) => {
        const activity = await storage.getActivity(jobActivity.activityId);
        const collaboratorIds = await storage.getCollaboratorsByActivity(jobActivity.activityId);
        const collaborators = await Promise.all(
          collaboratorIds.map(id => storage.getCollaborator(id))
        );
        
        return {
          ...jobActivity,
          activity,
          collaborators: collaborators.filter(Boolean)
        };
      })
    );
    
    return res.json(enhancedActivities);
  });

  // Create a new job activity
  app.post("/api/jobs/:jobId/activities", parseDates, async (req: Request, res: Response) => {
    try {
      const jobId = Number(req.params.jobId);
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const activityData = insertJobActivitySchema.parse({
        ...req.body,
        jobId
      });
      
      // Check if activity exists
      const activity = await storage.getActivity(activityData.activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      const newJobActivity = await storage.createJobActivity(activityData);
      
      // Assign collaborators if provided
      if (req.body.collaboratorIds && Array.isArray(req.body.collaboratorIds)) {
        for (const collaboratorId of req.body.collaboratorIds) {
          // Check if collaborator exists
          const collaborator = await storage.getCollaborator(collaboratorId);
          if (collaborator) {
            await storage.assignCollaboratorToActivity(activityData.activityId, collaboratorId);
          }
        }
      }
      
      return res.status(201).json(newJobActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating job activity:", error);
      return res.status(500).json({ message: "Failed to create job activity" });
    }
  });

  // Update a job activity
  app.put("/api/jobactivities/:id", parseDates, async (req: Request, res: Response) => {
    try {
      const jobActivityData = insertJobActivitySchema.partial().parse(req.body);
      
      // Check if activity exists if activityId is provided
      if (jobActivityData.activityId) {
        const activity = await storage.getActivity(jobActivityData.activityId);
        if (!activity) {
          return res.status(404).json({ message: "Activity not found" });
        }
      }
      
      const updatedJobActivity = await storage.updateJobActivity(Number(req.params.id), jobActivityData);
      if (!updatedJobActivity) {
        return res.status(404).json({ message: "Job activity not found" });
      }
      
      // Update collaborators if provided
      if (req.body.collaboratorIds && Array.isArray(req.body.collaboratorIds)) {
        // Get current collaborators
        const currentCollaboratorIds = await storage.getCollaboratorsByActivity(updatedJobActivity.activityId);
        
        // Remove collaborators not in the new list
        for (const currentId of currentCollaboratorIds) {
          if (!req.body.collaboratorIds.includes(currentId)) {
            await storage.removeCollaboratorFromActivity(updatedJobActivity.activityId, currentId);
          }
        }
        
        // Add new collaborators
        for (const newId of req.body.collaboratorIds) {
          if (!currentCollaboratorIds.includes(newId)) {
            // Check if collaborator exists
            const collaborator = await storage.getCollaborator(newId);
            if (collaborator) {
              await storage.assignCollaboratorToActivity(updatedJobActivity.activityId, newId);
            }
          }
        }
      }
      
      return res.json(updatedJobActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to update job activity" });
    }
  });

  // Delete a job activity
  app.delete("/api/jobactivities/:id", async (req: Request, res: Response) => {
    const result = await storage.deleteJobActivity(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Job activity not found" });
    }
    return res.status(204).send();
  });

  // Complete a job activity
  app.post("/api/jobactivities/:id/complete", parseDates, async (req: Request, res: Response) => {
    try {
      const jobActivityId = Number(req.params.id);
      const { completedDate, actualDuration, notes, photos } = req.body;
      
      // Validate required fields
      if (!completedDate || actualDuration === undefined) {
        return res.status(400).json({ message: "Completed date and actual duration are required" });
      }
      
      // Get the job activity
      const jobActivity = await storage.getJobActivity(jobActivityId);
      if (!jobActivity) {
        return res.status(404).json({ message: "Job activity not found" });
      }
      
      // Update the job activity
      const updatedJobActivity = await storage.updateJobActivity(jobActivityId, {
        status: "completed",
        completedDate: new Date(completedDate),
        actualDuration,
        notes: notes || jobActivity.notes,
        photos: photos || jobActivity.photos
      });
      
      return res.json(updatedJobActivity);
    } catch (error) {
      console.error("Error completing job activity:", error);
      return res.status(500).json({ message: "Failed to complete job activity" });
    }
  });

  // DASHBOARD STATS
  // Get stats for dashboard
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      const jobs = await storage.getJobs();
      
      const activeJobs = jobs.filter(job => job.status === "scheduled" || job.status === "in_progress").length;
      const completedJobs = jobs.filter(job => job.status === "completed").length;
      
      // Calculate monthly income (completed jobs in the current month)
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const completedJobsInMonth = jobs.filter(job => {
        const jobDate = new Date(job.startDate);
        return job.status === "completed" && 
              jobDate >= firstDayOfMonth && 
              jobDate <= lastDayOfMonth;
      });
      
      const monthlyIncome = completedJobsInMonth.reduce((sum, job) => {
        const laborCost = parseFloat(job.hourlyRate) * parseFloat(job.duration);
        return sum + laborCost + (job.materialsCost ? parseFloat(job.materialsCost) : 0);
      }, 0);
      
      // Get today's jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayJobs = jobs.filter(job => {
        const jobDate = new Date(job.startDate);
        jobDate.setHours(0, 0, 0, 0);
        return jobDate.getTime() === today.getTime();
      });
      
      // Get clients for today's jobs
      const todayJobsWithClients = await Promise.all(
        todayJobs.map(async (job) => {
          const client = await storage.getClient(job.clientId);
          return {
            ...job,
            client: client ? { id: client.id, name: client.name } : { name: "Unknown Client" }
          };
        })
      );
      
      return res.json({
        stats: {
          activeJobs,
          totalClients: clients.length,
          completedJobs,
          monthlyIncome: Math.round(monthlyIncome * 100) / 100
        },
        todayJobs: todayJobsWithClients
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Subscription Plan endpoints
  
  // Get all subscription plans
  app.get("/api/subscription-plans", async (req: Request, res: Response) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      return res.json(plans);
    } catch (error) {
      log(`Error fetching subscription plans: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get a specific subscription plan
  app.get("/api/subscription-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getSubscriptionPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      return res.json(plan);
    } catch (error) {
      log(`Error fetching subscription plan: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to fetch subscription plan" });
    }
  });

  // Create a new subscription plan
  app.post("/api/subscription-plans", async (req: Request, res: Response) => {
    try {
      log(`Creating subscription plan with data: ${JSON.stringify(req.body)}`, "subscription");
      
      // Transform numeric prices to strings if needed
      const transformedData = { ...req.body };
      if (transformedData.monthlyPrice !== undefined && transformedData.monthlyPrice !== null) {
        transformedData.monthlyPrice = transformedData.monthlyPrice.toString();
      }
      if (transformedData.yearlyPrice !== undefined && transformedData.yearlyPrice !== null) {
        transformedData.yearlyPrice = transformedData.yearlyPrice.toString();
      }
      
      const validatedData = insertSubscriptionPlanSchema.parse(transformedData);
      const plan = await storage.createSubscriptionPlan(validatedData);
      
      return res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Subscription plan validation error: ${validationError.message}`, "subscription");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error creating subscription plan: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update a subscription plan
  app.put("/api/subscription-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      log(`Updating subscription plan ${id} with data: ${JSON.stringify(req.body)}`, "subscription");
      
      // Transform numeric prices to strings if needed
      const transformedData = { ...req.body };
      if (transformedData.monthlyPrice !== undefined && transformedData.monthlyPrice !== null) {
        transformedData.monthlyPrice = transformedData.monthlyPrice.toString();
      }
      if (transformedData.yearlyPrice !== undefined && transformedData.yearlyPrice !== null) {
        transformedData.yearlyPrice = transformedData.yearlyPrice.toString();
      }
      
      const validatedData = insertSubscriptionPlanSchema.partial().parse(transformedData);
      const updatedPlan = await storage.updateSubscriptionPlan(id, validatedData);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      return res.json(updatedPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Subscription plan validation error: ${validationError.message}`, "subscription");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error updating subscription plan: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete a subscription plan
  app.delete("/api/subscription-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSubscriptionPlan(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      log(`Error deleting subscription plan: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });
  
  // User Subscription endpoints
  
  // Get all user subscriptions
  app.get("/api/user-subscriptions", async (req: Request, res: Response) => {
    try {
      const subscriptions = await storage.getUserSubscriptions();
      return res.json(subscriptions);
    } catch (error) {
      log(`Error fetching user subscriptions: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to fetch user subscriptions" });
    }
  });

  // Get a specific user subscription
  app.get("/api/user-subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const subscription = await storage.getUserSubscription(id);
      
      if (!subscription) {
        return res.status(404).json({ message: "User subscription not found" });
      }
      
      return res.json(subscription);
    } catch (error) {
      log(`Error fetching user subscription: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to fetch user subscription" });
    }
  });

  // Get subscription by user ID
  app.get("/api/users/:userId/subscription", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscriptionByUserId(userId);
      
      if (!subscription) {
        return res.status(404).json({ message: "User subscription not found" });
      }
      
      return res.json(subscription);
    } catch (error) {
      log(`Error fetching user subscription: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to fetch user subscription" });
    }
  });

  // Create a new user subscription
  app.post("/api/user-subscriptions", async (req: Request, res: Response) => {
    try {
      log(`Creating user subscription with data: ${JSON.stringify(req.body)}`, "subscription");
      
      // Normalize ISO date strings to Date instances if needed
      const transformed = { ...req.body } as any;
      if (typeof transformed.startDate === 'string') transformed.startDate = new Date(transformed.startDate);
      if (typeof transformed.endDate === 'string') transformed.endDate = new Date(transformed.endDate);
      if (typeof transformed.lastBillingDate === 'string') transformed.lastBillingDate = new Date(transformed.lastBillingDate);
      if (typeof transformed.nextBillingDate === 'string') transformed.nextBillingDate = new Date(transformed.nextBillingDate);

      const validatedData = insertUserSubscriptionSchema.parse(transformed);
      const subscription = await storage.createUserSubscription(validatedData);
      
      return res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`User subscription validation error: ${validationError.message}`, "subscription");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error creating user subscription: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to create user subscription" });
    }
  });

  // Update a user subscription
  app.put("/api/user-subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      log(`Updating user subscription ${id} with data: ${JSON.stringify(req.body)}`, "subscription");
      
      // Normalize ISO date strings to Date instances if needed
      const transformed = { ...req.body } as any;
      if (typeof transformed.startDate === 'string') transformed.startDate = new Date(transformed.startDate);
      if (typeof transformed.endDate === 'string') transformed.endDate = new Date(transformed.endDate);
      if (typeof transformed.lastBillingDate === 'string') transformed.lastBillingDate = new Date(transformed.lastBillingDate);
      if (typeof transformed.nextBillingDate === 'string') transformed.nextBillingDate = new Date(transformed.nextBillingDate);

      const validatedData = insertUserSubscriptionSchema.partial().parse(transformed);
      const updatedSubscription = await storage.updateUserSubscription(id, validatedData);
      
      if (!updatedSubscription) {
        return res.status(404).json({ message: "User subscription not found" });
      }
      
      return res.json(updatedSubscription);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`User subscription validation error: ${validationError.message}`, "subscription");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error updating user subscription: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to update user subscription" });
    }
  });

  // Delete a user subscription
  app.delete("/api/user-subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUserSubscription(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User subscription not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      log(`Error deleting user subscription: ${error}`, "subscription");
      return res.status(500).json({ message: "Failed to delete user subscription" });
    }
  });

  // Plan Configuration endpoints
  
  // Get all plan configurations
  app.get("/api/plan-configurations", async (req: Request, res: Response) => {
    try {
      const configs = await storage.getPlanConfigurations();
      return res.json(configs);
    } catch (error) {
      log(`Error fetching plan configurations: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to fetch plan configurations" });
    }
  });

  // Get plan configuration by ID
  app.get("/api/plan-configurations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getPlanConfiguration(id);
      
      if (!config) {
        return res.status(404).json({ message: "Plan configuration not found" });
      }
      
      return res.json(config);
    } catch (error) {
      log(`Error fetching plan configuration: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to fetch plan configuration" });
    }
  });

  // Get plan configuration by user ID
  app.get("/api/users/:userId/plan-configuration", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const config = await storage.getPlanConfigurationByUser(userId);
      
      if (!config) {
        return res.status(404).json({ message: "Plan configuration not found for user" });
      }
      
      return res.json(config);
    } catch (error) {
      log(`Error fetching user plan configuration: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to fetch user plan configuration" });
    }
  });

  // Create a new plan configuration
  app.post("/api/plan-configurations", async (req: Request, res: Response) => {
    try {
      log(`Creating plan configuration with data: ${JSON.stringify(req.body)}`, "plan-config");
      
      // Transform features object to JSON string if needed
      const transformedData = { ...req.body };
      if (transformedData.features && typeof transformedData.features === 'object') {
        transformedData.features = JSON.stringify(transformedData.features);
      }
      
      const validatedData = insertPlanConfigurationSchema.parse(transformedData);
      const config = await storage.createPlanConfiguration(validatedData);
      
      return res.status(201).json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Plan configuration validation error: ${validationError.message}`, "plan-config");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error creating plan configuration: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to create plan configuration" });
    }
  });

  // Update a plan configuration
  app.put("/api/plan-configurations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      log(`Updating plan configuration ${id} with data: ${JSON.stringify(req.body)}`, "plan-config");
      
      // Transform features object to JSON string if needed
      const transformedData = { ...req.body };
      if (transformedData.features && typeof transformedData.features === 'object') {
        transformedData.features = JSON.stringify(transformedData.features);
      }
      
      const validatedData = insertPlanConfigurationSchema.partial().parse(transformedData);
      const updatedConfig = await storage.updatePlanConfiguration(id, validatedData);
      
      if (!updatedConfig) {
        return res.status(404).json({ message: "Plan configuration not found" });
      }
      
      return res.json(updatedConfig);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        log(`Plan configuration validation error: ${validationError.message}`, "plan-config");
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error updating plan configuration: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to update plan configuration" });
    }
  });

  // Delete a plan configuration
  app.delete("/api/plan-configurations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePlanConfiguration(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Plan configuration not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      log(`Error deleting plan configuration: ${error}`, "plan-config");
      return res.status(500).json({ message: "Failed to delete plan configuration" });
    }
  });

  // General Settings endpoints
  app.get("/api/admin/settings/general", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getGeneralSettings();
      return res.json(settings || null);
    } catch (error) {
      log(`Error fetching general settings: ${error}`, "general-settings");
      return res.status(500).json({ message: "Failed to fetch general settings" });
    }
  });

  app.put("/api/admin/settings/general", async (req: Request, res: Response) => {
    try {
      const validated = insertGeneralSettingsSchema.parse(req.body);
      const saved = await storage.upsertGeneralSettings(validated);
      return res.json(saved);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      log(`Error saving general settings: ${error}`, "general-settings");
      return res.status(500).json({ message: "Failed to save general settings" });
    }
  });

  // ADMIN AUTH ROUTES
  // Admin login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // First, try Super Admin credentials
      const ADMIN_USERNAME = "admin";
      const ADMIN_PASSWORD_HASH = crypto.createHash('sha256').update("adminpassword").digest('hex');
      
      if (username === ADMIN_USERNAME) {
        // Check if password matches Super Admin
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        if (hashedPassword === ADMIN_PASSWORD_HASH) {
          // Create Super Admin session
          if (!req.session) {
            return res.status(500).json({ message: "Session not available" });
          }
          
          req.session.admin = {
            isAuthenticated: true,
            username: ADMIN_USERNAME,
            role: "superadmin"
          };
          
          return res.status(200).json({ 
            message: "Login successful",
            user: {
              username: ADMIN_USERNAME,
              role: "superadmin"
            }
          });
        }
      }
      
      // If not Super Admin, check if it's an Administrator (Artisan)
      try {
        log(`Checking for administrator user: ${username}`, "admin");
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          log(`User not found: ${username}`, "admin");
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        log(`User found: ${username}, type: ${user.type}`, "admin");
        
        // Check if user is an administrator type
        if (user.type !== 'admin' && user.type !== 'administrator') {
          log(`User type not allowed: ${user.type}`, "admin");
          return res.status(401).json({ message: "Access denied. Administrator privileges required." });
        }
        
        // Check password (using the same hashing method as user registration)
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        log(`Password check - Input hash: ${hashedPassword}, Stored hash: ${user.password}`, "admin");
        
        if (hashedPassword !== user.password) {
          log(`Password mismatch for user: ${username}`, "admin");
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Create Administrator session
        if (!req.session) {
          return res.status(500).json({ message: "Session not available" });
        }
        
        req.session.admin = {
          isAuthenticated: true,
          username: user.username,
          role: "administrator"
        };
        
        return res.status(200).json({ 
          message: "Login successful",
          user: {
            username: user.username,
            role: "administrator",
            fullName: user.fullName,
            email: user.email
          }
        });
        
      } catch (dbError) {
        log(`Database error during admin login: ${dbError}`, "admin");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
    } catch (error) {
      log(`Admin login error: ${error}`, "admin");
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // Check admin session
  app.get("/api/admin/session", (req: Request, res: Response) => {
    if (req.session && req.session.admin && req.session.admin.isAuthenticated) {
      return res.status(200).json({
        isAuthenticated: true,
        user: {
          username: req.session.admin.username,
          role: req.session.admin.role
        }
      });
    }
    
    return res.status(401).json({
      isAuthenticated: false
    });
  });

  // Admin logout
  app.post("/api/admin/logout", (req: Request, res: Response) => {
    if (req.session && req.session.admin) {
      req.session.admin = undefined;
      req.session.destroy((err) => {
        if (err) {
          log(`Error destroying session: ${err}`, "admin");
          return res.status(500).json({ message: "Logout failed" });
        }
        res.status(200).json({ message: "Logout successful" });
      });
    } else {
      res.status(200).json({ message: "Already logged out" });
    }
  });

  // Clients API endpoints
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      // In a real app, you'd filter by the authenticated user's business
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      log(`Error fetching clients: ${error}`, "clients");
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const clientData = req.body;
      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      log(`Error creating client: ${error}`, "clients");
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clientData = req.body;
      const updatedClient = await storage.updateClient(parseInt(id), clientData);
      res.json(updatedClient);
    } catch (error) {
      log(`Error updating client: ${error}`, "clients");
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(parseInt(id));
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      log(`Error deleting client: ${error}`, "clients");
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Jobs API endpoints
  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      // In a real app, you'd filter by the authenticated user's business
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      log(`Error fetching jobs: ${error}`, "jobs");
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", async (req: Request, res: Response) => {
    try {
      const jobData = req.body;
      const newJob = await storage.createJob(jobData);
      res.status(201).json(newJob);
    } catch (error) {
      log(`Error creating job: ${error}`, "jobs");
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.put("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const jobData = req.body;
      const updatedJob = await storage.updateJob(parseInt(id), jobData);
      res.json(updatedJob);
    } catch (error) {
      log(`Error updating job: ${error}`, "jobs");
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteJob(parseInt(id));
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      log(`Error deleting job: ${error}`, "jobs");
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Statistiche per admin dashboard
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    try {
      // Verifica autenticazione admin (temporaneamente disabilitata per sviluppo)
      // if (!req.session || !req.session.admin || !req.session.admin.isAuthenticated) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }
      
      // Ottenere i dati necessari
      const users = await storage.getUsers();
      const clients = await storage.getClients();
      const jobs = await storage.getJobs();
      const subscriptions = await storage.getUserSubscriptions();
      
      // Calcola le statistiche delle sottoscrizioni
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const activeSubscriptions = subscriptions.filter(sub => 
        sub.status === 'active' || sub.status === 'trial'
      ).length;
      
      const expiringSoon = subscriptions.filter(sub => {
        if (!sub.endDate) return false;
        const endDate = new Date(sub.endDate);
        return endDate > today && endDate < thirtyDaysFromNow;
      }).length;
      
      // Calcola dati reali per i ricavi dai job completati
      const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Inizializza i dati mensili
      const revenueMonthlyMap = new Map();
      monthNames.forEach((month, index) => {
        revenueMonthlyMap.set(index, { month, value: 0 });
      });
      
      // Calcola i guadagni dai lavori completati
      jobs.forEach(job => {
        if (job.status === 'completed' && job.completedDate) {
          const completedDate = new Date(job.completedDate);
          // Solo i lavori di quest'anno
          if (completedDate.getFullYear() === currentYear) {
            const month = completedDate.getMonth();
            const monthData = revenueMonthlyMap.get(month);
            if (monthData) {
              // Somma il costo totale del lavoro (materiali + orario)
              const jobTotal = (Number(job.cost) || 0) + (Number(job.laborCost) || 0) + (Number(job.materialsCost) || 0);
              monthData.value += jobTotal;
              revenueMonthlyMap.set(month, monthData);
            }
          }
        }
      });
      
      // Converti la mappa in array
      const revenueMonthly = Array.from(revenueMonthlyMap.values());
      const totalRevenue = revenueMonthly.reduce((sum, item) => sum + Number(item.value), 0);
      
      // Calcola nuovi utenti questo mese
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const newUsersThisMonth = clients.filter(client => {
        if (!client.createdAt) return false;
        const createdAt = new Date(client.createdAt);
        return createdAt >= firstDayOfMonth;
      }).length;
      
      const pendingSubscriptions = subscriptions.filter(sub => 
        sub.status === 'pending'
      ).length;
      
      // Get recent login events from database
      let recentLogins: any[] = [];
      try {
        const connection = await mysql.createConnection({
          host: "localhost",
          user: "root",
          password: "",
          database: "projectpro",
        });
        
        const [loginRows] = await connection.execute(`
          SELECT le.user_id, le.username, le.user_type, le.login_time, le.ip_address, le.user_agent
          FROM login_events le
          ORDER BY le.login_time DESC
          LIMIT 10
        `);
        recentLogins = Array.isArray(loginRows) ? loginRows : [];
        await connection.end();
      } catch (error) {
        console.error("Error fetching recent logins:", error);
        recentLogins = [];
      }
      
      
      return res.json({
        totalUsers: clients.length,
        newUsersThisMonth,
        activeSubscriptions,
        pendingSubscriptions,
        expiringSoon,
        revenueMonthly,
        totalRevenue,
        recentLogins: recentLogins || []
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return res.status(500).json({ message: "Error fetching statistics" });
    }
  });
  
  // Endpoint per statistiche avanzate
  app.get("/api/admin/stats/advanced", async (req: Request, res: Response) => {
    try {
      // Verifica autenticazione admin (temporaneamente disabilitata per sviluppo)
      // if (!req.session || !req.session.admin || !req.session.admin.isAuthenticated) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }
      
      // Parametri di filtro
      const period = req.query.period as string || 'month';
      const sectorId = req.query.sector === 'all' ? null : parseInt(req.query.sector as string);
      const planId = req.query.plan === 'all' ? null : parseInt(req.query.plan as string);
      const clientType = req.query.clientType as string || 'all';
      
      // Recupero dei dati
      const clients = await storage.getClients();
      const jobs = await storage.getJobs();
      const sectors = await storage.getSectors();
      const plans = await storage.getSubscriptionPlans();
      const subscriptions = await storage.getUserSubscriptions();
      const activities = await storage.getActivities();
      const jobActivities = await storage.getJobActivities();
      
      // Calcola la data di inizio basata sul periodo
      const today = new Date();
      let startDate = new Date();
      switch (period) {
        case 'week':
          startDate = new Date(today.setDate(today.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(today.setMonth(today.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(today.setMonth(today.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(today.setFullYear(today.getFullYear() - 1));
          break;
        case 'all':
          startDate = new Date(0); // Dal 1970
          break;
      }
      
      // Filtra i clienti in base ai parametri
      const filteredClients = clients.filter(client => {
        // Filtra per tipo
        if (clientType !== 'all' && client.type !== clientType) {
          return false;
        }
        
        // Filtra per settore (se fosse implementato)
        return true;
      });
      
      // Filtra i lavori per il periodo selezionato
      const filteredJobs = jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        return jobDate >= startDate;
      });
      
      // Filtra le iscrizioni
      const filteredSubscriptions = subscriptions.filter(sub => {
        // Filtra per piano
        if (planId && sub.planId !== planId) {
          return false;
        }
        
        const subDate = new Date(sub.createdAt || new Date());
        return subDate >= startDate;
      });
      
      // Calcola statistiche per i clienti
      const clientsTotal = filteredClients.length;
      const clientsActive = filteredClients.filter(client => {
        // Assumi che tutti i clienti sono attivi per ora
        return true;
      }).length;
      
      const clientsNew = filteredClients.filter(client => {
        if (!client.createdAt) return false;
        const createdAt = new Date(client.createdAt);
        return createdAt >= startDate;
      }).length;
      
      // Prepara statistiche per settore
      const clientsBySector = sectors.map(sector => {
        // Qui potremmo filtrare i clienti per settore se avessimo l'associazione
        // Per ora generiamo un numero casuale tra 1 e il numero totale di clienti
        const count = Math.floor(Math.random() * clientsTotal) + 1;
        return {
          name: sector.name,
          value: count
        };
      });
      
      // Prepara statistiche per piano di abbonamento
      const clientsByPlan = plans.map(plan => {
        const count = filteredSubscriptions.filter(sub => sub.planId === plan.id).length;
        return {
          name: plan.name,
          value: count
        };
      });
      
      // Calcola statistiche abbonamenti
      const subsTotal = filteredSubscriptions.length;
      const subsActive = filteredSubscriptions.filter(sub => 
        sub.status === 'active' || sub.status === 'trial'
      ).length;
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const subsExpiringSoon = filteredSubscriptions.filter(sub => {
        if (!sub.endDate) return false;
        const endDate = new Date(sub.endDate);
        // Deve scadere nei prossimi 30 giorni e non essere già scaduto
        return endDate <= thirtyDaysFromNow && endDate >= new Date();
      }).length;
      
      // Statistiche per tipo di abbonamento
      const subsByType = plans.map(plan => {
        const count = filteredSubscriptions.filter(sub => sub.planId === plan.id).length;
        return {
          name: plan.name,
          value: count
        };
      });
      
      // Trend degli abbonamenti
      const months = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.unshift(date);
      }
      
      const subsTrend = months.map(date => {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const activeInMonth = filteredSubscriptions.filter(sub => {
          const startDate = sub.startDate ? new Date(sub.startDate) : null;
          // Abbonamento attivo durante il mese
          return startDate && startDate <= monthEnd && 
                (!sub.endDate || new Date(sub.endDate) >= monthStart);
        }).length;
        
        const newInMonth = filteredSubscriptions.filter(sub => {
          if (!sub.startDate) return false;
          const startDate = new Date(sub.startDate);
          return startDate.getMonth() === date.getMonth() && 
                 startDate.getFullYear() === date.getFullYear();
        }).length;
        
        const expiringInMonth = filteredSubscriptions.filter(sub => {
          if (!sub.endDate) return false;
          const endDate = new Date(sub.endDate);
          return endDate.getMonth() === date.getMonth() && 
                 endDate.getFullYear() === date.getFullYear();
        }).length;
        
        return {
          date: date.toISOString().split('T')[0],
          active: activeInMonth,
          new: newInMonth,
          expiring: expiringInMonth
        };
      });
      
      // Calcola statistiche ricavi
      // Totale ricavi da lavori completati nel periodo
      let revenueTotal = 0;
      let revenueMonthly = 0;
      
      filteredJobs.forEach(job => {
        if (job.status === 'completed') {
          // Somma il costo totale del lavoro
          const jobTotal = (job.materialsCost ? parseFloat(job.materialsCost) : 0) + (parseFloat(job.hourlyRate) * parseFloat(job.duration));
          revenueTotal += jobTotal;
          
          // Verifica se è stato completato nell'ultimo mese
          if (job.completedDate) {
            const completedDate = new Date(job.completedDate);
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            
            if (completedDate >= lastMonth) {
              revenueMonthly += jobTotal;
            }
          }
        }
      });
      
      // Trend dei ricavi
      const revenueTrend = months.map(date => {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        let monthlyRevenue = 0;
        filteredJobs.forEach(job => {
          if (job.status === 'completed' && job.completedDate) {
            const completedDate = new Date(job.completedDate);
            if (completedDate >= monthStart && completedDate <= monthEnd) {
              // Somma il costo totale del lavoro
              const jobTotal = (job.materialsCost ? parseFloat(job.materialsCost) : 0) + (parseFloat(job.hourlyRate) * parseFloat(job.duration));
              monthlyRevenue += jobTotal;
            }
          }
        });
        
        return {
          date: date.toISOString().split('T')[0],
          value: monthlyRevenue
        };
      });
      
      // Statistiche di utilizzo (per esempio basate su attività)
      const avgSessionDuration = 35; // Esempio in minuti
      const avgSessionsPerUser = 12; // Esempio
      
      // Trend delle sessioni
      const sessionTrend = months.map(date => {
        return {
          date: date.toISOString().split('T')[0],
          duration: Math.floor(Math.random() * 10) + 30, // Da 30 a 40 minuti
          count: Math.floor(Math.random() * 5) + 10 // Da 10 a 15 sessioni
        };
      });
      
      return res.json({
        subscriptionsStats: {
          total: subsTotal,
          active: subsActive,
          expiringSoon: subsExpiringSoon,
          byType: subsByType,
          trend: subsTrend
        },
        clientsStats: {
          total: clientsTotal,
          active: clientsActive,
          new: clientsNew,
          bySector: clientsBySector,
          byPlan: clientsByPlan
        },
        revenueStats: {
          total: revenueTotal,
          monthly: revenueMonthly,
          trend: revenueTrend
        },
        usageStats: {
          avgSessionDuration,
          avgSessionsPerUser,
          sessionTrend
        },
        sectors: sectors,
        plans: plans
      });
    } catch (error) {
      console.error("Error fetching advanced stats:", error);
      return res.status(500).json({ message: "Error fetching advanced statistics" });
    }
  });
  
  // Admin logout
  app.post("/api/admin/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.admin = undefined;
      return res.status(200).json({ message: "Logout successful" });
    }
    
    return res.status(500).json({ message: "Session not available" });
  });
  
  // Get all users (administrators and mobile users)
  app.get("/api/administrators", async (req: Request, res: Response) => {
    try {
      // Temporaneamente commentato per sviluppo
      // Verifica autenticazione admin
      // if (!req.session.admin || !req.session.admin.isAuthenticated) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }
      
      // Ottieni tutti gli utenti dal database
      const allUsers = await storage.getUsers();
      
      // Filtra e formatta gli utenti per l'interfaccia di amministrazione
      const administrators = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        isActive: user.isActive !== undefined ? user.isActive : true,
        // roleIds: user.roleIds, // This field doesn't exist in the schema
        language: user.language,
        // Aggiungiamo altre proprietà rilevanti
        type: user.type || "admin"
      }));
      
      return res.json(administrators);
    } catch (error) {
      console.error("Error fetching administrators:", error);
      return res.status(500).json({ message: "Error fetching administrators" });
    }
  });
  
  // Get a specific administrator by ID
  app.get("/api/administrators/:id", async (req: Request, res: Response) => {
    try {
      // Temporaneamente commentato per sviluppo
      // Verifica autenticazione admin
      // if (!req.session.admin || !req.session.admin.isAuthenticated) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }
      
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching administrator:", error);
      return res.status(500).json({ message: "Error fetching administrator" });
    }
  });
  
  // Create a new administrator
  app.post("/api/administrators", async (req: Request, res: Response) => {
    try {
      // Verifica autenticazione admin
      if (!req.session.admin || !req.session.admin.isAuthenticated) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userData = req.body;
      
      // Controlla se l'utente esiste già
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Crea il nuovo utente
      const newUser = await storage.createUser({
        ...userData,
        type: "admin",
        isActive: userData.isActive !== undefined ? userData.isActive : true
      });
      
      // Rimuovi la password dalla risposta
      const { password, ...userWithoutPassword } = newUser;
      
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating administrator:", error);
      return res.status(500).json({ message: "Error creating administrator" });
    }
  });
  
  // Update an administrator
  app.put("/api/administrators/:id", async (req: Request, res: Response) => {
    try {
      // Verifica autenticazione admin (temporaneamente disabilitata per sviluppo)
      // if (!req.session.admin || !req.session.admin.isAuthenticated) {
      //  return res.status(401).json({ message: "Unauthorized" });
      // }
      
      const userId = Number(req.params.id);
      const userData = req.body;
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      // Rimuovi la password dalla risposta
      const { password, ...userWithoutPassword } = updatedUser;
      
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating administrator:", error);
      return res.status(500).json({ message: "Error updating administrator" });
    }
  });
  
  // Delete an administrator
  app.delete("/api/administrators/:id", async (req: Request, res: Response) => {
    try {
      // Verifica autenticazione admin (temporaneamente disabilitata per sviluppo)
      // if (!req.session.admin || !req.session.admin.isAuthenticated) {
      //  return res.status(401).json({ message: "Unauthorized" });
      // }
      
      const userId = Number(req.params.id);
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting administrator:", error);
      return res.status(500).json({ message: "Error deleting administrator" });
    }
  });

  // Registra le rotte per l'app mobile sotto /api/mobile per evitare conflitti
  app.use("/api/mobile", mobileRoutes);
  app.use("/api/stripe", stripeRoutes);
  
  // Usa le rotte di amministrazione
  app.use("/api/admin", isAdminMiddleware, adminRoutes);
  
  // DEMO ROUTES - Feature Visibility System
  app.post("/api/demo/setup-restrictive-config", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Create a restrictive plan configuration for user ID 1 (Marco)
      const restrictiveConfig = {
        userId: 1,
        planId: 2, // Updated to match user's actual plan
        features: JSON.stringify({
          visible_fields: {
            clients: ['name', 'email'], // Only show name and email for clients
            jobs: ['title', 'description', 'startDate', 'endDate', 'status'], // Only show basic job fields
            collaborators: [], // No collaborator fields visible
            profile: [], // No profile fields visible
            dashboard: [], // No dashboard fields visible
            registration: [] // No registration fields visible
          },
          permissions: {
            create_clients: false,
            edit_clients: false,
            delete_clients: false,
            create_jobs: false,
            edit_jobs: false,
            delete_jobs: false,
            // Collaborator permissions
            'collaborator.create': false,
            'collaborator.edit': false,
            'collaborator.delete': false,
            'collaborator.assign': false,
            // Settings permissions
            'settings.view': false,
            'settings.edit': false
          }
        }),
        isActive: true
      };
      
      // Check if configuration already exists
      const existingConfig = await db.select().from(planConfigurations)
        .where(eq(planConfigurations.userId, 1))
        .limit(1);
      
      if (existingConfig.length > 0) {
        // Update existing configuration
        await db.update(planConfigurations)
          .set(restrictiveConfig)
          .where(eq(planConfigurations.userId, 1));
        console.log('✅ Updated existing plan configuration');
      } else {
        // Create new configuration
        await db.insert(planConfigurations).values(restrictiveConfig);
        console.log('✅ Created new plan configuration');
      }
      
      res.json({
        message: 'Demo configuration applied successfully',
        config: restrictiveConfig
      });
    } catch (error) {
      console.error('Error setting up demo:', error);
      res.status(500).json({ error: 'Failed to setup demo configuration' });
    }
  });

  app.post("/api/demo/reset-config", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Remove the restrictive configuration
      await db.delete(planConfigurations).where(eq(planConfigurations.userId, 1));
      
      res.json({
        message: 'Demo configuration reset successfully'
      });
    } catch (error) {
      console.error('Error resetting demo:', error);
      res.status(500).json({ error: 'Failed to reset demo configuration' });
    }
  });
  
  // ANALYTICS ROUTES
  app.get("/api/analytics", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Get time filter from query parameters
      const { period = 'all' } = req.query;
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          startDate = startOfWeek;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null; // All time
      }
      
      // Get real data from database
      const [usersData, allJobsData, clientsData, jobTypesData] = await Promise.all([
        db.select().from(users),
        db.select().from(jobs),
        db.select().from(clients),
        db.select().from(jobTypes)
      ]);

      // Apply time filtering to jobs
      const jobsData = startDate 
        ? allJobsData.filter(job => job.createdAt && new Date(job.createdAt) >= startDate!)
        : allJobsData;

      // Calculate real metrics
      const totalUsers = usersData.length;
      const activeJobs = jobsData.filter(job => job.status === 'active' || job.status === 'in_progress').length;
      
      // Calculate total revenue from completed jobs
      const completedJobs = jobsData.filter(job => job.status === 'completed');
      const totalRevenue = completedJobs.reduce((sum, job) => {
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        return sum + jobRevenue + materialsCost;
      }, 0);

      // Calculate monthly growth (simplified - comparing this month vs last month)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const thisMonthJobs = jobsData.filter(job => 
        job.createdAt && new Date(job.createdAt) >= thisMonth
      ).length;
      
      const lastMonthJobs = jobsData.filter(job => 
        job.createdAt && 
        new Date(job.createdAt) >= lastMonth && 
        new Date(job.createdAt) < thisMonth
      ).length;
      
      const monthlyGrowth = lastMonthJobs > 0 
        ? ((thisMonthJobs - lastMonthJobs) / lastMonthJobs) * 100 
        : 0;

      // Get top clients by revenue
      const clientRevenue = new Map();
      completedJobs.forEach(job => {
        const clientId = job.clientId;
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        const totalJobRevenue = jobRevenue + materialsCost;
        
        if (clientRevenue.has(clientId)) {
          clientRevenue.set(clientId, clientRevenue.get(clientId) + totalJobRevenue);
        } else {
          clientRevenue.set(clientId, totalJobRevenue);
        }
      });

      const topClients = Array.from(clientRevenue.entries())
        .map(([clientId, revenue]) => {
          const client = clientsData.find(c => c.id === clientId);
          return {
            name: client?.name || `Client ${clientId}`,
            revenue: Math.round(revenue)
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get job types distribution
      const jobTypeCounts = new Map();
      jobsData.forEach(job => {
        const jobType = job.type;
        jobTypeCounts.set(jobType, (jobTypeCounts.get(jobType) || 0) + 1);
      });

      const jobTypesDistribution = Array.from(jobTypeCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const analyticsData = {
        period,
        totalUsers,
        activeJobs,
        totalRevenue: Math.round(totalRevenue),
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        topClients,
        jobTypes: jobTypesDistribution,
        timeRange: startDate ? {
          start: startDate.toISOString(),
          end: now.toISOString()
        } : null
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      res.status(500).json({ error: 'Errore nel recupero dei dati analitici' });
    }
  });

  app.get("/api/analytics/plan-usage", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Get real data from database
      const [plans, subscriptions] = await Promise.all([
        db.select().from(subscriptionPlans),
        db.select().from(userSubscriptions)
      ]);

      // Calculate real metrics
      const totalPlans = plans.length;
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
      
      // Get plan distribution
      const planDistribution = new Map();
      subscriptions.forEach(subscription => {
        const plan = plans.find(p => p.id === subscription.planId);
        if (plan) {
          const planName = plan.name;
          planDistribution.set(planName, (planDistribution.get(planName) || 0) + 1);
        }
      });

      const planDistributionData = Array.from(planDistribution.entries())
        .map(([planName, count]) => ({ planName, count }))
        .sort((a, b) => b.count - a.count);

      const planUsage = {
        totalPlans,
        activeSubscriptions,
        planDistribution: planDistributionData
      };

      res.json(planUsage);
    } catch (error) {
      console.error('Error fetching plan usage metrics:', error);
      res.status(500).json({ error: 'Errore nel recupero delle metriche di utilizzo dei piani' });
    }
  });

  app.get("/api/analytics/revenue", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Get real data from database
      const allJobs = await db.select().from(jobs);
      const completedJobs = allJobs.filter(job => job.status === 'completed');

      // Calculate total revenue
      const totalRevenue = completedJobs.reduce((sum, job) => {
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        return sum + jobRevenue + materialsCost;
      }, 0);

      // Calculate monthly revenue (current month)
      const currentDate = new Date();
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      
      const monthlyJobs = completedJobs.filter(job => 
        job.completedDate && 
        new Date(job.completedDate) >= currentMonth && 
        new Date(job.completedDate) < nextMonth
      );
      
      const monthlyRevenue = monthlyJobs.reduce((sum, job) => {
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        return sum + jobRevenue + materialsCost;
      }, 0);

      // Calculate yearly revenue (current year)
      const currentYear = new Date(currentDate.getFullYear(), 0, 1);
      const nextYear = new Date(currentDate.getFullYear() + 1, 0, 1);
      
      const yearlyJobs = completedJobs.filter(job => 
        job.completedDate && 
        new Date(job.completedDate) >= currentYear && 
        new Date(job.completedDate) < nextYear
      );
      
      const yearlyRevenue = yearlyJobs.reduce((sum, job) => {
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        return sum + jobRevenue + materialsCost;
      }, 0);

      // Calculate revenue growth (comparing this month vs last month)
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const lastMonthJobs = completedJobs.filter(job => 
        job.completedDate && 
        new Date(job.completedDate) >= lastMonth && 
        new Date(job.completedDate) < thisMonthStart
      );
      
      const lastMonthRevenue = lastMonthJobs.reduce((sum, job) => {
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        return sum + jobRevenue + materialsCost;
      }, 0);
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Get top revenue sources by job type
      const revenueByType = new Map();
      completedJobs.forEach(job => {
        const jobType = job.type;
        const jobRevenue = parseFloat(job.hourlyRate.toString()) * parseFloat((job.actualDuration || job.duration).toString());
        const materialsCost = parseFloat(job.materialsCost?.toString() || '0');
        const totalJobRevenue = jobRevenue + materialsCost;
        
        if (revenueByType.has(jobType)) {
          revenueByType.set(jobType, revenueByType.get(jobType) + totalJobRevenue);
        } else {
          revenueByType.set(jobType, totalJobRevenue);
        }
      });

      const topRevenueSources = Array.from(revenueByType.entries())
        .map(([source, revenue]) => ({ source, revenue: Math.round(revenue) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const revenueMetrics = {
        totalRevenue: Math.round(totalRevenue),
        monthlyRevenue: Math.round(monthlyRevenue),
        yearlyRevenue: Math.round(yearlyRevenue),
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        topRevenueSources
      };

      res.json(revenueMetrics);
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      res.status(500).json({ error: 'Errore nel recupero delle metriche di ricavo' });
    }
  });
  
  // SECTOR ROUTES
  // Get all sectors
  app.get("/api/sectors", async (req: Request, res: Response) => {
    const sectors = await storage.getAllSectors();
    return res.json(sectors);
  });
  
  // WEBPAGE ROUTES
  // Admin API for web pages management
  app.get("/api/admin/web-pages", isAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const webPages = await storage.getAllWebPages();
      res.json(webPages);
    } catch (error) {
      res.status(500).json({ error: "Si è verificato un errore durante il recupero delle pagine web" });
    }
  });

  app.get("/api/admin/web-pages/:id", isAdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const webPage = await storage.getWebPage(parseInt(id));
      if (!webPage) {
        return res.status(404).json({ error: "Pagina web non trovata" });
      }
      res.json(webPage);
    } catch (error) {
      res.status(500).json({ error: "Si è verificato un errore durante il recupero della pagina web" });
    }
  });

  app.post("/api/admin/web-pages", isAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const parsedBody = insertWebPageSchema.parse(req.body);
      
      // Verifica se esiste già una pagina con lo stesso slug
      const existingPage = await storage.getWebPageBySlug(parsedBody.slug);
      if (existingPage) {
        return res.status(400).json({ error: "Esiste già una pagina con questo slug" });
      }
      
      // Se questa pagina è impostata come homepage, assicurati che nessun'altra pagina dello stesso tipo sia una homepage
      if (parsedBody.isHomepage) {
        const pages = await storage.getAllWebPages();
        const pagesOfSameType = pages.filter(page => page.type === parsedBody.type);
        for (const page of pagesOfSameType) {
          if (page.isHomepage) {
            await storage.updateWebPage(page.id, { isHomepage: false });
          }
        }
      }
      
      const webPage = await storage.createWebPage(parsedBody);
      res.status(201).json(webPage);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Dati della pagina web non validi", details: error.format() });
      }
      res.status(500).json({ error: "Si è verificato un errore durante la creazione della pagina web" });
    }
  });

  app.patch("/api/admin/web-pages/:id", isAdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const existingWebPage = await storage.getWebPage(parseInt(id));
      if (!existingWebPage) {
        return res.status(404).json({ error: "Pagina web non trovata" });
      }
      
      // Valida solo i campi forniti
      const partialSchema = insertWebPageSchema.partial();
      const parsedBody = partialSchema.parse(req.body);
      
      // Se lo slug è cambiato, controlla che non esista già
      if (parsedBody.slug && parsedBody.slug !== existingWebPage.slug) {
        const existingPage = await storage.getWebPageBySlug(parsedBody.slug);
        if (existingPage && existingPage.id !== parseInt(id)) {
          return res.status(400).json({ error: "Esiste già una pagina con questo slug" });
        }
      }
      
      // Se questa pagina è impostata come homepage, assicurati che nessun'altra pagina dello stesso tipo sia una homepage
      if (parsedBody.isHomepage) {
        const pages = await storage.getAllWebPages();
        const pagesOfSameType = pages.filter(page => 
          page.type === (parsedBody.type || existingWebPage.type) && page.id !== parseInt(id)
        );
        for (const page of pagesOfSameType) {
          if (page.isHomepage) {
            await storage.updateWebPage(page.id, { isHomepage: false });
          }
        }
      }
      
      const updatedWebPage = await storage.updateWebPage(parseInt(id), parsedBody);
      res.json(updatedWebPage);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Dati della pagina web non validi", details: error.format() });
      }
      res.status(500).json({ error: "Si è verificato un errore durante l'aggiornamento della pagina web" });
    }
  });

  app.delete("/api/admin/web-pages/:id", isAdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const deleted = await storage.deleteWebPage(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: "Pagina web non trovata" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Si è verificato un errore durante l'eliminazione della pagina web" });
    }
  });

  // API endpoint pubblici per le pagine web
  app.get("/api/web-pages/:slug", async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      const webPage = await storage.getWebPageBySlug(slug);
      if (!webPage) {
        return res.status(404).json({ error: "Pagina web non trovata" });
      }
      
      // Restituisci solo le pagine pubblicate
      if (webPage.status !== "published") {
        return res.status(404).json({ error: "Pagina web non trovata" });
      }
      
      res.json(webPage);
    } catch (error) {
      res.status(500).json({ error: "Si è verificato un errore durante il recupero della pagina web" });
    }
  });

  app.get("/api/web-pages/type/:type/homepage", async (req: Request, res: Response) => {
    const { type } = req.params;
    try {
      // Trova la pagina impostata come homepage per questo tipo
      const pages = await storage.getWebPagesByType(type);
      const homepage = pages.find(page => page.isHomepage && page.status === "published");
      
      if (!homepage) {
        return res.status(404).json({ error: "Nessuna homepage trovata per questo tipo" });
      }
      
      res.json(homepage);
    } catch (error) {
      res.status(500).json({ error: "Si è verificato un errore durante il recupero della homepage" });
    }
  });

  // Get a specific sector
  app.get("/api/sectors/:id", async (req: Request, res: Response) => {
    const sector = await storage.getSector(Number(req.params.id));
    if (!sector) {
      return res.status(404).json({ message: "Sector not found" });
    }
    return res.json(sector);
  });

  // Create a new sector
  app.post("/api/sectors", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Creating sector with data:', req.body);
      const validatedData = insertSectorSchema.parse(req.body);
      console.log('🔍 Validated sector data:', validatedData);
      const sector = await storage.createSector(validatedData);
      console.log('✅ Sector created successfully:', sector);
      return res.json(sector);
    } catch (error) {
      console.error('❌ Error creating sector:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update a sector
  app.patch("/api/sectors/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const validatedData = insertSectorSchema.partial().parse(req.body);
      const sector = await storage.updateSector(id, validatedData);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      return res.json(sector);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a sector
  app.delete("/api/sectors/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteSector(id);
      if (!deleted) {
        return res.status(404).json({ message: "Sector not found" });
      }
      return res.json({ message: "Sector deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create job_activities table if it doesn't exist
  app.post("/api/setup/job-activities-table", async (req: Request, res: Response) => {
    try {
      const db = await initDB();
      
      // Create the job_activities table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS job_activities (
          id serial AUTO_INCREMENT NOT NULL,
          job_id int NOT NULL,
          activity_id int NOT NULL,
          start_date timestamp NOT NULL,
          duration decimal(5,2) NOT NULL,
          status text DEFAULT ('scheduled'),
          completed_date timestamp,
          actual_duration decimal(5,2),
          notes text,
          photos text,
          CONSTRAINT job_activities_id PRIMARY KEY(id)
        )
      `;
      
      await db.execute(createTableSQL);
      
      res.json({ 
        message: 'job_activities table created successfully',
        status: 'success'
      });
    } catch (error) {
      console.error('Error creating job_activities table:', error);
      res.status(500).json({ 
        error: 'Failed to create job_activities table',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create job activity (for mobile registration)
  app.post("/api/job-activities", parseDates, async (req: Request, res: Response) => {
    try {
      // Check mobile session authentication
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
        return res.status(401).json({ error: "Non autenticato" });
      }
      
      const userId = global.mobileSessions[mobileSessionId];
      
      // Check if user has permission to register activities
      const { PlanEnforcementService } = await import('./services/planEnforcement');
      const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
      
      const canRegisterActivities = planConfig?.features?.permissions?.['activity.register'] !== false;
      if (!canRegisterActivities) {
        return res.status(403).json({ 
          error: "Non hai il permesso di registrare attività",
          permission: "activity.register",
          required: true
        });
      }
      
      
      // Handle both JSON and FormData
      let activityData: any;
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle FormData
        const body = req.body as any;
        activityData = {
          jobId: body.jobId ? parseInt(body.jobId) : undefined,
          activityId: body.activityId !== undefined && body.activityId !== null ? parseInt(body.activityId) : undefined,
          startDate: body.startDate,
          duration: body.duration ? parseFloat(body.duration) : undefined,
          status: body.status,
          completedDate: body.completedDate || null,
          actualDuration: body.actualDuration ? parseFloat(body.actualDuration) : null,
          notes: body.notes || null,
          materials: body.materials || null,
          materialsCost: body.materialsCost ? parseFloat(body.materialsCost) : null,
          photos: body.photos || null,
        };
      } else {
        // Handle JSON
        activityData = req.body;
      }
      
      
      // Validate required fields manually
      if (!activityData.jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }
      // Convert activityId -1 to 10 (General Maintenance) for general job activities
      if (activityData.activityId === -1) {
        activityData.activityId = 10; // General Maintenance activity
      }
      
      // Validate activityId
      if (activityData.activityId === undefined || activityData.activityId === null) {
        return res.status(400).json({ message: "Activity ID is required" });
      }
      if (!activityData.startDate) {
        return res.status(400).json({ message: "Start date is required" });
      }
      if (!activityData.duration) {
        return res.status(400).json({ message: "Duration is required" });
      }
      if (!activityData.status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Check if job exists
      const job = await storage.getJob(activityData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if activity exists (skip if activityId is 10, which is General Maintenance)
      if (activityData.activityId !== 10) {
        const activity = await storage.getActivity(activityData.activityId);
        if (!activity) {
          return res.status(404).json({ message: "Activity not found" });
        }
      }
      
      // Set default values for optional fields
      const completeActivityData = {
        ...activityData,
        completedDate: activityData.completedDate || null,
        actualDuration: activityData.actualDuration || null,
        notes: activityData.notes || null,
        photos: activityData.photos || null,
      };
      
      const newJobActivity = await storage.createJobActivity(completeActivityData);
      
      // Update job status based on activity status
      if (job.status === 'scheduled' && activityData.status === 'in_progress') {
        await storage.updateJob(activityData.jobId, {
          status: 'in_progress'
        });
      } else if (activityData.status === 'completed') {
        await storage.updateJob(activityData.jobId, {
          status: 'completed'
        });
      }
      
      return res.status(201).json(newJobActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating job activity:", error);
      return res.status(500).json({ message: "Failed to create job activity" });
    }
  });

  // Web Page routes
  app.get("/api/admin/web-pages", async (req: Request, res: Response) => {
    try {
      const webPages = await storage.getAllWebPages();
      return res.json(webPages);
    } catch (error) {
      log(`Error fetching web pages: ${error}`, "web-page");
      return res.status(500).json({ message: "Failed to fetch web pages" });
    }
  });

  app.get("/api/admin/web-pages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const webPage = await storage.getWebPage(id);
      if (!webPage) {
        return res.status(404).json({ message: "Web page not found" });
      }
      return res.json(webPage);
    } catch (error) {
      log(`Error fetching web page: ${error}`, "web-page");
      return res.status(500).json({ message: "Failed to fetch web page" });
    }
  });

  app.post("/api/admin/web-pages", async (req: Request, res: Response) => {
    try {
      log(`Creating web page with data: ${JSON.stringify(req.body)}`, "web-page");
      
      // Transform authorId from string to number if provided
      const transformedData = { ...req.body };
      if (transformedData.authorId !== undefined && transformedData.authorId !== null) {
        transformedData.authorId = Number(transformedData.authorId);
      }
      
      const validatedData = insertWebPageSchema.parse(transformedData);
      const webPage = await storage.createWebPage(validatedData);
      return res.status(201).json(webPage);
    } catch (error) {
      if (error instanceof ZodError) {
        log(`Web page validation error: ${error}`, "web-page");
        return res.status(400).json({ 
          error: "Dati della pagina web non validi", 
          details: error.flatten() 
        });
      }
      log(`Error creating web page: ${error}`, "web-page");
      return res.status(500).json({ message: "Failed to create web page" });
    }
  });

  app.put("/api/admin/web-pages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Transform authorId from string to number if provided
      const transformedData = { ...req.body };
      if (transformedData.authorId !== undefined && transformedData.authorId !== null) {
        transformedData.authorId = Number(transformedData.authorId);
      }
      
      const validatedData = insertWebPageSchema.partial().parse(transformedData);
      const webPage = await storage.updateWebPage(id, validatedData);
      if (!webPage) {
        return res.status(404).json({ message: "Web page not found" });
      }
      return res.json(webPage);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Dati della pagina web non validi", 
          details: error.flatten() 
        });
      }
      log(`Error updating web page: ${error}`, "web-page");
      return res.status(500).json({ message: "Failed to update web page" });
    }
  });

  app.delete("/api/admin/web-pages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWebPage(id);
      if (!success) {
        return res.status(404).json({ message: "Web page not found" });
      }
      return res.status(204).send();
    } catch (error) {
      log(`Error deleting web page: ${error}`, "web-page");
      return res.status(500).json({ message: "Failed to delete web page" });
    }
  });

  // ===== MOBILE REPORTS API ENDPOINTS =====
  
  // Performance Report
  app.get("/api/reports/performance", async (req: Request, res: Response) => {
    try {
      // Check mobile session authentication
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
        return res.status(401).json({ error: "Non autenticato" });
      }
      
      const userId = global.mobileSessions[mobileSessionId];
      
      // Get all jobs for the user
      const jobs = await storage.getJobsByUserId(userId);
      const jobActivities = await storage.getJobActivities();
      
      // Calculate revenue (sum of all job rates)
      const revenue = jobs.reduce((sum, job) => sum + (parseFloat(job.hourlyRate) * parseFloat(job.duration)), 0);
      
      // Calculate time data
      const userJobIds = jobs.map(job => job.id);
      const userActivities = jobActivities.filter(activity => userJobIds.includes(activity.jobId));
      
      const totalPlanned = userActivities.reduce((sum, activity) => sum + parseFloat(activity.duration), 0);
      const totalActual = userActivities.reduce((sum, activity) => sum + parseFloat(activity.actualDuration || activity.duration), 0);
      const efficiency = totalPlanned > 0 ? (totalPlanned / totalActual) * 100 : 0;
      
      // Calculate cost data
      const totalCosts = jobs.reduce((sum, job) => sum + (job.materialsCost ? parseFloat(job.materialsCost) : 0), 0);
      const materialsCost = jobs.reduce((sum, job) => sum + (job.materialsCost ? parseFloat(job.materialsCost) : 0), 0);
      const laborCost = totalCosts - materialsCost;
      
      // Calculate performance metrics
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const onTimeCompletion = completedJobs > 0 ? (completedJobs / jobs.length) * 100 : 0;
      const clientSatisfaction = 85; // Placeholder - would need client feedback system
      
      // Calculate deltas (simplified - would need historical data)
      const revenueDelta = 0; // Would calculate vs previous period
      const efficiencyDelta = 0;
      const costsDelta = 0;
      
      res.json({
        revenue,
        timeData: {
          totalPlanned,
          totalActual,
          efficiency: Math.min(efficiency, 100) // Cap at 100%
        },
        costData: {
          total: totalCosts,
          materials: materialsCost,
          labor: laborCost
        },
        deltas: {
          revenue: revenueDelta,
          efficiency: efficiencyDelta,
          costs: costsDelta
        },
        performanceData: {
          score: Math.round((efficiency + onTimeCompletion + clientSatisfaction) / 3),
          onTimeCompletion: Math.round(onTimeCompletion),
          clientSatisfaction
        }
      });
    } catch (error) {
      console.error("Error fetching performance report:", error);
      res.status(500).json({ error: "Errore nel recuperare i dati di performance" });
    }
  });

  // Financial Report
  app.get("/api/reports/financial", async (req: Request, res: Response) => {
    try {
      // Check mobile session authentication
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
        return res.status(401).json({ error: "Non autenticato" });
      }
      
      const userId = global.mobileSessions[mobileSessionId];
      
      // Get all jobs for the user
      const jobs = await storage.getJobsByUserId(userId);
      const clients = await storage.getClients();
      
      // Calculate financial summary
      const totalRevenue = jobs.reduce((sum, job) => sum + (parseFloat(job.hourlyRate) * parseFloat(job.duration)), 0);
      const totalCosts = jobs.reduce((sum, job) => sum + (job.materialsCost ? parseFloat(job.materialsCost) : 0), 0);
      const profit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const revenueGrowth = 0; // Would need historical data
      
      // Calculate by job type
      const byJobType = jobs.reduce((acc, job) => {
        const type = job.type || 'unknown';
        if (!acc[type]) {
          acc[type] = { revenue: 0, count: 0 };
        }
        acc[type].revenue += parseFloat(job.hourlyRate) * parseFloat(job.duration);
        acc[type].count += 1;
        return acc;
      }, {} as Record<string, { revenue: number; count: number }>);
      
      // Calculate by client
      const byClient = clients.map(client => {
        const clientJobs = jobs.filter(job => job.clientId === client.id);
        const clientRevenue = clientJobs.reduce((sum, job) => sum + (parseFloat(job.hourlyRate) * parseFloat(job.duration)), 0);
        return {
          id: client.id,
          name: client.name,
          revenue: clientRevenue,
          jobs: clientJobs.length
        };
      }).sort((a, b) => b.revenue - a.revenue);
      
      res.json({
        summary: {
          totalRevenue,
          totalCosts,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          revenueGrowth
        },
        byPeriod: [], // Would need time-based grouping
        byJobType: Object.entries(byJobType).map(([type, data]) => ({
          type,
          revenue: data.revenue,
          count: data.count
        })),
        byClient: byClient.slice(0, 10) // Top 10 clients
      });
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ error: "Errore nel recuperare i dati finanziari" });
    }
  });

  // Time Analysis Report
  app.get("/api/reports/time", async (req: Request, res: Response) => {
    try {
      // Check mobile session authentication
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
        return res.status(401).json({ error: "Non autenticato" });
      }
      
      const userId = global.mobileSessions[mobileSessionId];
      
      // Get all jobs and activities for the user
      const jobs = await storage.getJobsByUserId(userId);
      const jobActivities = await storage.getJobActivities();
      
      const userJobIds = jobs.map(job => job.id);
      const userActivities = jobActivities.filter(activity => userJobIds.includes(activity.jobId));
      
      // Calculate time summary
      const totalPlanned = userActivities.reduce((sum, activity) => sum + parseFloat(activity.duration), 0);
      const totalActual = userActivities.reduce((sum, activity) => sum + parseFloat(activity.actualDuration || activity.duration), 0);
      const efficiency = totalPlanned > 0 ? (totalPlanned / totalActual) * 100 : 0;
      const delta = totalActual - totalPlanned;
      
      // Calculate on-time completion
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const onTimeCompletion = completedJobs > 0 ? (completedJobs / jobs.length) * 100 : 0;
      
      // Calculate by job type
      const byJobType = jobs.reduce((acc, job) => {
        const type = job.type || 'unknown';
        if (!acc[type]) {
          acc[type] = { planned: 0, actual: 0, count: 0 };
        }
        const jobActivities = userActivities.filter(activity => activity.jobId === job.id);
        const planned = jobActivities.reduce((sum, activity) => sum + parseFloat(activity.duration), 0);
        const actual = jobActivities.reduce((sum, activity) => sum + parseFloat(activity.actualDuration || activity.duration), 0);
        acc[type].planned += planned;
        acc[type].actual += actual;
        acc[type].count += 1;
        return acc;
      }, {} as Record<string, { planned: number; actual: number; count: number }>);
      
      // Calculate delays
      const delays = userActivities.map(activity => {
        const actual = activity.actualDuration || activity.duration;
        return parseFloat(actual) - parseFloat(activity.duration);
      }).filter(delay => delay > 0);
      
      const avgDelay = delays.length > 0 ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length : 0;
      const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
      
      res.json({
        summary: {
          totalPlanned,
          totalActual,
          efficiency: Math.min(efficiency, 100),
          delta,
          onTimeCompletion: Math.round(onTimeCompletion)
        },
        byPeriod: [], // Would need time-based grouping
        byJobType: Object.entries(byJobType).map(([type, data]) => ({
          type,
          planned: data.planned,
          actual: data.actual,
          count: data.count
        })),
        byCollaborator: [], // Would need collaborator data
        delays: {
          avgDelay: Math.round(avgDelay * 10) / 10,
          maxDelay: Math.round(maxDelay * 10) / 10,
          delayDistribution: [] // Would need delay categorization
        }
      });
    } catch (error) {
      console.error("Error fetching time analysis report:", error);
      res.status(500).json({ error: "Errore nel recuperare i dati di analisi temporale" });
    }
  });

  // Efficiency Report
  app.get("/api/reports/efficiency", async (req: Request, res: Response) => {
    try {
      // Check mobile session authentication
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
        return res.status(401).json({ error: "Non autenticato" });
      }
      
      const userId = global.mobileSessions[mobileSessionId];
      
      // Get all jobs and activities for the user
      const jobs = await storage.getJobsByUserId(userId);
      const jobActivities = await storage.getJobActivities();
      
      const userJobIds = jobs.map(job => job.id);
      const userActivities = jobActivities.filter(activity => userJobIds.includes(activity.jobId));
      
      // Calculate efficiency metrics
      const totalPlanned = userActivities.reduce((sum, activity) => sum + parseFloat(activity.duration), 0);
      const totalActual = userActivities.reduce((sum, activity) => sum + parseFloat(activity.actualDuration || activity.duration), 0);
      const overallEfficiency = totalPlanned > 0 ? (totalPlanned / totalActual) * 100 : 0;
      
      // Calculate resource utilization (simplified)
      const resourceUtilization = Math.min(overallEfficiency * 0.9, 100); // Placeholder calculation
      
      // Calculate process optimization (simplified)
      const processOptimization = Math.min(overallEfficiency * 0.85, 100); // Placeholder calculation
      
      // Calculate quality index (based on completion rate)
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const qualityIndex = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;
      
      // Calculate by job type
      const byJobType = jobs.reduce((acc, job) => {
        const type = job.type || 'unknown';
        if (!acc[type]) {
          acc[type] = { efficiency: 0, count: 0 };
        }
        const jobActivities = userActivities.filter(activity => activity.jobId === job.id);
        const planned = jobActivities.reduce((sum, activity) => sum + parseFloat(activity.duration), 0);
        const actual = jobActivities.reduce((sum, activity) => sum + parseFloat(activity.actualDuration || activity.duration), 0);
        const efficiency = planned > 0 ? (planned / actual) * 100 : 0;
        acc[type].efficiency = Math.min(efficiency, 100);
        acc[type].count += 1;
        return acc;
      }, {} as Record<string, { efficiency: number; count: number }>);
      
      res.json({
        summary: {
          overallEfficiency: Math.round(overallEfficiency * 10) / 10,
          resourceUtilization: Math.round(resourceUtilization * 10) / 10,
          processOptimization: Math.round(processOptimization * 10) / 10,
          qualityIndex: Math.round(qualityIndex * 10) / 10,
          trend: 0 // Would need historical data
        },
        byJobType: Object.entries(byJobType).map(([type, data]) => ({
          type,
          efficiency: data.efficiency,
          count: data.count
        })),
        byProcess: [], // Would need process categorization
        byCollaborator: [] // Would need collaborator data
      });
    } catch (error) {
      console.error("Error fetching efficiency report:", error);
      res.status(500).json({ error: "Errore nel recuperare i dati di efficienza" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
