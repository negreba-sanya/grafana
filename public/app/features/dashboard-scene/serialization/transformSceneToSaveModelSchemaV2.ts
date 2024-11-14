import { behaviors, SceneDataQuery, SceneDataTransformer, SceneVariableSet, VizPanel } from '@grafana/scenes';
import { GridLayoutItemKind, QueryOptionsSpec } from '@grafana/schema/dist/esm/schema/dashboard/v2alpha0/dashboard.gen';

import {
  DashboardV2,
  defaultDashboardSpec,
  defaultFieldConfigSource,
  PanelKind,
  PanelQueryKind,
  TransformationKind,
  FieldConfigSource,
  DashboardLink,
  DashboardCursorSync,
  DataTransformerConfig,
  PanelQuerySpec,
  DataQueryKind,
  defaultDataSourceRef,
  QueryVariableKind,
  TextVariableKind,
  IntervalVariableKind,
  DatasourceVariableKind,
  CustomVariableKind,
  ConstantVariableKind,
  GroupByVariableKind,
  AdhocVariableKind,
} from '../../../../../packages/grafana-schema/src/schema/dashboard/v2alpha0/dashboard.gen';
import { DashboardScene, DashboardSceneState } from '../scene/DashboardScene';
import { PanelTimeRange } from '../scene/PanelTimeRange';
import { DashboardGridItem } from '../scene/layout-default/DashboardGridItem';
import { DefaultGridLayoutManager } from '../scene/layout-default/DefaultGridLayoutManager';
import { dashboardSceneGraph } from '../utils/dashboardSceneGraph';
import { getQueryRunnerFor } from '../utils/utils';

import { sceneVariablesSetToSchemaV2Variables } from './sceneVariablesSetToVariables';

// FIXME: This is temporary to avoid creating partial types for all the new schema, it has some performance implications, but it's fine for now
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function transformSceneToSaveModelSchemaV2(scene: DashboardScene, isSnapshot = false): Partial<DashboardV2> {
  const oldDash = scene.state;
  const timeRange = oldDash.$timeRange!.state;

  const controlsState = oldDash.controls?.state;
  const refreshPicker = controlsState?.refreshPicker;

  const dashboardSchemaV2: DeepPartial<DashboardV2> = {
    kind: 'Dashboard',
    spec: {
      //dashboard settings
      title: oldDash.title,
      description: oldDash.description ?? '',
      cursorSync: getCursorSync(oldDash),
      liveNow: getLiveNow(oldDash),
      preload: oldDash.preload,
      editable: oldDash.editable,
      links: oldDash.links,
      tags: oldDash.tags,
      // EOF dashboard settings

      // time settings
      timeSettings: {
        timezone: timeRange.timeZone,
        from: timeRange.from,
        to: timeRange.to,
        autoRefresh: refreshPicker?.state.refresh,
        autoRefreshIntervals: refreshPicker?.state.intervals,
        quickRanges: [], //FIXME is coming timepicker.time_options,
        hideTimepicker: controlsState?.hideTimeControls ?? false,
        weekStart: timeRange.weekStart,
        fiscalYearStartMonth: timeRange.fiscalYearStartMonth,
        nowDelay: timeRange.UNSAFE_nowDelay,
      },
      // EOF time settings

      // variables
      variables: getVariables(oldDash),
      // EOF variables

      // elements
      elements: getElements(oldDash),
      // EOF elements

      // annotations
      annotations: [], //FIXME
      // EOF annotations

      // layout
      layout: {
        kind: 'GridLayout',
        spec: {
          items: getGridLayoutItems(oldDash),
        },
      },
      // EOF layout
    },
  };

  if (isDashboardSchemaV2(dashboardSchemaV2)) {
    return dashboardSchemaV2;
  }
  console.error('Error transforming dashboard to schema v2');
  throw new Error('Error transforming dashboard to schema v2');
}

function getCursorSync(state: DashboardSceneState) {
  // Find the first `CursorSync` behavior in the `$behaviors` array
  const cursorSyncBehavior = state.$behaviors?.find(
    (behavior): behavior is behaviors.CursorSync => behavior instanceof behaviors.CursorSync
  );
  // If found, get its `sync` property; otherwise, it will be `undefined`
  const cursorSync = cursorSyncBehavior?.state.sync;

  // transform numeric value to CursorSync enum
  let cursorSyncEnum: DashboardCursorSync;
  if (cursorSync !== undefined) {
    //map numeric value to CursorSync enum
    // 0 => Off = "Off",
    // 1=> Crosshair = "Crosshair",
    // 2 => Tooltip = "Tooltip",
    switch (cursorSync) {
      case 0:
        cursorSyncEnum = DashboardCursorSync.Off;
        break;
      case 1:
        cursorSyncEnum = DashboardCursorSync.Crosshair;
        break;
      case 2:
        cursorSyncEnum = DashboardCursorSync.Tooltip;
        break;
      default:
        cursorSyncEnum = defaultDashboardSpec().cursorSync;
    }
    return cursorSyncEnum;
  }

  //Return `cursorSync` if it exists, otherwise return the default value
  return cursorSync ?? defaultDashboardSpec().cursorSync;
}

function getLiveNow(state: DashboardSceneState) {
  const liveNow =
    state.$behaviors?.find((b): b is behaviors.LiveNowTimer => b instanceof behaviors.LiveNowTimer)?.isEnabled ||
    undefined;
  // hack for validator
  if (liveNow === undefined) {
    return false;
  }
  return liveNow;
}

function getGridLayoutItems(state: DashboardSceneState, isSnapshot?: boolean): GridLayoutItemKind[] {
  const body = state.body;
  const elements: GridLayoutItemKind[] = [];
  if (body instanceof DefaultGridLayoutManager) {
    for (const child of body.state.grid.state.children) {
      if (child instanceof DashboardGridItem) {
        // TODO: handle panel repeater scenario
        // if (child.state.variableName) {
        //   panels = panels.concat(panelRepeaterToPanels(child, isSnapshot));
        // } else {
        elements.push(gridItemToGridLayoutItemKind(child, isSnapshot));
        // }
      }

      // TODO: OLD transformer code
      // if (child instanceof SceneGridRow) {
      //   // Skip repeat clones or when generating a snapshot
      //   if (child.state.key!.indexOf('-clone-') > 0 && !isSnapshot) {
      //     continue;
      //   }
      //   gridRowToSaveModel(child, panels, isSnapshot);
      // }
    }
  }
  return elements;
}

export function gridItemToGridLayoutItemKind(gridItem: DashboardGridItem, isSnapshot = false): GridLayoutItemKind {
  let elementGridItem: GridLayoutItemKind | undefined;
  let x = 0,
    y = 0,
    width = 0,
    height = 0;

  let gridItem_ = gridItem;

  if (!(gridItem_.state.body instanceof VizPanel)) {
    throw new Error('DashboardGridItem body expected to be VizPanel');
  }

  // Get the grid position and size
  height = (gridItem_.state.variableName ? gridItem_.state.itemHeight : gridItem_.state.height) ?? 0;
  x = gridItem_.state.x ?? 0;
  y = gridItem_.state.y ?? 0;
  width = gridItem_.state.width ?? 0;

  // FIXME: which name should we use for the element reference, key or something else ?
  const elementName = gridItem_.state.body.state.key ?? 'DefaultName';
  elementGridItem = {
    kind: 'GridLayoutItem',
    spec: {
      x,
      y,
      width: width,
      height: height,
      element: {
        kind: 'ElementReference',
        name: elementName,
      },
    },
  };

  if (!elementGridItem) {
    throw new Error('Unsupported grid item type');
  }

  return elementGridItem;
}

function getElements(state: DashboardSceneState) {
  const panels = state.body.getVizPanels() ?? [];
  const panelsArray = panels.reduce((acc: PanelKind[], vizPanel: VizPanel) => {
    const elementSpec: PanelKind = {
      kind: 'Panel',
      spec: {
        uid: vizPanel.state.key ?? '', // FIXME: why is key optional?
        title: vizPanel.state.title,
        description: vizPanel.state.description ?? '',
        links: getPanelLinks(vizPanel),
        data: {
          kind: 'QueryGroup',
          spec: {
            queries: getVizPanelQueries(vizPanel),
            transformations: getVizPanelTransformations(vizPanel),
            queryOptions: getVizPanelQueryOptions(vizPanel),
          },
        },
        vizConfig: {
          kind: vizPanel.state.pluginId,
          spec: {
            pluginVersion: vizPanel.state.pluginVersion ?? '',
            options: vizPanel.state.options,
            fieldConfig: (vizPanel.state.fieldConfig as FieldConfigSource) ?? defaultFieldConfigSource(),
          },
        },
      },
    };
    acc.push(elementSpec);
    return acc;
  }, []);
  // create elements

  const elements = createElements(panelsArray);
  return elements;
}

function getPanelLinks(panel: VizPanel): DashboardLink[] {
  const vizLinks = dashboardSceneGraph.getPanelLinks(panel);
  if (vizLinks) {
    return (vizLinks.state.rawLinks as DashboardLink[]) ?? [];
  }
  return [];
}

function getVizPanelQueries(vizPanel: VizPanel): PanelQueryKind[] {
  const queries: PanelQueryKind[] = [];
  const queryRunner = getQueryRunnerFor(vizPanel);
  const vizPanelQueries = queryRunner?.state.queries;
  const datasource = queryRunner?.state.datasource;

  if (vizPanelQueries) {
    vizPanelQueries.forEach((query) => {
      const dataQuery: DataQueryKind = {
        kind: getDataQueryKind(query),
        spec: query,
      };
      const querySpec: PanelQuerySpec = {
        datasource: datasource ?? defaultDataSourceRef(),
        query: dataQuery,
        refId: query.refId,
        hidden: query.hidden,
      };
      queries.push({
        kind: 'PanelQuery',
        spec: querySpec,
      });
    });
  }
  return queries;
}

export function getDataQueryKind(query: SceneDataQuery): string {
  // FIXME kind in the query object is the datasource type?
  // what if the datasource is not set?
  // should we use default datasource type?
  return query.datasource?.type ?? '';
}

export function getDataQuerySpec(query: SceneDataQuery): Record<string, any> {
  const dataQuerySpec = {
    kind: getDataQueryKind(query),
    spec: query,
  };
  return dataQuerySpec;
}

function getVizPanelTransformations(vizPanel: VizPanel): TransformationKind[] {
  let transformations: TransformationKind[] = [];
  const dataProvider = vizPanel.state.$data;
  if (dataProvider instanceof SceneDataTransformer) {
    const transformationList = dataProvider.state.transformations;
    if (transformationList.length === 0) {
      return [];
    }
    transformationList.forEach((transformationItem) => {
      const transformation = transformationItem as DataTransformerConfig;
      const transformationSpec: DataTransformerConfig = {
        id: transformation.id,
        disabled: transformation.disabled,
        filter: {
          id: transformation.filter?.id ?? '',
          options: transformation.filter?.options ?? {},
        },
        topic: transformation.topic,
        options: transformation.options,
      };

      transformations.push({
        kind: transformation.id,
        spec: transformationSpec,
      });
    });
  }
  return transformations;
}

function getVizPanelQueryOptions(vizPanel: VizPanel): QueryOptionsSpec {
  let queryOptions: QueryOptionsSpec = {};
  const queryRunner = getQueryRunnerFor(vizPanel);

  if (queryRunner) {
    queryOptions.maxDataPoints = queryRunner.state.maxDataPoints;

    if (queryRunner.state.cacheTimeout) {
      queryOptions.cacheTimeout = queryRunner.state.cacheTimeout;
    }

    if (queryRunner.state.queryCachingTTL) {
      queryOptions.queryCachingTTL = queryRunner.state.queryCachingTTL;
    }
    if (queryRunner.state.minInterval) {
      queryOptions.interval = queryRunner.state.minInterval;
    }
  }

  const panelTime = vizPanel.state.$timeRange;

  if (panelTime instanceof PanelTimeRange) {
    queryOptions.timeFrom = panelTime.state.timeFrom;
    queryOptions.timeShift = panelTime.state.timeShift;
  }
  return queryOptions;
}

function createElements(panels: PanelKind[]): Record<string, PanelKind> {
  return panels.reduce(
    (acc, panel) => {
      const key = panel.spec.uid;
      acc[key] = panel;
      return acc;
    },
    {} as Record<string, PanelKind>
  );
}

function getVariables(oldDash: DashboardSceneState) {
  const variablesSet = oldDash.$variables;

  // variables is an array of all variables kind (union)
  let variables: Array<
    | QueryVariableKind
    | TextVariableKind
    | IntervalVariableKind
    | DatasourceVariableKind
    | CustomVariableKind
    | ConstantVariableKind
    | GroupByVariableKind
    | AdhocVariableKind
  > = [];

  if (variablesSet instanceof SceneVariableSet) {
    variables = sceneVariablesSetToSchemaV2Variables(variablesSet);
  }

  return variables;
}

// Function to know if the dashboard transformed is a valid DashboardV2
function isDashboardSchemaV2(dashboard: unknown): dashboard is DashboardV2 {
  if (typeof dashboard !== 'object' || dashboard === null) {
    return false;
  }

  const dash = dashboard as any;

  if (dash.kind !== 'Dashboard') {
    return false;
  }
  if (typeof dash.spec !== 'object' || dash.spec === null) {
    return false;
  }

  // Spec-level properties
  if (typeof dash.spec.title !== 'string') {
    return false;
  }
  if (typeof dash.spec.description !== 'string') {
    return false;
  }
  if (typeof dash.spec.cursorSync !== 'string') {
    return false;
  }
  if (!Object.values(DashboardCursorSync).includes(dash.spec.cursorSync)) {
    return false;
  }
  if (typeof dash.spec.liveNow !== 'boolean') {
    return false;
  }
  if (typeof dash.spec.preload !== 'boolean') {
    return false;
  }
  if (typeof dash.spec.editable !== 'boolean') {
    return false;
  }
  if (!Array.isArray(dash.spec.links)) {
    return false;
  }
  if (!Array.isArray(dash.spec.tags)) {
    return false;
  }

  if (dash.spec.id !== undefined && typeof dash.spec.id !== 'number') {
    return false;
  }

  // Time settings
  if (typeof dash.spec.timeSettings !== 'object' || dash.spec.timeSettings === null) {
    return false;
  }
  if (typeof dash.spec.timeSettings.timezone !== 'string') {
    return false;
  }
  if (typeof dash.spec.timeSettings.from !== 'string') {
    return false;
  }
  if (typeof dash.spec.timeSettings.to !== 'string') {
    return false;
  }
  if (typeof dash.spec.timeSettings.autoRefresh !== 'string') {
    return false;
  }
  if (!Array.isArray(dash.spec.timeSettings.autoRefreshIntervals)) {
    return false;
  }
  if (!Array.isArray(dash.spec.timeSettings.quickRanges)) {
    return false;
  }
  if (typeof dash.spec.timeSettings.hideTimepicker !== 'boolean') {
    return false;
  }
  if (typeof dash.spec.timeSettings.weekStart !== 'string') {
    return false;
  }
  if (typeof dash.spec.timeSettings.fiscalYearStartMonth !== 'number') {
    return false;
  }
  if (dash.spec.timeSettings.nowDelay !== undefined && typeof dash.spec.timeSettings.nowDelay !== 'string') {
    return false;
  }

  // Other sections
  if (!Array.isArray(dash.spec.variables)) {
    return false;
  }
  if (typeof dash.spec.elements !== 'object' || dash.spec.elements === null) {
    return false;
  }
  if (!Array.isArray(dash.spec.annotations)) {
    return false;
  }

  // Layout
  if (typeof dash.spec.layout !== 'object' || dash.spec.layout === null) {
    return false;
  }
  if (dash.spec.layout.kind !== 'GridLayout') {
    return false;
  }
  if (typeof dash.spec.layout.spec !== 'object' || dash.spec.layout.spec === null) {
    return false;
  }
  if (!Array.isArray(dash.spec.layout.spec.items)) {
    return false;
  }

  return true;
}
