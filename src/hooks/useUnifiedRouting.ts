import { useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateSlug, findClientBySlug } from '../lib/slugUtils';
import { logger } from '../lib/logger';

export const useUnifiedRouting = () => {
  const app = useApp();

  // Navigate to client
  const navigateToClient = useCallback((client: any, tab?: string) => {
    logger.debug('🧭 navigateToClient called:', { client, tab });
    
    if (!client || !client.id || !client.name) {
      logger.error('❌ Invalid client object:', client);
      return;
    }
    
    app.setSelectedClient(client);
    app.setActiveSection('client');
    
    const targetTab = tab || 'overview';
    app.setActiveTab(targetTab);
    
    const clientSlug = generateSlug(client.name);
    window.history.pushState({ client: client.id, tab: targetTab }, '', `/client/${clientSlug}/${targetTab}`);
    
    logger.debug('🧭 Navigated to client:', { clientId: client.id, clientName: client.name, tab: targetTab, clientSlug });
  }, [app]);

  // Navigate to section
  const navigateToSection = useCallback((section: 'admin' | 'client' | 'manage-clients' | 'manage-admin' | 'user-management' | 'settings' | 'privacy-policy' | 'terms-and-conditions' | 'contact-support', tab?: string, client?: any) => {
    logger.debug('🧭 navigateToSection called:', { section, tab, client: client?.name || 'none' });
    app.setActiveSection(section);
    
    if (section === 'admin') {
      const targetTab = tab || 'overview';
      app.setActiveTab(targetTab);
      window.history.pushState({ section, tab: targetTab }, '', `/admin/${targetTab}`);
      logger.debug('🧭 Navigated to admin dashboard:', { section, targetTab, url: `/admin/${targetTab}` });
    } else if (section === 'client' && client) {
      // If navigating to client section with a client, use navigateToClient
      navigateToClient(client, tab);
      return;
    } else if (section === 'manage-clients') {
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/manage-clients');
    } else if (section === 'manage-admin') {
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/manage-admin');
    } else if (section === 'user-management') {
      const targetTab = tab || app.activeTab || 'clients';
      app.setActiveTab(targetTab);
      window.history.pushState({ section, tab: targetTab }, '', `/management/${targetTab}`);
      logger.debug('🧭 Navigated to user management:', { section, targetTab, url: `/management/${targetTab}` });
    } else if (section === 'settings') {
      app.setActiveSection('settings');
      app.setSelectedClient(null);
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/settings');
    } else if (section === 'privacy-policy') {
      app.setActiveSection('privacy-policy');
      app.setSelectedClient(null);
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/privacy-policy');
    } else if (section === 'terms-and-conditions') {
      app.setActiveSection('terms-and-conditions');
      app.setSelectedClient(null);
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/terms-and-conditions');
    } else if (section === 'contact-support') {
      app.setActiveSection('contact-support');
      app.setSelectedClient(null);
      app.setActiveTab('overview');
      window.history.pushState({ section }, '', '/contact-support');
    }
    
    // logger.debug('🧭 Navigated to section:', { section, tab, client: client?.name });
  }, [app, navigateToClient]);

  // Navigate to tab within current section
  const navigateToTab = useCallback((tab: string) => {
    app.setActiveTab(tab);
    
    if (app.activeSection === 'admin') {
      window.history.pushState({ section: 'admin', tab }, '', `/admin/${tab}`);
    } else if (app.activeSection === 'client' && app.selectedClient) {
      const clientSlug = generateSlug(app.selectedClient.name);
      window.history.pushState({ client: app.selectedClient.id, tab }, '', `/client/${clientSlug}/${tab}`);
    } else if (app.activeSection === 'user-management') {
      window.history.pushState({ section: 'user-management', tab }, '', `/management/${tab}`);
    }
    
    logger.debug('🧭 Navigated to tab:', { section: app.activeSection, tab });
  }, [app]);

  // Initialize routing from URL
  const initializeRouting = useCallback(() => {
    const path = window.location.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    
    logger.debug('🧭 initializeRouting called:', { 
      path,
      pathSegments, 
      clientsCacheLength: app.clientsCache.length,
      currentSection: app.activeSection,
      selectedClient: app.selectedClient?.name
    });
    
    if (pathSegments.length === 0) {
      // Default to Undeniable dashboard
      logger.debug('🧭 No path segments, defaulting to admin');
      navigateToSection('admin', 'overview');
      return;
    }

    const [section, ...rest] = pathSegments;

    switch (section) {
      case 'admin':
        const tab = rest[0] || 'overview';
        if (['overview', 'growth', 'performance', 'cold-email', 'ads', 'spam-outreach'].includes(tab)) {
          app.setActiveSection('admin');
          app.setSelectedClient(null);
          app.setActiveTab(tab);
        } else {
          navigateToSection('admin', 'overview');
        }
        break;

      case 'client':
        if (rest.length >= 1) {
          const clientSlug = rest[0];
          const client = findClientBySlug(app.clientsCache, clientSlug);
          
          logger.debug('🧭 Client routing:', { 
            clientSlug, 
            foundClient: client ? { id: client.id, name: client.name } : null,
            clientsCache: app.clientsCache.map(c => ({ id: c.id, name: c.name, slug: generateSlug(c.name) }))
          });
          
          if (client) {
            const tab = rest[1] || 'overview';
            if (['overview', 'growth', 'performance', 'cold-email', 'ads', 'spam-outreach'].includes(tab)) {
              logger.debug('🧭 Setting client section and client:', { clientName: client.name, tab });
              app.setActiveSection('client');
              app.setSelectedClient(client as any);
              app.setActiveTab(tab);
            } else {
              logger.debug('🧭 Invalid tab, navigating to client with overview');
              navigateToClient(client, 'overview');
            }
          } else {
            // Client not found, redirect to Undeniable dashboard
            logger.debug('🧭 Client not found, redirecting to admin');
            navigateToSection('admin', 'overview');
          }
        } else {
          logger.debug('🧭 No client slug, redirecting to admin');
          navigateToSection('admin', 'overview');
        }
        break;

      case 'manage-clients':
        app.setActiveSection('manage-clients');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'manage-admin':
        app.setActiveSection('manage-admin');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'management':
        const managementTab = rest[0] || app.activeTab || 'clients';
        if (['users', 'invitations', 'clients', 'brand'].includes(managementTab)) {
          logger.debug('🧭 Setting user-management section:', { tab: managementTab });
          app.setActiveSection('user-management');
          app.setSelectedClient(null);
          app.setActiveTab(managementTab);
        } else {
          // Invalid tab, redirect to clients (first tab after reordering)
          logger.debug('🧭 Invalid management tab, redirecting to clients:', { tab: managementTab });
          navigateToSection('user-management', 'clients');
        }
        break;

        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'settings':
        app.setActiveSection('settings');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'privacy-policy':
        app.setActiveSection('privacy-policy');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'terms-and-conditions':
        app.setActiveSection('terms-and-conditions');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      case 'contact-support':
      case 'support':
      case 'contact':
        app.setActiveSection('contact-support');
        app.setSelectedClient(null);
        app.setActiveTab('overview');
        break;

      default:
        // Unknown route, redirect to Undeniable dashboard
        logger.debug('🧭 Unknown route, redirecting to admin:', { section, pathSegments });
        navigateToSection('admin', 'overview');
    }
  }, [app, navigateToSection, navigateToClient]);

    // Handle browser back/forward and initial page load
    useEffect(() => {
      const handlePopState = (_event: PopStateEvent) => {
        initializeRouting();
      };

      // Initialize routing on mount - only once
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        const cacheKey = `initial_routing_${currentPath}`;
        const lastInitialized = sessionStorage.getItem(cacheKey);
        
        if (!lastInitialized) {
          logger.debug('🧭 Initial routing initialization on mount');
          initializeRouting();
          sessionStorage.setItem(cacheKey, Date.now().toString());
        }
      }, 100); // Small delay to ensure context is ready

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        clearTimeout(timer);
      };
    }, [initializeRouting]);

  // Initialize routing when clients are loaded OR when no clients (for initial setup)
  useEffect(() => {
    // Check if routing has already been initialized for this specific path
    const currentPath = window.location.pathname;
    const cacheKey = `routing_initialized_${currentPath}_${app.clientsCache.length}_${app.clientsCache.map(c => c.id).join(',')}`;
    const lastInitialized = sessionStorage.getItem(cacheKey);
    const now = Date.now();
    
    // Only initialize if not done recently (within 1 second) OR if the path has changed
    if (!lastInitialized || (now - parseInt(lastInitialized)) > 1000) {
      logger.debug("🧭 Initializing routing:", {
        clientsCount: app.clientsCache.length,
        currentPath: window.location.pathname,
        clients: app.clientsCache.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.name ? generateSlug(c.name) : "unknown",
        })),
      });
      initializeRouting();
      sessionStorage.setItem(cacheKey, now.toString());
    } else {
      logger.debug('🧭 Routing initialization skipped (already initialized recently)');
    }
  }, [app.clientsCache, initializeRouting]);

  return {
    navigateToSection,
    navigateToClient,
    navigateToTab,
    initializeRouting
  };
};
