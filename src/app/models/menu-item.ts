export interface MenuItem {
  label?: string;
  icon?: string;
  command?(): void;
  id?: string;
  routerLink?: string;
  queryParamsHandling?: string;
}
