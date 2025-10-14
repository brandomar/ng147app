import React, { useEffect, useState, Suspense, lazy } from "react";
import { Sidebar } from "./Sidebar";
import { NotificationToast } from "../shared/NotificationToast";
import { AppFooter } from "../shared/AppFooter";
import { LegalPagesRouter } from "../legal/LegalPagesRouter";

// Lazy load components only when needed
const LazyDashboard = lazy(() => import("../dashboard/Dashboard").then(module => ({ default: module.Dashboard })));
const LazyManagementConsole = lazy(() =>
  import("../management/ManagementConsole").then((module) => ({
    default: module.ManagementConsole,
  }))
);
const LazyClientDebugInterface = lazy(() =>
  import("../management/ClientDebugInterface").then((module) => ({
    default: module.ClientDebugInterface,
  }))
);
const LazySettingsPage = lazy(() =>
  import("../settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { useUnifiedRouting } from "../../hooks/useUnifiedRouting";
import { useGlobalPermissions } from "../../hooks/useGlobalPermissions";
import { usePermissions } from "../../contexts/PermissionContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { logger } from "../../lib/logger";
import {
  getAdminSection,
  getClientSection,
} from "../../lib/whitelabelDatabase";

// Inner component that uses the app context
const MainLayoutInner: React.FC = () => {
  const app = useApp();
  const auth = useAuth();
  const routing = useUnifiedRouting();
  const permissions = useGlobalPermissions();

  // Try to get new permission system, but don't fail if not available
  let newPermissions = null;
  try {
    newPermissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue with legacy system
  }

  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isClientAssignmentOpen, setIsClientAssignmentOpen] = useState(false);
  const [isDebugInterfaceOpen, setIsDebugInterfaceOpen] = useState(false);

  // Update document title dynamically
  useDocumentTitle();

  // Routing is automatically initialized by the useUnifiedRouting hook

  // Load clients when user is authenticated - ONLY if not already loaded
  useEffect(() => {
    if (auth.isAuthenticated && app.clientsCache.length === 0 && !app.loading) {
      logger.debug("🚀 MainLayout: Loading clients (cache empty)", {
        authenticated: auth.isAuthenticated,
        cacheLength: app.clientsCache.length,
        appLoading: app.loading,
      });
      app.loadClients();
    }
  }, [auth.isAuthenticated, app.clientsCache.length]); // Removed app.loading from dependencies

  // Debug interface keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === "D") {
        event.preventDefault();
        setIsDebugInterfaceOpen(true);
        logger.info("🔧 Debug interface opened via keyboard shortcut");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderContent = () => {
    logger.debug("🧭 MainLayout renderContent:", {
      activeSection: app.activeSection,
      adminSection: getAdminSection(),
      clientSection: getClientSection(),
    });

    if (
      app.activeSection === getAdminSection() ||
      app.activeSection === getClientSection()
    ) {
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading dashboard...</p>
              </div>
            </div>
          }
        >
          <LazyDashboard userId={auth.user?.id} client={app.selectedClient} />
        </Suspense>
      );
    } else if (app.activeSection === "user-management") {
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading management console...</p>
              </div>
            </div>
          }
        >
          <LazyManagementConsole />
        </Suspense>
      );
    } else if (app.activeSection === "settings") {
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading settings...</p>
              </div>
            </div>
          }
        >
          <LazySettingsPage />
        </Suspense>
      );
    } else if (
      app.activeSection === "privacy-policy" ||
      app.activeSection === "terms-and-conditions" ||
      app.activeSection === "contact-support" ||
      app.activeSection === "support" ||
      app.activeSection === "contact"
    ) {
      return <LegalPagesRouter />;
    }

    // Default fallback - show loading or error
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeSection={app.activeSection}
          selectedClient={app.selectedClient}
          clients={app.clientsCache}
          onSectionChange={routing.navigateToSection}
          onManageUsers={() =>
            routing.navigateToSection("user-management", "clients")
          }
          onClientAssignment={() =>
            routing.navigateToSection("client-assignment")
          }
          user={auth.user}
          canManageUsers={
            newPermissions?.hasPermission("canManageUsers") ||
            permissions.canManageUsers
          }
          onSignOut={auth.signOut}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Content */}
          <main className="flex-1">{renderContent()}</main>
          {/* Footer */}
          <AppFooter />
        </div>
      </div>

      {/* User Management Modal - keeping for backward compatibility */}
      {isUserManagementOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Management</h2>
                <button
                  onClick={() => setIsUserManagementOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                This is the user management interface. The new role-based user
                management system is now available in the main navigation.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsUserManagementOpen(false);
                    routing.navigateToSection("user-management", "clients");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go to New User Management
                </button>
                <button
                  onClick={() => setIsUserManagementOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Debug Interface */}
      {isDebugInterfaceOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading debug interface...</p>
              </div>
            </div>
          }
        >
          <LazyClientDebugInterface
            isOpen={isDebugInterfaceOpen}
            onClose={() => setIsDebugInterfaceOpen(false)}
          />
        </Suspense>
      )}

      {/* Notification Toast */}
      <NotificationToast />
    </div>
  );
};

// Main component with providers
export const MainLayout: React.FC = () => {
  return <MainLayoutInner />;
};
