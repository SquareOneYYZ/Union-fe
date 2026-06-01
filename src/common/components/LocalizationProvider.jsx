/* eslint-disable import/no-relative-packages */
import React, {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import dayjs from 'dayjs';
import usePersistedState from '../util/usePersistedState';

import 'dayjs/locale/af';
import 'dayjs/locale/ar';
import 'dayjs/locale/az';
import 'dayjs/locale/bg';
import 'dayjs/locale/bn';
import 'dayjs/locale/ca';
import 'dayjs/locale/cs';
import 'dayjs/locale/da';
import 'dayjs/locale/de';
import 'dayjs/locale/el';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fa';
import 'dayjs/locale/fi';
import 'dayjs/locale/fr';
import 'dayjs/locale/gl';
import 'dayjs/locale/he';
import 'dayjs/locale/hi';
import 'dayjs/locale/hr';
import 'dayjs/locale/hu';
import 'dayjs/locale/id';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ka';
import 'dayjs/locale/kk';
import 'dayjs/locale/km';
import 'dayjs/locale/ko';
import 'dayjs/locale/lo';
import 'dayjs/locale/lt';
import 'dayjs/locale/lv';
import 'dayjs/locale/mk';
import 'dayjs/locale/ml';
import 'dayjs/locale/mn';
import 'dayjs/locale/ms';
import 'dayjs/locale/nb';
import 'dayjs/locale/ne';
import 'dayjs/locale/nl';
import 'dayjs/locale/nn';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ro';
import 'dayjs/locale/ru';
import 'dayjs/locale/si';
import 'dayjs/locale/sk';
import 'dayjs/locale/sl';
import 'dayjs/locale/sq';
import 'dayjs/locale/sr';
import 'dayjs/locale/sv';
import 'dayjs/locale/ta';
import 'dayjs/locale/th';
import 'dayjs/locale/tr';
import 'dayjs/locale/uk';
import 'dayjs/locale/uz';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh';
import 'dayjs/locale/zh-tw';

const languages = {
  af: { loader: () => import('../../resources/l10n/af.json'), country: 'ZA', name: 'Afrikaans' },
  ar: { loader: () => import('../../resources/l10n/ar.json'), country: 'AE', name: 'العربية' },
  az: { loader: () => import('../../resources/l10n/az.json'), country: 'AZ', name: 'Azərbaycanca' },
  bg: { loader: () => import('../../resources/l10n/bg.json'), country: 'BG', name: 'Български' },
  bn: { loader: () => import('../../resources/l10n/bn.json'), country: 'IN', name: 'বাংলা' },
  ca: { loader: () => import('../../resources/l10n/ca.json'), country: 'ES', name: 'Català' },
  cs: { loader: () => import('../../resources/l10n/cs.json'), country: 'CZ', name: 'Čeština' },
  de: { loader: () => import('../../resources/l10n/de.json'), country: 'DE', name: 'Deutsch' },
  da: { loader: () => import('../../resources/l10n/da.json'), country: 'DK', name: 'Dansk' },
  el: { loader: () => import('../../resources/l10n/el.json'), country: 'GR', name: 'Ελληνικά' },
  en: { loader: () => import('../../resources/l10n/en.json'), country: 'US', name: 'English' },
  es: { loader: () => import('../../resources/l10n/es.json'), country: 'ES', name: 'Español' },
  fa: { loader: () => import('../../resources/l10n/fa.json'), country: 'IR', name: 'فارسی' },
  fi: { loader: () => import('../../resources/l10n/fi.json'), country: 'FI', name: 'Suomi' },
  fr: { loader: () => import('../../resources/l10n/fr.json'), country: 'FR', name: 'Français' },
  gl: { loader: () => import('../../resources/l10n/gl.json'), country: 'ES', name: 'Galego' },
  he: { loader: () => import('../../resources/l10n/he.json'), country: 'IL', name: 'עברית' },
  hi: { loader: () => import('../../resources/l10n/hi.json'), country: 'IN', name: 'हिन्दी' },
  hr: { loader: () => import('../../resources/l10n/hr.json'), country: 'HR', name: 'Hrvatski' },
  hu: { loader: () => import('../../resources/l10n/hu.json'), country: 'HU', name: 'Magyar' },
  id: { loader: () => import('../../resources/l10n/id.json'), country: 'ID', name: 'Bahasa Indonesia' },
  it: { loader: () => import('../../resources/l10n/it.json'), country: 'IT', name: 'Italiano' },
  ja: { loader: () => import('../../resources/l10n/ja.json'), country: 'JP', name: '日本語' },
  ka: { loader: () => import('../../resources/l10n/ka.json'), country: 'GE', name: 'ქართული' },
  kk: { loader: () => import('../../resources/l10n/kk.json'), country: 'KZ', name: 'Қазақша' },
  ko: { loader: () => import('../../resources/l10n/ko.json'), country: 'KR', name: '한국어' },
  km: { loader: () => import('../../resources/l10n/km.json'), country: 'KH', name: 'ភាសាខ្មែរ' },
  lo: { loader: () => import('../../resources/l10n/lo.json'), country: 'LA', name: 'ລາວ' },
  lt: { loader: () => import('../../resources/l10n/lt.json'), country: 'LT', name: 'Lietuvių' },
  lv: { loader: () => import('../../resources/l10n/lv.json'), country: 'LV', name: 'Latviešu' },
  mk: { loader: () => import('../../resources/l10n/mk.json'), country: 'MK', name: 'Mакедонски' },
  ml: { loader: () => import('../../resources/l10n/ml.json'), country: 'IN', name: 'മലയാളം' },
  mn: { loader: () => import('../../resources/l10n/mn.json'), country: 'MN', name: 'Монгол хэл' },
  ms: { loader: () => import('../../resources/l10n/ms.json'), country: 'MY', name: 'بهاس ملايو' },
  nb: { loader: () => import('../../resources/l10n/nb.json'), country: 'NO', name: 'Norsk bokmål' },
  ne: { loader: () => import('../../resources/l10n/ne.json'), country: 'NP', name: 'नेपाली' },
  nl: { loader: () => import('../../resources/l10n/nl.json'), country: 'NL', name: 'Nederlands' },
  nn: { loader: () => import('../../resources/l10n/nn.json'), country: 'NO', name: 'Norsk nynorsk' },
  pl: { loader: () => import('../../resources/l10n/pl.json'), country: 'PL', name: 'Polski' },
  pt: { loader: () => import('../../resources/l10n/pt.json'), country: 'PT', name: 'Português' },
  ptBR: { loader: () => import('../../resources/l10n/pt_BR.json'), country: 'BR', name: 'Português (Brasil)' },
  ro: { loader: () => import('../../resources/l10n/ro.json'), country: 'RO', name: 'Română' },
  ru: { loader: () => import('../../resources/l10n/ru.json'), country: 'RU', name: 'Русский' },
  si: { loader: () => import('../../resources/l10n/si.json'), country: 'LK', name: 'සිංහල' },
  sk: { loader: () => import('../../resources/l10n/sk.json'), country: 'SK', name: 'Slovenčina' },
  sl: { loader: () => import('../../resources/l10n/sl.json'), country: 'SI', name: 'Slovenščina' },
  sq: { loader: () => import('../../resources/l10n/sq.json'), country: 'AL', name: 'Shqipëria' },
  sr: { loader: () => import('../../resources/l10n/sr.json'), country: 'RS', name: 'Srpski' },
  sv: { loader: () => import('../../resources/l10n/sv.json'), country: 'SE', name: 'Svenska' },
  ta: { loader: () => import('../../resources/l10n/ta.json'), country: 'IN', name: 'தமிழ்' },
  th: { loader: () => import('../../resources/l10n/th.json'), country: 'TH', name: 'ไทย' },
  tr: { loader: () => import('../../resources/l10n/tr.json'), country: 'TR', name: 'Türkçe' },
  uk: { loader: () => import('../../resources/l10n/uk.json'), country: 'UA', name: 'Українська' },
  uz: { loader: () => import('../../resources/l10n/uz.json'), country: 'UZ', name: 'Oʻzbekcha' },
  vi: { loader: () => import('../../resources/l10n/vi.json'), country: 'VN', name: 'Tiếng Việt' },
  zh: { loader: () => import('../../resources/l10n/zh.json'), country: 'CN', name: '中文' },
  zhTW: { loader: () => import('../../resources/l10n/zh_TW.json'), country: 'TW', name: '中文 (Taiwan)' },
};

const getDefaultLanguage = () => {
  const browserLanguages = window.navigator.languages ? window.navigator.languages.slice() : [];
  const browserLanguage = window.navigator.userLanguage || window.navigator.language;
  browserLanguages.push(browserLanguage);
  browserLanguages.push(browserLanguage.substring(0, 2));

  for (let i = 0; i < browserLanguages.length; i += 1) {
    let language = browserLanguages[i].replace('-', '');
    if (language in languages) {
      return language;
    }
    if (language.length > 2) {
      language = language.substring(0, 2);
      if (language in languages) {
        return language;
      }
    }
  }
  return 'en';
};

const LocalizationContext = createContext({
  languages,
  language: 'en',
  setLanguage: () => { },
  data: {},
});

export const LocalizationProvider = ({ children }) => {
  const [language, setLanguage] = usePersistedState('language', getDefaultLanguage());
  const [data, setData] = useState({});
  const direction = /^(ar|he|fa)$/.test(language) ? 'rtl' : 'ltr';

  const value = useMemo(
    () => ({ languages, language, setLanguage, direction, data }),
    [language, setLanguage, direction, data],
  );

  useEffect(() => {
    let cancelled = false;
    languages[language].loader().then((mod) => {
      if (!cancelled) setData(mod.default ?? mod);
    });
    return () => { cancelled = true; };
  }, [language]);

  useEffect(() => {
    let selected;
    if (language.length > 2) {
      selected = `${language.slice(0, 2)}-${language.slice(-2).toLowerCase()}`;
    } else {
      selected = language;
    }
    dayjs.locale(selected);
    document.dir = direction;
  }, [language, direction]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => useContext(LocalizationContext);

export const useTranslation = () => {
  const { data } = useContext(LocalizationContext);
  return useMemo(() => (key) => data[key], [data]);
};

export const useTranslationKeys = (predicate) => {
  const { data } = useContext(LocalizationContext);
  return Object.keys(data).filter(predicate);
};
