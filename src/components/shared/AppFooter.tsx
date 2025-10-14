import React from 'react';
import { useBrand } from '../../contexts/BrandContext';
import { useUnifiedRouting } from '../../hooks/useUnifiedRouting';

export const AppFooter: React.FC = () => {
  const { brandConfig } = useBrand();
  const routing = useUnifiedRouting();

  const currentYear = new Date().getFullYear();
  const copyrightText = brandConfig.copyrightText || `© ${currentYear} Dashboard. All rights reserved.`;

  return (
    <footer className="bg-gray-50 border-t border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          {/* Copyright */}
          <div className="text-sm text-gray-600">
            {copyrightText}
          </div>

          {/* Legal Links */}
          <div className="flex items-center space-x-6 text-sm">
            <button
              onClick={() => routing.navigateToSection('privacy-policy')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => routing.navigateToSection('terms-and-conditions')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => routing.navigateToSection('contact-support')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
