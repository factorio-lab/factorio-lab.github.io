import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first, map } from 'rxjs';

import { LabState, Preferences, Settings } from '~/store';
import { BrowserUtility } from '~/utilities';

export const canActivateLanding: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const router = inject(Router);
  return inject(Store<LabState>)
    .select(Preferences.selectBypassLanding)
    .pipe(
      first(),
      map((bypassLanding) => {
        if (bypassLanding) {
          if (
            BrowserUtility.routerState &&
            Object.keys(route.queryParams).length === 0
          ) {
            // Navigating to root with no query params, use last known state
            return router.parseUrl(BrowserUtility.routerState);
          }

          // Navigate to list, preserving query params from target route
          const id = route.paramMap.get('id') ?? Settings.initialState.modId;
          return router.createUrlTree([id, 'list'], {
            queryParams: route.queryParams,
          });
        }

        return true;
      }),
    );
};
