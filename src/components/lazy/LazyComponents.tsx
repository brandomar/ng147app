/**
 * Lazy Loading Components
 * Only load components when they're actually needed
 */
import { lazy } from 'react';

// Dashboard Components - Only load when dashboard is accessed
export const LazyDashboard = lazy(() => import('../dashboard/Dashboard'));

// Management Components - Only load when management section is accessed
export const LazyManagementConsole = lazy(
  () => import("../management/ManagementConsole")
);
export const LazyClientManagement = lazy(() => import('../management/ClientManagement'));

// Settings Components - Only load when settings are accessed
export const LazySettingsPage = lazy(() => import('../settings/SettingsPage'));
export const LazyBrandSettings = lazy(() => import('../settings/BrandSettings'));

// Shared Components - Only load when needed
export const LazyMetricsViewer = lazy(() => import('../shared/MetricsViewer'));
export const LazySetupGuidance = lazy(() => import('../shared/SetupGuidance'));

// Auth Components - Only load when auth is needed
export const LazyLoginForm = lazy(() => import('../auth/LoginForm'));
export const LazySignupForm = lazy(() => import('../auth/SignupForm'));
export const LazyPasswordResetForm = lazy(() => import('../auth/PasswordResetForm'));
