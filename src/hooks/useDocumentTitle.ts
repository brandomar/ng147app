import { useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useApp } from '../contexts/AppContext';
import { logger } from '../lib/logger';

/**
 * Hook to dynamically update document title based on brand configuration and current section
 */
export const useDocumentTitle = () => {
  const { brandConfig } = useBrand();
  const { activeSection, selectedClient, activeTab } = useApp();

  
  // Removed excessive debug logging

  useEffect(() => {
    const updateTitle = () => {
      try {
        const appName = brandConfig.applicationName || 'Dashboard';
        
        let title = '';
        
        if (activeSection === 'admin') {
          title = `${appName} Dashboard`;
        } else if (activeSection === 'client' && selectedClient) {
          title = `${selectedClient.name} Dashboard - ${appName}`;
        } else if (activeSection === 'user-management') {
          title = `User Management - ${appName}`;
        } else if (activeSection === 'settings') {
          title = `Settings - ${appName}`;
        } else {
          title = `${appName} Dashboard`;
        }
        
        
        // Update document title
        document.title = title;
        
        // Also update the title element in the head for extra safety
        const titleElement = document.querySelector('title');
        if (titleElement) {
          titleElement.textContent = title;
        }
        
        // Force update with a small delay to override any other changes
        setTimeout(() => {
          document.title = title;
        }, 100);
        
        // Title updated successfully
        
      } catch (error) {
        logger.error('❌ Error updating document title:', error);
        // Fallback
        document.title = 'Dashboard';
      }
    };

    updateTitle();
  }, [brandConfig.companyName, activeSection, selectedClient?.name]);
};
