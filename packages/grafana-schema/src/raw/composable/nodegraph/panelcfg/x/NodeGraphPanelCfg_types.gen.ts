// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     PluginTsTypesJenny
//
// Run 'make gen-cue' from repository root to regenerate.

export const pluginVersion = "11.5.0-pre";

export interface ArcOption {
  /**
   * The color of the arc.
   */
  color?: string;
  /**
   * Field from which to get the value. Values should be less than 1, representing fraction of a circle.
   */
  field?: string;
}

export enum ZoomMode {
  Cooperative = 'cooperative',
  Greedy = 'greedy',
}

export interface NodeNameOverrides {
  arc?: string;
  color?: string;
  details?: string;
  highlighted?: string;
  icon?: string;
  id?: string;
  mainStat?: string;
  nodeRadius?: string;
  secondaryStat?: string;
  subTitle?: string;
  title?: string;
}

export interface EdgeNameOverrides {
  color?: string;
  details?: string;
  highlighted?: string;
  id?: string;
  mainStat?: string;
  secondaryStat?: string;
  source?: string;
  target?: string;
  thickness?: string;
}

export interface Options {
  edgeNameOverrides?: EdgeNameOverrides;
  edges?: {
    /**
     * Unit for the main stat to override what ever is set in the data frame.
     */
    mainStatUnit?: string;
    /**
     * Unit for the secondary stat to override what ever is set in the data frame.
     */
    secondaryStatUnit?: string;
  };
  nodeNameOverrides?: NodeNameOverrides;
  nodes?: {
    /**
     * Unit for the main stat to override what ever is set in the data frame.
     */
    mainStatUnit?: string;
    /**
     * Unit for the secondary stat to override what ever is set in the data frame.
     */
    secondaryStatUnit?: string;
    /**
     * Define which fields are shown as part of the node arc (colored circle around the node).
     */
    arcs?: Array<ArcOption>;
  };
  /**
   * How to handle zoom/scroll events in the node graph
   */
  zoomMode?: ZoomMode;
}
