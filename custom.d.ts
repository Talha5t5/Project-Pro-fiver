import 'express-session';

declare module 'express-session' {
  interface SessionData {
    admin?: {
      isAuthenticated: boolean;
      username: string;
      role: string;
    };
    mobileUserId?: number; // Aggiunto per il supporto dell'autenticazione mobile
  }
}