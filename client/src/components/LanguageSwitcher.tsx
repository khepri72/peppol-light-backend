import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' }
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2" data-testid="language-switcher">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          variant={i18n.language === lang.code ? 'default' : 'outline'}
          size="sm"
          className="min-w-[70px]"
          data-testid={`button-lang-${lang.code}`}
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
}
