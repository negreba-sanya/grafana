import { config } from '@grafana/runtime';
import { AnnotationQuery, DataQuery, Panel, VariableModel } from '@grafana/schema';
import {
  AnnotationQueryKind,
  DashboardV2Spec,
  DataLink,
  DatasourceVariableKind,
  defaultDashboardV2Spec,
  defaultFieldConfigSource,
  defaultTimeSettingsSpec,
  PanelQueryKind,
  QueryVariableKind,
  TransformationKind,
} from '@grafana/schema/dist/esm/schema/dashboard/v2alpha0/dashboard.gen';
import { DataTransformerConfig } from '@grafana/schema/src/raw/dashboard/x/dashboard_types.gen';
import {
  AnnoKeyCreatedBy,
  AnnoKeyFolder,
  AnnoKeySlug,
  AnnoKeyUpdatedBy,
  AnnoKeyUpdatedTimestamp,
} from 'app/features/apiserver/types';
import {
  transformCursorSynctoEnum,
  transformDataTopic,
  transformSortVariableToEnum,
  transformVariableHideToEnum,
  transformVariableRefreshToEnum,
} from 'app/features/dashboard-scene/serialization/transformToV2TypesUtils';
import { DashboardDataDTO, DashboardDTO } from 'app/types';

import { DashboardWithAccessInfo } from './types';
import { isDashboardResource, isDashboardV0Spec, isDashboardV2Resource } from './utils';

export function ensureV2Response(
  dto: DashboardDTO | DashboardWithAccessInfo<DashboardDataDTO> | DashboardWithAccessInfo<DashboardV2Spec>
): DashboardWithAccessInfo<DashboardV2Spec> {
  if (isDashboardV2Resource(dto)) {
    return dto;
  }
  let dashboard: DashboardDataDTO;

  if (isDashboardResource(dto)) {
    dashboard = dto.spec;
  } else {
    dashboard = dto.dashboard;
  }

  const timeSettingsDefaults = defaultTimeSettingsSpec();
  const dashboardDefaults = defaultDashboardV2Spec();
  const [elements, layout] = getElementsFromPanels(dashboard.panels || []);
  const variables = getVariables(dashboard.templating?.list || []);
  const annotations = getAnnotations(dashboard.annotations?.list || []);

  const accessAndMeta = isDashboardResource(dto)
    ? {
        ...dto.access,
        created: dto.metadata.creationTimestamp,
        createdBy: dto.metadata.annotations?.[AnnoKeyCreatedBy],
        updatedBy: dto.metadata.annotations?.[AnnoKeyUpdatedBy],
        updated: dto.metadata.annotations?.[AnnoKeyUpdatedTimestamp],
        folderUid: dto.metadata.annotations?.[AnnoKeyFolder],
        slug: dto.metadata.annotations?.[AnnoKeySlug],
      }
    : dto.meta;

  const spec: DashboardV2Spec = {
    title: dashboard.title,
    description: dashboard.description,
    tags: dashboard.tags ?? [],
    schemaVersion: dashboard.schemaVersion,
    cursorSync: transformCursorSynctoEnum(dashboard.graphTooltip),
    preload: dashboard.preload || dashboardDefaults.preload,
    liveNow: dashboard.liveNow,
    editable: dashboard.editable,
    timeSettings: {
      from: dashboard.time?.from || timeSettingsDefaults.from,
      to: dashboard.time?.to || timeSettingsDefaults.to,
      timezone: dashboard.timezone || timeSettingsDefaults.timezone,
      autoRefresh: dashboard.refresh || timeSettingsDefaults.autoRefresh,
      autoRefreshIntervals: dashboard.timepicker?.refresh_intervals || timeSettingsDefaults.autoRefreshIntervals,
      fiscalYearStartMonth: dashboard.fiscalYearStartMonth || timeSettingsDefaults.fiscalYearStartMonth,
      hideTimepicker: dashboard.timepicker?.hidden || timeSettingsDefaults.hideTimepicker,
      quickRanges: dashboard.timepicker?.time_options || timeSettingsDefaults.quickRanges,
      weekStart: dashboard.weekStart || timeSettingsDefaults.weekStart,
      nowDelay: dashboard.timepicker?.nowDelay || timeSettingsDefaults.nowDelay,
    },
    links: dashboard.links || [],
    annotations,
    variables,
    elements,
    layout,
  };

  return {
    apiVersion: 'v2alpha1',
    kind: 'DashboardWithAccessInfo',
    metadata: {
      creationTimestamp: accessAndMeta.created || '', // TODO verify this empty string is valid
      name: dashboard.uid,
      resourceVersion: dashboard.version?.toString() || '0',
      annotations: {
        [AnnoKeyCreatedBy]: accessAndMeta.createdBy,
        [AnnoKeyUpdatedBy]: accessAndMeta.updatedBy,
        [AnnoKeyUpdatedTimestamp]: accessAndMeta.updated,
        [AnnoKeyFolder]: accessAndMeta.folderUid,
        [AnnoKeySlug]: accessAndMeta.slug,
      },
    },
    spec,
    access: {
      url: accessAndMeta.url || '',
      canAdmin: accessAndMeta.canAdmin,
      canDelete: accessAndMeta.canDelete,
      canEdit: accessAndMeta.canEdit,
      canSave: accessAndMeta.canSave,
      canShare: accessAndMeta.canShare,
      canStar: accessAndMeta.canStar,
      slug: accessAndMeta.slug,
      annotationsPermissions: accessAndMeta.annotationsPermissions,
    },
  };
}

export function ensureV1Response(
  dashboard: DashboardDTO | DashboardWithAccessInfo<DashboardV2Spec> | DashboardWithAccessInfo<DashboardDataDTO>
): DashboardDTO {
  // if dashboard is not on v0 schema or v2 schema, return as is
  if (!isDashboardResource(dashboard)) {
    return dashboard;
  }

  const spec = dashboard.spec;
  // if dashboard is on v0 schema
  if (isDashboardV0Spec(spec)) {
    return {
      meta: {
        ...dashboard.access,
        isNew: false,
        isFolder: false,
        uid: dashboard.metadata.name,
        k8s: dashboard.metadata,
        version: parseInt(dashboard.metadata.resourceVersion, 10),
      },
      dashboard: spec,
    };
  } else {
    // if dashboard is on v2 schema convert to v1 schema
    return {
      meta: {
        created: dashboard.metadata.creationTimestamp,
        createdBy: dashboard.metadata.annotations?.['grafana.app/createdBy'] ?? '',
        updated: dashboard.metadata.annotations?.['grafana.app/updatedTimestamp'],
        updatedBy: dashboard.metadata.annotations?.['grafana.app/updatedBy'],
        folderUid: dashboard.metadata.annotations?.['grafana.app/folder'],
        slug: dashboard.metadata.annotations?.['grafana.app/slug'],
        url: dashboard.access.url,
        canAdmin: dashboard.access.canAdmin,
        canDelete: dashboard.access.canDelete,
        canEdit: dashboard.access.canEdit,
        canSave: dashboard.access.canSave,
        canShare: dashboard.access.canShare,
        canStar: dashboard.access.canStar,
        annotationsPermissions: dashboard.access.annotationsPermissions,
      },
      dashboard: {
        uid: dashboard.metadata.name,
        title: spec.title,
        description: spec.description,
        tags: spec.tags,
        schemaVersion: spec.schemaVersion,
        // @ts-ignore TODO: Use transformers for these enums
        //   graphTooltip: spec.cursorSync, // Assuming transformCursorSynctoEnum is reversible
        preload: spec.preload,
        liveNow: spec.liveNow,
        editable: spec.editable,
        time: {
          from: spec.timeSettings.from,
          to: spec.timeSettings.to,
        },
        timezone: spec.timeSettings.timezone,
        refresh: spec.timeSettings.autoRefresh,
        timepicker: {
          refresh_intervals: spec.timeSettings.autoRefreshIntervals,
          hidden: spec.timeSettings.hideTimepicker,
          time_options: spec.timeSettings.quickRanges,
          nowDelay: spec.timeSettings.nowDelay,
        },
        fiscalYearStartMonth: spec.timeSettings.fiscalYearStartMonth,
        weekStart: spec.timeSettings.weekStart,
        version: parseInt(dashboard.metadata.resourceVersion, 10),
        links: spec.links, // Assuming transformDashboardLinksToEnums is reversible
        annotations: { list: [] }, // TODO
      },
    };
  }
}

export const ResponseTransformers = {
  ensureV2Response,
  ensureV1Response,
};

// TODO[schema v2]: handle rows
function getElementsFromPanels(panels: Panel[]): [DashboardV2Spec['elements'], DashboardV2Spec['layout']] {
  const elements: DashboardV2Spec['elements'] = {};
  const layout: DashboardV2Spec['layout'] = {
    kind: 'GridLayout',
    spec: {
      items: [],
    },
  };

  if (!panels) {
    return [elements, layout];
  }

  // iterate over panels
  for (const p of panels) {
    const queries = getPanelQueries(
      (p.targets as unknown as DataQuery[]) || [],
      p.datasource?.type || getDefaultDatasourceType()
    );

    const transformations = getPanelTransformations(p.transformations || []);

    elements[p.id!] = {
      kind: 'Panel',
      spec: {
        title: p.title || '',
        description: p.description || '',
        vizConfig: {
          kind: p.type,
          spec: {
            fieldConfig: (p.fieldConfig as any) || defaultFieldConfigSource(),
            options: p.options as any,
            pluginVersion: p.pluginVersion!,
          },
        },
        links:
          p.links?.map<DataLink>((l) => ({
            title: l.title,
            url: l.url || '',
            targetBlank: l.targetBlank,
          })) || [],
        id: p.id!,
        data: {
          kind: 'QueryGroup',
          spec: {
            queries,
            transformations, // TODO[schema v2]: handle transformations
            queryOptions: {
              cacheTimeout: p.cacheTimeout,
              maxDataPoints: p.maxDataPoints,
              interval: p.interval,
              hideTimeOverride: p.hideTimeOverride,
              queryCachingTTL: p.queryCachingTTL,
              timeFrom: p.timeFrom,
              timeShift: p.timeShift,
            },
          },
        },
      },
    };

    layout.spec.items.push({
      kind: 'GridLayoutItem',
      spec: {
        x: p.gridPos!.x,
        y: p.gridPos!.y,
        width: p.gridPos!.w,
        height: p.gridPos!.h,
        element: {
          kind: 'ElementReference',
          name: p.id!.toString(),
        },
      },
    });
  }

  return [elements, layout];
}

function getDefaultDatasourceType() {
  const datasources = config.datasources;
  // find default datasource in datasources
  return Object.values(datasources).find((ds) => ds.isDefault)!.type;
}

function getPanelQueries(targets: DataQuery[], panelDatasourceType: string): PanelQueryKind[] {
  return targets.map((t) => {
    const { refId, hide, datasource, ...query } = t;
    const q: PanelQueryKind = {
      kind: 'PanelQuery',
      spec: {
        refId: t.refId,
        hidden: t.hide ?? false,
        // TODO[schema v2]: ds coming from panel ?!?!!?! AAAAAAAAAAAAA! Send help!
        datasource: t.datasource ? t.datasource : undefined,
        query: {
          kind: t.datasource?.type || panelDatasourceType,
          spec: {
            ...query,
          },
        },
      },
    };
    return q;
  });
}

function getPanelTransformations(transformations: DataTransformerConfig[]): TransformationKind[] {
  return transformations.map((t) => {
    return {
      kind: t.id,
      spec: {
        ...t,
        topic: transformDataTopic(t.topic),
      },
    };
  });
}

function getVariables(vars: VariableModel[]): DashboardV2Spec['variables'] {
  const variables: DashboardV2Spec['variables'] = [];
  for (const v of vars) {
    switch (v.type) {
      case 'query':
        let query = v.query || {};

        if (typeof query === 'string') {
          console.error('Query variable query is a string. It needs to extend DataQuery.');
          query = {};
        }

        const qv: QueryVariableKind = {
          kind: 'QueryVariable',
          spec: {
            name: v.name,
            label: v.label,
            hide: transformVariableHideToEnum(v.hide),
            skipUrlSync: Boolean(v.skipUrlSync),
            multi: Boolean(v.multi),
            includeAll: Boolean(v.includeAll),
            allValue: v.allValue,
            current: v.current || { text: '', value: '' },
            options: v.options || [],
            refresh: transformVariableRefreshToEnum(v.refresh),
            datasource: v.datasource ?? undefined,
            regex: v.regex || '',
            sort: transformSortVariableToEnum(v.sort),
            query: {
              kind: v.datasource?.type || getDefaultDatasourceType(),
              spec: {
                ...query,
              },
            },
          },
        };
        variables.push(qv);
        break;
      case 'datasource':
        let pluginId = getDefaultDatasourceType();

        if (v.query && typeof v.query === 'string') {
          pluginId = v.query;
        }

        const dv: DatasourceVariableKind = {
          kind: 'DatasourceVariable',
          spec: {
            name: v.name,
            label: v.label,
            hide: transformVariableHideToEnum(v.hide),
            skipUrlSync: Boolean(v.skipUrlSync),
            multi: Boolean(v.multi),
            includeAll: Boolean(v.includeAll),
            allValue: v.allValue,
            current: v.current || { text: '', value: '' },
            options: v.options || [],
            refresh: transformVariableRefreshToEnum(v.refresh),
            pluginId,
            regex: v.regex || '',
            description: v.description || '',
          },
        };
        variables.push(dv);
        break;
    }
  }
  return variables;
}

function getAnnotations(annotations: AnnotationQuery[]): DashboardV2Spec['annotations'] {
  return annotations.map((a) => {
    const aq: AnnotationQueryKind = {
      kind: 'AnnotationQuery',
      spec: {
        name: a.name,
        datasource: a.datasource ?? undefined,
        enable: a.enable,
        hide: Boolean(a.hide),
        iconColor: a.iconColor,
        builtIn: Boolean(a.builtIn),
        query: {
          kind: a.datasource?.type || getDefaultDatasourceType(),
          spec: {
            ...a.target,
          },
        },
        filter: a.filter,
      },
    };
    return aq;
  });
}
