export interface Message {
  severity: 'info' | 'error';
  summary?: string;
  detail: string;
}
