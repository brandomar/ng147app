import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Settings, Trash2, FileText, Table, Database } from 'lucide-react';
import { DataSource, DataSourceConfig } from '../../types/dataSource';
import { MultiSheetSelector } from '../shared/MultiSheetSelector';
import { getClientDataSources, createGoogleSheetsDataSources, deleteDataSource } from '../../lib/database';
import { logger } from '../../lib/logger';
import { useAuth } from '../../contexts/AuthContext';

interface DataSourceManagerProps {
  clientId: string;
  onDataSourceAdded: (dataSource: DataSource) => void;
  onDataSourceUpdated: (dataSource: DataSource) => void;
  onDataSourceDeleted: (dataSourceId: string) => void;
}

interface GoogleSheetTab {
  name: string;
  gid: string;
  url: string;
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  clientId,
  onDataSourceAdded,
  onDataSourceUpdated,
  onDataSourceDeleted
}) => {
  const { user } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<'google_sheets' | 'csv' | 'xlsx' | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [selectedTabs, setSelectedTabs] = useState<GoogleSheetTab[]>([]);
  const [dataSourceName, setDataSourceName] = useState('');

  useEffect(() => {
    loadDataSources();
  }, [clientId]);

  const loadDataSources = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('Loading data sources for client:', clientId);
      
      const { data, error } = await getClientDataSources(clientId);
      
      if (error) {
        throw new Error(error.message || 'Failed to load data sources');
      }
      
      setDataSources(data || []);
      logger.debug('Loaded data sources:', data?.length || 0);
    } catch (err) {
      logger.error('Error loading data sources:', err);
      setError('Failed to load data sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataSource = () => {
    setShowAddModal(true);
    setSelectedSourceType(null);
    setSpreadsheetId('');
    setSelectedTabs([]);
    setDataSourceName('');
    setError(null);
  };

  const handleCreateDataSources = async () => {
    if (!selectedSourceType || !dataSourceName.trim()) {
      setError('Please select a source type and enter a name.');
      return;
    }

    if (selectedSourceType === 'google_sheets' && (!spreadsheetId.trim() || selectedTabs.length === 0)) {
      setError('Please enter a spreadsheet ID and select at least one tab.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug('Creating data sources:', { selectedSourceType, selectedTabs });

      if (selectedSourceType === 'google_sheets') {
        const { data, error } = await createGoogleSheetsDataSources(
          clientId,
          dataSourceName,
          spreadsheetId,
          selectedTabs
        );

        if (error) {
          throw new Error(error.message || 'Failed to create data sources');
        }

        // Notify parent of each created data source
        if (data) {
          for (const result of data) {
            const dataSource: DataSource = {
              id: result.data_source_id,
              client_id: clientId,
              name: result.data_source_name,
              source_type: 'google_sheets',
              source_config: {
                spreadsheet_id: spreadsheetId,
                sheet_name: selectedTabs.find(tab => result.data_source_name.includes(tab.name))?.name || '',
                range: 'A:AZ',
                auto_sync: true,
                sync_frequency: 'daily'
              },
              is_active: true,
              display_order: dataSources.length,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            onDataSourceAdded(dataSource);
          }
        }
      }

      setShowAddModal(false);
      setSelectedSourceType(null);
      setSpreadsheetId('');
      setSelectedTabs([]);
      setDataSourceName('');
    } catch (err) {
      logger.error('Error creating data sources:', err);
      setError('Failed to create data sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataSource = async (dataSourceId: string) => {
    if (!confirm('Are you sure you want to delete this data source? This action cannot be undone.')) {
      return;
    }

    try {
      logger.debug('Deleting data source:', dataSourceId);
      
      const { error } = await deleteDataSource(dataSourceId);
      
      if (error) {
        throw new Error(error.message || 'Failed to delete data source');
      }
      
      onDataSourceDeleted(dataSourceId);
    } catch (err) {
      logger.error('Error deleting data source:', err);
      setError('Failed to delete data source. Please try again.');
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'google_sheets':
        return <Table size={20} className="text-green-600" />;
      case 'csv':
        return <FileText size={20} className="text-blue-600" />;
      case 'xlsx':
        return <Database size={20} className="text-orange-600" />;
      default:
        return <Database size={20} className="text-gray-600" />;
    }
  };

  return (
    <div className="data-source-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
          <p className="text-sm text-gray-600">Manage your data sources for this client</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDataSources}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleAddDataSource}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Add Data Source</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Data Sources List */}
      {loading && dataSources.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="animate-spin mx-auto text-gray-400" size={32} />
          <p className="text-gray-500 mt-2">Loading data sources...</p>
        </div>
      ) : dataSources.length === 0 ? (
        <div className="text-center py-8">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Data Sources</h4>
          <p className="text-gray-600 mb-4">Add your first data source to start syncing metrics.</p>
          <button
            onClick={handleAddDataSource}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Data Source
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dataSources.map(dataSource => (
            <div key={dataSource.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSourceIcon(dataSource.source_type)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{dataSource.name}</h4>
                    <p className="text-xs text-gray-500">
                      {dataSource.source_type} • {dataSource.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {/* TODO: Implement edit */}}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteDataSource(dataSource.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Data Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Data Source</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Source Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Source Type</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedSourceType('google_sheets')}
                    className={`p-4 border rounded-lg text-center ${
                      selectedSourceType === 'google_sheets'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Table size={24} className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Google Sheets</div>
                  </button>
                  <button
                    onClick={() => setSelectedSourceType('csv')}
                    className={`p-4 border rounded-lg text-center ${
                      selectedSourceType === 'csv'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText size={24} className="mx-auto mb-2" />
                    <div className="text-sm font-medium">CSV File</div>
                  </button>
                  <button
                    onClick={() => setSelectedSourceType('xlsx')}
                    className={`p-4 border rounded-lg text-center ${
                      selectedSourceType === 'xlsx'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Database size={24} className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Excel File</div>
                  </button>
                </div>
              </div>

              {/* Google Sheets Configuration */}
              {selectedSourceType === 'google_sheets' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Source Name
                    </label>
                    <input
                      type="text"
                      value={dataSourceName}
                      onChange={(e) => setDataSourceName(e.target.value)}
                      placeholder="e.g., Q1 Sales Data"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheets URL or ID
                    </label>
                    <input
                      type="text"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1ABC123.../edit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {spreadsheetId && (
                    <MultiSheetSelector
                      onSheetsChanged={(sheets) => {
                        // Convert to the format expected by the existing logic
                        const allTabs = sheets.flatMap(sheet => sheet.selectedTabs);
                        setSelectedTabs(allTabs);
                      }}
                      initialSheets={[]}
                      supportedTypes={['google-sheets']}
                      userId={user?.id}
                      clientId={clientId}
                    />
                  )}
                </div>
              )}

              {/* CSV/Excel Configuration */}
              {(selectedSourceType === 'csv' || selectedSourceType === 'xlsx') && (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {selectedSourceType.toUpperCase()} file upload functionality will be implemented in the next phase.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDataSources}
                  disabled={loading || !selectedSourceType || !dataSourceName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Data Sources'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
