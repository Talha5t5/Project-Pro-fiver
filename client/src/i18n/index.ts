import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all language files
import en from './locales/en.json';
import it from './locales/it.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import sq from './locales/sq.json';
import ar from './locales/ar.json';
import ro from './locales/ro.json';

const resources = {
  en: { translation: en },
  it: { translation: it },
  de: { translation: de },
  fr: { translation: fr },
  sq: { translation: sq },
  ar: { translation: ar },
  ro: { translation: ro }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language - English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

// Language options for the UI
export const languageOptions = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' }
];

// Function to change language
export const changeLanguage = (languageCode: string) => {
  console.log('🔄 Changing language to:', languageCode);
  i18n.changeLanguage(languageCode);
  localStorage.setItem('preferredLanguage', languageCode);
  console.log('✅ Language changed to:', i18n.language);
};

// Function to get current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

// Function to initialize language from localStorage
export const initializeLanguage = () => {
  const savedLanguage = localStorage.getItem('preferredLanguage');
  console.log('🌍 Initializing language. Saved language:', savedLanguage);
  
  if (savedLanguage && languageOptions.find(lang => lang.code === savedLanguage)) {
    console.log('🔄 Setting language to saved language:', savedLanguage);
    i18n.changeLanguage(savedLanguage);
  } else {
    console.log('🔄 Setting language to default: en');
    i18n.changeLanguage('en');
  }
  console.log('✅ Current language set to:', i18n.language);
}; 