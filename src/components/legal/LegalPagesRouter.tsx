import React from 'react';
import { useApp } from "../../contexts/AppContext";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsAndConditions } from "./TermsAndConditions";
import { ContactSupport } from "./ContactSupport";

export const LegalPagesRouter: React.FC = () => {
  const app = useApp();

  // Route based on active section
  switch (app.activeSection) {
    case "privacy-policy":
      return <PrivacyPolicy />;
    case "terms-and-conditions":
      return <TermsAndConditions />;
    case "contact-support":
    case "support":
    case "contact":
      return <ContactSupport />;
    default:
      return <ContactSupport />;
  }
};
