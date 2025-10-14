import React, { useState, useEffect } from 'react';
import { BrandedLoginForm } from './components/auth/BrandedLoginForm';
import { MainLayout } from './components/layout/MainLayout';
import { PasswordResetPage } from './components/auth/PasswordResetPage';
import { AcceptInvitationPage } from './components/auth/AcceptInvitationPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/shared/NetworkStatus';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FilterProvider } from "./contexts/FilterContext";
import { BrandProvider } from "./contexts/BrandContext";
import { AppProvider } from "./contexts/AppContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { cleanupExpiredStorage } from "./lib/storageSecurity";
import { supabase } from "./lib/supabase";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Clean up expired storage on app start
  useEffect(() => {
    cleanupExpiredStorage();
  }, []);

  // Check if we're on special pages
  useEffect(() => {
    const isResetPage =
      window.location.pathname === "/reset-password" ||
      window.location.hash.includes("reset-password");
    setShowPasswordReset(isResetPage);

    const isInvitationPage =
      window.location.pathname === "/accept-invitation" ||
      window.location.search.includes("client_id=");
    setShowInvitation(isInvitationPage);

    // Check if this is an email confirmation redirect
    const isEmailConfirmation =
      window.location.search.includes("type=signup") ||
      window.location.search.includes("confirmation") ||
      window.location.hash.includes("type=signup");

    if (isEmailConfirmation) {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Show email confirmation message
      setShowEmailConfirmation(true);
      // Sign out to clear the auto-login session
      supabase.auth.signOut();
    }
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  // Show email confirmation message
  if (showEmailConfirmation) {
    return (
      <ErrorBoundary>
        <NetworkStatus />
        <div className="min-h-screen bg-gradient-to-br from-undeniable-black to-neutral-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-undeniable-black mb-2">
              Email Confirmed!
            </h1>
            <p className="text-neutral-600 mb-6">
              Your email has been successfully verified. You can now sign in to
              your account.
            </p>
            <button
              onClick={() => setShowEmailConfirmation(false)}
              className="w-full bg-gradient-to-r from-undeniable-violet to-undeniable-mint text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Only render DataProvider when user is authenticated
  if (!user) {
    return (
      <ErrorBoundary>
        <NetworkStatus />
        {showInvitation ? (
          <AcceptInvitationPage />
        ) : showPasswordReset ? (
          <PasswordResetPage onSuccess={() => setShowPasswordReset(false)} />
        ) : (
          <BrandedLoginForm
            onForgotPassword={() => setShowPasswordReset(true)}
          />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <NetworkStatus />
      {showInvitation ? (
        <AcceptInvitationPage />
      ) : user ? (
        <MainLayout />
      ) : showPasswordReset ? (
        <PasswordResetPage onSuccess={() => setShowPasswordReset(false)} />
      ) : (
        <BrandedLoginForm />
      )}
    </ErrorBoundary>
  );
};

function App() {
  return (
    <BrandProvider>
      <AuthProvider>
        <FilterProvider>
          <PermissionProvider>
            <AppProvider>
              <AppContent />
            </AppProvider>
          </PermissionProvider>
        </FilterProvider>
      </AuthProvider>
    </BrandProvider>
  );
}

export default App;