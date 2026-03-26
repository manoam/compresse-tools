import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import keycloak from '../keycloak';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

interface AuthContextType {
  authenticated: boolean;
  user: User | null;
  token: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  token: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak
      .init({ onLoad: 'login-required', checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth);
        if (auth && keycloak.tokenParsed) {
          setUser({
            firstName: keycloak.tokenParsed.given_name || '',
            lastName: keycloak.tokenParsed.family_name || '',
            email: keycloak.tokenParsed.email || '',
            username: keycloak.tokenParsed.preferred_username || '',
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Keycloak init failed', err);
        // Retry login instead of showing app unauthenticated
        window.location.reload();
      });

    // Auto-refresh token
    const interval = setInterval(() => {
      keycloak.updateToken(60).catch(() => {
        keycloak.logout();
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Connexion en cours...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Redirection vers la connexion...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authenticated, user, token: keycloak.token || null, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
