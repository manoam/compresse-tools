import { createContext, useContext, type ReactNode } from 'react';
import keycloak from '../keycloak';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user: User | null = keycloak.tokenParsed
    ? {
        firstName: keycloak.tokenParsed.given_name || '',
        lastName: keycloak.tokenParsed.family_name || '',
        email: keycloak.tokenParsed.email || '',
        username: keycloak.tokenParsed.preferred_username || '',
      }
    : null;

  const logout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <AuthContext.Provider value={{ user, token: keycloak.token || null, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
