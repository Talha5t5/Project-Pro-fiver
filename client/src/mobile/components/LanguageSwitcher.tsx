import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'it' ? 'en' : 'it';
    i18n.changeLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {i18n.language === 'it' ? '🇮🇹 IT' : '🇺🇸 EN'}
      </span>
    </Button>
  );
}
