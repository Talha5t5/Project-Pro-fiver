import { storage } from "../storage";
import { log } from "../vite";
import type { Client, Collaborator, Job } from "@shared/schema";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const canSendEmail = Boolean(process.env.MAIL_HOST);

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!payload.to) return;
  if (!canSendEmail) {
    log(`[DEV] Email -> ${payload.to} :: ${payload.subject}`);
    return;
  }

  // Lazy import to avoid requiring dependency when not configured
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Boolean(process.env.MAIL_SECURE === "true"),
    auth: process.env.MAIL_USER && process.env.MAIL_PASS ? {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@projectpro.local",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}


export async function notifyCollaboratorActivation(collaborator: Collaborator, activationUrl: string): Promise<void> {
  if (collaborator.email && collaborator.notifyByEmail) {
    await sendEmail({
      to: collaborator.email,
      subject: "Attiva il tuo account collaboratore",
      html: `<p>Ciao ${collaborator.name},</p><p>Il tuo account è stato creato. Completa l'attivazione: <a href="${activationUrl}">attiva account</a></p>`
    });
  }

}

export async function notifyJobCreated(job: Job, client?: Client): Promise<void> {
  // Assigned user
  if (job.assignedUserId) {
    const user = await storage.getUser(job.assignedUserId);
    if (user) {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `Nuovo lavoro assegnato: ${job.title}`,
          html: `<p>Ti è stato assegnato un nuovo lavoro.</p><p>Titolo: ${job.title}</p><p>Quando: ${new Date(job.startDate).toLocaleString()}</p>`
        });
      }
      // WhatsApp notifications removed
    }
  }

  // Notify client (basic)
  if (client && client.email) {
    await sendEmail({
      to: client.email,
      subject: `Appuntamento creato: ${job.title}`,
      html: `<p>Gentile ${client.name},</p><p>è stato creato un intervento: ${job.title}.</p>`
    });
  }
}

export async function notifyClientAboutJob(job: Job, client: Client): Promise<void> {
  if (client.email) {
    await sendEmail({
      to: client.email,
      subject: `Aggiornamento intervento: ${job.title}`,
      html: `<p>Gentile ${client.name},</p><p>Stato: ${job.status}</p>`
    });
  }
}

export async function sendUpcomingJobReminders(now = new Date()): Promise<number> {
  const jobs = await storage.getJobs();
  let sent = 0;
  for (const job of jobs) {
    if (!job.startDate) continue;
    const start = new Date(job.startDate);
    const diffHours = (start.getTime() - now.getTime()) / 36e5;
    if (diffHours < 0 || diffHours > 72) continue; // only near-future window

    // Get collaborators involved
    const recipients = new Map<number, Collaborator>();

    if (job.assignedUserId) {
      const primary = await storage.getUser(job.assignedUserId);
      if (primary) {
        recipients.set(primary.id, primary as unknown as Collaborator);
      }
    }

    try {
      const activities = await storage.getJobActivitiesByJob(job.id);
      for (const a of activities) {
        const collaboratorIds = await storage.getCollaboratorsByActivity(a.activityId);
        for (const id of collaboratorIds) {
          const collab = await storage.getCollaborator(id);
          if (collab) recipients.set(collab.id, collab);
        }
      }
    } catch {
      // ignore if activities not used
    }

    const recipientList = Array.from(recipients.values());
    for (const collab of recipientList) {
      const threshold = collab.notificationTime ?? 24;
      if (diffHours <= threshold + 0.25 && diffHours >= threshold - 0.25) {
        if (collab.email && collab.notifyByEmail) {
          await sendEmail({
            to: collab.email,
            subject: `Promemoria lavoro: ${job.title}`,
            html: `<p>Ciao ${collab.name},</p><p>Ricordo: ${job.title} inizia alle ${start.toLocaleString()}.</p>`
          });
          sent++;
        }
      }
    }
  }
  return sent;
}

export async function notifyPlanRenewalReminder(userId: number): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) return;
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Promemoria rinnovo abbonamento",
      html: `<p>Ciao ${user.fullName || user.username || "utente"}, il tuo servizio sta per scadere.</p>`
    });
  }
}

export async function processPlanRenewalReminders(daysAhead = 7): Promise<number> {
  const now = new Date();
  const subs = await storage.getUserSubscriptions();
  let count = 0;
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    const reference = sub.nextBillingDate ?? sub.endDate;
    if (!reference) continue;
    const diffDays = (new Date(reference).getTime() - now.getTime()) / 86400000;
    if (diffDays <= daysAhead && diffDays >= 0) {
      await notifyPlanRenewalReminder(sub.userId);
      count++;
    }
  }
  return count;
}

export const NotificationService = {
  sendEmail,
  notifyCollaboratorActivation,
  notifyJobCreated,
  notifyClientAboutJob,
  sendUpcomingJobReminders,
  notifyPlanRenewalReminder,
  processPlanRenewalReminders,
};

export default NotificationService;


