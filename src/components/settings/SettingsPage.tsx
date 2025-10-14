/**
 * Settings Page Component
 * 
 * Full-page settings interface with tabbed navigation.
 * Replaces modal-based settings with a dedicated page.
 * Maintains sidebar navigation while providing tabbed content area.
 */
import React, { useState } from 'react';
import { useGlobalPermissions } from '../../hooks/useGlobalPermissions';
import { User, Shield, Bell } from "lucide-react";
import { DebugSettingsTab } from "./DebugSettings";
import { ProfileSettings } from "./ProfileSettings";
import { NotificationSettings } from "./NotificationSettings";

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType;
  requiresRole?: "admin" | "staff" | "client";
}

const SETTINGS_TABS: SettingsTab[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    component: ProfileSettings,
    requiresRole: undefined, // Available to all users
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    component: NotificationSettings,
    requiresRole: undefined, // Available to all users
  },
  {
    id: "debug",
    label: "Debug Settings",
    icon: Shield,
    component: DebugSettingsTab,
    requiresRole: "admin", // Admin only
  },
];

export const SettingsPage: React.FC = () => {
  const permissions = useGlobalPermissions();
  const [activeTab, setActiveTab] = useState("profile");

  // Filter tabs based on user role
  const availableTabs = SETTINGS_TABS.filter((tab) => {
    if (!tab.requiresRole) return true;

    const roleHierarchy = { client: 1, staff: 2, admin: 3 };
    const userRoleLevel =
      roleHierarchy[permissions.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[tab.requiresRole];

    return userRoleLevel >= requiredRoleLevel;
  });

  const activeTabConfig = availableTabs.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div
      className="bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6"
      style={{ minHeight: "calc(100vh - 1rem)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint border-b rounded-t-xl">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Settings
                  <span className="ml-2 text-lg font-normal text-white/80">
                    | {activeTabConfig?.label || "User Settings"}
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-b-xl shadow-lg border border-gray-200">
          <div className="flex">
            {/* Settings Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200">
              <div className="p-6">
                <nav className="space-y-2">
                  {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          size={20}
                          className={
                            isActive ? "text-blue-600" : "text-gray-500"
                          }
                        />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-8">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
