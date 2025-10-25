import { mysqlTable, text, serial, int, boolean, timestamp, decimal, primaryKey } from "drizzle-orm/mysql-core";
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
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  roleId: int("role_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  roleId: true,
});

// Tabella per i piani di abbonamento
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).notNull(),
  monthlyDuration: int("monthly_duration"),
  yearlyDuration: int("yearly_duration"),
  isActive: boolean("is_active").default(true),
  isFree: boolean("is_free").default(false),
  features: text("features"),
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
  billingFrequency: text("billing_frequency").default("monthly"),
  status: text("status").default("active"),
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
  type: text("type").notNull().default('residential'),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  geoLocation: text("geo_location"),
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
  type: text("type").notNull(),
  status: text("status").notNull().default('scheduled'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  duration: decimal("duration", { precision: 5, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  materialsCost: decimal("materials_cost", { precision: 10, scale: 2 }).default("0"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedDate: timestamp("completed_date"),
  actualDuration: decimal("actual_duration", { precision: 5, scale: 2 }),
  photos: text("photos"),
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
  location: true,
  notes: true,
  completedDate: true,
  actualDuration: true,
  photos: true,
});

export const activities = mysqlTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTypeId: int("job_type_id").notNull(),
  jobTypeIds: text("job_type_ids"),
  sectorIds: text("sector_ids"),
  description: text("description"),
  implementationNotes: text("implementation_notes"),
  defaultDuration: decimal("default_duration", { precision: 5, scale: 2 }),
  defaultRate: decimal("default_rate", { precision: 10, scale: 2 }),
  defaultCost: decimal("default_cost", { precision: 10, scale: 2 }),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  name: true,
  jobTypeId: true,
  jobTypeIds: true,
  sectorIds: true,
  description: true,
  implementationNotes: true,
  defaultDuration: true,
  defaultRate: true,
  defaultCost: true,
});

export const jobTypes = mysqlTable("job_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertJobTypeSchema = createInsertSchema(jobTypes).pick({
  name: true,
  description: true,
});

export const roles = mysqlTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions"),
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
});

export const collaborators = mysqlTable("collaborators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleId: int("role_id"),
  roleIds: text("role_ids").notNull(),
  phone: text("phone"),
  email: text("email"),
  workHours: text("work_hours"),
  notifyByEmail: boolean("notify_by_email").default(false),
  notifyByWhatsApp: boolean("notify_by_whatsapp").default(false),
  notificationTime: int("notification_time").default(24),
  password: text("password"),
  activationToken: text("activation_token"),
  isActive: boolean("is_active").default(false),
  language: text("language").default("it"),
  username: text("username"),
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
  status: text("status").default('scheduled'),
  completedDate: timestamp("completed_date"),
  actualDuration: decimal("actual_duration", { precision: 5, scale: 2 }),
  notes: text("notes"),
  photos: text("photos"),
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
  enableRedirect: boolean("enable_redirect").default(false),
  images: text("images"),
  textAnimationType: text("text_animation_type").default("fixed"),
  imageDisplayType: text("image_display_type").default("single"),
  status: text("status").default("inactive"),
  timeRanges: text("time_ranges"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  dailyFrequency: int("daily_frequency").default(1),
  weeklySchedule: text("weekly_schedule"),
  visiblePages: text("visible_pages").default('all'),
  position: text("position").notNull(),
  width: int("width"),
  height: int("height"),
  displayDuration: int("display_duration").default(10),
  displayInterval: int("display_interval").default(0),
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
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  type: text("type").notNull().default("desktop"),
  status: text("status").notNull().default("draft"),
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

// Tabella per le configurazioni personalizzate dei piani
export const planConfigurations = mysqlTable("plan_configurations", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  planId: int("plan_id").notNull(),
  features: text("features"),
  limits: text("limits"),
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