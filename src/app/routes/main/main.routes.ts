import { RouterModule, Routes } from '@angular/router';

import { MainComponent } from './main.component';

export const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [
      {
        path: 'list',
        loadChildren: () =>
          import('./routes/list/list.module').then((c) => c.ListModule),
      },
      {
        path: 'flow',
        loadChildren: () =>
          import('./routes/flow/flow.module').then((m) => m.FlowModule),
      },
      {
        path: 'matrix',
        loadChildren: () =>
          import('./routes/matrix/matrix.module').then((m) => m.MatrixModule),
      },
    ],
  },
];

export const MainRoutingModule = RouterModule.forChild(routes);
