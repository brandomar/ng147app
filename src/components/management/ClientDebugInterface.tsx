/**
 * Client Debug Interface
 * 
 * Provides a debugging interface for clients experiencing sync issues.
 * Access via: Ctrl+Shift+D (keyboard shortcut)
 * 
 * Features:
 * - Enable/disable detailed logging
 * - View recent log entries with filtering
 * - Download logs for support
 * - Real-time log monitoring
 * 
 * This interface is production-safe and only shows when explicitly opened.
 */
import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { Bug, Download, Trash2, Eye, EyeOff, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { validateSecurityCohesion, validateUserAccess, getSecurityReport } from '../../lib/database';

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface ClientDebugInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientDebugInterface: React.FC<ClientDebugInterfaceProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const [activeTab, setActiveTab] = useState<'logs' | 'security'>('logs');
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load recent logs when interface opens
      setLogs(logger.getRecentLogs(200));
      setIsDebugEnabled(logger.isClientDebuggingEnabled());
    }
  }, [isOpen]);

  const refreshLogs = () => {
    setLogs(logger.getRecentLogs(200));
  };

  const toggleDebugging = () => {
    if (isDebugEnabled) {
      logger.disableClientDebugging();
      setIsDebugEnabled(false);
    } else {
      logger.enableClientDebugging();
      setIsDebugEnabled(true);
    }
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const downloadLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      logs: logs,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const runSecurityValidation = async () => {
    setIsValidating(true);
    try {
      const report = await getSecurityReport();
      setSecurityReport(report);
      logger.info('Security validation completed:', report);
    } catch (error) {
      logger.error('Security validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Bug className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Client Debug Interface</h2>
            <span
              className={`px-2 py-1 rounded text-sm ${
                isDebugEnabled
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isDebugEnabled ? "Debug Enabled" : "Debug Disabled"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "logs"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Bug size={16} className="inline mr-2" />
            Logs
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "security"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield size={16} className="inline mr-2" />
            Security Validation
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "logs" && (
          <>
            {/* Controls */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleDebugging}
                    className={`flex items-center space-x-2 px-3 py-2 rounded ${
                      isDebugEnabled
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isDebugEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{isDebugEnabled ? "Disable" : "Enable"} Debug</span>
                  </button>

                  <button
                    onClick={refreshLogs}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={clearLogs}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>

                  <button
                    onClick={downloadLogs}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border rounded"
                >
                  <option value="all">All Logs</option>
                  <option value="error">Errors Only</option>
                  <option value="warn">Warnings Only</option>
                  <option value="info">Info Only</option>
                  <option value="debug">Debug Only</option>
                </select>
              </div>
            </div>

            {/* Log Display */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No logs available. Enable debugging to start collecting
                    logs.
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 border rounded"
                    >
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                          log.level
                        )}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 font-mono">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm">{log.message}</div>
                        {log.data && (
                          <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "security" && (
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-6">
              {/* Security Validation Controls */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Database Security Validation
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Validate the cohesion between userRoles, clients, and
                      profiles tables
                    </p>
                  </div>
                  <button
                    onClick={runSecurityValidation}
                    disabled={isValidating}
                    className={`flex items-center space-x-2 px-4 py-2 rounded ${
                      isValidating
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    <Shield size={16} />
                    <span>
                      {isValidating ? "Validating..." : "Run Security Check"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Security Report Display */}
              {securityReport && (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      securityReport.cohesion.isValid
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {securityReport.cohesion.isValid ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <XCircle className="text-red-600" size={24} />
                      )}
                      <div>
                        <h4 className="text-lg font-semibold">
                          {securityReport.cohesion.isValid
                            ? "Security Valid"
                            : "Security Issues Found"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Last checked:{" "}
                          {new Date(securityReport.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {securityReport.statistics.totalUsers}
                      </div>
                      <div className="text-sm text-blue-800">Total Users</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {securityReport.statistics.totalAccessRecords}
                      </div>
                      <div className="text-sm text-purple-800">
                        Access Records
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {securityReport.cohesion.issues.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertTriangle className="text-red-600" size={20} />
                        <h4 className="text-lg font-semibold text-red-800">
                          Issues Found
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {securityReport.cohesion.issues.map(
                          (issue: string, index: number) => (
                            <li
                              key={index}
                              className="text-sm text-red-700 flex items-start space-x-2"
                            >
                              <span className="text-red-500 mt-1">•</span>
                              <span>{issue}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {securityReport.cohesion.recommendations.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertTriangle className="text-yellow-600" size={20} />
                        <h4 className="text-lg font-semibold text-yellow-800">
                          Recommendations
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {securityReport.cohesion.recommendations.map(
                          (rec: string, index: number) => (
                            <li
                              key={index}
                              className="text-sm text-yellow-700 flex items-start space-x-2"
                            >
                              <span className="text-yellow-500 mt-1">•</span>
                              <span>{rec}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Success Message */}
                  {securityReport.cohesion.isValid &&
                    securityReport.cohesion.issues.length === 0 && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="text-green-600" size={20} />
                          <span className="text-green-800 font-medium">
                            All security checks passed! Database tables are
                            working cohesively.
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* No Report Yet */}
              {!securityReport && (
                <div className="text-center text-gray-500 py-8">
                  <Shield className="mx-auto mb-4 text-gray-400" size={48} />
                  <p>
                    Click "Run Security Check" to validate database security
                    cohesion
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          <div className="flex justify-between items-center">
            {activeTab === "logs" ? (
              <>
                <span>
                  Showing {filteredLogs.length} of {logs.length} logs
                </span>
                <span>Debug interface for troubleshooting sync issues</span>
              </>
            ) : (
              <>
                <span>Security validation for database table cohesion</span>
                <span>Access via Ctrl+Shift+D keyboard shortcut</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
