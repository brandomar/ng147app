/**
 * Notification Settings Tab
 * 
 * Notification preferences available to all users.
 * Includes email, dashboard, and system notifications.
 */
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationSettings: React.FC = () => {
  const auth = useAuth();
  const [notifications, setNotifications] = useState({
    syncNotifications: true,
    errorAlerts: true,
    clientChanges: true,
    systemEvents: true,
    edgeFunctionFailures: true,
    dataIntegrityIssues: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load notification settings from database
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!auth.user?.id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', auth.user.id)
          .single();

        if (error && error.code !== 'PGRST116' && error.code !== '406') { // PGRST116 = no rows found, 406 = not acceptable
          logger.error('❌ Error loading notification settings:', error);
          return;
        }

        if (data) {
          setNotifications({
            syncNotifications: data.sync_notifications ?? true,
            errorAlerts: data.error_alerts ?? true,
            clientChanges: data.client_changes ?? true,
            systemEvents: data.system_events ?? true,
            edgeFunctionFailures: data.edge_function_failures ?? true,
            dataIntegrityIssues: data.data_integrity_issues ?? true
          });
        }
      } catch (error) {
        logger.error('❌ Failed to load notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotificationSettings();
  }, [auth.user?.id]);

  const handleNotificationChange = async (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    
    // Auto-save to database
    await saveNotificationSettings({ ...notifications, [key]: value });
  };

  const saveNotificationSettings = async (settingsToSave = notifications) => {
    if (!auth.user?.id) return;

    try {
      setIsSaving(true);
      setSaveStatus('idle');

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: auth.user.id,
          sync_notifications: settingsToSave.syncNotifications,
          error_alerts: settingsToSave.errorAlerts,
          client_changes: settingsToSave.clientChanges,
          system_events: settingsToSave.systemEvents,
          edge_function_failures: settingsToSave.edgeFunctionFailures,
          data_integrity_issues: settingsToSave.dataIntegrityIssues,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('❌ Error saving notification settings:', error);
        setSaveStatus('error');
        return;
      }

      logger.info('✅ Notification settings saved successfully');
      setSaveStatus('success');
      
      // Clear success status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      logger.error('❌ Failed to save notification settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading notification settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">🚀</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Coming Soon</h3>
            <p className="text-sm text-blue-700 mt-1">
              Notification settings are being developed and will be available soon.
            </p>
          </div>
        </div>
      </div>
      {/* Save Status Indicator */}
      <div className="flex items-center justify-end space-x-2">
        {isSaving && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Saving...</span>
          </div>
        )}
        {saveStatus === 'success' && (
          <div className="flex items-center space-x-2 text-green-600">
            <span className="text-sm">✓ Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center space-x-2 text-red-600">
            <span className="text-sm">✗ Save failed</span>
          </div>
        )}
      </div>

      {/* System Notifications */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">System Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Sync Operations</h4>
              <p className="text-sm text-gray-500">Notify when Google Sheets sync completes or fails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.syncNotifications}
                onChange={(e) => handleNotificationChange('syncNotifications', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Error Alerts</h4>
              <p className="text-sm text-gray-500">Critical system errors and failures</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.errorAlerts}
                onChange={(e) => handleNotificationChange('errorAlerts', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Client Changes</h4>
              <p className="text-sm text-gray-500">When clients are added, removed, or modified</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.clientChanges}
                onChange={(e) => handleNotificationChange('clientChanges', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>
        </div>
      </div>

      {/* Technical Notifications */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Technical Alerts</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">System Events</h4>
              <p className="text-sm text-gray-500">Database changes, user actions, and system updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.systemEvents}
                onChange={(e) => handleNotificationChange('systemEvents', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Edge Function Failures</h4>
              <p className="text-sm text-gray-500">When Supabase edge functions fail or timeout</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.edgeFunctionFailures}
                onChange={(e) => handleNotificationChange('edgeFunctionFailures', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Data Integrity Issues</h4>
              <p className="text-sm text-gray-500">When data validation fails or inconsistencies are detected</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifications.dataIntegrityIssues}
                onChange={(e) => handleNotificationChange('dataIntegrityIssues', e.target.checked)}
                disabled={isSaving}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}></div>
            </label>
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 bg-white rounded-lg border border-gray-200 p-6">
        <button className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium">
          Reset to Defaults
        </button>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Save Settings
        </button>
      </div>
    </div>
  );
};
