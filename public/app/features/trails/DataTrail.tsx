import { css } from '@emotion/css';
import { useEffect } from 'react';

import { AdHocVariableFilter, GrafanaTheme2, RawTimeRange, urlUtil, VariableHide } from '@grafana/data';
import { PromQuery } from '@grafana/prometheus';
import { locationService, useChromeHeaderHeight } from '@grafana/runtime';
import {
  AdHocFiltersVariable,
  ConstantVariable,
  CustomVariable,
  DataSourceVariable,
  SceneComponentProps,
  SceneControlsSpacer,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneObjectWithUrlSync,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  sceneUtils,
  SceneVariable,
  SceneVariableSet,
  UrlSyncContextProvider,
  UrlSyncManager,
  VariableDependencyConfig,
  VariableValueSelectors,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { getSelectedScopes } from 'app/features/scopes';

import { DataTrailSettings } from './DataTrailSettings';
import { DataTrailHistory } from './DataTrailsHistory';
import { MetricScene } from './MetricScene';
import { MetricSelectScene } from './MetricSelect/MetricSelectScene';
import { MetricsHeader } from './MetricsHeader';
import { getTrailStore } from './TrailStore/TrailStore';
import { MetricDatasourceHelper } from './helpers/MetricDatasourceHelper';
import { reportChangeInLabelFilters } from './interactions';
import { migrateOtelDeploymentEnvironment } from './migrations/otelDeploymentEnvironment';
import { getDeploymentEnvironments, getNonPromotedOtelResources, totalOtelResources } from './otel/api';
import { OtelTargetType } from './otel/types';
import { manageOtelAndMetricFilters, updateOtelData, updateOtelJoinWithGroupLeft } from './otel/util';
import {
  getVariablesWithOtelJoinQueryConstant,
  MetricSelectedEvent,
  trailDS,
  VAR_DATASOURCE,
  VAR_DATASOURCE_EXPR,
  VAR_FILTERS,
  VAR_MISSING_OTEL_TARGETS,
  VAR_OTEL_AND_METRIC_FILTERS,
  VAR_OTEL_DEPLOYMENT_ENV,
  VAR_OTEL_GROUP_LEFT,
  VAR_OTEL_JOIN_QUERY,
  VAR_OTEL_RESOURCES,
} from './shared';
import { getTrailFor, limitAdhocProviders } from './utils';

export interface DataTrailState extends SceneObjectState {
  topScene?: SceneObject;
  embedded?: boolean;
  controls: SceneObject[];
  history: DataTrailHistory;
  settings: DataTrailSettings;
  createdAt: number;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  // this is for otel, if the data source has it, it will be updated here
  hasOtelResources?: boolean;
  useOtelExperience?: boolean;
  otelTargets?: OtelTargetType; // all the targets with job and instance regex, job=~"<job-v>|<job-v>"", instance=~"<instance-v>|<instance-v>"
  otelJoinQuery?: string;
  isStandardOtel?: boolean;
  nonPromotedOtelResources?: string[];
  initialCheckComplete?: boolean; // updated after the first otel check
  fromStart?: boolean;

  // moved into settings
  showPreviews?: boolean;

  // Synced with url
  metric?: string;
  metricSearch?: string;
}

export class DataTrail extends SceneObjectBase<DataTrailState> implements SceneObjectWithUrlSync {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['metric', 'metricSearch', 'showPreviews'] });

  public constructor(state: Partial<DataTrailState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      // the initial variables should include a metric for metric scene and the otelJoinQuery.
      // NOTE: The other OTEL filters should be included too before this work is merged
      $variables:
        state.$variables ?? getVariableSet(state.initialDS, state.metric, state.initialFilters, state.otelJoinQuery),
      controls: state.controls ?? [
        new VariableValueSelectors({ layout: 'vertical' }),
        new SceneControlsSpacer(),
        new SceneTimePicker({}),
        new SceneRefreshPicker({}),
      ],
      history: state.history ?? new DataTrailHistory({}),
      settings: state.settings ?? new DataTrailSettings({}),
      createdAt: state.createdAt ?? new Date().getTime(),
      // default to false but update this to true on updateOtelData()
      // or true if the user either turned on the experience
      useOtelExperience: state.useOtelExperience ?? false,
      // preserve the otel join query
      otelJoinQuery: state.otelJoinQuery ?? '',
      showPreviews: state.showPreviews ?? true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    const urlParams = urlUtil.getUrlSearchParams();
    migrateOtelDeploymentEnvironment(this, urlParams);

    if (!this.state.topScene) {
      this.setState({ topScene: getTopSceneFor(this.state.metric) });
    }

    // Some scene elements publish this
    this.subscribeToEvent(MetricSelectedEvent, this._handleMetricSelectedEvent.bind(this));

    const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, this);
    if (filtersVariable instanceof AdHocFiltersVariable) {
      this._subs.add(
        filtersVariable?.subscribeToState((newState, prevState) => {
          if (!this._addingFilterWithoutReportingInteraction) {
            reportChangeInLabelFilters(newState.filters, prevState.filters);
          }
        })
      );
    }

    const otelAndMetricsFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_AND_METRIC_FILTERS, this);
    const otelFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_RESOURCES, this);
    if (
      otelAndMetricsFiltersVariable instanceof AdHocFiltersVariable &&
      otelFiltersVariable instanceof AdHocFiltersVariable &&
      filtersVariable instanceof AdHocFiltersVariable
    ) {
      this._subs.add(
        otelAndMetricsFiltersVariable?.subscribeToState((newState, prevState) => {
          // identify the added, updated or removed variables and update the correct filter,
          // either the otel resource or the var filter
          // do not update on switching on otel experience or the initial check
          // we know it is the initial check because the label is hidden
          // the initial check may also be the data source resetting
          const isNormalUpdate = newState.hide === prevState.hide;
          if (this.state.useOtelExperience && isNormalUpdate) {
            const nonPromotedOtelResources = this.state.nonPromotedOtelResources ?? [];
            manageOtelAndMetricFilters(
              newState.filters,
              prevState.filters,
              nonPromotedOtelResources,
              otelFiltersVariable,
              filtersVariable
            );
          }
        })
      );
    }

    // Save the current trail as a recent (if the browser closes or reloads) if user selects a metric OR applies filters to metric select view
    const saveRecentTrail = () => {
      const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, this);
      const hasFilters = filtersVariable instanceof AdHocFiltersVariable && filtersVariable.state.filters.length > 0;
      if (this.state.metric || hasFilters) {
        getTrailStore().setRecentTrail(this);
      }
    };
    window.addEventListener('unload', saveRecentTrail);

    return () => {
      if (!this.state.embedded) {
        saveRecentTrail();
      }
      window.removeEventListener('unload', saveRecentTrail);
    };
  }

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_DATASOURCE, VAR_OTEL_RESOURCES, VAR_OTEL_JOIN_QUERY, VAR_OTEL_AND_METRIC_FILTERS],
    onReferencedVariableValueChanged: async (variable: SceneVariable) => {
      const { name } = variable.state;

      if (name === VAR_DATASOURCE) {
        this.datasourceHelper.reset();

        // fresh check for otel experience
        this.checkDataSourceForOTelResources(true);
      }

      // update otel variables when changed
      if (this.state.useOtelExperience && name === VAR_OTEL_RESOURCES) {
        // for state and variables
        const timeRange: RawTimeRange | undefined = this.state.$timeRange?.state;
        const datasourceUid = sceneGraph.interpolate(this, VAR_DATASOURCE_EXPR);
        if (timeRange) {
          updateOtelData(this, datasourceUid, timeRange);
        }
      }
    },
  });

  /**
   * Assuming that the change in filter was already reported with a cause other than `'adhoc_filter'`,
   * this will modify the adhoc filter variable and prevent the automatic reporting which would
   * normally occur through the call to `reportChangeInLabelFilters`.
   */
  public addFilterWithoutReportingInteraction(filter: AdHocVariableFilter) {
    const variable = sceneGraph.lookupVariable('filters', this);
    const otelAndMetricsFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_AND_METRIC_FILTERS, this);
    if (
      !(variable instanceof AdHocFiltersVariable) ||
      !(otelAndMetricsFiltersVariable instanceof AdHocFiltersVariable)
    ) {
      return;
    }

    this._addingFilterWithoutReportingInteraction = true;
    if (this.state.useOtelExperience) {
      otelAndMetricsFiltersVariable.setState({ filters: [...otelAndMetricsFiltersVariable.state.filters, filter] });
    } else {
      variable.setState({ filters: [...variable.state.filters, filter] });
    }
    this._addingFilterWithoutReportingInteraction = false;
  }

  private _addingFilterWithoutReportingInteraction = false;
  private datasourceHelper = new MetricDatasourceHelper(this);

  public getMetricMetadata(metric?: string) {
    return this.datasourceHelper.getMetricMetadata(metric);
  }

  public getCurrentMetricMetadata() {
    return this.getMetricMetadata(this.state.metric);
  }

  public restoreFromHistoryStep(state: DataTrailState) {
    if (!state.topScene && !state.metric) {
      // If the top scene for an  is missing, correct it.
      state.topScene = new MetricSelectScene({});
    }

    this.setState(
      sceneUtils.cloneSceneObjectState(state, {
        history: this.state.history,
        metric: !state.metric ? undefined : state.metric,
        metricSearch: !state.metricSearch ? undefined : state.metricSearch,
      })
    );

    const urlState = new UrlSyncManager().getUrlState(this);
    const fullUrl = urlUtil.renderUrl(locationService.getLocation().pathname, urlState);
    locationService.replace(fullUrl);
  }

  private async _handleMetricSelectedEvent(evt: MetricSelectedEvent) {
    const metric = evt.payload ?? '';

    if (this.state.useOtelExperience) {
      await updateOtelJoinWithGroupLeft(this, metric);
    }

    this.setState(this.getSceneUpdatesForNewMetricValue(metric));

    // Add metric to adhoc filters baseFilter
    const filterVar = sceneGraph.lookupVariable(VAR_FILTERS, this);
    if (filterVar instanceof AdHocFiltersVariable) {
      filterVar.setState({
        baseFilters: getBaseFiltersForMetric(evt.payload),
      });
    }
  }

  private getSceneUpdatesForNewMetricValue(metric: string | undefined) {
    const stateUpdate: Partial<DataTrailState> = {};
    stateUpdate.metric = metric;
    stateUpdate.topScene = getTopSceneFor(metric);
    return stateUpdate;
  }

  getUrlState(): SceneObjectUrlValues {
    const { metric, metricSearch, showPreviews } = this.state;
    return {
      metric,
      metricSearch,
      ...{ showPreviews: showPreviews === false ? 'false' : null },
    };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<DataTrailState> = {};

    if (typeof values.metric === 'string') {
      if (this.state.metric !== values.metric) {
        Object.assign(stateUpdate, this.getSceneUpdatesForNewMetricValue(values.metric));
      }
    } else if (values.metric == null) {
      stateUpdate.metric = undefined;
      stateUpdate.topScene = new MetricSelectScene({});
    }

    if (typeof values.metricSearch === 'string') {
      stateUpdate.metricSearch = values.metricSearch;
    } else if (values.metric == null) {
      stateUpdate.metricSearch = undefined;
    }

    if (typeof values.showPreviews === 'string') {
      stateUpdate.showPreviews = values.showPreviews !== 'false';
    }

    this.setState(stateUpdate);
  }

  /**
   * Check that the data source has otel resources
   * Check that the data source is standard for OTEL
   * Show a warning if not
   * Update the following variables:
   * otelResources (filters), otelJoinQuery (used in the query)
   * Enable the otel experience
   *
   * @returns
   */
  public async checkDataSourceForOTelResources(fromDataSourceChanged?: boolean) {
    // call up in to the parent trail
    const trail = getTrailFor(this);

    // get the time range
    const timeRange: RawTimeRange | undefined = trail.state.$timeRange?.state;

    if (timeRange) {
      const datasourceUid = sceneGraph.interpolate(trail, VAR_DATASOURCE_EXPR);
      const otelTargets = await totalOtelResources(datasourceUid, timeRange);
      const deploymentEnvironments = await getDeploymentEnvironments(datasourceUid, timeRange, getSelectedScopes());
      const hasOtelResources = otelTargets.jobs.length > 0 && otelTargets.instances.length > 0;
      // get the non promoted resources
      // THIS COULD BE THE FULL CHECK
      //   - remove hasOtelResources
      //   - remove deployment environments as a check
      const nonPromotedOtelResources = await getNonPromotedOtelResources(datasourceUid, timeRange);
      // HERE WE START THE OTEL EXPERIENCE ENGINE
      // 1. Set deployment variable values
      // 2. update all other variables and state
      if (hasOtelResources && nonPromotedOtelResources) {
        updateOtelData(
          this,
          datasourceUid,
          timeRange,
          deploymentEnvironments,
          hasOtelResources,
          nonPromotedOtelResources,
          fromDataSourceChanged
        );
      } else {
        // reset filters to apply auto, anywhere there are {} characters
        this.resetOtelExperience(hasOtelResources, deploymentEnvironments);
      }
    }
  }

  resetOtelExperience(hasOtelResources?: boolean, deploymentEnvironments?: string[]) {
    const otelResourcesVariable = sceneGraph.lookupVariable(VAR_OTEL_RESOURCES, this);
    const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, this);
    const otelAndMetricsFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_AND_METRIC_FILTERS, this);
    const otelJoinQueryVariable = sceneGraph.lookupVariable(VAR_OTEL_JOIN_QUERY, this);

    if (
      !(
        otelResourcesVariable instanceof AdHocFiltersVariable &&
        filtersVariable instanceof AdHocFiltersVariable &&
        otelAndMetricsFiltersVariable instanceof AdHocFiltersVariable &&
        otelJoinQueryVariable instanceof ConstantVariable
      )
    ) {
      return;
    }

    // show the var filters normally
    filtersVariable.setState({
      addFilterButtonText: 'Add label',
      label: 'Select label',
      hide: VariableHide.hideLabel,
    });
    // Resetting the otel experience filters means clearing both the otel resources var and the otemmetricsvar
    // hide the super otel and metric filter and reset it
    otelAndMetricsFiltersVariable.setState({
      filters: [],
      hide: VariableHide.hideVariable,
    });

    // if there are no resources reset the otel variables and otel state
    // or if not standard
    otelResourcesVariable.setState({
      filters: [],
      defaultKeys: [],
      hide: VariableHide.hideVariable,
    });

    otelJoinQueryVariable.setState({ value: '' });

    // full reset when a data source fails the check
    if (hasOtelResources && deploymentEnvironments) {
      this.setState({
        hasOtelResources,
        isStandardOtel: deploymentEnvironments.length > 0,
        useOtelExperience: false,
        otelTargets: { jobs: [], instances: [] },
        otelJoinQuery: '',
      });
    } else {
      // partial reset when a user turns off the otel experience
      this.setState({
        otelTargets: { jobs: [], instances: [] },
        otelJoinQuery: '',
        useOtelExperience: false,
      });
    }
  }

  public getQueries(): PromQuery[] {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const sqrs = sceneGraph.findAllObjects(this, (b) => b instanceof SceneQueryRunner) as SceneQueryRunner[];

    return sqrs.reduce<PromQuery[]>((acc, sqr) => {
      acc.push(
        ...sqr.state.queries.map((q) => ({
          ...q,
          expr: sceneGraph.interpolate(sqr, q.expr),
        }))
      );

      return acc;
    }, []);
  }

  static Component = ({ model }: SceneComponentProps<DataTrail>) => {
    const { controls, topScene, history, settings, useOtelExperience, hasOtelResources } = model.useState();

    const chromeHeaderHeight = useChromeHeaderHeight();
    const styles = useStyles2(getStyles, chromeHeaderHeight ?? 0);
    const showHeaderForFirstTimeUsers = getTrailStore().recent.length < 2;

    useEffect(() => {
      // do not check otel until the data source is loaded
      if (model.datasourceHelper._metricsMetadata === undefined) {
        return;
      }
      // check if the otel experience has been enabled
      if (!useOtelExperience) {
        // if the experience has been turned off, reset the otel variables
        const otelResourcesVariable = sceneGraph.lookupVariable(VAR_OTEL_RESOURCES, model);
        const otelAndMetricsFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_AND_METRIC_FILTERS, model);
        const otelJoinQueryVariable = sceneGraph.lookupVariable(VAR_OTEL_JOIN_QUERY, model);
        const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, model);

        if (
          otelResourcesVariable instanceof AdHocFiltersVariable &&
          otelAndMetricsFiltersVariable instanceof AdHocFiltersVariable &&
          otelJoinQueryVariable instanceof ConstantVariable &&
          filtersVariable instanceof AdHocFiltersVariable
        ) {
          model.resetOtelExperience();
        }
      } else {
        // if experience is enabled, check standardization and update the otel variables
        model.checkDataSourceForOTelResources();
      }
    }, [model, hasOtelResources, useOtelExperience]);

    useEffect(() => {
      const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, model);
      const otelAndMetricsFiltersVariable = sceneGraph.lookupVariable(VAR_OTEL_AND_METRIC_FILTERS, model);
      const limitedFilterVariable = useOtelExperience ? otelAndMetricsFiltersVariable : filtersVariable;
      const datasourceHelper = model.datasourceHelper;
      limitAdhocProviders(model, limitedFilterVariable, datasourceHelper);
    }, [model, useOtelExperience]);

    return (
      <div className={styles.container}>
        {showHeaderForFirstTimeUsers && <MetricsHeader />}
        <history.Component model={history} />
        {controls && (
          <div className={styles.controls}>
            {controls.map((control) => (
              <control.Component key={control.state.key} model={control} />
            ))}
            <settings.Component model={settings} />
          </div>
        )}
        {topScene && (
          <UrlSyncContextProvider scene={topScene}>
            <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
          </UrlSyncContextProvider>
        )}
      </div>
    );
  };
}

export function getTopSceneFor(metric?: string) {
  if (metric) {
    return new MetricScene({ metric: metric });
  } else {
    return new MetricSelectScene({});
  }
}

function getVariableSet(
  initialDS?: string,
  metric?: string,
  initialFilters?: AdHocVariableFilter[],
  otelJoinQuery?: string
) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        description: 'Only prometheus data sources are supported',
        value: initialDS,
        pluginId: 'prometheus',
      }),
      new AdHocFiltersVariable({
        name: VAR_OTEL_RESOURCES,
        label: 'Select resource attributes',
        addFilterButtonText: 'Select resource attributes',
        datasource: trailDS,
        hide: VariableHide.hideVariable,
        layout: 'vertical',
        defaultKeys: [],
        applyMode: 'manual',
      }),
      new AdHocFiltersVariable({
        name: VAR_FILTERS,
        addFilterButtonText: 'Add label',
        datasource: trailDS,
        // hide the variable on start because the otel check can make it look flickering,
        // switching from "labels" to "attributes"
        // show it only after passing or failing the otel check
        hide: VariableHide.hideVariable,
        layout: 'vertical',
        filters: initialFilters ?? [],
        baseFilters: getBaseFiltersForMetric(metric),
        applyMode: 'manual',
        // since we only support prometheus datasources, this is always true
        supportsMultiValueOperators: true,
      }),
      ...getVariablesWithOtelJoinQueryConstant(otelJoinQuery ?? ''),
      new ConstantVariable({
        name: VAR_OTEL_GROUP_LEFT,
        value: undefined,
        hide: VariableHide.hideVariable,
      }),
      new ConstantVariable({
        name: VAR_MISSING_OTEL_TARGETS,
        hide: VariableHide.hideVariable,
        value: false,
      }),
      new AdHocFiltersVariable({
        name: VAR_OTEL_AND_METRIC_FILTERS,
        addFilterButtonText: 'Add attribute',
        datasource: trailDS,
        hide: VariableHide.hideVariable,
        layout: 'vertical',
        filters: initialFilters ?? [],
        baseFilters: getBaseFiltersForMetric(metric),
        applyMode: 'manual',
        // since we only support prometheus datasources, this is always true
        supportsMultiValueOperators: true,
      }),
      // Legacy variable needed for bookmarking which is necessary because
      // url sync method does not handle multiple dep env values
      // Remove this when the rudderstack event "deployment_environment_migrated" tapers off
      new CustomVariable({
        name: VAR_OTEL_DEPLOYMENT_ENV,
        label: 'Deployment environment',
        hide: VariableHide.hideVariable,
        value: undefined,
        placeholder: 'Select',
        isMulti: true,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2, chromeHeaderHeight: number) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(1),
      flexDirection: 'column',
      background: theme.isLight ? theme.colors.background.primary : theme.colors.background.canvas,
      padding: theme.spacing(2, 3, 2, 3),
    }),
    body: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(1),
      padding: theme.spacing(1, 0),
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      position: 'sticky',
      background: theme.isDark ? theme.colors.background.canvas : theme.colors.background.primary,
      zIndex: theme.zIndex.navbarFixed,
      top: chromeHeaderHeight,
    }),
  };
}

function getBaseFiltersForMetric(metric?: string): AdHocVariableFilter[] {
  if (metric) {
    return [{ key: '__name__', operator: '=', value: metric }];
  }
  return [];
}
