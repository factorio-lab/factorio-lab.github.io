import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map } from 'rxjs';

import { versionStr } from '~/helpers';

import { DataService } from './data.service';

const BREAKPOINT_SMALL = 576;

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  dataSvc = inject(DataService);

  // Responsive
  windowScrollY = (): number => window.scrollY;
  windowInnerWidth = (): number => window.innerWidth;
  scrollTop = toSignal(
    fromEvent(window, 'scroll').pipe(map(this.windowScrollY)),
    { initialValue: window.scrollY },
  );
  width = toSignal(
    fromEvent(window, 'resize').pipe(map(this.windowInnerWidth)),
    { initialValue: window.innerWidth },
  );

  isMobile = computed(() => this.width() < BREAKPOINT_SMALL);

  toast(toast: unknown): void {
    // TODO: Add toast support
    console.log('toast', toast);
  }

  confirm(confirmation: unknown): void {
    // TODO: Add confirmation support
    console.log('confirm', confirmation);
  }

  // Header
  settingsActive = signal(false);
  settingsXlHidden = signal(false);

  toggleSettings(): void {
    this.settingsActive.set(!this.settingsActive());
  }

  toggleSettingsXl(): void {
    this.settingsXlHidden.set(!this.settingsXlHidden());
  }

  version$ = this.dataSvc.config$.pipe(map((c) => versionStr(c.version)));
}
