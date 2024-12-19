import { Store } from '@reduxjs/toolkit';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, MemoryHistoryBuildOptions } from 'history';
import { Fragment, PropsWithChildren } from 'react';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { getGrafanaContextMock } from 'test/mocks/getGrafanaContextMock';

import { PluginExtensionAddedLinkConfig } from '@grafana/data';
import {
  HistoryWrapper,
  LocationServiceProvider,
  setAppEvents,
  setLocationService,
  setPluginComponentHook,
  setPluginComponentsHook,
  setPluginExtensionGetter,
  setPluginExtensionsHook,
  setPluginLinksHook,
  setReturnToPreviousHook,
} from '@grafana/runtime';
import appEvents from 'app/core/app_events';
import { GrafanaContext, GrafanaContextType, useReturnToPreviousInternal } from 'app/core/context/GrafanaContext';
import { ModalsContextProvider } from 'app/core/context/ModalsContextProvider';
import { ExtensionRegistriesProvider } from 'app/features/plugins/extensions/ExtensionRegistriesContext';
import { createPluginExtensionsGetter } from 'app/features/plugins/extensions/getPluginExtensions';
import { AddedComponentsRegistry } from 'app/features/plugins/extensions/registry/AddedComponentsRegistry';
import { AddedLinksRegistry } from 'app/features/plugins/extensions/registry/AddedLinksRegistry';
import { ExposedComponentsRegistry } from 'app/features/plugins/extensions/registry/ExposedComponentsRegistry';
import { PluginExtensionConfigs } from 'app/features/plugins/extensions/registry/Registry';
import { usePluginComponent } from 'app/features/plugins/extensions/usePluginComponent';
import { usePluginComponents } from 'app/features/plugins/extensions/usePluginComponents';
import { createUsePluginExtensions } from 'app/features/plugins/extensions/usePluginExtensions';
import { usePluginLinks } from 'app/features/plugins/extensions/usePluginLinks';
import { configureStore } from 'app/store/configureStore';
import { StoreState } from 'app/types/store';

const getFreshPluginExtensionRegistries = () => {
  return {
    addedComponentsRegistry: new AddedComponentsRegistry(),
    exposedComponentsRegistry: new ExposedComponentsRegistry(),
    addedLinksRegistry: new AddedLinksRegistry(),
  };
};

interface ExtendedRenderOptions extends RenderOptions {
  /**
   * Optional store to use for rendering. If not provided, a fresh store will be generated
   * via `configureStore` method
   */
  store?: Store<StoreState>;
  /**
   * Partial state to use for preloading store when rendering tests
   */
  preloadedState?: Partial<StoreState>;
  /**
   * Should the wrapper be generated with a wrapping Router component?
   * Useful if you're testing something that needs more nuanced routing behaviour
   * and you want full control over it instead
   */
  renderWithRouter?: boolean;
  /**
   * Props to pass to `createMemoryHistory`, if being used
   */
  historyOptions?: MemoryHistoryBuildOptions;
  /**
   * Method to return any preset plugin links that you would like to be available for the component being rendered
   */
  pluginLinks?: Array<PluginExtensionConfigs<PluginExtensionAddedLinkConfig>>;
}

/** Perform the same setup that we expect `app.ts` to have done when our components are rendering "for real" */
const performAppSetup = (options: ExtendedRenderOptions) => {
  const { historyOptions, pluginLinks } = options;
  const store = options.store || configureStore();
  // Create a fresh location service for each test - otherwise we run the risk
  // of it being stateful in between runs
  const history = createMemoryHistory(historyOptions);
  const locationService = new HistoryWrapper(history);
  setLocationService(locationService);
  setAppEvents(appEvents);

  const pluginExtensionRegistries = getFreshPluginExtensionRegistries();
  (pluginLinks || []).forEach((pluginLink) => {
    pluginExtensionRegistries.addedLinksRegistry.register(pluginLink);
  });

  setPluginExtensionGetter(createPluginExtensionsGetter(pluginExtensionRegistries));
  setPluginExtensionsHook(createUsePluginExtensions(pluginExtensionRegistries));
  setPluginLinksHook(usePluginLinks);
  setPluginComponentHook(usePluginComponent);
  setPluginComponentsHook(usePluginComponents);

  setReturnToPreviousHook(useReturnToPreviousInternal);

  return {
    locationService,
    history,
    store,
    pluginExtensionRegistries,
  };
};

/**
 * Get a wrapper component that implements all of the providers that components
 * within the app will need
 */
const getWrapper = (
  options: ExtendedRenderOptions & {
    grafanaContext?: Partial<GrafanaContextType>;
  }
) => {
  const { renderWithRouter, grafanaContext } = options;
  const { locationService, history, store: reduxStore, pluginExtensionRegistries } = performAppSetup(options);

  /**
   * Conditional router - either a MemoryRouter or just a Fragment
   */
  const PotentialRouter = renderWithRouter
    ? ({ children }: PropsWithChildren) => <Router history={history}>{children}</Router>
    : ({ children }: PropsWithChildren) => <Fragment>{children}</Fragment>;

  const PotentialCompatRouter = renderWithRouter ? CompatRouter : Fragment;

  const context = {
    ...getGrafanaContextMock(),
    ...grafanaContext,
  };

  /**
   * Returns a wrapper that should (eventually?) match the main `AppWrapper`, so any tests are rendering
   * in mostly the same providers as a "real" hierarchy
   */
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={reduxStore}>
        <GrafanaContext.Provider value={context}>
          <ExtensionRegistriesProvider registries={pluginExtensionRegistries}>
            <PotentialRouter>
              <LocationServiceProvider service={locationService}>
                <PotentialCompatRouter>
                  <ModalsContextProvider>{children}</ModalsContextProvider>
                </PotentialCompatRouter>
              </LocationServiceProvider>
            </PotentialRouter>
          </ExtensionRegistriesProvider>
        </GrafanaContext.Provider>
      </Provider>
    );
  };
};

/**
 * Extended [@testing-library/react render](https://testing-library.com/docs/react-testing-library/api/#render)
 * method which wraps the passed element in all of the necessary Providers,
 * so it can render correctly in the context of the application
 */
const customRender = (
  ui: React.ReactElement,
  { renderWithRouter = true, ...renderOptions }: ExtendedRenderOptions = {}
) => {
  const user = userEvent.setup();
  const store = renderOptions.preloadedState ? configureStore(renderOptions?.preloadedState) : undefined;
  const AllTheProviders = renderOptions.wrapper || getWrapper({ store, renderWithRouter, ...renderOptions });

  return {
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
    /** Instance of `userEvent.setup()` ready for use to interact with rendered component */
    user,
    store,
  };
};

export * from '@testing-library/react';
export { customRender as render, getWrapper, userEvent };
