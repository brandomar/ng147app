import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MonthlyTargets, updateClientGoals } from '../../lib/database';
import { logger } from '../../lib/logger';

interface GoalsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  currentGoals: MonthlyTargets;
  userId?: string;
  onSave?: () => void;
}

export const GoalsSettingsModal: React.FC<GoalsSettingsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  currentGoals,
  userId,
  onSave,
}) => {
  const [goals, setGoals] = useState<MonthlyTargets>(currentGoals);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset goals when modal opens or currentGoals change
  useEffect(() => {
    setGoals(currentGoals);
    setError(null);
  }, [currentGoals, isOpen]);

  const handleInputChange = (field: keyof MonthlyTargets, value: string) => {
    const numValue = parseFloat(value) || 0;
    setGoals((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      logger.info('💾 Saving client goals', { clientId, goals });

      const { error: saveError } = await updateClientGoals(
        clientId,
        goals,
        userId
      );

      if (saveError) {
        throw saveError;
      }

      logger.info('✅ Client goals saved successfully');
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }

      onClose();
    } catch (err) {
      logger.error('❌ Error saving client goals', err);
      setError('Failed to save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Set Monthly Goal Targets
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Ad Spend Goal */}
            <div>
              <label
                htmlFor="ad_spend"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ad Spend Target
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  id="ad_spend"
                  value={goals.ad_spend || ''}
                  onChange={(e) => handleInputChange('ad_spend', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  step="100"
                />
              </div>
            </div>

            {/* Booked Calls Goal */}
            <div>
              <label
                htmlFor="booked_calls"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Booked Calls Goal
              </label>
              <input
                type="number"
                id="booked_calls"
                value={goals.booked_calls || ''}
                onChange={(e) => handleInputChange('booked_calls', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                step="1"
              />
            </div>

            {/* Offer Rate Goal */}
            <div>
              <label
                htmlFor="offer_rate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Offer Rate Goal
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="offer_rate"
                  value={goals.offer_rate || ''}
                  onChange={(e) => handleInputChange('offer_rate', e.target.value)}
                  className="w-full px-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  max="1"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter as decimal (e.g., 0.75 for 75%)
              </p>
            </div>

            {/* Closes Goal */}
            <div>
              <label
                htmlFor="closes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Closes Goal
              </label>
              <input
                type="number"
                id="closes"
                value={goals.closes || ''}
                onChange={(e) => handleInputChange('closes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                step="1"
              />
            </div>

            {/* CPA Goal */}
            <div>
              <label
                htmlFor="cpa"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                CPA (Cost Per Acquisition) Goal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  id="cpa"
                  value={goals.cpa || ''}
                  onChange={(e) => handleInputChange('cpa', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  step="10"
                />
              </div>
            </div>

            {/* Sales Goal */}
            <div>
              <label
                htmlFor="sales"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Sales Goal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  id="sales"
                  value={goals.sales || ''}
                  onChange={(e) => handleInputChange('sales', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  step="100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>
    </div>
  );
};

