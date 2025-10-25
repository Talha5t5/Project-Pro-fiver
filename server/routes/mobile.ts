import { Request, Response, Router } from "express";
import { storage } from "../storage";
import * as bcrypt from 'bcrypt';
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Declare global mobile sessions storage
declare global {
  var mobileSessions: { [key: string]: number } | undefined;
}

// Initialize global mobile sessions if not exists
if (!global.mobileSessions) {
  global.mobileSessions = {};
}
import { 
  requireFeature, 
  requirePageAccess, 
  requirePermission, 
  checkFeatureLimit,
  filterResponseByPlan,
  addPlanInfo 
} from "../middleware/planEnforcement";

const router = Router();

// Hashare con Bcrypt per test
async function hashPassword(password: string) {
  // Per test è meglio bcrypt perché più comune
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('comparePasswords called with:', {
      supplied: supplied ? 'provided' : 'missing',
      stored: stored ? 'provided' : 'missing',
      storedStartsWith: stored ? stored.substring(0, 4) : 'n/a'
    });
    
    // 1. Test per formato bcrypt (inizia con $)
    if (stored && stored.startsWith('$2b$')) {
      console.log('Usando confronto bcrypt');
      const result = await bcrypt.compare(supplied, stored);
      console.log('bcrypt result:', result);
      return result;
    }
    
    // 2. Password in chiaro - per test e sviluppo
    console.log('Usando confronto testo semplice');
    console.log('Plain text comparison:', {
      supplied,
      stored,
      match: supplied === stored
    });
    
    if (supplied === stored) {
      console.warn('WARNING: Using plain text password comparison!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Registrazione nuovo utente
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email e password sono richiesti" });
    }
    
    // Controlla se esiste già un utente con questa email
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Questa email è già registrata. Prova ad effettuare il login o usa un'altra email per registrarti." });
    }
    
    // Genera hash della password
    const hashedPassword = await hashPassword(password);
    
    // Crea nuovo utente
    const userData = {
      email,
      password: hashedPassword,
      fullName: fullName || username || email.split('@')[0],
      username: username || email.split('@')[0],
      isActive: true,
      type: "client"
    };
    
    const newUser = await storage.createUser(userData);
    
    // Imposta l'utente nella sessione
    (req.session as any).mobileUserId = newUser.id;
    (req.session as any).userType = newUser.type;
    
    // Create mobile session ID for mobile app (same as login)
    const mobileSessionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!global.mobileSessions) {
      global.mobileSessions = {};
    }
    global.mobileSessions[mobileSessionId] = newUser.id;
    console.log(`✅ Mobile session created for new user ${newUser.id}: ${mobileSessionId}`);
    
    // Rimuovi la password dai dati utente per sicurezza
    const { password: _, ...userDataSafe } = newUser;
    
    res.status(201).json({ ...userDataSafe, mobileSessionId });
  } catch (err) {
    console.error("Errore nella registrazione:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottieni dati utente corrente
router.get("/user", async (req: Request, res: Response) => {
  try {
    // Debug session information (guarded by env flag)
    if (process.env.DEBUG_PERMISSIONS) console.log("Session debug:", {
      sessionExists: !!req.session,
      sessionId: req.sessionID,
      mobileUserId: (req.session as any)?.mobileUserId,
      allSessionKeys: req.session ? Object.keys(req.session) : 'no session',
      cookies: req.headers.cookie,
      mobileSessionId: req.headers['x-mobile-session-id']
    });
    
    // Check authentication via mobile session header ONLY
    let userId: number | undefined;
    
    if (req.headers['x-mobile-session-id']) {
      const mobileSessionId = req.headers['x-mobile-session-id'] as string;
      if (global.mobileSessions && global.mobileSessions[mobileSessionId]) {
        userId = global.mobileSessions[mobileSessionId];
        if (process.env.DEBUG_PERMISSIONS) console.log(`✅ Mobile session authenticated: ${mobileSessionId} -> userId: ${userId}`);
      } else {
        console.log(`❌ Invalid mobile session: ${mobileSessionId}`);
      }
    }
    
    if (!userId) {
      if (process.env.DEBUG_PERMISSIONS) console.log(`❌ 
        No valid mobile session found. Headers:`, req.headers,
        `
        Global mobile sessions:`, global.mobileSessions,
        `
        Mobile session ID:`, req.headers['x-mobile-session-id'],
        `
        Mobile session:`, global.mobileSessions?.[req.headers['x-mobile-session-id'] as string]);
      return res.status(401).json({ error: "Non autenticato" });
    }

    // Ottieni dati utente dal db
    const user = await storage.getUser(userId);
    if (!user) {
      (req.session as any).mobileUserId = undefined;
      (req.session as any).userType = undefined;
      return res.status(401).json({ error: "Utente non trovato" });
    }

    // Rimuovi la password dai dati utente per sicurezza
    const { password, ...userData } = user;
    
    res.json(userData);
  } catch (err) {
    console.error("Errore nell'ottenere dati utente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Login utente
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // Controlla se è stato fornito username o email
    const loginIdentifier = email || username;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: "Email/Username e password sono richiesti" });
    }

    // Debug per verificare cosa viene inviato
    console.log("Login attempt:", { email, username, password: password ? "***" : undefined });
    
    // Cerca utente - prima per email se fornita, altrimenti per username
    let user;
    
    // Solo per debug, mostriamo tutti gli utenti
    const allUsers = await storage.getUsers();
    console.log("All users:", allUsers.map(u => ({ 
      id: u.id, 
      email: u.email, 
      username: u.username
    })));
    
    if (email) {
      user = await storage.getUserByEmail(email);
      console.log("User found by email:", !!user);
    } else {
      user = await storage.getUserByUsername(username);
      console.log("User found by username:", !!user);
    }
    
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Verifica password
    console.log("Verifica password:", { 
      storedPassword: user.password,
      providedPassword: password,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
    const passwordMatch = await comparePasswords(password, user.password);
    console.log("Password match result:", passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Controlla se l'utente è attivo
    if (user.isActive === false) {
      return res.status(403).json({ error: "L'account non è attivo" });
    }

    // Store ONLY in global mobile sessions (no Express session dependency)
    const mobileSessionId = `mobile_${Date.now()}_${user.id}`;
    
    // Debug before setting
    console.log("🔍 Before setting global session:", {
      mobileSessionId,
      userId: user.id,
      globalSessionsExists: !!global.mobileSessions,
      globalSessionsType: typeof global.mobileSessions,
      globalSessionsKeys: global.mobileSessions ? Object.keys(global.mobileSessions) : 'undefined'
    });
    
    global.mobileSessions![mobileSessionId] = user.id;
    
    // Debug after setting
    console.log("🔍 After setting global session:", {
      mobileSessionId,
      userId: user.id,
      globalSessionsCount: Object.keys(global.mobileSessions!).length,
      allSessions: global.mobileSessions
    });
    
    // Debug mobile session after setting
    console.log("Mobile session created:", {
      mobileSessionId,
      userId: user.id,
      globalSessionsCount: Object.keys(global.mobileSessions!).length
    });
    
    // Log plan permissions for this user
    try {
      const { PlanEnforcementService } = await import('../services/planEnforcement');
      const planConfig = await PlanEnforcementService.getUserPlanConfiguration(user.id);
      const permissions = planConfig?.features?.permissions || {};
      console.log("✅ Permissions for user login:", {
        userId: user.id,
        planId: planConfig?.planId,
        permissions
      });
    } catch (permErr) {
      console.warn("Unable to fetch plan permissions on login:", permErr);
    }

    // Return mobile session ID for mobile app
    const { password: _, ...userData } = user;
    res.json({ ...userData, mobileSessionId });
  } catch (err) {
    console.error("Errore durante il login:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Logout utente
router.post("/logout", (req: Request, res: Response) => {
  // Clean up global mobile session if session ID is provided
  if (req.headers['x-mobile-session-id']) {
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (global.mobileSessions && global.mobileSessions[mobileSessionId]) {
      delete global.mobileSessions[mobileSessionId];
      console.log(`✅ Mobile session cleaned up: ${mobileSessionId}`);
    }
  }
  
  res.status(200).json({ message: "Logout effettuato con successo" });
});

// Attiva un account
router.post("/activate", async (req: Request, res: Response) => {
  try {
    const { activationCode, password, fullName } = req.body;
    
    if (!activationCode || !password || !fullName) {
      return res.status(400).json({ 
        error: "Codice di attivazione, password e nome completo sono richiesti" 
      });
    }

    // TODO: Implement collaborator activation code system
    // For now, return an error as this feature is not implemented
    return res.status(501).json({ error: "Sistema di attivazione collaboratori non ancora implementato" });
  } catch (err) {
    console.error("Errore durante l'attivazione:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiorna impostazioni utente
router.put("/user", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Ottieni dati utente dal db
    const user = await storage.getUser(userId);
    if (!user) {
      (req.session as any).mobileUserId = undefined;
      (req.session as any).userType = undefined;
      return res.status(401).json({ error: "Utente non trovato" });
    }

    // Aggiorna i dati utente
    const updatedUser = await storage.updateUser(userId, req.body);
    
    // Rimuovi la password dai dati utente per sicurezza
    const { password, ...userData } = updatedUser as any;
    
    res.json(userData);
  } catch (err) {
    console.error("Errore nell'aggiornamento utente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Cambio password
router.post("/change-password", async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "La password attuale e la nuova password sono richieste" 
      });
    }

    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Ottieni dati utente dal db
    const user = await storage.getUser(userId);
    if (!user) {
      (req.session as any).mobileUserId = undefined;
      (req.session as any).userType = undefined;
      return res.status(401).json({ error: "Utente non trovato" });
    }

    // Verifica password attuale
    const passwordMatch = await comparePasswords(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Password attuale non valida" });
    }

    // Hash della nuova password
    const hashedPassword = await hashPassword(newPassword);

    // Aggiorna la password
    await storage.updateUser(userId, { password: hashedPassword });
    
    res.json({ message: "Password aggiornata con successo" });
  } catch (err) {
    console.error("Errore nel cambio password:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottenere tutti i lavori assegnati all'utente corrente
router.get("/jobs", 
  requireFeature('job_management'),
  requirePageAccess('jobs', 'view'),
  filterResponseByPlan('jobs'),
  addPlanInfo(),
  async (req: Request, res: Response) => {
    try {
      // Controlla se l'utente è autenticato
      const userId = (req.session as any).mobileUserId;
      if (!userId) {
        return res.status(401).json({ error: "Non autenticato" });
      }

      // Ottieni lavori assegnati all'utente
      const jobs = await storage.getJobsByUserId(userId);
      
      res.json(jobs);
    } catch (err) {
      console.error("Errore nell'ottenere i lavori:", err);
      res.status(500).json({ error: "Errore nel server" });
    }
  }
);

// ===== JOB MANAGEMENT ENDPOINTS =====

// Get jobs assigned to current user (MUST come before /jobs/:id)
router.get("/jobs/assigned", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    // Get jobs assigned to the current user
    const assignedJobs = await storage.getJobsByUserId(userId);
    
    res.json({
      message: "Jobs assigned to current user",
      totalJobs: assignedJobs.length,
      jobs: assignedJobs
    });
  } catch (err) {
    console.error("Errore nell'ottenere i lavori assegnati:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});


// Get a specific job by ID
router.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const jobId = Number(req.params.id);
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // For now, allow access to all jobs. In a real system, you'd implement proper job assignment logic
    // TODO: Implement job assignment system with assignedUserId field

    res.json(job);
  } catch (err) {
    console.error("Errore nell'ottenere il lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update a job
router.put("/jobs/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to edit jobs
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    
    // Check job edit permission
    const canEditJobs = planConfig?.features?.permissions?.edit_jobs !== false;
    if (!canEditJobs) {
      return res.status(403).json({ 
        error: "Non hai il permesso di modificare lavori",
        permission: "edit_jobs",
        required: true
      });
    }

    const jobId = Number(req.params.id);
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Check if user has access to this job
    if (job.assignedUserId !== userId) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // Update job
    const updatedJob = await storage.updateJob(jobId, req.body);
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nell'aggiornamento del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Delete a job
router.delete("/jobs/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to delete jobs
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    
    // Check job delete permission
    const canDeleteJobs = planConfig?.features?.permissions?.delete_jobs !== false;
    if (!canDeleteJobs) {
      return res.status(403).json({ 
        error: "Non hai il permesso di eliminare lavori",
        permission: "delete_jobs",
        required: true
      });
    }

    const jobId = Number(req.params.id);
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Check if user has access to this job
    if (job.assignedUserId !== userId) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // Delete job
    await storage.deleteJob(jobId);
    
    res.status(204).send();
  } catch (err) {
    console.error("Errore nella cancellazione del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});


// ===== CALENDAR ENDPOINTS =====

// Get jobs for a specific date range
router.get("/calendar", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const { startDate, endDate, view } = req.query;
    
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default to current month if no dates provided
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get jobs for the date range
    const jobs = await storage.getJobsByDateRange(start, end);
    
    // Format jobs for calendar display
    const calendarJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      start: job.startDate,
      end: job.endDate || job.startDate,
      status: job.status,
      clientId: job.clientId,
      color: getJobColor(job.status, (job as any).jobTypeId)
    }));

    res.json(calendarJobs);
  } catch (err) {
    console.error("Errore nell'ottenere i lavori del calendario:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get jobs for today
router.get("/calendar/today", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Get jobs for today
    const jobs = await storage.getJobsByDateRange(startOfDay, endOfDay);
    
    res.json(jobs);
  } catch (err) {
    console.error("Errore nell'ottenere i lavori di oggi:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ===== JOB ASSIGNMENT ENDPOINTS =====

// Assign a job to a user
router.post("/jobs/:id/assign", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    const { assignedUserId } = req.body;
    
    if (!assignedUserId) {
      return res.status(400).json({ error: "ID utente assegnato è richiesto" });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Check if the current user can assign jobs (admin or job owner)
    const currentUser = await storage.getUser(userId);
    if (!currentUser || (currentUser.type !== 'admin' && job.assignedUserId !== userId)) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // Update job assignment
    const updatedJob = await storage.updateJob(jobId, {
      assignedUserId: Number(assignedUserId)
    });
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nell'assegnazione del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});



// Get available users for job assignment
router.get("/users/available", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    // Get all active users
    const users = await storage.getUsers();
    const availableUsers = users
      .filter(user => user.isActive && user.type !== 'client')
      .map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        type: user.type
      }));
    
    res.json(availableUsers);
  } catch (err) {
    console.error("Errore nell'ottenere gli utenti disponibili:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ===== JOB TYPES & CATEGORIES =====

// Get all job types
router.get("/job-types", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobTypes = await storage.getJobTypes();
    res.json(jobTypes);
  } catch (err) {
    console.error("Errore nell'ottenere i tipi di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Create new job type
router.post("/job-types", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and is admin
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const currentUser = await storage.getUser(userId);
    if (!currentUser || currentUser.type !== 'admin') {
      return res.status(403).json({ error: "Accesso negato - Solo amministratori" });
    }

    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Nome del tipo di lavoro è richiesto" });
    }

    const newJobType = await storage.createJobType({ name, description });
    res.status(201).json(newJobType);
  } catch (err) {
    console.error("Errore nella creazione del tipo di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ===== ENHANCED JOB NOTES & PHOTOS =====

// Add note to a job
router.post("/jobs/:id/notes", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    const { note, noteType = 'general' } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: "Nota è richiesta" });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Create note entry (you might want to add a job_notes table to the schema)
    const noteData = {
      jobId,
      userId,
      note,
      noteType,
      timestamp: new Date()
    };

    // For now, append to existing notes
    const currentNotes = job.notes || '';
    const updatedNotes = currentNotes ? `${currentNotes}\n\n[${new Date().toLocaleString()}] ${note}` : note;
    
    const updatedJob = await storage.updateJob(jobId, {
      notes: updatedNotes
    });
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nell'aggiunta della nota:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Upload photo to a job
router.post("/jobs/:id/photos", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    const { photoUrl, description } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ error: "URL della foto è richiesto" });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Parse existing photos or create new array
    let currentPhotos = [];
    try {
      currentPhotos = job.photos ? JSON.parse(job.photos) : [];
    } catch (e) {
      currentPhotos = [];
    }

    // Add new photo
    const newPhoto = {
      url: photoUrl,
      description: description || '',
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    };

    currentPhotos.push(newPhoto);

    // Update job with new photos
    const updatedJob = await storage.updateJob(jobId, {
      photos: JSON.stringify(currentPhotos)
    });
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nell'upload della foto:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get job photos
router.get("/jobs/:id/photos", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    
    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Parse and return photos
    let photos = [];
    try {
      photos = job.photos ? JSON.parse(job.photos) : [];
    } catch (e) {
      photos = [];
    }
    
    res.json(photos);
  } catch (err) {
    console.error("Errore nell'ottenere le foto:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ===== JOB COLLABORATION & TEAM MANAGEMENT =====

// Add collaborator to a job
router.post("/jobs/:id/collaborators", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    const { collaboratorId, role } = req.body;
    
    if (!collaboratorId) {
      return res.status(400).json({ error: "ID collaboratore è richiesto" });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Check if the current user can manage this job (admin or job owner)
    const currentUser = await storage.getUser(userId);
    if (!currentUser || (currentUser.type !== 'admin' && job.assignedUserId !== userId)) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // For now, store collaboration info in job notes
    // In a real system, you'd have a separate job_collaborators table
    const collaborationNote = `[${new Date().toLocaleString()}] Collaboratore aggiunto: ID ${collaboratorId}, Ruolo: ${role || 'assistente'}`;
    const currentNotes = job.notes || '';
    const updatedNotes = currentNotes ? `${currentNotes}\n\n${collaborationNote}` : collaborationNote;
    
    const updatedJob = await storage.updateJob(jobId, {
      notes: updatedNotes
    });
    
    res.json({
      message: "Collaboratore aggiunto al lavoro",
      job: updatedJob
    });
  } catch (err) {
    console.error("Errore nell'aggiunta del collaboratore:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get job collaboration info
router.get("/jobs/:id/collaborators", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    
    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Parse collaboration info from notes (temporary solution)
    // In a real system, you'd query a separate table
    const collaborationInfo = {
      primaryUser: job.assignedUserId,
      notes: job.notes,
      message: "Collaboration info is currently stored in job notes. A proper collaboration table will be implemented."
    };
    
    res.json(collaborationInfo);
  } catch (err) {
    console.error("Errore nell'ottenere le informazioni di collaborazione:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get team members for a job
router.get("/jobs/:id/team", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = (req.session as any).mobileUserId;
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const jobId = Number(req.params.id);
    
    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }

    // Get team members (primary user + any collaborators)
    const teamMembers = [];
    
    if (job.assignedUserId) {
      const primaryUser = await storage.getUser(job.assignedUserId);
      if (primaryUser) {
        teamMembers.push({
          id: primaryUser.id,
          username: primaryUser.username,
          fullName: primaryUser.fullName,
          role: 'primary',
          type: primaryUser.type
        });
      }
    }

    // TODO: In a real system, query a job_collaborators table
    // For now, return the primary user info
    
    res.json({
      jobId,
      teamMembers,
      totalMembers: teamMembers.length
    });
  } catch (err) {
    console.error("Errore nell'ottenere i membri del team:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Helper function to get job color based on status and type
function getJobColor(status: string, jobTypeId?: number | null): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'blue';
    case 'scheduled':
      return 'yellow';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
}

// Creazione/acquisto di un nuovo abbonamento
router.post("/subscriptions", async (req: Request, res: Response) => {
  try {
    const { planId, billingFrequency = "monthly", paymentMethod, paymentInfo } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: "ID del piano richiesto" });
    }

    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Ottieni il piano di abbonamento
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: "Piano non trovato" });
    }

    // Verifica se il piano è gratuito
    const isFreePlan = plan.isFree || parseFloat(plan.monthlyPrice) === 0;

    // Validazione pagamento per piani a pagamento
    if (!isFreePlan) {
      if (!paymentMethod) {
        return res.status(400).json({ error: "Metodo di pagamento richiesto per piani a pagamento" });
      }

      // Process payment with Stripe for credit card payments
      if (paymentMethod === "credit_card") {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
          return res.status(400).json({ error: "Payment Intent ID richiesto per pagamenti con carta" });
        }

        try {
          // Verify the payment intent with Stripe
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              error: "Pagamento non completato", 
              details: "Il pagamento non è stato completato con successo"
            });
          }

          // Verify the amount matches the plan price
          const expectedAmount = billingFrequency === "monthly" 
            ? Math.round(parseFloat(plan.monthlyPrice) * 100)
            : Math.round(parseFloat(plan.yearlyPrice) * 100);
            
          if (paymentIntent.amount !== expectedAmount) {
            return res.status(400).json({ 
              error: "Importo non corrispondente", 
              details: "L'importo pagato non corrisponde al prezzo del piano"
            });
          }
        } catch (stripeError: any) {
          console.error('Stripe payment verification error:', stripeError);
          return res.status(400).json({ 
            error: "Errore nella verifica del pagamento", 
            details: stripeError.message || "Errore sconosciuto"
          });
        }
      }
    }

    // Calcola date di inizio e fine
    const startDate = new Date();
    let endDate = new Date();
    
    if (billingFrequency === "monthly" && plan.monthlyDuration) {
      endDate.setDate(endDate.getDate() + plan.monthlyDuration);
    } else if (billingFrequency === "yearly" && plan.yearlyDuration) {
      endDate.setDate(endDate.getDate() + plan.yearlyDuration);
    }

    // Determina lo status in base al tipo di piano e metodo di pagamento
    let status = "active";
    if (!isFreePlan && paymentMethod === "bank_transfer") {
      status = "pending"; // In attesa di pagamento
    }

    // Crea nuovo abbonamento
    const subscription = await storage.createUserSubscription({
      userId,
      planId,
      billingFrequency,
      startDate,
      endDate,
      status,
    });
    
    res.status(201).json(subscription);
  } catch (err) {
    console.error("Errore nella creazione dell'abbonamento:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottenere i piani di abbonamento
router.get("/subscription-plans", async (req: Request, res: Response) => {
  try {
    const plans = await storage.getSubscriptionPlans();
    
    // Filtra solo i piani attivi
    const activePlans = plans.filter(plan => plan.isActive);
    
    res.json(activePlans);
  } catch (err) {
    console.error("Errore nell'ottenere i piani:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottenere un piano di abbonamento specifico per ID
router.get("/subscription-plans/:id", async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    
    if (isNaN(planId)) {
      return res.status(400).json({ error: "ID piano non valido" });
    }
    
    const plan = await storage.getSubscriptionPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ error: "Piano non trovato" });
    }
    
    res.json(plan);
  } catch (err) {
    console.error("Errore nell'ottenere il piano:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottieni abbonamento corrente dell'utente
router.get("/user-subscription", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Ottieni abbonamento
    const subscription = await storage.getUserSubscriptionByUserId(userId);
    
    if (!subscription) {
      return res.json(null);
    }
    
    // Ottieni anche i dettagli del piano
    const plan = await storage.getSubscriptionPlan(subscription.planId);
    
    res.json({
      ...subscription,
      plan,
    });
  } catch (err) {
    console.error("Errore nell'ottenere l'abbonamento:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Check activity management permissions
router.get("/permissions/activity-management", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Check if activity management is enabled for this user's plan
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const activityManagementEnabled = await PlanEnforcementService.isActivityManagementEnabled(userId);
    
    res.json({
      activityManagementEnabled,
      userId
    });
  } catch (err) {
    console.error("Errore nel controllo dei permessi di gestione attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottiene statistiche per la dashboard mobile
router.get("/stats", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    
    // Ottieni tutti i lavori per calcolare le statistiche reali
    const allJobs = await storage.getJobs();
    const clients = await storage.getClients();
    
    // Calcola le statistiche reali
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const activeJobs = allJobs.filter(job => 
      job.status === 'scheduled' || job.status === 'in_progress'
    ).length;
    
    const completedJobs = allJobs.filter(job => 
      job.status === 'completed'
    ).length;
    
    const totalClients = clients.length;
    
    // Calcola l'incasso mensile dai lavori completati questo mese
    const monthlyRevenue = allJobs
      .filter(job => {
        if (job.status !== 'completed' || !job.completedDate) return false;
        const completedDate = new Date(job.completedDate);
        return completedDate.getMonth() === currentMonth && 
               completedDate.getFullYear() === currentYear;
      })
      .reduce((total, job) => total + Number(job.cost || 0), 0);
    
    return res.json({
      lavoriAttivi: activeJobs,
      clientiTotali: totalClients,
      lavoriCompletati: completedJobs,
      incassoMensile: monthlyRevenue,
      totalJobs: allJobs.length
    });
  } catch (err) {
    console.error("Errore nell'ottenere le statistiche:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Ottiene gli impegni di oggi per la dashboard mobile
router.get("/today-appointments", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    
    // Ottieni tutti i lavori e clienti
    const allJobs = await storage.getJobs();
    const allClients = await storage.getClients();
    
    // Filtra i lavori di oggi (scheduled)
    // Use database date to avoid timezone issues
    const today = new Date();
    // Get the date in the local timezone (same as database)
    const todayString = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
    
    const todayJobs = allJobs.filter(job => {
      if (job.status !== 'scheduled') return false;
      const jobDate = new Date(job.startDate);
      const jobDateString = jobDate.toISOString().split('T')[0];
      return jobDateString === todayString;
    });
    
    // Formatta gli appuntamenti con i dati dei clienti
    const appointments = todayJobs.map(job => {
      const client = allClients.find(c => c.id === job.clientId);
      const startTime = new Date(job.startDate).toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const endTime = job.endDate ? 
        new Date(job.endDate).toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }) : 
        new Date(new Date(job.startDate).getTime() + (Number(job.duration) * 60 * 60 * 1000)).toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      
      return {
        id: job.id,
        title: job.title,
        client: client?.name || 'Cliente sconosciuto',
        location: job.location || 'Indirizzo non specificato',
        startTime,
        endTime,
        color: job.type === 'repair' ? 'blue' : job.type === 'quote' ? 'purple' : 'yellow'
      };
    });
    
    res.json(appointments);
  } catch (err) {
    console.error("Errore nell'ottenere gli appuntamenti di oggi:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// CLIENTS ROUTES
router.get("/clients", 
  requireFeature('client_management'),
  requirePageAccess('clients', 'view'),
  filterResponseByPlan('clients'),
  addPlanInfo(),
  async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      return res.json(clients);
    } catch (err) {
      console.error("Errore nell'ottenere i clienti:", err);
      res.status(500).json({ error: "Errore nel server" });
    }
  }
);

router.get("/clients/:id", async (req: Request, res: Response) => {
  try {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    return res.json(client);
  } catch (err) {
    console.error("Errore nell'ottenere il cliente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// JOB TYPES ROUTES
router.get("/jobtypes", async (req: Request, res: Response) => {
  try {
    const jobTypes = await storage.getJobTypes();
    return res.json(jobTypes);
  } catch (err) {
    console.error("Errore nell'ottenere i tipi di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

router.get("/jobtypes/:id", async (req: Request, res: Response) => {
  try {
    const jobType = await storage.getJobType(Number(req.params.id));
    if (!jobType) {
      return res.status(404).json({ error: "Tipo di lavoro non trovato" });
    }
    return res.json(jobType);
  } catch (err) {
    console.error("Errore nell'ottenere il tipo di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Creazione di un nuovo tipo di lavoro
router.post("/jobtypes", async (req: Request, res: Response) => {
  try {
    const newJobType = await storage.createJobType(req.body);
    return res.json(newJobType);
  } catch (err) {
    console.error("Errore nella creazione del tipo di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiornamento di un tipo di lavoro
router.patch("/jobtypes/:id", async (req: Request, res: Response) => {
  try {
    const jobTypeId = Number(req.params.id);
    const updatedJobType = await storage.updateJobType(jobTypeId, req.body);
    
    if (!updatedJobType) {
      return res.status(404).json({ error: "Tipo di lavoro non trovato" });
    }
    
    return res.json(updatedJobType);
  } catch (err) {
    console.error("Errore nell'aggiornamento del tipo di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Eliminazione di un tipo di lavoro
router.delete("/jobtypes/:id", async (req: Request, res: Response) => {
  try {
    const jobTypeId = Number(req.params.id);
    const success = await storage.deleteJobType(jobTypeId);
    
    if (!success) {
      return res.status(404).json({ error: "Tipo di lavoro non trovato" });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Errore nell'eliminazione del tipo di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ACTIVITIES ROUTES - Removed duplicate, using the one below with mobile session auth

router.get("/activities/:id", async (req: Request, res: Response) => {
  try {
    const activity = await storage.getActivity(Number(req.params.id));
    if (!activity) {
      return res.status(404).json({ error: "Attività non trovata" });
    }
    return res.json(activity);
  } catch (err) {
    console.error("Errore nell'ottenere l'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Creazione di una nuova attività
router.post("/activities", async (req: Request, res: Response) => {
  try {
    const newActivity = await storage.createActivity(req.body);
    return res.json(newActivity);
  } catch (err) {
    console.error("Errore nella creazione dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiornamento di un'attività (PATCH)
router.patch("/activities/:id", async (req: Request, res: Response) => {
  try {
    const activityId = Number(req.params.id);
    console.log("PATCH - Aggiornamento attività:", activityId, JSON.stringify(req.body, null, 2));
    const updatedActivity = await storage.updateActivity(activityId, req.body);
    
    if (!updatedActivity) {
      return res.status(404).json({ error: "Attività non trovata" });
    }
    
    return res.json(updatedActivity);
  } catch (err) {
    console.error("Errore nell'aggiornamento dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiornamento di un'attività (PUT)
router.put("/activities/:id", async (req: Request, res: Response) => {
  try {
    const activityId = Number(req.params.id);
    console.log("PUT - Aggiornamento attività:", activityId, JSON.stringify(req.body, null, 2));
    const updatedActivity = await storage.updateActivity(activityId, req.body);
    
    if (!updatedActivity) {
      return res.status(404).json({ error: "Attività non trovata" });
    }
    
    return res.json(updatedActivity);
  } catch (err) {
    console.error("Errore nell'aggiornamento dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Eliminazione di un'attività
router.delete("/activities/:id", async (req: Request, res: Response) => {
  try {
    const activityId = Number(req.params.id);
    const success = await storage.deleteActivity(activityId);
    
    if (!success) {
      return res.status(404).json({ error: "Attività non trovata" });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Errore nell'eliminazione dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// ROLES ROUTES
router.get("/roles", async (req: Request, res: Response) => {
  try {
    const roles = await storage.getRoles();
    return res.json(roles);
  } catch (err) {
    console.error("Errore nell'ottenere i ruoli:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

router.get("/roles/:id", async (req: Request, res: Response) => {
  try {
    const role = await storage.getRole(Number(req.params.id));
    if (!role) {
      return res.status(404).json({ error: "Ruolo non trovato" });
    }
    return res.json(role);
  } catch (err) {
    console.error("Errore nell'ottenere il ruolo:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Creazione di un nuovo ruolo
router.post("/roles", async (req: Request, res: Response) => {
  try {
    // Expect permissions as object of booleans or string 'true'/'false'.
    const { name, description, permissions, sectorId, isDefault } = req.body || {};
    const normalizedPermissions: Record<string, boolean> = {};
    if (permissions && typeof permissions === 'object') {
      for (const key of Object.keys(permissions)) {
        const val = permissions[key];
        normalizedPermissions[key] = (val === true || val === 'true');
      }
    }
    const rolePayload = {
      name,
      description: description || '',
      permissions: JSON.stringify(normalizedPermissions),
      sectorId: sectorId ?? null,
      isDefault: !!isDefault,
    };
    const newRole = await storage.createRole(rolePayload as any);
    return res.json(newRole);
  } catch (err) {
    console.error("Errore nella creazione del ruolo:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Eliminazione di un ruolo
router.delete("/roles/:id", async (req: Request, res: Response) => {
  try {
    const roleId = Number(req.params.id);
    const success = await storage.deleteRole(roleId);
    
    if (!success) {
      return res.status(404).json({ error: "Ruolo non trovato" });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Errore nell'eliminazione del ruolo:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiornamento di un ruolo
router.patch("/roles/:id", async (req: Request, res: Response) => {
  try {
    const roleId = Number(req.params.id);
    const { name, description, permissions, sectorId, isDefault } = req.body || {};
    const normalizedPermissions: Record<string, boolean> = {};
    if (permissions && typeof permissions === 'object') {
      for (const key of Object.keys(permissions)) {
        const val = permissions[key];
        normalizedPermissions[key] = (val === true || val === 'true');
      }
    }
    const rolePayload: any = {};
    if (name !== undefined) rolePayload.name = name;
    if (description !== undefined) rolePayload.description = description;
    if (permissions !== undefined) rolePayload.permissions = JSON.stringify(normalizedPermissions);
    if (sectorId !== undefined) rolePayload.sectorId = sectorId;
    if (isDefault !== undefined) rolePayload.isDefault = !!isDefault;

    const updatedRole = await storage.updateRole(roleId, rolePayload);
    
    if (!updatedRole) {
      return res.status(404).json({ error: "Ruolo non trovato" });
    }
    
    return res.json(updatedRole);
  } catch (err) {
    console.error("Errore nell'aggiornamento del ruolo:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// COLLABORATORS ROUTES
router.get("/collaborators", async (req: Request, res: Response) => {
  try {
    const collaborators = await storage.getCollaborators();
    return res.json(collaborators);
  } catch (err) {
    console.error("Errore nell'ottenere i collaboratori:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

router.get("/collaborators/:id", async (req: Request, res: Response) => {
  try {
    const collaborator = await storage.getCollaborator(Number(req.params.id));
    if (!collaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    return res.json(collaborator);
  } catch (err) {
    console.error("Errore nell'ottenere il collaboratore:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Creazione di un nuovo collaboratore
router.post("/collaborators", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to create collaborators
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canCreateCollaborators = await PlanEnforcementService.hasPermission(userId, 'collaborator.create');
    if (!canCreateCollaborators) {
      return res.status(403).json({ 
        error: "Non hai il permesso di creare collaboratori",
        permission: "collaborator.create",
        required: true
      });
    }

    const newCollaborator = await storage.createCollaborator(req.body);
    return res.json(newCollaborator);
  } catch (err) {
    console.error("Errore nella creazione del collaboratore:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Aggiornamento di un collaboratore
router.patch("/collaborators/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to edit collaborators
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canEditCollaborators = await PlanEnforcementService.hasPermission(userId, 'collaborator.edit');
    if (!canEditCollaborators) {
      return res.status(403).json({ 
        error: "Non hai il permesso di modificare collaboratori",
        permission: "collaborator.edit",
        required: true
      });
    }

    const collaboratorId = Number(req.params.id);
    const updatedCollaborator = await storage.updateCollaborator(collaboratorId, req.body);
    
    if (!updatedCollaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    return res.json(updatedCollaborator);
  } catch (err) {
    console.error("Errore nell'aggiornamento del collaboratore:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Eliminazione di un collaboratore
router.delete("/collaborators/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to delete collaborators
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canDeleteCollaborators = await PlanEnforcementService.hasPermission(userId, 'collaborator.delete');
    if (!canDeleteCollaborators) {
      return res.status(403).json({ 
        error: "Non hai il permesso di eliminare collaboratori",
        permission: "collaborator.delete",
        required: true
      });
    }

    const collaboratorId = Number(req.params.id);
    const success = await storage.deleteCollaborator(collaboratorId);
    
    if (!success) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Errore nell'eliminazione del collaboratore:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// COMPLETE JOB MANAGEMENT ENDPOINTS
// Get all jobs (for mobile app)
router.get("/all-jobs", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Get user's plan configuration for permissions and feature visibility
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    // Enforce job.view_all via deny-by-default
    const canViewAllJobs = await PlanEnforcementService.hasPermission(userId, 'job.view_all');
    const jobs = canViewAllJobs
      ? await storage.getJobs()
      : await storage.getJobsByUserId(userId);
    
    // Get plan configuration only for visible fields filtering
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    // Filter job fields based on plan configuration
    const visibleFields = planConfig?.features?.visible_fields?.jobs || [
      'title', 'description', 'startDate', 'endDate', 'status', 'rate', 'client', 'actualDuration', 
      'assignedTo', 'photos', 'materialsCost', 'cost', 'location', 'duration', 'completedDate', 'priority', 'materials'
    ];
    
    const filteredJobs = jobs.map(job => {
      const filteredJob: any = {};
      
      // Always include the ID field for functionality purposes
      filteredJob.id = job.id;
      
      // Add other visible fields
      visibleFields.forEach((field: string) => {
        if (job[field as keyof typeof job] !== undefined) {
          filteredJob[field] = job[field as keyof typeof job];
        }
      });
      return filteredJob;
    });
    
    res.json(filteredJobs);
  } catch (err) {
    console.error("Errore nell'ottenere i lavori:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Create new job
router.post("/jobs", async (req: Request, res: Response) => {
  try {
    console.log("🚀 POST /jobs route called");
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      console.log("❌ Authentication failed");
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    console.log(`✅ Authenticated user: ${userId}`);
    
    // Set userId in session for plan enforcement
    (req.session as any).userId = userId;
    
    // Check permission to create jobs
    console.log("🔍 Checking job creation permission...");
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const hasPermission = await PlanEnforcementService.hasPermission(userId, 'job.create');
    console.log(`🔍 Job creation permission check: userId=${userId}, permission=job.create, hasPermission=${hasPermission}`);
    if (!hasPermission) {
      console.log(`❌ Job creation blocked for userId=${userId}`);
      return res.status(403).json({ error: "Non hai il permesso di creare nuovi lavori" });
    }
    console.log(`✅ Job creation allowed for userId=${userId}`);

    // Prepare job data with required fields
    const jobData = {
      title: req.body.title,
      clientId: Number(req.body.clientId),
      type: req.body.type || 'repair',
      status: req.body.status || 'scheduled',
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      duration: req.body.duration || '2.00',
      hourlyRate: req.body.hourlyRate || '25.00',
      materialsCost: req.body.materialsCost || '0.00',
      cost: req.body.cost || '0.00',
      laborCost: req.body.laborCost || '0.00',
      location: req.body.location || null,
      notes: req.body.description || req.body.notes || '',
      assignedUserId: userId,
      completedDate: null,
      actualDuration: null,
      photos: null,
      manageByActivities: req.body.manageByActivities || false,
      isActivityLevel: req.body.isActivityLevel || false,
      isPriceTotal: req.body.isPriceTotal || false
    };

    console.log(`🔍 Creating job with data:`, jobData);
    const newJob = await storage.createJob(jobData);
    res.status(201).json(newJob);
  } catch (err) {
    console.error("Errore nella creazione del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update job
router.patch("/jobs/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Set userId in session for plan enforcement
    (req.session as any).userId = userId;
    
    // Check permission to edit jobs
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const hasPermission = await PlanEnforcementService.hasPermission(userId, 'job.edit');
    if (!hasPermission) {
      return res.status(403).json({ error: "Non hai il permesso di modificare i lavori" });
    }

    const jobId = Number(req.params.id);
    const updatedJob = await storage.updateJob(jobId, req.body);
    
    if (!updatedJob) {
      return res.status(404).json({ error: "Lavoro non trovato" });
    }
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nell'aggiornamento del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Complete job
router.post("/jobs/:id/complete", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Set userId in session for plan enforcement
    (req.session as any).userId = userId;
    
    // Check permission to complete jobs
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const hasPermission = await PlanEnforcementService.hasPermission(userId, 'job.complete');
    if (!hasPermission) {
      return res.status(403).json({ error: "Non hai il permesso di completare i lavori" });
    }

    const jobId = Number(req.params.id);
    const { completedDate, actualDuration, notes, photos } = req.body;
    
    if (!completedDate || actualDuration === undefined) {
      return res.status(400).json({ error: "Data completamento e durata sono richiesti" });
    }
    
    const updatedJob = await storage.updateJob(jobId, {
      status: "completed",
      completedDate: new Date(completedDate),
      actualDuration,
      notes: notes || "",
      photos: photos || ""
    });
    
    res.json(updatedJob);
  } catch (err) {
    console.error("Errore nel completamento del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get all clients (for mobile app) with feature visibility
router.get("/all-clients", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const clients = await storage.getClients();
    
    // Get user's plan configuration for feature visibility
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    
    // Filter client fields based on plan configuration
    const visibleFields = planConfig?.features?.visible_fields?.clients || [
      'name', 'email', 'phone', 'address', 'clientType', 'notes', 'location', 'sectors', 'createdAt'
    ];
    
    const filteredClients = clients.map(client => {
      const filteredClient: any = {};
      
      // Always include the ID field for functionality purposes
      filteredClient.id = client.id;
      
      // Add other visible fields
      visibleFields.forEach(field => {
        if (client[field as keyof typeof client] !== undefined) {
          filteredClient[field] = client[field as keyof typeof client];
        }
      });
      return filteredClient;
    });
    
    res.json(filteredClients);
  } catch (err) {
    console.error("Errore nell'ottenere i clienti:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Create new client
router.post("/clients", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to create clients
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    // Check client creation permission via deny-by-default
    const canCreateClients = await PlanEnforcementService.hasPermission(userId, 'client.create');
    if (!canCreateClients) {
      return res.status(403).json({ 
        error: "Non hai il permesso di creare nuovi clienti",
        permission: "client.create",
        required: true
      });
    }

    const newClient = await storage.createClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    console.error("Errore nella creazione del cliente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update client (mobile)
router.patch("/clients/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to edit clients
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canEditClients = await PlanEnforcementService.hasPermission(userId, 'client.edit');
    if (!canEditClients) {
      return res.status(403).json({ 
        error: "Non hai il permesso di modificare clienti",
        permission: 'client.edit',
        required: true
      });
    }

    const clientId = Number(req.params.id);
    const updatedClient = await storage.updateClient(clientId, req.body);
    console.log(`[API] PUT /api/mobile/clients/${clientId} body=`, req.body);
    if (!updatedClient) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    return res.json(updatedClient);
  } catch (err) {
    console.error("Errore nell'aggiornamento del cliente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update client (PUT alias)
router.put("/clients/:id", async (req: Request, res: Response) => {
  try {
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const userId = global.mobileSessions[mobileSessionId];
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canEditClients = await PlanEnforcementService.hasPermission(userId, 'client.edit');
    if (!canEditClients) {
      return res.status(403).json({ 
        error: "Non hai il permesso di modificare clienti",
        permission: 'client.edit',
        required: true
      });
    }

    const clientId = Number(req.params.id);
    const updatedClient = await storage.updateClient(clientId, req.body);
    if (!updatedClient) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    return res.json(updatedClient);
  } catch (err) {
    console.error("Errore nell'aggiornamento del cliente (PUT):", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Delete client (mobile)
router.delete("/clients/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const userId = global.mobileSessions[mobileSessionId];

    // Check if user has permission to delete clients
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const canDeleteClients = await PlanEnforcementService.hasPermission(userId, 'client.delete');
    if (!canDeleteClients) {
      return res.status(403).json({ 
        error: "Non hai il permesso di eliminare clienti",
        permission: 'client.delete',
        required: true
      });
    }

    const clientId = Number(req.params.id);
    const success = await storage.deleteClient(clientId);
    console.log(`[API] DELETE /api/mobile/clients/${clientId} success=${success}`);
    if (!success) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Errore nell'eliminazione del cliente:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get user plan configuration for mobile app
router.get("/plan-configuration", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Get user's plan configuration
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    
    if (!planConfig) {
      return res.json({
        planId: null,
        features: {},
        visibleFields: {
          clients: ['name', 'email', 'phone', 'address', 'clientType', 'notes', 'location', 'sectors', 'createdAt'],
          jobs: ['title', 'description', 'startDate', 'endDate', 'status', 'rate', 'client', 'actualDuration', 'assignedTo', 'photos', 'materialsCost', 'cost', 'location', 'duration', 'completedDate', 'priority', 'materials']
        }
      });
    }
    
    res.json(planConfig);
  } catch (err) {
    console.error("Errore nell'ottenere la configurazione del piano:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Debug endpoint to check user subscriptions
router.get("/debug-plan", async (req: Request, res: Response) => {
  try {
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    
    // Get all user subscriptions
    const allSubscriptions = await storage.getUserSubscriptions();
    const userSubscriptions = allSubscriptions.filter(sub => sub.userId === userId);
    
    // Get active subscription
    const activeSubscription = userSubscriptions.find(sub => sub.status === 'active');
    
    // Get plan details
    const plans = await storage.getSubscriptionPlans();
    const activePlan = activeSubscription ? plans.find(p => p.id === activeSubscription.planId) : null;
    
    res.json({
      userId,
      allSubscriptions: allSubscriptions.length,
      userSubscriptions,
      activeSubscription,
      activePlan: activePlan ? {
        id: activePlan.id,
        name: activePlan.name,
        features: activePlan.features
      } : null
    });
  } catch (err) {
    console.error("Debug plan error:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get user permissions for mobile app
router.get("/permissions", async (req: Request, res: Response) => {
  try {
    if (process.env.DEBUG_PERMISSIONS) console.log('🚀 PERMISSIONS ENDPOINT CALLED');
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      console.log("❌ Permissions endpoint - Invalid mobile session:", {
        mobileSessionId,
        globalSessionsExists: !!global.mobileSessions,
        globalSessionsKeys: global.mobileSessions ? Object.keys(global.mobileSessions) : []
      });
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];
    if (process.env.DEBUG_PERMISSIONS) console.log("✅ Permissions endpoint - Valid mobile session:", { mobileSessionId, userId });

    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Get user's plan configuration for field visibility
    const { PlanEnforcementService } = await import('../services/planEnforcement');
    const planConfig = await PlanEnforcementService.getUserPlanConfiguration(userId);
    
    if (process.env.DEBUG_PERMISSIONS) console.log('🔍 Plan Config Debug:', {
      userId,
      planConfig: planConfig ? {
        planId: planConfig.planId,
        hasFeatures: !!planConfig.features,
        hasVisibleFields: !!planConfig.features?.visible_fields,
        visibleFieldsKeys: planConfig.features?.visible_fields ? Object.keys(planConfig.features.visible_fields) : []
      } : null
    });
    
    // Get visible fields from plan configuration
    const visibleFields = planConfig?.features?.visible_fields || {};
    const clientVisibleFields = visibleFields.clients || [
      'name', 'email', 'phone', 'address', 'type', 'notes', 'geoLocation', 'sectorIds', 'createdAt'
    ];
    const jobVisibleFields = visibleFields.jobs || [
      'title', 'description', 'startDate', 'endDate', 'status', 'rate', 'client', 'actualDuration', 
      'assignedTo', 'photos', 'materialsCost', 'cost', 'location', 'duration', 'completedDate', 'priority', 'materials'
    ];

    if (process.env.DEBUG_PERMISSIONS) console.log('🔍 Field Visibility Debug:', {
      userId,
      userType: user.type,
      visibleFields,
      clientVisibleFields,
      jobVisibleFields
    });

    // Apply field visibility overrides based on admin settings
    const fieldVisibilityPermissions = {
      // Client field visibility based on admin settings
      canViewClientName: clientVisibleFields.includes('name'),
      canViewClientAddress: clientVisibleFields.includes('address'),
      canViewClientPhone: clientVisibleFields.includes('phone'),
      canViewClientEmail: clientVisibleFields.includes('email'),
      canViewClientType: clientVisibleFields.includes('type'),
      canViewClientNotes: clientVisibleFields.includes('notes'),
      canViewClientGeoLocation: clientVisibleFields.includes('geoLocation'),
      canViewClientSectors: clientVisibleFields.includes('sectorIds'),
      canViewClientCreatedAt: clientVisibleFields.includes('createdAt'),
      
      // Job field visibility based on admin settings
      canViewJobTitle: jobVisibleFields.includes('title'),
      canViewJobDescription: jobVisibleFields.includes('description'),
      canViewJobStartDate: jobVisibleFields.includes('startDate'),
      canViewJobEndDate: jobVisibleFields.includes('endDate'),
      canViewJobStatus: jobVisibleFields.includes('status'),
      canViewJobRate: jobVisibleFields.includes('rate'),
      canViewJobClient: jobVisibleFields.includes('clientId'),
      canViewJobActualDuration: jobVisibleFields.includes('actualDuration'),
      canViewJobAssignedTo: jobVisibleFields.includes('assignedTo'),
      canViewJobPhotos: jobVisibleFields.includes('photos'),
      canViewJobMaterialsCost: jobVisibleFields.includes('materialsCost'),
      canViewJobCost: jobVisibleFields.includes('cost'),
      canViewJobLocation: jobVisibleFields.includes('location'),
      canViewJobDuration: jobVisibleFields.includes('duration'),
      canViewJobCompletedDate: jobVisibleFields.includes('completedDate'),
      canViewJobPriority: jobVisibleFields.includes('priority'),
      canViewJobMaterials: jobVisibleFields.includes('materials'),
      
      // Registration field visibility based on admin settings
      canViewRegistrationDate: (visibleFields.registration || []).includes('date'),
      canViewRegistrationTime: (visibleFields.registration || []).includes('time'),
      canViewRegistrationActivity: (visibleFields.registration || []).includes('activityId'),
      canViewRegistrationDuration: (visibleFields.registration || []).includes('duration'),
      canViewRegistrationPhotos: (visibleFields.registration || []).includes('photos'),
      canViewRegistrationLocation: (visibleFields.registration || []).includes('location'),
      canViewRegistrationJob: (visibleFields.registration || []).includes('jobId'),
      canViewRegistrationNotes: (visibleFields.registration || []).includes('notes'),
      canViewRegistrationMaterials: (visibleFields.registration || []).includes('materials'),
      canViewRegistrationSignature: (visibleFields.registration || []).includes('signature'),
    };

    // For all users, apply field visibility settings
    const isAdmin = user.type === "admin";
    
    // Base permissions for all users
    const basePermissions = {
        // Admin users get full permissions, others get limited permissions
        canViewClients: isAdmin,
        canEditClients: isAdmin,
        canCreateClients: isAdmin,
        canDeleteClients: isAdmin,
        canViewClientDetails: isAdmin,
        canViewClientSensitiveData: isAdmin,
        canViewJobs: true, // All users can view jobs
        canEditJobs: isAdmin,
        canCreateJobs: true, // All users can create jobs
        canDeleteJobs: isAdmin,
        canViewJobDetails: true, // All users can view job details
        canViewJobFinancials: isAdmin,
        canUpdateJobStatus: true, // All users can update job status
        canAddJobNotes: true, // All users can add notes
        canUploadJobPhotos: true, // All users can upload photos
        canViewReports: isAdmin,
        canCreateReports: isAdmin,
        canExportReports: isAdmin,
        canViewFinancialReports: isAdmin,
        canViewPerformanceMetrics: isAdmin,
        canViewInvoices: isAdmin,
        canEditInvoices: isAdmin,
        canCreateInvoices: isAdmin,
        canDeleteInvoices: isAdmin,
        canViewInvoiceAmounts: isAdmin,
        canViewPaymentHistory: isAdmin,
        canTrackTime: true, // All users can track time
        canViewTimeEntries: true, // All users can view their time entries
        canEditTimeEntries: true, // All users can edit their time entries
        canViewActivityLogs: isAdmin,
        canViewMaterials: true, // All users can view materials
        canEditMaterials: isAdmin,
        canViewInventory: isAdmin,
        canUpdateInventory: isAdmin,
        canSendNotifications: isAdmin,
        canViewMessages: true, // All users can view messages
        canSendMessages: true, // All users can send messages
        canViewSystemAlerts: isAdmin,
    };

    // Merge base permissions with field visibility
    const finalPermissions = { ...basePermissions, ...fieldVisibilityPermissions };
    
    if (process.env.DEBUG_PERMISSIONS) console.log('🔍 Final Permissions Debug:', {
      userId,
      userType: user.type,
      isAdmin,
      fieldVisibilityPermissions: Object.keys(fieldVisibilityPermissions).filter(k => k.startsWith('canViewClient')),
      finalPermissions: Object.keys(finalPermissions).filter(k => k.startsWith('canViewClient')),
      clientVisibleFields,
      visibleFieldsResponse: {
        clients: clientVisibleFields,
        jobs: jobVisibleFields
      }
    });
    
    return res.json({
      userId: user.id,
      type: user.type,
      permissions: finalPermissions,
      visibleFields: {
        clients: clientVisibleFields,
        jobs: jobVisibleFields,
        activities: visibleFields.activities || [],
        job_activities: visibleFields.job_activities || [],
        collaborators: visibleFields.collaborators || [],
        profile: visibleFields.profile || [],
        dashboard: visibleFields.dashboard || [],
        registration: visibleFields.registration || []
      }
    });

  } catch (error) {
    console.error("Error getting permissions:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// Get all job types
router.get("/job-types", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const jobTypes = await storage.getJobTypes();
    res.json(jobTypes);
  } catch (err) {
    console.error("Errore nell'ottenere i tipi di lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get all activities
router.get("/activities", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const activities = await storage.getActivities();
    res.json(activities);
  } catch (err) {
    console.error("Errore nell'ottenere le attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// NOTIFICATION PREFERENCES ENDPOINTS

// Get notification preferences
router.get("/notification-preferences", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // For now, return default preferences
    // In a real app, you'd fetch from a user_preferences table
    const defaultPreferences = {
      globalEmail: true,
      globalWhatsApp: false,
      globalPush: true,
      activityNotifications: {
        enabled: true,
        method: 'both',
        timing: 'immediate',
      },
      collaboratorCreationNotifications: {
        enabled: true,
        method: 'email',
      },
    };

    res.json(defaultPreferences);
  } catch (err) {
    console.error("Errore nell'ottenere le preferenze di notifica:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update notification preferences
router.patch("/notification-preferences", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // For now, just return the updated preferences
    // In a real app, you'd save to a user_preferences table
    const updatedPreferences = req.body;

    res.json(updatedPreferences);
  } catch (err) {
    console.error("Errore nell'aggiornamento delle preferenze di notifica:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// COMPANY ENDPOINTS

// Get company information
router.get("/company", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // For now, return default company data
    // In a real app, you'd fetch from a company table
    const defaultCompany = {
      name: "La Tua Azienda",
      ownerName: "Nome Proprietario",
      vatNumber: "IT12345678901",
      address: "Via Roma 123",
      city: "Milano",
      zipCode: "20100",
      province: "MI",
      country: "Italia",
      email: "info@azienda.it",
      phone: "+39 02 1234567",
      website: "www.azienda.it",
      logo: ""
    };

    res.json(defaultCompany);
  } catch (err) {
    console.error("Errore nell'ottenere i dati aziendali:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update company information
router.patch("/company", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // For now, just return the updated company data
    // In a real app, you'd save to a company table
    const updatedCompany = req.body;

    res.json(updatedCompany);
  } catch (err) {
    console.error("Errore nell'aggiornamento dei dati aziendali:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Create new activity
router.post("/activities", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const newActivity = await storage.createActivity(req.body);
    res.status(201).json(newActivity);
  } catch (err) {
    console.error("Errore nella creazione dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update activity
router.patch("/activities/:id", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const activityId = Number(req.params.id);
    const updatedActivity = await storage.updateActivity(activityId, req.body);
    
    if (!updatedActivity) {
      return res.status(404).json({ error: "Attività non trovata" });
    }
    
    res.json(updatedActivity);
  } catch (err) {
    console.error("Errore nell'aggiornamento dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Assign activity to job
router.post("/jobs/:jobId/activities", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const jobId = Number(req.params.jobId);
    const { activityId, notes, estimatedDuration } = req.body;
    
    if (!activityId) {
      return res.status(400).json({ error: "ID attività richiesto" });
    }
    
    const jobActivity = await storage.createJobActivity({
      jobId,
      activityId,
      startDate: new Date(),
      duration: estimatedDuration || "1.00",
      notes: notes || "",
      status: "assigned"
    });
    
    res.status(201).json(jobActivity);
  } catch (err) {
    console.error("Errore nell'assegnazione dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Complete activity
router.post("/job-activities/:id/complete", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const jobActivityId = Number(req.params.id);
    const { actualDuration, notes, photos } = req.body;
    
    if (!actualDuration) {
      return res.status(400).json({ error: "Durata effettiva richiesta" });
    }
    
    const updatedJobActivity = await storage.updateJobActivity(jobActivityId, {
      actualDuration,
      notes: notes || "",
      photos: photos || "",
      status: "completed",
      completedDate: new Date()
    });
    
    res.json(updatedJobActivity);
  } catch (err) {
    console.error("Errore nel completamento dell'attività:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Get job activities
router.get("/jobs/:jobId/activities", async (req: Request, res: Response) => {
  try {
    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    const jobId = Number(req.params.jobId);
    const jobActivities = await storage.getJobActivitiesByJob(jobId);
    
    res.json(jobActivities);
  } catch (err) {
    console.error("Errore nell'ottenere le attività del lavoro:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Update existing subscription (plan change)
router.put("/subscriptions/:subscriptionId", async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { planId, billingFrequency = "monthly", paymentMethod, paymentInfo } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: "ID del piano richiesto" });
    }

    // Check mobile session authentication
    const mobileSessionId = req.headers['x-mobile-session-id'] as string;
    if (!mobileSessionId || !global.mobileSessions || !global.mobileSessions[mobileSessionId]) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const userId = global.mobileSessions[mobileSessionId];

    // Get current subscription
    const currentSubscription = await storage.getUserSubscription(parseInt(subscriptionId));
    if (!currentSubscription || currentSubscription.userId !== userId) {
      return res.status(404).json({ error: "Abbonamento non trovato" });
    }

    // Get new plan
    const newPlan = await storage.getSubscriptionPlan(planId);
    if (!newPlan) {
      return res.status(404).json({ error: "Piano non trovato" });
    }

    // Check if it's a free plan
    const isFreePlan = newPlan.isFree || parseFloat(newPlan.monthlyPrice) === 0;

    // Process payment for paid plans
    if (!isFreePlan) {
      if (!paymentMethod) {
        return res.status(400).json({ error: "Metodo di pagamento richiesto per piani a pagamento" });
      }

      if (paymentMethod === "credit_card") {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
          return res.status(400).json({ error: "Payment Intent ID richiesto per pagamenti con carta" });
        }

        try {
          // Verify the payment intent with Stripe
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              error: "Pagamento non completato", 
              details: "Il pagamento non è stato completato con successo"
            });
          }

          // Verify the amount matches the plan price
          const expectedAmount = billingFrequency === "monthly" 
            ? Math.round(parseFloat(newPlan.monthlyPrice) * 100)
            : Math.round(parseFloat(newPlan.yearlyPrice) * 100);
            
          if (paymentIntent.amount !== expectedAmount) {
            return res.status(400).json({ 
              error: "Importo non corrispondente", 
              details: "L'importo pagato non corrisponde al prezzo del piano"
            });
          }
        } catch (stripeError: any) {
          console.error('Stripe payment verification error:', stripeError);
          return res.status(400).json({ 
            error: "Errore nella verifica del pagamento", 
            details: stripeError.message || "Errore sconosciuto"
          });
        }
      }
    }

    // Calculate new dates
    const startDate = new Date();
    let endDate = new Date();
    
    if (billingFrequency === "monthly" && newPlan.monthlyDuration) {
      endDate.setDate(endDate.getDate() + newPlan.monthlyDuration);
    } else if (billingFrequency === "yearly" && newPlan.yearlyDuration) {
      endDate.setDate(endDate.getDate() + newPlan.yearlyDuration);
    }

    // Update subscription
    const updatedSubscription = await storage.updateUserSubscription(parseInt(subscriptionId), {
      planId,
      billingFrequency,
      startDate,
      endDate,
      status: isFreePlan ? "active" : "active"
    });

    res.json(updatedSubscription);
  } catch (err) {
    console.error("Errore nell'aggiornamento dell'abbonamento:", err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

export default router;