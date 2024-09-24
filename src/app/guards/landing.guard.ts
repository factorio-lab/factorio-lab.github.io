import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { DEFAULT_MOD } from '~/models/constants';
import { PreferencesService } from '~/services/preferences.service';
import { RouterService } from '~/services/router.service';

export const canActivateLanding: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const router = inject(Router);
  const bypassLanding = inject(PreferencesService).bypassLanding();
  if (bypassLanding) {
    const routerState = inject(RouterService).stored();
    // If navigating to root with no query params, use last known state
    if (routerState && Object.keys(route.queryParams).length === 0)
      return router.parseUrl(routerState);

    // Navigate to list, preserving query params from target route
    const id = route.paramMap.get('id') ?? DEFAULT_MOD;
    return router.createUrlTree([id, 'list'], {
      queryParams: route.queryParams,
    });
  }

  return true;
};
