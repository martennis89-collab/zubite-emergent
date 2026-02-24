import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, getTranslation } from '@/lib/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine language from URL
  const langFromUrl = useMemo(() => {
    return location.pathname.startsWith('/en') ? 'en' : 'bg';
  }, [location.pathname]);
  
  const [language, setLanguageState] = useState(langFromUrl);
  
  // Sync language state with URL
  useEffect(() => {
    setLanguageState(langFromUrl);
  }, [langFromUrl]);
  
  // Get localized path (add or remove /en prefix)
  const getLocalizedPath = (path, targetLang = language) => {
    // Remove existing /en prefix if present
    const cleanPath = path.replace(/^\/en/, '') || '/';
    
    if (targetLang === 'en') {
      return `/en${cleanPath === '/' ? '' : cleanPath}`;
    }
    return cleanPath;
  };
  
  // Switch language and navigate
  const setLanguage = (newLang) => {
    if (newLang === language) return;
    
    const currentPath = location.pathname;
    let newPath;
    
    if (newLang === 'en') {
      // Add /en prefix
      newPath = `/en${currentPath === '/' ? '' : currentPath}`;
    } else {
      // Remove /en prefix
      newPath = currentPath.replace(/^\/en/, '') || '/';
    }
    
    setLanguageState(newLang);
    navigate(newPath);
  };
  
  // Translation helper
  const t = (path) => getTranslation(language, path);
  
  // Get city name in current language
  const getCityName = (citySlug) => {
    return t(`cities.${citySlug}`) || citySlug;
  };
  
  // Get treatment info in current language
  const getTreatment = (treatmentType) => {
    const key = treatmentType === 'full_mouth' ? 'full-mouth' : treatmentType;
    return {
      name: t(`treatments.${key}.name`),
      description: t(`treatments.${key}.description`)
    };
  };
  
  const value = {
    language,
    setLanguage,
    t,
    getLocalizedPath,
    getCityName,
    getTreatment,
    translations: translations[language]
  };
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
