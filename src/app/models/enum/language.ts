import { SelectItem } from 'primeng/api';

export enum Language {
  English = 'en',
  French = 'fr',
  Chinese = 'zh',
}

export const languageOptions: SelectItem<Language>[] = [
  { label: 'English', value: Language.English },
  { label: 'Français', value: Language.French },
  { label: '简体中文', value: Language.Chinese },
];
