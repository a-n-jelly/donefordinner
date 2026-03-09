import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Bypass auth in preview/dev environment for easier testing
  const isPreviewOrDev = typeof window !== 'undefined' && (
    window.location.hostname.includes('id-preview') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  
  if (isPreviewOrDev) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
