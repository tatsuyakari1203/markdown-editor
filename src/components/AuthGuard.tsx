import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from './LoginForm';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  if (!user) {
    return fallback || <LoginForm />;
  }

  return <>{children}</>;
}