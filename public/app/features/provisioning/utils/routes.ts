import { config } from '@grafana/runtime';
import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import { RouteDescriptor } from 'app/core/navigation/types';
import { DashboardRoutes } from 'app/types';

import { PROVISIONING_URL } from '../constants';

export function getProvisioningRoutes(): RouteDescriptor[] {
  if (!config.featureToggles.provisioning) {
    return [];
  }

  return [
    {
      path: PROVISIONING_URL,
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "RepositoryListPage"*/ 'app/features/provisioning/RepositoryListPage')
      ),
    },
    {
      path: PROVISIONING_URL + '/new',
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "NewRepositoryPage"*/ 'app/features/provisioning/NewRepositoryPage')
      ),
    },
    {
      path: PROVISIONING_URL + '/:name',
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "RepositoryStatusPage"*/ 'app/features/provisioning/RepositoryStatusPage')
      ),
    },
    {
      path: PROVISIONING_URL + '/:name/edit',
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "EditRepositoryPage"*/ 'app/features/provisioning/EditRepositoryPage')
      ),
    },
    {
      path: PROVISIONING_URL + '/:slug/dashboard/preview/*',
      pageClass: 'page-dashboard',
      routeName: DashboardRoutes.Provisioning,
      component: SafeDynamicImport(
        () =>
          import(/* webpackChunkName: "DashboardScenePage" */ 'app/features/dashboard-scene/pages/DashboardScenePage')
      ),
    },
  ];
}
