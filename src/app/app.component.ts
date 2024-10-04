import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { first } from 'rxjs';

import { versionStr } from './helpers';
import { AnalyticsService } from './services/analytics.service';
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'lab-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  analyticsSvc = inject(AnalyticsService);
  dataSvc = inject(DataService);
  themeSvc = inject(ThemeService);

  constructor() {
    this.dataSvc.config$.pipe(first()).subscribe((c) => {
      console.log(versionStr(c.version));
      if (c.version) this.analyticsSvc.event('version', c.version);
    });
  }
}
