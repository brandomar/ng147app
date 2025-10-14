/**
 * Setup Guidance Component
 * 
 * Provides centralized guidance for missing data and configuration issues.
 * Shows actionable notifications to help users complete their setup.
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, Settings, Users, Building2, Palette, ArrowRight, X } from 'lucide-react';
import { useGlobalPermissions } from '../../hooks/useGlobalPermissions';
import { useUnifiedRouting } from '../../hooks/useUnifiedRouting';
import { useBrand } from '../../contexts/BrandContext';
import { logger } from '../../lib/logger';

interface SetupIssue {
  id: string;
  type: 'brand' | 'clients' | 'users' | 'data';
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  requiredRole?: 'admin' | 'staff' | 'client';
  priority: 'high' | 'medium' | 'low';
}

interface SetupGuidanceProps {
  issues: SetupIssue[];
  onDismiss?: (issueId: string) => void;
  maxIssues?: number;
}

export const SetupGuidance: React.FC<SetupGuidanceProps> = ({
  issues,
  onDismiss,
  maxIssues = 3
}) => {
  const permissions = useGlobalPermissions();
  const routing = useUnifiedRouting();
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set());

  // Filter issues based on user role and priority
  const filteredIssues = issues
    .filter(issue => {
      // Check role requirements
      if (issue.requiredRole) {
        const roleKey = `is${issue.requiredRole.charAt(0).toUpperCase() + issue.requiredRole.slice(1)}` as keyof typeof permissions;
        if (!permissions[roleKey]) {
          return false;
        }
      }
      
      // Don't show dismissed issues
      return !dismissedIssues.has(issue.id);
    })
    .sort((a, b) => {
      // Sort by priority: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, maxIssues);

  const handleDismiss = (issueId: string) => {
    setDismissedIssues(prev => new Set([...prev, issueId]));
    onDismiss?.(issueId);
    logger.debug('🔧 Setup guidance dismissed:', issueId);
  };

  const handleAction = (issue: SetupIssue) => {
    logger.debug('🔧 Setup guidance action taken:', issue);
    
    // Navigate to the appropriate section using unified routing
    if (issue.actionUrl === '/user-management/brand') {
      routing.navigateToSection('user-management', 'brand');
    } else if (issue.actionUrl === '/user-management/clients') {
      routing.navigateToSection('user-management', 'clients');
    } else if (issue.actionUrl.startsWith('/')) {
      // Fallback for other absolute URLs
      window.location.href = issue.actionUrl;
    } else {
      // Handle internal routing for relative paths
      const [section, tab] = issue.actionUrl.split('/');
      routing.navigateToSection(section as string, tab);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'brand':
        return <Palette className="text-purple-600" size={20} />;
      case 'clients':
        return <Building2 className="text-blue-600" size={20} />;
      case 'users':
        return <Users className="text-green-600" size={20} />;
      case 'data':
        return <Settings className="text-orange-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (filteredIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 max-w-md">
      {filteredIssues.map((issue) => (
        <div
          key={issue.id}
          className={`${getPriorityColor(issue.priority)} border rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out`}
        >
          <div className="flex items-start space-x-3">
            {getIssueIcon(issue.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  {issue.title}
                </h4>
                <button
                  onClick={() => handleDismiss(issue.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {issue.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => handleAction(issue)}
                  className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{issue.action}</span>
                  <ArrowRight size={14} />
                </button>
                {issue.priority === 'high' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    Required
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook to detect setup issues and provide guidance
 */
export const useSetupGuidance = () => {
  const [issues, setIssues] = useState<SetupIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get brand context at hook level (not inside async function)
  const { hasBrandSettings } = useBrand();

  const checkSetupIssues = async () => {
    setIsLoading(true);
    const detectedIssues: SetupIssue[] = [];

    try {
      // Check for brand settings - only show for undeniable users when no brand settings exist
      // Use the hasBrandSettings value from the hook closure (will be updated via useEffect)
      if (!hasBrandSettings) {
        detectedIssues.push({
          id: 'brand-settings-missing',
          type: 'brand',
          title: 'Brand Settings Missing',
          description: 'Configure your company branding, colors, and visual identity.',
          action: 'Set up branding',
          actionUrl: '/user-management/brand',
          requiredRole: 'admin',
          priority: 'high' // Changed to high priority to show first
        });
      }

      // Check for clients - only show if brand settings exist or user is not undeniable
      const { data: clients } = await import('../../lib/database').then(m => m.getClients());
      if (!clients || clients.length === 0) {
        detectedIssues.push({
          id: 'clients-missing',
          type: 'clients',
          title: 'No Clients Found',
          description: 'Add your first client to start tracking metrics and data.',
          action: 'Add client',
          actionUrl: '/user-management/clients',
          requiredRole: 'admin',
          priority: 'high' // Changed to high priority so both show as "Required"
        });
      }

      // Check for users (if user has undeniable role)
      // Note: We can't use hooks in async functions, so we'll skip this check for now
      // This would need to be handled differently in a real implementation
      // const { data: users } = await import('../../lib/database').then(m => m.getUsers());
      // if (!users || users.length <= 1) {
      //   detectedIssues.push({
      //     id: 'users-missing',
      //     type: 'users',
      //     title: 'Invite Team Members',
      //     description: 'Add staff members and invite clients to collaborate.',
      //     action: 'Manage users',
      //     actionUrl: '/manage-clients/overview',
      //     requiredRole: 'admin',
      //     priority: 'low'
      //   });
      // }

    } catch (error) {
      logger.error('❌ Error checking setup issues:', error);
    } finally {
      setIsLoading(false);
    }

    setIssues(detectedIssues);
  };

  useEffect(() => {
    checkSetupIssues();
  }, [hasBrandSettings]); // Re-run when brand settings change

  return {
    issues,
    isLoading,
    refreshIssues: checkSetupIssues
  };
};
