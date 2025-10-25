import { and, eq, ne } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  clients,
  jobs,
  jobTypes,
  activities,
  roles,
  collaborators,
  jobActivities,
  activityCollaborators,
  subscriptionPlans,
  userSubscriptions,
  sectors,
  webPages,
  planConfigurations,
  promotionalSpots,
  generalSettings,
  InsertUser,
  User,
  InsertClient,
  Client,
  InsertJob,
  Job,
  InsertJobType,
  JobType,
  InsertActivity,
  Activity,
  InsertRole,
  Role,
  InsertCollaborator,
  Collaborator,
  InsertJobActivity,
  JobActivity,
  InsertActivityCollaborator,
  ActivityCollaborator,
  InsertSubscriptionPlan,
  SubscriptionPlan,
  InsertUserSubscription,
  UserSubscription,
  InsertSector,
  Sector,
  InsertWebPage,
  WebPage,
  InsertPlanConfiguration,
  PlanConfiguration,
  InsertPromotionalSpot,
  PromotionalSpot,
  InsertGeneralSettings,
  GeneralSettings
} from "../shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // PlanConfiguration methods
  getPlanConfigurations(): Promise<PlanConfiguration[]>;
  getPlanConfiguration(id: number): Promise<PlanConfiguration | undefined>;
  getPlanConfigurationByUser(userId: number): Promise<PlanConfiguration | undefined>;
  createPlanConfiguration(config: InsertPlanConfiguration): Promise<PlanConfiguration>;
  updatePlanConfiguration(id: number, config: Partial<InsertPlanConfiguration>): Promise<PlanConfiguration | undefined>;
  deletePlanConfiguration(id: number): Promise<boolean>;

  // General Settings methods
  getGeneralSettings(): Promise<GeneralSettings | undefined>;
  upsertGeneralSettings(settings: InsertGeneralSettings): Promise<GeneralSettings>;

  // Web Page methods
  getAllWebPages(): Promise<WebPage[]>;
  getWebPagesByType(type: string): Promise<WebPage[]>;
  getWebPage(id: number): Promise<WebPage | undefined>;
  getWebPageBySlug(slug: string): Promise<WebPage | undefined>;
  createWebPage(webPage: InsertWebPage): Promise<WebPage>;
  updateWebPage(id: number, webPage: Partial<InsertWebPage>): Promise<WebPage | undefined>;
  deleteWebPage(id: number): Promise<boolean>;
  
  // Sector methods
  getAllSectors(): Promise<Sector[]>;
  getSectors(): Promise<Sector[]>; // Alias for getAllSectors
  getSector(id: number): Promise<Sector | undefined>;
  createSector(sector: InsertSector): Promise<Sector>;
  updateSector(id: number, sector: Partial<InsertSector>): Promise<Sector | undefined>;
  deleteSector(id: number): Promise<boolean>;
  
  // WebPage methods
  getAllWebPages(): Promise<WebPage[]>;
  getWebPagesByType(type: string): Promise<WebPage[]>;
  getWebPage(id: number): Promise<WebPage | undefined>;
  getWebPageBySlug(slug: string): Promise<WebPage | undefined>;
  createWebPage(webPage: InsertWebPage): Promise<WebPage>;
  updateWebPage(id: number, webPage: Partial<InsertWebPage>): Promise<WebPage | undefined>;
  deleteWebPage(id: number): Promise<boolean>;
  
  // Promotional Spot methods
  getPromotionalSpots(): Promise<PromotionalSpot[]>;
  getActivePromotionalSpots(): Promise<PromotionalSpot[]>;
  getPromotionalSpot(id: number): Promise<PromotionalSpot | undefined>;
  createPromotionalSpot(spot: InsertPromotionalSpot): Promise<PromotionalSpot>;
  updatePromotionalSpot(id: number, spot: Partial<InsertPromotionalSpot>): Promise<PromotionalSpot | undefined>;
  deletePromotionalSpot(id: number): Promise<boolean>;
  
  // Subscription plan methods
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<boolean>;
  
  // User subscription methods
  getUserSubscriptions(): Promise<UserSubscription[]>;
  getUserSubscription(id: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  deleteUserSubscription(id: number): Promise<boolean>;
  
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Job methods
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobsByClient(clientId: number): Promise<Job[]>;
  getJobsByUserId(userId: number): Promise<Job[]>;
  getJobsByDateRange(startDate: Date, endDate: Date): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  
  // Job Type methods
  getJobTypes(): Promise<JobType[]>;
  getJobType(id: number): Promise<JobType | undefined>;
  createJobType(jobType: InsertJobType): Promise<JobType>;
  updateJobType(id: number, jobType: Partial<InsertJobType>): Promise<JobType | undefined>;
  deleteJobType(id: number): Promise<boolean>;
  
  // Activity methods
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByJobType(jobTypeId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Role methods
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  
  // Collaborator methods
  getCollaborators(): Promise<Collaborator[]>;
  getCollaborator(id: number): Promise<Collaborator | undefined>;
  getCollaboratorsByRole(roleId: number): Promise<Collaborator[]>;
  createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  updateCollaborator(id: number, collaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined>;
  deleteCollaborator(id: number): Promise<boolean>;
  
  // Job Activity methods
  getJobActivities(): Promise<JobActivity[]>;
  getJobActivity(id: number): Promise<JobActivity | undefined>;
  getJobActivitiesByJob(jobId: number): Promise<JobActivity[]>;
  createJobActivity(jobActivity: InsertJobActivity): Promise<JobActivity>;
  updateJobActivity(id: number, jobActivity: Partial<InsertJobActivity>): Promise<JobActivity | undefined>;
  deleteJobActivity(id: number): Promise<boolean>;
  
  // Activity Collaborator methods
  getActivityCollaborators(): Promise<ActivityCollaborator[]>;
  getCollaboratorsByActivity(activityId: number): Promise<number[]>;
  getActivitiesByCollaborator(collaboratorId: number): Promise<number[]>;
  assignCollaboratorToActivity(activityId: number, collaboratorId: number): Promise<ActivityCollaborator>;
  removeCollaboratorFromActivity(activityId: number, collaboratorId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  // Promotional Spot methods
  async getPromotionalSpots(): Promise<PromotionalSpot[]> {
    return Array.from(this.promotionalSpots.values());
  }

  async getActivePromotionalSpots(): Promise<PromotionalSpot[]> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    
    // Aggiungi dei log per debug
    console.log("Recupero spot promozionali attivi, ora corrente:", currentTimeStr);
    
    return Array.from(this.promotionalSpots.values()).filter(spot => {
      // Filtra per stato attivo
      if (spot.status !== "active") return false;
      
      // Filtra per date di validità (se specificate)
      if (spot.startDate && new Date(spot.startDate) > now) return false;
      if (spot.endDate && new Date(spot.endDate) < now) return false;
      
      // Filtra per fasce orarie (se specificate)
      if (spot.timeRanges && spot.timeRanges.length > 0) {
        const timeRanges = typeof spot.timeRanges === 'string' ? JSON.parse(spot.timeRanges) : spot.timeRanges;
        const hasValidTimeRange = timeRanges && timeRanges.some((range: any) => {
          if (!range.startTime || !range.endTime) return false;
          return currentTimeStr >= range.startTime && currentTimeStr <= range.endTime;
        });
        
        // Se ci sono fasce orarie ma nessuna valida, lo spot non è visibile
        if (!hasValidTimeRange) return false;
      } else if (spot.startTime && spot.endTime) {
        // Supporto per i campi legacy (singola fascia oraria)
        if (currentTimeStr < spot.startTime || currentTimeStr > spot.endTime) return false;
      }
      
      // Assicuriamoci che visiblePages sia definito correttamente
      if (!spot.visiblePages) {
        spot.visiblePages = "all"; // Predefinito: mostra su tutte le pagine
      }
      
      console.log("Spot attivo trovato:", spot.title, "visibile su:", spot.visiblePages);
      
      // Se passa tutti i filtri, lo spot è visibile
      return true;
    });
  }

  async getPromotionalSpot(id: number): Promise<PromotionalSpot | undefined> {
    return this.promotionalSpots.get(id);
  }

  async createPromotionalSpot(spot: InsertPromotionalSpot): Promise<PromotionalSpot> {
    const id = this.spotId++;
    const now = new Date();
    
    console.log("Creazione spot promozionale con dati:", spot);
    
    // Assicuriamoci che tutti i campi null/undefined siano gestiti correttamente
    const newSpot: PromotionalSpot = {
      id,
      title: spot.title,
      position: spot.position,
      content: spot.content ?? null,
      redirectUrl: spot.redirectUrl ?? null,
      enableRedirect: spot.enableRedirect ?? false,
      images: spot.images ?? null,
      textAnimationType: spot.textAnimationType ?? null,
      imageDisplayType: spot.imageDisplayType ?? null,
      status: spot.status ?? "inactive",
      startDate: spot.startDate ? new Date(spot.startDate) : null,
      endDate: spot.endDate ? new Date(spot.endDate) : null,
      startTime: null, // Add missing required fields
      endTime: null,   // Add missing required fields
      timeRanges: spot.timeRanges ?? null,
      dailyFrequency: spot.dailyFrequency ?? 1,
      weeklySchedule: spot.weeklySchedule ?? null,
      visiblePages: spot.visiblePages ?? "all", // Gestione esplicita del nuovo campo
      width: spot.width ?? null,
      height: spot.height ?? null,
      displayDuration: spot.displayDuration ?? 10,
      displayInterval: spot.displayInterval ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.promotionalSpots.set(id, newSpot);
    return newSpot;
  }

  async updatePromotionalSpot(id: number, spot: Partial<InsertPromotionalSpot>): Promise<PromotionalSpot | undefined> {
    const existingSpot = this.promotionalSpots.get(id);
    if (!existingSpot) return undefined;
    
    console.log("Aggiornamento spot promozionale, dati ricevuti:", spot);
    
    const updatedSpot: PromotionalSpot = {
      ...existingSpot,
      title: spot.title ?? existingSpot.title,
      position: spot.position ?? existingSpot.position,
      content: spot.content ?? existingSpot.content,
      redirectUrl: spot.redirectUrl ?? existingSpot.redirectUrl,
      enableRedirect: spot.enableRedirect ?? existingSpot.enableRedirect,
      images: spot.images ?? existingSpot.images,
      textAnimationType: spot.textAnimationType ?? existingSpot.textAnimationType,
      imageDisplayType: spot.imageDisplayType ?? existingSpot.imageDisplayType,
      status: spot.status ?? existingSpot.status,
      startDate: spot.startDate ? new Date(spot.startDate) : existingSpot.startDate,
      endDate: spot.endDate ? new Date(spot.endDate) : existingSpot.endDate,
      timeRanges: spot.timeRanges ?? existingSpot.timeRanges,
      dailyFrequency: spot.dailyFrequency ?? existingSpot.dailyFrequency,
      weeklySchedule: spot.weeklySchedule ?? existingSpot.weeklySchedule,
      visiblePages: spot.visiblePages ?? existingSpot.visiblePages ?? "all", // Gestione esplicita del campo visiblePages
      width: spot.width ?? existingSpot.width,
      height: spot.height ?? existingSpot.height,
      displayDuration: spot.displayDuration ?? existingSpot.displayDuration,
      updatedAt: new Date()
    };
    
    this.promotionalSpots.set(id, updatedSpot);
    return updatedSpot;
  }

  async deletePromotionalSpot(id: number): Promise<boolean> {
    return this.promotionalSpots.delete(id);
  }
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private jobs: Map<number, Job>;
  private jobTypes: Map<number, JobType>;
  private activities: Map<number, Activity>;
  private roles: Map<number, Role>;
  private collaborators: Map<number, Collaborator>;
  private jobActivities: Map<number, JobActivity>;
  private activityCollaborators: Set<string>; // Using composite key "activityId:collaboratorId"
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private userSubscriptions: Map<number, UserSubscription>;
  private sectors: Map<number, Sector>;
  private webPages: Map<number, WebPage>;
  private planConfigurations: Map<number, PlanConfiguration>;
  private promotionalSpots: Map<number, PromotionalSpot>;
  private generalSettings: Map<number, GeneralSettings>;
  
  private userId: number;
  private clientId: number;
  private jobId: number;
  private jobTypeId: number;
  private activityId: number;
  private roleId: number;
  private collaboratorId: number;
  private jobActivityId: number;
  private planId: number;
  private subscriptionId: number;
  private sectorId: number;
  private webPageId: number;
  private planConfigurationId: number;
  private spotId: number;
  private generalSettingsId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.jobs = new Map();
    this.jobTypes = new Map();
    this.activities = new Map();
    this.roles = new Map();
    this.collaborators = new Map();
    this.jobActivities = new Map();
    this.activityCollaborators = new Set();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.sectors = new Map();
    this.webPages = new Map();
    this.planConfigurations = new Map();
    this.promotionalSpots = new Map();
    this.generalSettings = new Map();
    
    this.planConfigurationId = 1;
    this.spotId = 1;
    this.generalSettingsId = 1;
    
    this.userId = 1;
    this.clientId = 1;
    this.jobId = 1;
    
    // Aggiungi spot promozionale di esempio
    this.createPromotionalSpot({
      title: "Spot Promozionale Demo",
      position: "top",
      content: "Questo è uno spot promozionale di dimostrazione",
      status: "active",
      imageDisplayType: "single",
      images: JSON.stringify(["https://via.placeholder.com/300x100?text=Demo+Spot"]),
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Valido per un anno
      timeRanges: JSON.stringify([
        { startTime: "00:00", endTime: "23:59" } // Disponibile 24/7
      ]),
      visiblePages: "all", // Disponibile su tutte le pagine
      height: 100,
      width: 300,
      displayDuration: 10
    });
    this.jobTypeId = 1;
    this.activityId = 1;
    this.roleId = 1;
    this.collaboratorId = 1;
    this.jobActivityId = 1;
    this.planId = 1;
    this.subscriptionId = 1;
    this.sectorId = 1;
    this.webPageId = 1;
    
    // Aggiungi settori predefiniti
    this.createSector({
      name: "Idraulica",
      description: "Servizi idraulici e termoidraulici",
      isActive: true
    });
    
    this.createSector({
      name: "Elettricità",
      description: "Impianti elettrici civili e industriali",
      isActive: true
    });
    
    this.createSector({
      name: "Falegnameria",
      description: "Lavori in legno e arredamento",
      isActive: true
    });
    
    this.createSector({
      name: "Edilizia",
      description: "Costruzione, ristrutturazione e muratura",
      isActive: true
    });
    
    this.createSector({
      name: "Climatizzazione",
      description: "Installazione e manutenzione di sistemi di condizionamento",
      isActive: true
    });
    
    // Create default roles
    this.createRole({
      name: "Amministratore",
      description: "Accesso completo a tutte le funzionalità",
      permissions: JSON.stringify(["view_all", "edit_all", "delete_all", "admin_panel"])
    });
    
    this.createRole({
      name: "Tecnico",
      description: "Può visualizzare e completare lavori assegnati",
      permissions: JSON.stringify(["view_assigned_jobs", "complete_jobs", "view_clients"])
    });
    
    // Add default job types
    this.createJobType({
      name: "Riparazione",
      description: "Riparazione di impianti o apparecchiature esistenti"
    });
    
    this.createJobType({
      name: "Installazione",
      description: "Installazione di nuovi impianti o apparecchiature"
    });
    
    this.createJobType({
      name: "Manutenzione",
      description: "Manutenzione preventiva o periodica"
    });
    
    this.createJobType({
      name: "Preventivo",
      description: "Sopralluogo per fornire un preventivo"
    });
    
    this.createJobType({
      name: "Emergenza",
      description: "Intervento urgente per problemi critici"
    });
    
    // Add default activities
    this.createActivity({
      name: "Ispezione iniziale",
      jobTypeId: 1, // Riparazione
      description: "Valutazione iniziale del problema",
      defaultDuration: "0.5",
      defaultRate: "40"
    });
    
    this.createActivity({
      name: "Sostituzione componenti",
      jobTypeId: 1, // Riparazione
      description: "Sostituzione di parti danneggiate",
      defaultDuration: "1.5",
      defaultRate: "45"
    });
    
    this.createActivity({
      name: "Sopralluogo",
      jobTypeId: 4, // Preventivo
      description: "Valutazione e misurazione per preventivo",
      defaultDuration: "1",
      defaultRate: "0"
    });
    
    // Add default users with hashed passwords
    // REMOVED: Marco user with bcrypt hash to avoid conflicts
    
    // Add test mobile user (plain text password for testing)
    this.createUser({
      username: "test",
      email: "pacrost@tiscali.it",
      password: "password123", // Plain text for testing
      fullName: "Test User", 
      phone: "+39 333 111 2222",
      roleId: 3,
      isActive: true
    });
    
    // Add marco user (plain text password for testing)
    this.createUser({
      username: "marco",
      email: "marco@example.com",
      password: "password123", // Plain text for testing
      fullName: "Marco Rossi", 
      phone: "+39 333 123 4567",
      roleId: 3,
      isActive: true
    });
    
    // Add sample collaborator
    this.createCollaborator({
      name: "Giuseppe Verdi",
      roleIds: "2",
      phone: "+39 333 456 7890",
      email: "giuseppe@example.com",
      // hourlyRate: 25, // This field doesn't exist in the schema
      workHours: JSON.stringify({
        monday: { start: "08:00", end: "17:00" },
        tuesday: { start: "08:00", end: "17:00" },
        wednesday: { start: "08:00", end: "17:00" },
        thursday: { start: "08:00", end: "17:00" },
        friday: { start: "08:00", end: "17:00" },
        saturday: { start: "", end: "" },
        sunday: { start: "", end: "" }
      }),
      notifyByEmail: true,
      notifyByWhatsApp: false,
      notificationTime: 24
    });
    
    // Add some sample clients
    this.createClient({
      name: "Famiglia Bianchi",
      type: "residential",
      phone: "+39 345 123 4567",
      email: "bianchi@example.com",
      address: "Via Roma 42, Milano",
      geoLocation: "45.4642,9.1900",
      notes: ""
    });
    
    this.createClient({
      name: "Marco Verdi",
      type: "residential",
      phone: "+39 333 987 6543",
      email: "verdi@example.com",
      address: "Via Dante 15, Milano",
      geoLocation: "45.4642,9.1905",
      notes: ""
    });
    
    this.createClient({
      name: "Ristorante Bella Vista",
      type: "commercial",
      phone: "+39 02 1234567",
      email: "info@bellavista.it",
      address: "Piazza Duomo 5, Milano",
      geoLocation: "45.4642,9.1890",
      notes: "Ristorante con cucina e bar"
    });
    
    this.createClient({
      name: "Condominio Sole",
      type: "residential",
      phone: "+39 02 7654321",
      email: "amministratore@condominiosole.it",
      address: "Via Manzoni 34, Milano",
      geoLocation: "45.4680,9.1920",
      notes: "15 appartamenti"
    });
    
    // Add some sample jobs
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 5);
    
    this.createJob({
      title: "Riparazione impianto elettrico",
      clientId: 1,
      type: "repair",
      status: "scheduled",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      duration: "2.00",
      hourlyRate: "40.00",
      materialsCost: "40.00",
      location: "Via Roma 42, Milano",
      notes: "Problemi con l'impianto",
      photos: JSON.stringify([])
    });
    
    this.createJob({
      title: "Sostituzione rubinetti bagno",
      clientId: 2,
      type: "installation",
      status: "scheduled",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      duration: "2.00",
      hourlyRate: "35.00",
      materialsCost: "80.00",
      location: "Via Dante 15, Milano",
      notes: "Rubinetti da sostituire nel bagno principale",
      photos: JSON.stringify([])
    });
    
    this.createJob({
      title: "Preventivo ristrutturazione bagno",
      clientId: 3,
      type: "quote",
      status: "scheduled",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
      duration: "1",
      hourlyRate: "0",
      materialsCost: "0",
      location: "Corso Vittorio 78, Milano",
      notes: "Preventivo gratuito",
      photos: JSON.stringify([])
    });
    
    this.createJob({
      title: "Emergenza allagamento",
      clientId: 4,
      type: "emergency",
      status: "scheduled",
      startDate: new Date(dayAfterTomorrow.getFullYear(), dayAfterTomorrow.getMonth(), dayAfterTomorrow.getDate(), 8, 30),
      duration: "2",
      hourlyRate: "50",
      materialsCost: "80",
      location: "Via Manzoni 34, Milano",
      notes: "Perdita d'acqua nel seminterrato",
      photos: JSON.stringify([])
    });
    
    this.createJob({
      title: "Sostituzione caldaia",
      clientId: 2,
      type: "installation",
      status: "completed",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0),
      duration: "6",
      hourlyRate: "45",
      materialsCost: "680",
      location: "Viale Monza 120, Milano",
      notes: "Caldaia nuova modello Eco+",
      completedDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 17, 0),
      actualDuration: "7",
      photos: JSON.stringify([])
    });
    
    // Aggiungiamo un lavoro multi-giorno che dura 3 giorni
    this.createJob({
      title: "Ristrutturazione completa bagno",
      clientId: 3,
      type: "installation",
      status: "scheduled",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      duration: "72", // 3 giorni in ore
      hourlyRate: "45",
      materialsCost: "1200",
      location: "Piazza Duomo 5, Milano",
      notes: "Ristrutturazione completa con sostituzione sanitari e piastrelle",
      photos: JSON.stringify([])
    });
    
    // Add job activities
    this.createJobActivity({
      jobId: 1,
      activityId: 1,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      duration: "0.5",
      status: "scheduled",
      notes: "",
      photos: JSON.stringify([])
    });
    
    this.createJobActivity({
      jobId: 1,
      activityId: 2,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
      duration: "1.5",
      status: "scheduled",
      notes: "",
      photos: JSON.stringify([])
    });
    
    // Assign collaborators to activities
    this.assignCollaboratorToActivity(1, 1);
    
    // Aggiungi piani di abbonamento predefiniti
    this.createSubscriptionPlan({
      name: "Piano Gratuito",
      description: "Piano base con funzionalità limitate",
      monthlyPrice: "0",
      yearlyPrice: "0",
      monthlyDuration: null, // illimitato
      yearlyDuration: null, // illimitato
      isFree: true,
      isActive: true,
      features: JSON.stringify({
        modules: {
          collaborators: false, // Modulo collaboratori disattivato
          jobActivities: false, // Modulo attività per lavori disattivato
        },
        hiddenData: {
          collaboratorPhone: true, // Nascondi telefono dei collaboratori
        },
        pages: {
          settings: false, // No accesso alle impostazioni
          reports: false,  // No accesso ai report
        },
        limits: {
          maxClients: 5,   // Massimo 5 clienti
          maxJobs: 10,     // Massimo 10 lavori
        }
      })
    });
    
    this.createSubscriptionPlan({
      name: "Piano Base",
      description: "Piano per piccole imprese",
      monthlyPrice: "19.99",
      yearlyPrice: "199.99",
      monthlyDuration: 30, // in giorni
      yearlyDuration: 365, // in giorni
      isFree: false,
      isActive: true,
      features: JSON.stringify({
        modules: {
          collaborators: true, // Modulo collaboratori attivato
          jobActivities: true, // Modulo attività per lavori attivato
        },
        hiddenData: {
          collaboratorPhone: false, // Mostra telefono dei collaboratori
        },
        pages: {
          settings: true,  // Accesso alle impostazioni
          reports: true,   // Accesso ai report
        },
        limits: {
          maxClients: 50,  // Massimo 50 clienti
          maxJobs: 200,    // Massimo 200 lavori
        }
      })
    });
    
    this.createSubscriptionPlan({
      name: "Piano Pro",
      description: "Piano completo per aziende medie e grandi",
      monthlyPrice: "49.99",
      yearlyPrice: "499.99",
      monthlyDuration: 30, // in giorni
      yearlyDuration: 365, // in giorni
      isFree: false,
      isActive: true,
      features: JSON.stringify({
        modules: {
          collaborators: true,
          jobActivities: true,
          advancedReports: true, // Reportistica avanzata
          inventory: true,       // Gestione magazzino
        },
        hiddenData: {
          collaboratorPhone: false,
        },
        pages: {
          settings: true,
          reports: true,
          analytics: true, // Analisi avanzate
        },
        limits: {
          maxClients: null, // Illimitati
          maxJobs: null,    // Illimitati
        }
      })
    });
    
    // Create subscription plans
    this.createSubscriptionPlan({
      name: "Free",
      description: "Piano gratuito con funzionalità limitate",
      monthlyPrice: "0",
      yearlyPrice: "0",
      monthlyDuration: null, // illimitato
      yearlyDuration: null, // illimitato
      isActive: true,
      isFree: true,
      features: JSON.stringify({
        max_clients: 10,
        max_jobs: 20,
        max_collaborators: 1,
        job_types: false,
        activities: false,
        reporting: false,
        invoicing: false
      })
    });
    
    this.createSubscriptionPlan({
      name: "Professional",
      description: "Piano professionale con tutte le funzionalità essenziali",
      monthlyPrice: "19.99",
      yearlyPrice: "199.99",
      monthlyDuration: 30, // in giorni
      yearlyDuration: 365, // in giorni
      isActive: true,
      isFree: false,
      features: JSON.stringify({
        max_clients: 100,
        max_jobs: 500,
        max_collaborators: 5,
        job_types: true,
        activities: true,
        reporting: true,
        invoicing: true
      })
    });
    
    this.createSubscriptionPlan({
      name: "Enterprise",
      description: "Piano completo per grandi aziende",
      monthlyPrice: "49.99",
      yearlyPrice: "499.99",
      monthlyDuration: 30, // in giorni
      yearlyDuration: 365, // in giorni
      isActive: true,
      isFree: false,
      features: JSON.stringify({
        max_clients: -1, // illimitati
        max_jobs: -1, // illimitati
        max_collaborators: -1, // illimitati
        job_types: true,
        activities: true,
        reporting: true,
        invoicing: true,
        custom_branding: true,
        api_access: true,
        priority_support: true
      })
    });
    
    // Assegna piano di abbonamento all'utente predefinito
    this.createUserSubscription({
      userId: 1,
      planId: 2, // Professional
      status: "active",
      startDate: new Date(),
      endDate: null,
      billingFrequency: "monthly",
      lastBillingDate: new Date(),
      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      roleId: insertUser.roleId || null,
      type: insertUser.type || null,
      isActive: insertUser.isActive || null,
      language: insertUser.language || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    const createdAt = new Date();
    const client: Client = { 
      ...insertClient, 
      id, 
      createdAt,
      email: insertClient.email || null,
      phone: insertClient.phone || null,
      address: insertClient.address || null,
      geoLocation: insertClient.geoLocation || null,
      notes: insertClient.notes || null,
      type: insertClient.type || "residential"
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Job methods
  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobsByClient(clientId: number): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(
      (job) => job.clientId === clientId,
    );
  }

  async getJobsByUserId(userId: number): Promise<Job[]> {
    // Filter jobs by assigned user
    return Array.from(this.jobs.values()).filter(job => 
      job.assignedUserId === userId
    );
  }

  async getJobsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter((job) => {
      // First filter by user assignment if specified
      if (userId && job.assignedUserId !== userId) {
        return false;
      }
      
      const jobStartDate = new Date(job.startDate);
      
      // Caso 1: La data di inizio del lavoro è all'interno dell'intervallo di query
      if (jobStartDate >= startDate && jobStartDate <= endDate) {
        return true;
      }
      
      // Caso 2: Il lavoro ha una data di fine ed è all'interno dell'intervallo o attraversa l'intervallo
      if (job.endDate) {
        const jobEndDate = new Date(job.endDate);
        
        // Verifica se la fine del lavoro è nell'intervallo di query
        if (jobEndDate >= startDate && jobEndDate <= endDate) {
          return true;
        }
        
        // Verifica se il lavoro attraversa completamente l'intervallo di query
        if (jobStartDate <= startDate && jobEndDate >= endDate) {
          return true;
        }
      } 
      // Caso 3: Il lavoro non ha endDate ma ha una durata definita
      else if (job.duration) {
        // Calcola la data di fine basata sulla durata
        const calculatedEndDate = new Date(jobStartDate.getTime());
        calculatedEndDate.setHours(calculatedEndDate.getHours() + Math.floor(parseFloat(job.duration)));
        calculatedEndDate.setMinutes(calculatedEndDate.getMinutes() + (parseFloat(job.duration) % 1) * 60);
        
        // Verifica se la fine calcolata è nell'intervallo di query
        if (calculatedEndDate >= startDate && calculatedEndDate <= endDate) {
          return true;
        }
        
        // Verifica se il lavoro attraversa completamente l'intervallo di query
        if (jobStartDate <= startDate && calculatedEndDate >= endDate) {
          return true;
        }
      }
      
      return false;
    });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.jobId++;
    const createdAt = new Date();
    
    // Calcola automaticamente la data di fine basata sulla durata
    let endDate = insertJob.endDate;
    if (!endDate && insertJob.startDate && insertJob.duration) {
      const start = new Date(insertJob.startDate);
      endDate = new Date(start.getTime());
      endDate.setHours(endDate.getHours() + Math.floor(parseFloat(insertJob.duration)));
      endDate.setMinutes(endDate.getMinutes() + (parseFloat(insertJob.duration) % 1) * 60);
    }
    
    const job: Job = { 
      ...insertJob, 
      id, 
      createdAt, 
      endDate: endDate || null,
      status: insertJob.status || "scheduled",
      notes: insertJob.notes ?? null,
      materialsCost: insertJob.materialsCost ?? null,
      cost: insertJob.cost ?? null,
      laborCost: insertJob.laborCost ?? null,
      location: insertJob.location ?? null,
      assignedUserId: insertJob.assignedUserId ?? null,
      completedDate: insertJob.completedDate ?? null,
      actualDuration: insertJob.actualDuration ?? null,
      photos: insertJob.photos ?? null,
      manageByActivities: insertJob.manageByActivities ?? null,
      isActivityLevel: insertJob.isActivityLevel ?? null,
      isPriceTotal: insertJob.isPriceTotal ?? null
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, jobUpdate: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    // Se vengono aggiornati startDate o duration, ricalcola anche endDate
    if ((jobUpdate.startDate || jobUpdate.duration) && !jobUpdate.endDate) {
      const startDate = jobUpdate.startDate || job.startDate;
      const duration = jobUpdate.duration || job.duration;
      
      if (startDate && duration) {
        const start = new Date(startDate);
        const endDate = new Date(start.getTime());
        endDate.setHours(endDate.getHours() + Math.floor(parseFloat(duration)));
        endDate.setMinutes(endDate.getMinutes() + (parseFloat(duration) % 1) * 60);
        
        jobUpdate.endDate = endDate;
      }
    }

    const updatedJob = { ...job, ...jobUpdate };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  // Job Type methods
  async getJobTypes(): Promise<JobType[]> {
    return Array.from(this.jobTypes.values());
  }

  async getJobType(id: number): Promise<JobType | undefined> {
    return this.jobTypes.get(id);
  }

  async createJobType(insertJobType: InsertJobType): Promise<JobType> {
    const id = this.jobTypeId++;
    const jobType: JobType = { 
      ...insertJobType, 
      id,
      description: insertJobType.description || null,
      sectorIds: insertJobType.sectorIds || null
    };
    this.jobTypes.set(id, jobType);
    return jobType;
  }

  async updateJobType(id: number, jobTypeUpdate: Partial<InsertJobType>): Promise<JobType | undefined> {
    const jobType = this.jobTypes.get(id);
    if (!jobType) return undefined;

    const updatedJobType = { ...jobType, ...jobTypeUpdate };
    this.jobTypes.set(id, updatedJobType);
    return updatedJobType;
  }

  async deleteJobType(id: number): Promise<boolean> {
    return this.jobTypes.delete(id);
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByJobType(jobTypeId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter((activity) => {
      // Verifica il jobTypeId principale
      if (activity.jobTypeId === jobTypeId) return true;
      
      // Verifica anche in jobTypesIds se contiene l'ID richiesto
      if (activity.jobTypeIds) {
        try {
          // Gestione stringa CSV
          if (activity.jobTypeIds.includes(',')) {
            const jobTypeIds = activity.jobTypeIds.split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));
            return jobTypeIds.includes(jobTypeId);
          }
          
          // Gestione formato JSON array
          if (activity.jobTypeIds.startsWith('[') && activity.jobTypeIds.endsWith(']')) {
            const jobTypeIds = JSON.parse(activity.jobTypeIds);
            return Array.isArray(jobTypeIds) && jobTypeIds.includes(jobTypeId);
          }
        } catch (error) {
          console.error("Errore nel parsing dei jobTypesIds:", error);
        }
      }
      
      return false;
    });
  }
  
  // Nuovo metodo per ottenere attività per più tipi di lavoro
  async getActivitiesByJobTypes(jobTypeIds: number[]): Promise<Activity[]> {
    if (!jobTypeIds || jobTypeIds.length === 0) {
      return this.getActivities();
    }
    
    return Array.from(this.activities.values()).filter((activity) => {
      // Verifica se il jobTypeId principale è nella lista
      if (jobTypeIds.includes(activity.jobTypeId)) return true;
      
      // Verifica anche in jobTypesIds se contiene almeno uno degli ID richiesti
      if (activity.jobTypeIds) {
        try {
          let activityJobTypeIds: number[] = [];
          
          // Gestione stringa CSV
          if (activity.jobTypeIds.includes(',')) {
            activityJobTypeIds = activity.jobTypeIds.split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));
          } 
          // Gestione formato JSON array
          else if (activity.jobTypeIds.startsWith('[') && activity.jobTypeIds.endsWith(']')) {
            const parsed = JSON.parse(activity.jobTypeIds);
            if (Array.isArray(parsed)) {
              activityJobTypeIds = parsed;
            }
          }
          
          // Verifica se c'è almeno un ID in comune
          return jobTypeIds.some(id => activityJobTypeIds.includes(id));
        } catch (error) {
          console.error("Errore nel parsing dei jobTypesIds:", error);
        }
      }
      
      return false;
    });
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityId++;
    const activity: Activity = { 
      ...insertActivity, 
      id,
      description: insertActivity.description || null,
      sectorIds: insertActivity.sectorIds || null,
      jobTypeIds: insertActivity.jobTypeIds || null,
      implementationNotes: insertActivity.implementationNotes || null,
      defaultDuration: insertActivity.defaultDuration || null,
      defaultRate: insertActivity.defaultRate || null,
      defaultCost: insertActivity.defaultCost || null
    };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(id: number, activityUpdate: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;

    const updatedActivity = { ...activity, ...activityUpdate };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Role methods
  async getRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const id = this.roleId++;
    const role: Role = { 
      ...insertRole, 
      id,
      description: insertRole.description || null,
      permissions: insertRole.permissions || null,
      sectorId: insertRole.sectorId || null,
      isDefault: insertRole.isDefault || null
    };
    this.roles.set(id, role);
    return role;
  }

  async updateRole(id: number, roleUpdate: Partial<InsertRole>): Promise<Role | undefined> {
    const role = this.roles.get(id);
    if (!role) return undefined;

    const updatedRole = { ...role, ...roleUpdate };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: number): Promise<boolean> {
    return this.roles.delete(id);
  }

  // Collaborator methods
  async getCollaborators(): Promise<Collaborator[]> {
    return Array.from(this.collaborators.values());
  }

  async getCollaborator(id: number): Promise<Collaborator | undefined> {
    return this.collaborators.get(id);
  }

  async getCollaboratorsByRole(roleId: number): Promise<Collaborator[]> {
    return Array.from(this.collaborators.values()).filter(
      (collaborator) => collaborator.roleId === roleId,
    );
  }

  async createCollaborator(insertCollaborator: InsertCollaborator): Promise<Collaborator> {
    const id = this.collaboratorId++;
    const collaborator: Collaborator = { 
      ...insertCollaborator, 
      id,
      roleId: null, // This field doesn't exist in the schema
      username: insertCollaborator.username || null,
      password: insertCollaborator.password || null,
      email: insertCollaborator.email || null,
      phone: insertCollaborator.phone || null,
      isActive: insertCollaborator.isActive || null,
      language: insertCollaborator.language || null,
      activationToken: insertCollaborator.activationToken || null,
      workHours: insertCollaborator.workHours || null,
      notifyByEmail: insertCollaborator.notifyByEmail ?? null,
      notifyByWhatsApp: insertCollaborator.notifyByWhatsApp ?? null,
      notificationTime: insertCollaborator.notificationTime ?? null
    };
    this.collaborators.set(id, collaborator);
    return collaborator;
  }

  async updateCollaborator(id: number, collaboratorUpdate: Partial<InsertCollaborator>): Promise<Collaborator | undefined> {
    const collaborator = this.collaborators.get(id);
    if (!collaborator) return undefined;

    const updatedCollaborator = { ...collaborator, ...collaboratorUpdate };
    this.collaborators.set(id, updatedCollaborator);
    return updatedCollaborator;
  }

  async deleteCollaborator(id: number): Promise<boolean> {
    return this.collaborators.delete(id);
  }

  // Job Activity methods
  async getJobActivities(): Promise<JobActivity[]> {
    return Array.from(this.jobActivities.values());
  }

  async getJobActivity(id: number): Promise<JobActivity | undefined> {
    return this.jobActivities.get(id);
  }

  async getJobActivitiesByJob(jobId: number): Promise<JobActivity[]> {
    return Array.from(this.jobActivities.values()).filter(
      (jobActivity) => jobActivity.jobId === jobId,
    );
  }

  async createJobActivity(insertJobActivity: InsertJobActivity): Promise<JobActivity> {
    const id = this.jobActivityId++;
    const jobActivity: JobActivity = { 
      ...insertJobActivity, 
      id,
      status: insertJobActivity.status || null,
      notes: insertJobActivity.notes || null,
      completedDate: insertJobActivity.completedDate || null,
      actualDuration: insertJobActivity.actualDuration || null,
      photos: insertJobActivity.photos || null
    };
    this.jobActivities.set(id, jobActivity);
    return jobActivity;
  }

  async updateJobActivity(id: number, jobActivityUpdate: Partial<InsertJobActivity>): Promise<JobActivity | undefined> {
    const jobActivity = this.jobActivities.get(id);
    if (!jobActivity) return undefined;

    const updatedJobActivity = { ...jobActivity, ...jobActivityUpdate };
    this.jobActivities.set(id, updatedJobActivity);
    return updatedJobActivity;
  }

  async deleteJobActivity(id: number): Promise<boolean> {
    return this.jobActivities.delete(id);
  }

  // Activity Collaborator methods
  async getActivityCollaborators(): Promise<ActivityCollaborator[]> {
    const activityCollaborators: ActivityCollaborator[] = [];
    for (const key of Array.from(this.activityCollaborators)) {
      const [activityId, collaboratorId] = key.split(':').map(Number);
      activityCollaborators.push({
        activityId,
        collaboratorId,
      });
    }
    return activityCollaborators;
  }

  async getCollaboratorsByActivity(activityId: number): Promise<number[]> {
    const collaboratorIds: number[] = [];
    for (const key of Array.from(this.activityCollaborators)) {
      const [aid, cid] = key.split(':').map(Number);
      if (aid === activityId) {
        collaboratorIds.push(cid);
      }
    }
    return collaboratorIds;
  }

  async getActivitiesByCollaborator(collaboratorId: number): Promise<number[]> {
    const activityIds: number[] = [];
    for (const key of Array.from(this.activityCollaborators)) {
      const [aid, cid] = key.split(':').map(Number);
      if (cid === collaboratorId) {
        activityIds.push(aid);
      }
    }
    return activityIds;
  }

  async assignCollaboratorToActivity(activityId: number, collaboratorId: number): Promise<ActivityCollaborator> {
    const key = `${activityId}:${collaboratorId}`;
    this.activityCollaborators.add(key);
    return {
      activityId,
      collaboratorId,
    };
  }

  async removeCollaboratorFromActivity(activityId: number, collaboratorId: number): Promise<boolean> {
    const key = `${activityId}:${collaboratorId}`;
    return this.activityCollaborators.delete(key);
  }

  // Subscription plan methods
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values());
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = this.planId++;
    const createdAt = new Date();
    const plan: SubscriptionPlan = { 
      ...insertPlan, 
      id, 
      createdAt,
      isActive: insertPlan.isActive || null,
      description: insertPlan.description || null,
      monthlyDuration: insertPlan.monthlyDuration || null,
      yearlyDuration: insertPlan.yearlyDuration || null,
      isFree: insertPlan.isFree || null,
      features: insertPlan.features || null
    };
    this.subscriptionPlans.set(id, plan);
    return plan;
  }

  async updateSubscriptionPlan(id: number, planUpdate: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const plan = this.subscriptionPlans.get(id);
    if (!plan) return undefined;

    const updatedPlan = { ...plan, ...planUpdate };
    this.subscriptionPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteSubscriptionPlan(id: number): Promise<boolean> {
    return this.subscriptionPlans.delete(id);
  }

  // User subscription methods
  async getUserSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values());
  }

  async getUserSubscription(id: number): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.get(id);
  }

  async getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined> {
    return Array.from(this.userSubscriptions.values()).find(
      (subscription) => subscription.userId === userId,
    );
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const id = this.subscriptionId++;
    const createdAt = new Date();
    const subscription: UserSubscription = { 
      ...insertSubscription, 
      id, 
      createdAt,
      status: insertSubscription.status || null,
      endDate: insertSubscription.endDate || null,
      billingFrequency: insertSubscription.billingFrequency || null,
      lastBillingDate: insertSubscription.lastBillingDate || null,
      nextBillingDate: insertSubscription.nextBillingDate || null,
      startDate: insertSubscription.startDate || new Date()
    };
    this.userSubscriptions.set(id, subscription);
    return subscription;
  }

  async updateUserSubscription(id: number, subscriptionUpdate: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined> {
    const subscription = this.userSubscriptions.get(id);
    if (!subscription) return undefined;

    const updatedSubscription = { ...subscription, ...subscriptionUpdate };
    this.userSubscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteUserSubscription(id: number): Promise<boolean> {
    return this.userSubscriptions.delete(id);
  }

  // Sector methods
  async createSector(insertSector: InsertSector): Promise<Sector> {
    const id = this.sectorId++;
    const createdAt = new Date();
    const sector: Sector = { 
      ...insertSector, 
      id, 
      createdAt,
      isActive: insertSector.isActive || null,
      description: insertSector.description || null
    };
    this.sectors.set(id, sector);
    return sector;
  }

  async getSector(id: number): Promise<Sector | undefined> {
    return this.sectors.get(id);
  }

  async getAllSectors(): Promise<Sector[]> {
    return Array.from(this.sectors.values());
  }

  async getSectors(): Promise<Sector[]> {
    return this.getAllSectors();
  }

  async updateSector(id: number, sectorUpdate: Partial<InsertSector>): Promise<Sector | undefined> {
    const sector = this.sectors.get(id);
    if (!sector) return undefined;

    const updatedSector = { ...sector, ...sectorUpdate };
    this.sectors.set(id, updatedSector);
    return updatedSector;
  }

  async deleteSector(id: number): Promise<boolean> {
    return this.sectors.delete(id);
  }

  // WebPage methods
  async createWebPage(insertWebPage: InsertWebPage): Promise<WebPage> {
    try {
      const id = this.webPageId++;
      const createdAt = new Date();
      const updatedAt = new Date();
      
      // Se la pagina è impostata come homepage, rimuovi il flag homepage da tutte le altre pagine dello stesso tipo
      if (insertWebPage.isHomepage) {
        for (const [pageId, page] of Array.from(this.webPages.entries())) {
          if (page.type === insertWebPage.type && page.isHomepage && pageId !== id) {
            page.isHomepage = false;
          }
        }
      }
      
      // Aggiungiamo la data di pubblicazione se lo stato è pubblicato
      let publishedAt = null;
      if (insertWebPage.status === "published") {
        publishedAt = new Date();
      }
      
      const webPage: WebPage = {
        ...insertWebPage,
        id,
        createdAt,
        updatedAt,
        publishedAt,
        type: insertWebPage.type || "page",
        status: insertWebPage.status || "draft",
        title: insertWebPage.title || "",
        slug: insertWebPage.slug || "",
        content: insertWebPage.content || "",
        featuredImage: insertWebPage.featuredImage || null,
        metaTitle: insertWebPage.metaTitle || null,
        metaDescription: insertWebPage.metaDescription || null,
        authorId: insertWebPage.authorId || 1,
        sortOrder: insertWebPage.sortOrder || 0,
        isHomepage: insertWebPage.isHomepage || false
      };
      
      this.webPages.set(id, webPage);
      return webPage;
    } catch (error) {
      console.error("Errore durante la creazione della pagina web:", error);
      throw error;
    }
  }
  
  async getWebPage(id: number): Promise<WebPage | undefined> {
    return this.webPages.get(id);
  }
  
  async getWebPageBySlug(slug: string): Promise<WebPage | undefined> {
    return Array.from(this.webPages.values()).find(page => page.slug === slug);
  }
  
  async getHomePage(type: string): Promise<WebPage | undefined> {
    return Array.from(this.webPages.values()).find(
      page => page.type === type && page.isHomepage
    );
  }
  
  async getAllWebPages(): Promise<WebPage[]> {
    return Array.from(this.webPages.values());
  }
  
  async getWebPagesByType(type: string): Promise<WebPage[]> {
    return Array.from(this.webPages.values()).filter(page => page.type === type);
  }
  
  async updateWebPage(id: number, webPageUpdate: Partial<InsertWebPage>): Promise<WebPage | undefined> {
    try {
      const existingPage = await this.getWebPage(id);
      if (!existingPage) return undefined;
      
      const updatedAt = new Date();
      
      // Se la pagina è impostata come homepage, rimuovi il flag homepage da tutte le altre pagine dello stesso tipo
      if (webPageUpdate.isHomepage) {
        for (const [pageId, page] of Array.from(this.webPages.entries())) {
          if (page.type === (webPageUpdate.type || existingPage.type) && page.isHomepage && pageId !== id) {
            page.isHomepage = false;
          }
        }
      }
      
      // Aggiungiamo la data di pubblicazione se lo stato viene cambiato in pubblicato
      let publishedAt = existingPage.publishedAt;
      if (webPageUpdate.status === "published" && !existingPage.publishedAt) {
        publishedAt = new Date();
      }
      
      // Aggiorniamo la pagina
      const updatedPage = {
        ...existingPage,
        ...webPageUpdate,
        updatedAt,
        publishedAt
      };
      
      this.webPages.set(id, updatedPage);
      return updatedPage;
    } catch (error) {
      console.error(`Errore durante l'aggiornamento della pagina web con ID ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteWebPage(id: number): Promise<boolean> {
    try {
      return this.webPages.delete(id);
    } catch (error) {
      console.error(`Errore durante l'eliminazione della pagina web con ID ${id}:`, error);
      return false;
    }
  }
  
  // Plan Configuration methods
  async getPlanConfigurations(): Promise<PlanConfiguration[]> {
    return Array.from(this.planConfigurations.values());
  }
  
  async getPlanConfiguration(id: number): Promise<PlanConfiguration | undefined> {
    return this.planConfigurations.get(id);
  }
  
  async getPlanConfigurationByUser(userId: number): Promise<PlanConfiguration | undefined> {
    return Array.from(this.planConfigurations.values()).find(
      (config) => config.userId === userId
    );
  }
  
  async createPlanConfiguration(insertConfig: InsertPlanConfiguration): Promise<PlanConfiguration> {
    const id = this.planConfigurationId++;
    const createdAt = new Date();
    const config: PlanConfiguration = { 
      ...insertConfig, 
      id, 
      createdAt,
      updatedAt: new Date(),
      isActive: insertConfig.isActive || null,
      features: insertConfig.features || null,
      limits: insertConfig.limits || null
    };
    this.planConfigurations.set(id, config);
    return config;
  }
  
  async updatePlanConfiguration(id: number, configUpdate: Partial<InsertPlanConfiguration>): Promise<PlanConfiguration | undefined> {
    const config = this.planConfigurations.get(id);
    if (!config) return undefined;
    
    const updatedConfig = { ...config, ...configUpdate };
    this.planConfigurations.set(id, updatedConfig);
    return updatedConfig;
  }
  
  async deletePlanConfiguration(id: number): Promise<boolean> {
    return this.planConfigurations.delete(id);
  }

  // General Settings methods
  async getGeneralSettings(): Promise<GeneralSettings | undefined> {
    // Return the first (and only) general settings record
    const settings = Array.from(this.generalSettings.values())[0];
    return settings;
  }

  async upsertGeneralSettings(settings: InsertGeneralSettings): Promise<GeneralSettings> {
    const existing = Array.from(this.generalSettings.values())[0];
    
    if (existing) {
      // Update existing settings
      const updated = { ...existing, ...settings, updatedAt: new Date() };
      this.generalSettings.set(existing.id, updated);
      return updated;
    } else {
      // Create new settings
      const newSettings: GeneralSettings = {
        id: this.generalSettingsId++,
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
        appName: settings.appName || "ProjectPro",
        defaultLanguage: settings.defaultLanguage || "it",
        enableEmailNotifications: settings.enableEmailNotifications || null,
        enableWhatsAppNotifications: settings.enableWhatsAppNotifications || null,
        // maxFileSize: settings.maxFileSize || null, // This field doesn't exist in the schema
        allowedFileTypes: settings.allowedFileTypes || null,
        defaultNotificationTime: settings.defaultNotificationTime || null,
        dateFormat: settings.dateFormat || "DD/MM/YYYY",
        timeFormat: settings.timeFormat || "24h",
        timezone: settings.timezone || "Europe/Rome",
        weekStartsOn: settings.weekStartsOn ?? null,
        sessionTimeout: settings.sessionTimeout ?? null,
        passwordMinLength: settings.passwordMinLength ?? null,
        passwordRequireNumbers: settings.passwordRequireNumbers ?? null,
        passwordRequireSpecialChars: settings.passwordRequireSpecialChars ?? null,
        defaultPageSize: settings.defaultPageSize ?? null,
        maxUploadFileSize: settings.maxUploadFileSize ?? null
      };
      this.generalSettings.set(newSettings.id, newSettings);
      return newSettings;
    }
  }
}

// Import MySQL storage
import { MySQLStorage } from './mysqlStorage';

// Use MySQL storage for persistence
export const storage = new MySQLStorage();