import React from 'react';
import { useTranslation } from 'react-i18next';
import { languageOptions, changeLanguage, getCurrentLanguage } from '../../i18n';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const currentLangOption = languageOptions.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {currentLangOption?.flag} {currentLangOption?.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languageOptions.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${currentLanguage === language.code ? 'bg-accent' : ''}`}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple language switcher for mobile
export function MobileLanguageSelector() {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const currentLangOption = languageOptions.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('settings.language')}</label>
      <div className="grid grid-cols-2 gap-2">
        {languageOptions.map((language) => (
          <Button
            key={language.code}
            variant={currentLanguage === language.code ? "default" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange(language.code)}
            className="justify-start"
          >
            <span className="mr-2">{language.flag}</span>
            <span className="text-xs">{language.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
} 