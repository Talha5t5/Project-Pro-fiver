import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { queryClient } from "../../lib/queryClient";
import { mobileApiCall } from "../utils/mobileApi";

// Use the centralized mobile API utility
const apiCall = mobileApiCall;

// Tipo utente mobile
export interface MobileUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleId: number | null;
  type?: "client" | "collaborator";
  language?: string;
}

export interface MobileAuthContextType {
  user: MobileUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<MobileUser>;
  register: (email: string, password: string, fullName: string) => Promise<MobileUser>;
  logout: () => Promise<void>;
  activate: (code: string, password: string, fullName: string) => Promise<MobileUser>;
  updateUser: (userData: Partial<MobileUser>) => Promise<MobileUser>;
  updateUserSettings: (settings: {language?: string}) => Promise<MobileUser>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const MobileAuthContext = createContext<MobileAuthContextType | null>(null);

export const MobileAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Carica l'utente all'avvio
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const res = await apiCall('GET', '/api/mobile/user');
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Errore nel caricamento dell'utente:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // Login utente
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting login process for:', email);
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('POST', '/api/mobile/login', { email, password });
      
      console.log('📡 Login response status:', res.status);
      console.log('📡 Login response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        console.error('❌ Login failed with status:', res.status);
        const errorData = await res.json();
        console.error('❌ Error data:', errorData);
        throw new Error(errorData.error || 'Errore durante il login');
      }
      
      const userData = await res.json();
      console.log('✅ Login successful, user data:', userData);
      console.log('🔑 Mobile session ID from response:', userData.mobileSessionId);
      
      // Verify session ID was stored
      const storedSessionId = localStorage.getItem('mobileSessionId');
      console.log('💾 Stored session ID in localStorage:', storedSessionId);
      
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('💥 Login error:', err);
      const error = err instanceof Error ? err : new Error('Errore durante il login');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Registrazione utente
  const register = async (email: string, password: string, fullName: string) => {
    try {
      console.log('🔐 Starting registration process for:', email);
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('POST', '/api/mobile/register', { 
        email, 
        password, 
        fullName,
        username: email.split('@')[0]
      });
      
      console.log('📡 Registration response status:', res.status);
      
      if (!res.ok) {
        console.error('❌ Registration failed with status:', res.status);
        const errorData = await res.json();
        console.error('❌ Error data:', errorData);
        throw new Error(errorData.error || 'Errore durante la registrazione');
      }
      
      const userData = await res.json();
      console.log('✅ Registration successful, user data:', userData);
      console.log('🔑 Mobile session ID from response:', userData.mobileSessionId);
      
      // Verify session ID was stored
      const storedSessionId = localStorage.getItem('mobileSessionId');
      console.log('💾 Stored session ID in localStorage:', storedSessionId);
      
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('💥 Registration error:', err);
      const error = err instanceof Error ? err : new Error('Errore durante la registrazione');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout utente
  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('POST', '/api/mobile/logout');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore durante il logout');
      }
      
      setUser(null);
      queryClient.clear();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Errore durante il logout');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Attiva l'account
  const activate = async (code: string, password: string, fullName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('POST', '/api/mobile/activate', {
        activationCode: code,
        password,
        fullName
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Errore durante l'attivazione dell'account");
      }
      
      const userData = await res.json();
      setUser(userData);
      return userData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Errore durante l'attivazione dell'account");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Aggiorna i dati utente
  const updateUser = async (userData: Partial<MobileUser>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('PUT', '/api/mobile/user', userData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Errore durante l'aggiornamento dei dati");
      }
      
      const updatedUser = await res.json();
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Errore durante l'aggiornamento dei dati");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cambia la password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await apiCall('POST', '/api/mobile/change-password', {
        currentPassword,
        newPassword
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore durante il cambio password');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Errore durante il cambio password');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Aggiorna le impostazioni dell'utente
  const updateUserSettings = async (settings: {language?: string}) => {
    return updateUser(settings);
  };

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        activate,
        updateUser,
        updateUserSettings,
        changePassword
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = () => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth deve essere utilizzato all\'interno di un MobileAuthProvider');
  }
  return context;
};