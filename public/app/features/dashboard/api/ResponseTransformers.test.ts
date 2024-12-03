import { DashboardV2Spec } from '@grafana/schema/dist/esm/schema/dashboard/v2alpha0/dashboard.gen';
import { DashboardDataDTO, DashboardDTO } from 'app/types';

import { ResponseTransformers } from './ResponseTransformers';
import { DashboardWithAccessInfo } from './types';

describe('ResponseTransformers', () => {
  describe('v1 transformation', () => {
    it('should transform DashboardDTO to DashboardWithAccessInfo<DashboardV2Spec>', () => {
      const dashboardV1: DashboardDataDTO = {
        uid: 'dashboard-uid',
        title: 'Dashboard Title',
        description: 'Dashboard Description',
        tags: ['tag1', 'tag2'],
        schemaVersion: 1,
        graphTooltip: 0,
        preload: true,
        liveNow: false,
        editable: true,
        time: { from: 'now-6h', to: 'now' },
        timezone: 'browser',
        refresh: '5m',
        timepicker: {
          refresh_intervals: ['5s', '10s', '30s'],
          hidden: false,
          time_options: ['5m', '15m', '1h'],
          nowDelay: '1m',
        },
        fiscalYearStartMonth: 1,
        weekStart: 'monday',
        version: 1,
        links: [],
        annotations: {
          list: [],
        },
      };

      const dto: DashboardWithAccessInfo<DashboardDataDTO> = {
        spec: dashboardV1,
        access: {
          slug: 'dashboard-slug',
          url: '/d/dashboard-slug',
          canAdmin: true,
          canDelete: true,
          canEdit: true,
          canSave: true,
          canShare: true,
          canStar: true,
          annotationsPermissions: {
            dashboard: { canAdd: true, canEdit: true, canDelete: true },
            organization: { canAdd: true, canEdit: true, canDelete: true },
          },
        },
        apiVersion: 'v1',
        kind: 'DashboardWithAccessInfo',
        metadata: {
          name: 'dashboard-uid',
          resourceVersion: '1',

          creationTimestamp: '2023-01-01T00:00:00Z',
          annotations: {
            'grafana.app/createdBy': 'user1',
            'grafana.app/updatedBy': 'user2',
            'grafana.app/updatedTimestamp': '2023-01-02T00:00:00Z',
            'grafana.app/folder': 'folder1',
            'grafana.app/slug': 'dashboard-slug',
          },
        },
      };

      const transformed = ResponseTransformers.ensureV2Response(dto);

      expect(transformed.apiVersion).toBe('v2alpha1');
      expect(transformed.kind).toBe('DashboardWithAccessInfo');
      expect(transformed.metadata).toEqual(dto.metadata);

      const spec = transformed.spec;
      expect(spec.title).toBe(dashboardV1.title);
      expect(spec.description).toBe(dashboardV1.description);
      expect(spec.tags).toEqual(dashboardV1.tags);
      expect(spec.schemaVersion).toBe(dashboardV1.schemaVersion);
      expect(spec.cursorSync).toBe('Off'); // Assuming transformCursorSynctoEnum(0) returns 'Off'
      expect(spec.preload).toBe(dashboardV1.preload);
      expect(spec.liveNow).toBe(dashboardV1.liveNow);
      expect(spec.editable).toBe(dashboardV1.editable);
      expect(spec.timeSettings.from).toBe(dashboardV1.time?.from);
      expect(spec.timeSettings.to).toBe(dashboardV1.time?.to);
      expect(spec.timeSettings.timezone).toBe(dashboardV1.timezone);
      expect(spec.timeSettings.autoRefresh).toBe(dashboardV1.refresh);
      expect(spec.timeSettings.autoRefreshIntervals).toEqual(dashboardV1.timepicker?.refresh_intervals);
      expect(spec.timeSettings.hideTimepicker).toBe(dashboardV1.timepicker?.hidden);
      expect(spec.timeSettings.quickRanges).toEqual(dashboardV1.timepicker?.time_options);
      expect(spec.timeSettings.nowDelay).toBe(dashboardV1.timepicker?.nowDelay);
      expect(spec.timeSettings.fiscalYearStartMonth).toBe(dashboardV1.fiscalYearStartMonth);
      expect(spec.timeSettings.weekStart).toBe(dashboardV1.weekStart);
      expect(spec.links).toEqual([]); // Assuming transformDashboardLinksToEnums([]) returns []
      expect(spec.annotations).toEqual([]);
    });
  });

  describe('v2 transformation', () => {
    it('should return the same object if it is already a DashboardDTO', () => {
      const dashboard: DashboardDTO = {
        dashboard: {
          schemaVersion: 1,
          title: 'Dashboard Title',
          uid: 'dashboard1',
          version: 1,
        },
        meta: {},
      };

      expect(ResponseTransformers.ensureV1Response(dashboard)).toBe(dashboard);
    });

    it('should transform DashboardWithAccessInfo<DashboardV2Spec> to DashboardDTO', () => {
      const dashboardV2: DashboardWithAccessInfo<DashboardV2Spec> = {
        apiVersion: 'v2alpha1',
        kind: 'DashboardWithAccessInfo',
        metadata: {
          creationTimestamp: '2023-01-01T00:00:00Z',
          name: 'dashboard1',
          resourceVersion: '1',
          annotations: {
            'grafana.app/createdBy': 'user1',
            'grafana.app/updatedBy': 'user2',
            'grafana.app/updatedTimestamp': '2023-01-02T00:00:00Z',
            'grafana.app/folder': 'folder1',
            'grafana.app/slug': 'dashboard-slug',
          },
        },
        spec: {
          title: 'Dashboard Title',
          description: 'Dashboard Description',
          tags: ['tag1', 'tag2'],
          schemaVersion: 1,
          cursorSync: 'Off',
          preload: true,
          liveNow: false,
          editable: true,
          timeSettings: {
            from: 'now-6h',
            to: 'now',
            timezone: 'browser',
            autoRefresh: '5m',
            autoRefreshIntervals: ['5s', '10s', '30s'],
            hideTimepicker: false,
            quickRanges: ['5m', '15m', '1h'],
            nowDelay: '1m',
            fiscalYearStartMonth: 1,
            weekStart: 'monday',
          },
          links: [],
          annotations: [],
          variables: [],
          elements: {},
          layout: {
            kind: 'GridLayout',
            spec: {
              items: [],
            },
          },
        },
        access: {
          url: '/d/dashboard-slug',
          canAdmin: true,
          canDelete: true,
          canEdit: true,
          canSave: true,
          canShare: true,
          canStar: true,
          slug: 'dashboard-slug',
          annotationsPermissions: {
            dashboard: { canAdd: true, canEdit: true, canDelete: true },
            organization: { canAdd: true, canEdit: true, canDelete: true },
          },
        },
      };

      const transformed = ResponseTransformers.ensureV1Response(dashboardV2);

      expect(transformed.meta.created).toBe(dashboardV2.metadata.creationTimestamp);
      expect(transformed.meta.createdBy).toBe(dashboardV2.metadata.annotations?.['grafana.app/createdBy']);
      expect(transformed.meta.updated).toBe(dashboardV2.metadata.annotations?.['grafana.app/updatedTimestamp']);
      expect(transformed.meta.updatedBy).toBe(dashboardV2.metadata.annotations?.['grafana.app/updatedBy']);
      expect(transformed.meta.folderUid).toBe(dashboardV2.metadata.annotations?.['grafana.app/folder']);
      expect(transformed.meta.slug).toBe(dashboardV2.metadata.annotations?.['grafana.app/slug']);
      expect(transformed.meta.url).toBe(dashboardV2.access.url);
      expect(transformed.meta.canAdmin).toBe(dashboardV2.access.canAdmin);
      expect(transformed.meta.canDelete).toBe(dashboardV2.access.canDelete);
      expect(transformed.meta.canEdit).toBe(dashboardV2.access.canEdit);
      expect(transformed.meta.canSave).toBe(dashboardV2.access.canSave);
      expect(transformed.meta.canShare).toBe(dashboardV2.access.canShare);
      expect(transformed.meta.canStar).toBe(dashboardV2.access.canStar);
      expect(transformed.meta.annotationsPermissions).toEqual(dashboardV2.access.annotationsPermissions);

      const dashboard = transformed.dashboard;
      expect(dashboard.uid).toBe(dashboardV2.metadata.name);
      expect(dashboard.title).toBe(dashboardV2.spec.title);
      expect(dashboard.description).toBe(dashboardV2.spec.description);
      expect(dashboard.tags).toEqual(dashboardV2.spec.tags);
      expect(dashboard.schemaVersion).toBe(dashboardV2.spec.schemaVersion);
      //   expect(dashboard.graphTooltip).toBe(0); // Assuming transformCursorSynctoEnum('Off') returns 0
      expect(dashboard.preload).toBe(dashboardV2.spec.preload);
      expect(dashboard.liveNow).toBe(dashboardV2.spec.liveNow);
      expect(dashboard.editable).toBe(dashboardV2.spec.editable);
      expect(dashboard.time?.from).toBe(dashboardV2.spec.timeSettings.from);
      expect(dashboard.time?.to).toBe(dashboardV2.spec.timeSettings.to);
      expect(dashboard.timezone).toBe(dashboardV2.spec.timeSettings.timezone);
      expect(dashboard.refresh).toBe(dashboardV2.spec.timeSettings.autoRefresh);
      expect(dashboard.timepicker?.refresh_intervals).toEqual(dashboardV2.spec.timeSettings.autoRefreshIntervals);
      expect(dashboard.timepicker?.hidden).toBe(dashboardV2.spec.timeSettings.hideTimepicker);
      expect(dashboard.timepicker?.time_options).toEqual(dashboardV2.spec.timeSettings.quickRanges);
      expect(dashboard.timepicker?.nowDelay).toBe(dashboardV2.spec.timeSettings.nowDelay);
      expect(dashboard.fiscalYearStartMonth).toBe(dashboardV2.spec.timeSettings.fiscalYearStartMonth);
      expect(dashboard.weekStart).toBe(dashboardV2.spec.timeSettings.weekStart);
      expect(dashboard.links).toEqual([]); // Assuming transformDashboardLinksToEnums([]) returns []
      expect(dashboard.annotations).toEqual({ list: [] });
    });
  });
});
