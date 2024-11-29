import { config, scopesService } from '@grafana/runtime';
import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';

import { enterEditMode, openSelector, toggleDashboards } from './utils/actions';
import { expectDashboardsClosed, expectDashboardsDisabled, expectScopesSelectorClosed } from './utils/assertions';
import { getDatasource, getInstanceSettings, getMock } from './utils/mocks';
import { renderDashboard, resetScenes } from './utils/render';

jest.mock('@grafana/runtime', () => ({
  __esModule: true,
  ...jest.requireActual('@grafana/runtime'),
  useChromeHeaderHeight: jest.fn(),
  getBackendSrv: () => ({ get: getMock }),
  getDataSourceSrv: () => ({ get: getDatasource, getInstanceSettings }),
  usePluginLinks: jest.fn().mockReturnValue({ links: [] }),
}));

describe('View mode', () => {
  let dashboardScene: DashboardScene;

  beforeAll(() => {
    config.featureToggles.scopeFilters = true;
    config.featureToggles.groupByVariable = true;
  });

  beforeEach(() => {
    dashboardScene = renderDashboard();
  });

  afterEach(async () => {
    await resetScenes();
  });

  it('Enters view mode', async () => {
    await enterEditMode(dashboardScene);
    expect(scopesService.state.isReadOnly).toEqual(true);
    expect(scopesService.state.isDrawerOpened).toEqual(false);
  });

  it('Closes selector on enter', async () => {
    await openSelector();
    await enterEditMode(dashboardScene);
    expectScopesSelectorClosed();
  });

  it('Closes dashboards list on enter', async () => {
    await toggleDashboards();
    await enterEditMode(dashboardScene);
    expectDashboardsClosed();
  });

  it('Does not open selector when view mode is active', async () => {
    await enterEditMode(dashboardScene);
    await openSelector();
    expectScopesSelectorClosed();
  });

  it('Disables the expand button when view mode is active', async () => {
    await enterEditMode(dashboardScene);
    expectDashboardsDisabled();
  });
});
