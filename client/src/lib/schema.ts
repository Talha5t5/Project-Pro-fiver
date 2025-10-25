import { mysqlTable, text, serial, int, boolean, timestamp, decimal, primaryKey, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabella per i settori
export const sectors = mysqlTable("sectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSectorSchema = createInsertSchema(sectors).pick({
  name: true,
  description: true,
  isActive: true,
});

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  roleId: int("role_id"),
  type: text("type").default("admin"), // admin, client, collaborator
  isActive: boolean("is_active").default(true),
  language: text("language").default("it"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  roleId: true,
  type: true,
  isActive: true,
  language: true,
});

// Tabella per i piani di abbonamento
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).notNull(),
  monthlyDuration: int("monthly_duration"), // in giorni, null significa illimitato
  yearlyDuration: int("yearly_duration"), // in giorni, null significa illimitato
  isActive: boolean("is_active").default(true),
  isFree: boolean("is_free").default(false),
  features: text("features"), // JSON con le caratteristiche abilitate per il piano
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  name: true,
  description: true,
  monthlyPrice: true,
  yearlyPrice: true,
  monthlyDuration: true,
  yearlyDuration: true,
  isActive: true,
  isFree: true,
  features: true,
});

// Tabella per le sottoscrizioni utente
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  planId: int("plan_id").notNull(), 
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  billingFrequency: text("billing_frequency").default("monthly"), // monthly, yearly
  status: text("status").default("active"), // active, cancelled, expired, trial
  lastBillingDate: timestamp("last_billing_date"),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  planId: true,
  startDate: true,
  endDate: true,
  billingFrequency: true,
  status: true,
  lastBillingDate: true,
  nextBillingDate: true,
});

export const clients = mysqlTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default('residential'), // residential, commercial, industrial
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  geoLocation: text("geo_location"), // Format: "latitude,longitude"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  type: true,
  phone: true,
  email: true,
  address: true,
  geoLocation: true,
  notes: true,
});

export const jobs = mysqlTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: int("client_id").notNull(),
  type: text("type").notNull(), // repair, installation, maintenance, quote, emergency
  status: text("status").notNull().default('scheduled'), // scheduled, in_progress, completed, cancelled
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // Data di fine calcolata
  duration: decimal("duration", { precision: 5, scale: 2 }).notNull(), // Duration in hours
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  materialsCost: decimal("materials_cost", { precision: 10, scale: 2 }).default("0"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0"), // Total cost
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }).default("0"), // Labor cost
  location: text("location"),
  notes: text("notes"),
  assignedUserId: int("assigned_user_id"), // User assigned to this job
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedDate: timestamp("completed_date"),
  actualDuration: decimal("actual_duration", { precision: 5, scale: 2 }),
  photos: text("photos"), // URLs of photos (JSON array as text)
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  title: true,
  clientId: true,
  type: true,
  status: true,
  startDate: true,
  endDate: true,
  duration: true,
  hourlyRate: true,
  materialsCost: true,
  cost: true,
  laborCost: true,
  location: true,
  notes: true,
  assignedUserId: true,
  completedDate: true,
  actualDuration: true,
  photos: true,
});

// Modelli per le attività e i collaboratori
export const activities = mysqlTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTypeId: int("job_type_id").notNull(), // Foreign key to job_types (per retrocompatibilità)
  jobTypeIds: text("job_type_ids"), // JSON con array di ID per supportare più tipi di lavoro
  description: text("description"),
  implementationNotes: text("implementation_notes"), // Note realizzazione attività
  defaultDuration: decimal("default_duration", { precision: 5, scale: 2 }), // Default duration in hours
  defaultRate: decimal("default_rate", { precision: 10, scale: 2 }), // Default hourly rate for clients
  defaultCost: decimal("default_cost", { precision: 10, scale: 2 }), // Default hourly cost for company
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  name: true,
  jobTypeId: true,
  jobTypeIds: true,
  description: true,
  implementationNotes: true,
  defaultDuration: true,
  defaultRate: true,
  defaultCost: true,
});

export const jobTypes = mysqlTable("job_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
});

export const insertJobTypeSchema = createInsertSchema(jobTypes).pick({
  name: true,
  description: true,
});

export const roles = mysqlTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  permissions: text("permissions"), // Array of permission strings (JSON as text)
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
});

export const collaborators = mysqlTable("collaborators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleId: int("role_id"), // Primary role for backward compatibility (nullable)
  roleIds: text("role_ids").notNull(), // JSON array of role IDs for multiple roles
  phone: text("phone"),
  email: text("email"),
  workHours: text("work_hours"), // JSON string with working hours
  notifyByEmail: boolean("notify_by_email").default(false),
  notifyByWhatsApp: boolean("notify_by_whatsapp").default(false),
  notificationTime: int("notification_time").default(24), // Hours before job
  password: text("password"), // Password for account access (stored hashed)
  activationToken: text("activation_token"), // Token for first-time setup
  isActive: boolean("is_active").default(false), // Whether the collaborator has activated their account
  language: text("language").default("it"), // Preferred language (italiano, english, etc.)
  username: text("username"), // Username for login
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).pick({
  name: true,
  roleIds: true,
  phone: true,
  email: true,
  workHours: true,
  notifyByEmail: true,
  notifyByWhatsApp: true,
  notificationTime: true,
  password: true,
  activationToken: true,
  isActive: true,
  language: true,
  username: true,
});

// Job activity assignments
export const jobActivities = mysqlTable("job_activities", {
  id: serial("id").primaryKey(),
  jobId: int("job_id").notNull(),
  activityId: int("activity_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  duration: decimal("duration", { precision: 5, scale: 2 }).notNull(),
  status: text("status").default('scheduled'), // scheduled, in_progress, completed, cancelled
  completedDate: timestamp("completed_date"),
  actualDuration: decimal("actual_duration", { precision: 5, scale: 2 }),
  notes: text("notes"),
  photos: text("photos"), // URLs of photos (JSON array as text)
});

export const insertJobActivitySchema = createInsertSchema(jobActivities).pick({
  jobId: true,
  activityId: true,
  startDate: true,
  duration: true,
  status: true,
  completedDate: true,
  actualDuration: true,
  notes: true,
  photos: true,
});

// Activity-collaborator assignments
export const activityCollaborators = mysqlTable("activity_collaborators", {
  activityId: int("activity_id").notNull(),
  collaboratorId: int("collaborator_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.activityId, table.collaboratorId] }),
}));

export const insertActivityCollaboratorSchema = createInsertSchema(activityCollaborators);

// Tabella per gli Spot (promozioni)
export const promotionalSpots = mysqlTable("promotional_spots", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  redirectUrl: text("redirect_url"),
  enableRedirect: boolean("enable_redirect").default(false), // Attiva/disattiva il reindirizzamento
  images: text("images"), // Array di URL delle immagini/video (JSON as text)
  textAnimationType: text("text_animation_type").default("fixed"), // fixed, scroll
  imageDisplayType: text("image_display_type").default("single"), // single, slideshow
  status: text("status").default("inactive"), // active, inactive
  // Fasce orarie multiple (JSON array di oggetti con startTime e endTime)
  timeRanges: text("time_ranges"), // JSON as text
  // Manteniamo per compatibilità anche i campi singoli
  startTime: text("start_time"), 
  endTime: text("end_time"),
  // Periodo di visibilità
  startDate: timestamp("start_date"), // Data di inizio validità spot
  endDate: timestamp("end_date"),     // Data di fine validità spot
  dailyFrequency: int("daily_frequency").default(1), // Quante volte al giorno mostrare lo spot
  weeklySchedule: text("weekly_schedule"), // Giorni della settimana (0-6 dove 0 è Domenica) (JSON as text)
  // Pagine in cui lo spot è visibile (all = tutte le pagine, oppure array di percorsi specifici)
  visiblePages: text("visible_pages").default('all'), // JSON as text
  position: text("position").notNull(), // top, bottom, left, popup
  width: int("width"), // Larghezza in pixel o percentuale
  height: int("height"), // Altezza in pixel o percentuale
  displayDuration: int("display_duration").default(10), // Durata visualizzazione in secondi (per popup)
  displayInterval: int("display_interval").default(0), // Intervallo di ripetizione in secondi (0 = sempre visibile)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPromotionalSpotSchema = createInsertSchema(promotionalSpots).pick({
  title: true,
  content: true,
  redirectUrl: true,
  enableRedirect: true,
  images: true,
  textAnimationType: true,
  imageDisplayType: true,
  status: true,
  timeRanges: true,
  startDate: true,
  endDate: true,
  dailyFrequency: true,
  weeklySchedule: true,
  visiblePages: true,
  position: true,
  width: true,
  height: true,
  displayDuration: true,
  displayInterval: true,
});

// Tabella per le pagine web CMS
export const webPages = mysqlTable("web_pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  type: text("type").notNull().default("desktop"), // desktop, mobile
  status: text("status").notNull().default("draft"), // draft, published, archived
  featuredImage: text("featured_image"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  authorId: int("author_id").notNull(),
  isHomepage: boolean("is_homepage").default(false),
  sortOrder: int("sort_order").default(0),
});

export const insertWebPageSchema = createInsertSchema(webPages).pick({
  title: true,
  slug: true,
  content: true,
  type: true,
  status: true,
  featuredImage: true,
  metaTitle: true,
  metaDescription: true,
  authorId: true,
  isHomepage: true,
  sortOrder: true,
});

// Tabella per le configurazioni personalizzate dei piani per i clienti
export const planConfigurations = mysqlTable("plan_configurations", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(), // ID dell'utente/cliente
  planId: int("plan_id").notNull(), // ID del piano di abbonamento di riferimento
  features: text("features"), // Configurazione personalizzata delle funzionalità (JSON as text)
  limits: text("limits"), // Limiti personalizzati (es. numero max clienti) (JSON as text)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlanConfigurationSchema = createInsertSchema(planConfigurations).pick({
  userId: true,
  planId: true,
  features: true,
  limits: true,
  isActive: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertJobType = z.infer<typeof insertJobTypeSchema>;
export type JobType = typeof jobTypes.$inferSelect;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaborators.$inferSelect;

export type InsertJobActivity = z.infer<typeof insertJobActivitySchema>;
export type JobActivity = typeof jobActivities.$inferSelect;

export type InsertActivityCollaborator = z.infer<typeof insertActivityCollaboratorSchema>;
export type ActivityCollaborator = typeof activityCollaborators.$inferSelect;

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertSector = z.infer<typeof insertSectorSchema>;
export type Sector = typeof sectors.$inferSelect;

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

export type InsertPromotionalSpot = z.infer<typeof insertPromotionalSpotSchema>;
export type PromotionalSpot = typeof promotionalSpots.$inferSelect;

export type InsertWebPage = z.infer<typeof insertWebPageSchema>;
export type WebPage = typeof webPages.$inferSelect;

export type InsertPlanConfiguration = z.infer<typeof insertPlanConfigurationSchema>;
export type PlanConfiguration = typeof planConfigurations.$inferSelect;
