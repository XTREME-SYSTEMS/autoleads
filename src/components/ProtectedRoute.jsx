import { useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const ORG_SETUP_ROUTES = ['/onboarding', '/get-started', '/auto-leads-setup', '/auto-contact-setup', '/auto-bids-setup', '/auto-app-setup', '/auto-pricing-setup', '/auto-system-setup', '/auto-payments-setup', '/auto-teams', '/auto-contact'];

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  // Org membership check — redirect to onboarding if user has no organization
  const hasOrg = user?.organization_ids && Array.isArray(user.organization_ids) && user.organization_ids.length > 0;
  if (!hasOrg && !ORG_SETUP_ROUTES.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}