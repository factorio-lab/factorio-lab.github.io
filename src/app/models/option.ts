export interface Option<T = string> {
  label: string;
  value: T;
  category?: string;
  disabled?: boolean;
}
