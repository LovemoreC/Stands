import React from 'react';
import { Navigate } from 'react-router-dom';

export interface Auth {
  token: string;
  role: string;
}

interface AuthContextType {
  auth: Auth | null;
  login: (token: string, role: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType>({
  auth: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = React.useState<Auth | null>(null);
  const login = (token: string, role: string) => setAuth({ token, role });
  const logout = () => setAuth(null);
  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);

export const ProtectedRoute: React.FC<{ roles?: string[]; children: React.ReactElement }> = ({ roles, children }) => {
  const { auth } = useAuth();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(auth.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
