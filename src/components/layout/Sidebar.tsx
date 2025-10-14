import React, { useState } from 'react';
import {
  BarChart3,
  Building2,
  Users,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Client } from "../../types";
import { useGlobalPermissions } from "../../hooks/useGlobalPermissions";
import { usePermissions } from "../../contexts/PermissionContext";
import { useBrand } from "../../contexts/BrandContext";
import {
  getAdminSection,
  getAdminDashboardTitle,
} from "../../lib/whitelabelDatabase";

interface SidebarProps {
  activeSection: string;
  selectedClient: Client | null;
  clients: Client[];
  onSectionChange: (section: string, tab?: string, client?: Client) => void;
  onSignOut: () => void;
  onManageUsers: () => void;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  } | null;
  canManageUsers?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  selectedClient,
  clients,
  onSectionChange,
  onSignOut,
  onManageUsers,
  user,
  canManageUsers: _canManageUsers = false,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const permissions = useGlobalPermissions();

  // Try to get new permission system, but don't fail if not available
  let newPermissions = null;
  try {
    newPermissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue with legacy system
  }

  const { brandConfig, isLoading: brandLoading } = useBrand();

  // Extract first name from user metadata
  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      const firstName = user.user_metadata.full_name.split(" ")[0];
      return firstName;
    }
    return null;
  };

  const displayName = getDisplayName();

  // Show loading state while brand config is loading
  if (brandLoading) {
    return (
      <div className="w-64 bg-black text-white h-screen flex flex-col fixed left-0 top-0 z-10">
        <div className="px-6 py-4 border-b border-neutral-800 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mx-auto"></div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-black text-white h-screen flex flex-col fixed left-0 top-0 z-10">
      <div className="px-6 py-4 border-b border-neutral-800 text-center">
        {brandConfig.logoFilePath ? (
          <img
            src={brandConfig.logoFilePath}
            alt={`${brandConfig.companyName} logo`}
            className="h-8 mx-auto object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<h1 class=\"text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent\">${
                  brandConfig.applicationName || "Dashboard"
                }</h1>`;
              }
            }}
          />
        ) : (
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            {brandConfig.applicationName || "Dashboard"}
          </h1>
        )}
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-6">
          {/* Primary Dashboard - Shows configured primary client or fallback admin button */}
          {(newPermissions?.isGlobalAdmin || permissions.isAdmin) &&
            (() => {
              const primaryClient = clients.find(
                (client) => client.client_type === "primary"
              );

              return (
                <div key="primary-dashboard">
                  <button
                    onClick={() =>
                      primaryClient
                        ? onSectionChange("client", undefined, primaryClient)
                        : onSectionChange(getAdminSection())
                    }
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                      (primaryClient &&
                        activeSection === "client" &&
                        selectedClient?.id === primaryClient.id) ||
                      (!primaryClient && activeSection === getAdminSection())
                        ? "bg-gradient-to-r from-indigo-600 to-emerald-400 text-white shadow-lg"
                        : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <BarChart3 size={20} className="mr-1 flex-shrink-0" />
                    <div className="text-left flex-1">
                      <div className="text-base font-bold whitespace-nowrap">
                        {primaryClient?.name ||
                          brandConfig.applicationName ||
                          "Dashboard"}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })()}

          {/* Client Dashboards */}
          <div key="client-dashboards">
            <div className="flex items-center mb-3 px-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                CLIENT DASHBOARDS
              </span>
            </div>

            <div className="space-y-2">
              {(() => {
                // Filter out primary clients from client dashboards
                const clientDashboards = clients.filter(
                  (client) => client.client_type !== "primary"
                );
                return clientDashboards.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-neutral-500 italic">
                    No clients configured yet
                  </div>
                ) : (
                  clientDashboards.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        onSectionChange("client", undefined, client);
                      }}
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                        activeSection === "client" &&
                        selectedClient?.id === client.id
                          ? "bg-gradient-to-r from-indigo-600 to-emerald-400 text-white"
                          : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt={`${client.name} logo`}
                          className="w-6 h-6 rounded mr-3 object-cover"
                        />
                      ) : (
                        <FileText size={20} className="mr-3" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {client.name}
                      </span>
                    </button>
                  ))
                );
              })()}
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <div className="relative">
          {/* User Welcome Message - Clickable */}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg transition-colors"
          >
            <div
              className={`flex-1 min-w-0 ${
                !displayName ? "text-center" : "text-left"
              }`}
            >
              {displayName ? (
                <p className="text-sm font-medium truncate whitespace-nowrap">
                  Hello, {displayName}
                </p>
              ) : (
                <p className="text-base font-medium whitespace-nowrap">Hello</p>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />

              {/* Dropdown Content */}
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-neutral-200 z-50">
                <div className="p-2 space-y-1">
                  {/* Consolidated Management - Single page for all management tasks */}
                  {(newPermissions?.hasPermission("canManageUsers") ||
                    newPermissions?.hasPermission("canManageClients") ||
                    permissions.isStaff ||
                    permissions.isAdmin) && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onManageUsers(); // Use the consolidated UserManagement component
                      }}
                      className="w-full px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        Management
                      </span>
                    </button>
                  )}

                  {/* Settings for all users */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSectionChange("settings");
                    }}
                    className="w-full px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">
                      Settings
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSectionChange("contact-support");
                    }}
                    className="w-full px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">
                      Contact Support
                    </span>
                  </button>

                  {/* Sign out for all users */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">
                      Sign Out
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};