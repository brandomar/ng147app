import { useEffect, useState } from 'react';
import { performStateMigration } from '../lib/stateCleanup';

interface MigrationState {
  isComplete: boolean;
  migrationData: any;
  cleanedKeys: string[];
  essentialKeys: string[];
}

/**
 * Hook to handle state migration from fragmented localStorage to context system
 */
export const useStateMigration = () => {
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isComplete: false,
    migrationData: null,
    cleanedKeys: [],
    essentialKeys: []
  });

  useEffect(() => {
    // Check if migration has already been performed
    const migrationComplete = localStorage.getItem('state_migration_complete');
    
    if (!migrationComplete) {
      console.log('🔄 Performing state migration...');
      
      try {
        const result = performStateMigration();
        
        setMigrationState({
          isComplete: true,
          migrationData: result.migrationData,
          cleanedKeys: result.cleanedKeys,
          essentialKeys: result.essentialKeys
        });
        
        // Mark migration as complete
        localStorage.setItem('state_migration_complete', 'true');
        localStorage.setItem('state_migration_timestamp', new Date().toISOString());
        
        console.log('✅ State migration completed successfully');
      } catch (error) {
        console.error('❌ State migration failed:', error);
      }
    } else {
      console.log('✅ State migration already completed');
      setMigrationState(prev => ({ ...prev, isComplete: true }));
    }
  }, []);

  return migrationState;
};
