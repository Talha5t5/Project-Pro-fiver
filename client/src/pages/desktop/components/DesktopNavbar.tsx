import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/ui/language-selector';

export const DesktopNavbar: React.FC = () => {
  const { t } = useTranslation();
  const [location] = useLocation();
  
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/desktop" className="text-2xl font-bold text-blue-600">
              ProjectPro
          </Link>
        </div>
        
          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link
                href="/desktop"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('navigation.home', 'Home')}
              </Link>
              <Link
                href="#features"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('navigation.features', 'Funzionalità')}
              </Link>
              <Link
                href="#pricing"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('navigation.pricing', 'Prezzi')}
              </Link>
              <Link
                href="#about"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('navigation.about', 'Chi Siamo')}
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('navigation.howItWorks', 'Come Funziona')}
              </Link>
            </div>
          </div>

          {/* Right side - Language and Auth */}
          <div className="flex items-center space-x-4">
            <LanguageSelector />
          {!location.includes('/checkout') && !location.includes('/payment-success') ? (
            <>
                <Link
                  href="/desktop/auth"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('auth.login', 'Accedi')}
                </Link>
            </>
          ) : (
              <Link
                href="/desktop"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('common.backToHome', 'Torna alla Home')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};