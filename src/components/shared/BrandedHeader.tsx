import React from 'react';
import { useBrand } from "../../contexts/BrandContext";

interface BrandedHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  className?: string;
}

export const BrandedHeader: React.FC<BrandedHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
  className = "",
}) => {
  const { brandConfig: config } = useBrand();

  const displayTitle = title || config.applicationName;
  const displaySubtitle = subtitle || config.ui.welcomeMessage;

  return (
    <header
      className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showLogo && config.logoFilePath && (
            <div className="flex-shrink-0">
              <img
                src={config.logoFilePath}
                alt={`${config.companyName} Logo`}
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback to text logo if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="h-8 w-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">${config.companyName
                      .charAt(0)
                      .toUpperCase()}</div>`;
                  }
                }}
              />
            </div>
          )}

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {displayTitle}
            </h1>
            {displaySubtitle && (
              <p className="text-sm text-gray-600">{displaySubtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">{config.companyName}</div>
        </div>
      </div>
    </header>
  );
};

/**
 * Branded Logo Component
 */
export const BrandedLogo: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const { brandConfig: config } = useBrand();

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  if (!config.logoFilePath) {
    return (
      <div
        className={`${sizeClasses[size]} bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold ${className}`}
      >
        {config.companyName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={config.logoFilePath}
      alt={`${config.companyName} Logo`}
      className={`${sizeClasses[size]} ${className}`}
      onError={(e) => {
        // Fallback to text logo if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        const parent = target.parentElement;
        if (parent) {
          parent.innerHTML = `<div class="${
            sizeClasses[size]
          } bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">${config.companyName
            .charAt(0)
            .toUpperCase()}</div>`;
        }
      }}
    />
  );
};

/**
 * Branded Footer Component
 */
export const BrandedFooter: React.FC<{
  className?: string;
}> = ({ className = "" }) => {
  const { brandConfig: config } = useBrand();

  return (
    <footer
      className={`bg-gray-50 border-t border-gray-200 px-6 py-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{config.copyrightText}</div>

        {config.supportEmail && (
          <div className="text-sm text-gray-600">
            <a
              href={`mailto:${config.supportEmail}`}
              className="hover:text-brand-primary transition-colors"
            >
              Support
            </a>
          </div>
        )}
      </div>
    </footer>
  );
};
