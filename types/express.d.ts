import 'express-session';

declare module 'express-session' {
  interface SessionData {
    mobileUserId?: number;
    admin?: {
      isAuthenticated: boolean;
      username: string;
      role: string;
    };
  }
} 