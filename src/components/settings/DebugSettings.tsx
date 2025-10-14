/**
 * Debug Settings Component
 * 
 * Simple debug settings interface for Undeniable role users only.
 * Uses localStorage for persistence (much simpler than database).
 */
import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { Settings, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGlobalPermissions } from '../../hooks/useGlobalPermissions';

interface DebugSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Shared debug settings component that can be used as both modal and tab
const DebugSettingsContent: React.FC<{
  isModal?: boolean;
  onClose?: () => void;
}> = ({ isModal = false, onClose }) => {
  const permissions = useGlobalPermissions();
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [configSource, setConfigSource] = useState<'config.json' | 'localStorage' | 'default'>('default');

  // Check if user has permission to access debug settings
  const canAccessDebugSettings = permissions.role === "admin";

  // Load settings from config.json first, then localStorage fallback
  useEffect(() => {
    if (canAccessDebugSettings) {
      const loadDebugSettings = async () => {
        try {
          // First, try to load from config.json
          const response = await fetch('/config.json');
          if (response.ok) {
            const config = await response.json();
            if (config.debug) {
              setDebugEnabled(config.debug.enabled || false);
              setConfigSource('config.json');
              logger.debug('🔧 Debug settings loaded from config.json:', {
                enabled: config.debug.enabled,
                level: config.debug.level
              });
              return;
            }
          }
        } catch (error) {
          logger.debug('📄 config.json not found, falling back to localStorage');
        }

        // Fallback to localStorage if config.json doesn't provide settings
        const savedDebugEnabled = localStorage.getItem('debug_enabled') === 'true';
        setDebugEnabled(savedDebugEnabled);
        setConfigSource('localStorage');
        
        logger.debug('🔧 Debug settings loaded from localStorage:', {
          debugEnabled: savedDebugEnabled,
        });
      };

      loadDebugSettings();
    }
  }, [canAccessDebugSettings]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      // Save to localStorage (much simpler!)
      localStorage.setItem('debug_enabled', debugEnabled.toString());
      
      // Also save to the logger's expected keys for compatibility
      localStorage.setItem('client_debug_enabled', debugEnabled.toString());

      // Apply debug setting - simple on/off
      if (debugEnabled) {
        logger.enableClientDebugging();
      } else {
        logger.disableClientDebugging();
      }

      setSaveStatus('saved');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      logger.info('✅ Debug settings saved to localStorage');

    } catch (error) {
      logger.error('❌ Failed to save debug settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setDebugEnabled(false);
    logger.info('🔧 Debug settings reset to defaults');
  };

  if (!canAccessDebugSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">Debug settings are only available to Undeniable role users.</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Debug Mode Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Debug Mode</h3>
              <p className="text-sm text-gray-500">
                Enable detailed logging for troubleshooting
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Source: {configSource === 'config.json' ? 'config.json (read-only)' : 
                        configSource === 'localStorage' ? 'localStorage' : 'default'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={debugEnabled}
              onChange={(e) => setDebugEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Removed Debug Level and Auto-Off Timer sections */}

      

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={handleResetSettings}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
            saveStatus === "saved"
              ? "bg-green-600 text-white hover:bg-green-700"
              : saveStatus === "error"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          }`}
        >
          {saveStatus === "saving" && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
          {saveStatus === "saved" && <CheckCircle className="h-4 w-4" />}
          {saveStatus === "error" && <AlertTriangle className="h-4 w-4" />}
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Settings Saved!"}
          {saveStatus === "error" && "Save Failed"}
          {saveStatus === "idle" && "Save Settings"}
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Settings saved successfully!
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Debug Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};

export const DebugSettings: React.FC<DebugSettingsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <DebugSettingsContent isModal={true} onClose={onClose} />;
};

// Export for use as a tab component
export const DebugSettingsTab: React.FC = () => {
  return <DebugSettingsContent isModal={false} />;
};

export default DebugSettingsContent;