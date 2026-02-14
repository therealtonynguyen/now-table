/**
 * ViewRegistry — Pluggable view system for now-table.
 * Week 5: Grid (default) | Kanban | Gallery | Forms | Calendar | Map | VTB.
 * Hook: getViewForSchema(schema) selects view based on data schema.
 */

import type { ListLayout } from '../data/ListLayout.js';

export type ViewId = string;

export interface ViewRegistration {
  viewId: ViewId;
  label: string;
  /** Optional: when this view can handle a schema (e.g. Kanban for choice/reference). */
  supportsSchema?: (schema: ListLayout) => boolean;
}

export type GetViewForSchemaHook = (schema: ListLayout) => ViewId;

const DEFAULT_VIEW_ID: ViewId = 'grid';

/**
 * Registry of view types. Default view is "grid".
 * Use setGetViewForSchema() to customize which view is chosen for a given schema.
 */
export class ViewRegistry {
  private _views = new Map<ViewId, ViewRegistration>();
  private _getViewForSchema: GetViewForSchemaHook = () => DEFAULT_VIEW_ID;

  constructor() {
    this.register({
      viewId: DEFAULT_VIEW_ID,
      label: 'Grid',
      supportsSchema: () => true,
    });
  }

  /** Register a view. Overwrites existing registration for same viewId. */
  register(registration: ViewRegistration): void {
    this._views.set(registration.viewId, registration);
  }

  /** Set the hook that selects view id from schema. Default returns "grid". */
  setGetViewForSchema(fn: GetViewForSchemaHook): void {
    this._getViewForSchema = fn;
  }

  /** Get the view id for a given list layout (uses registered hook). */
  getViewForSchema(schema: ListLayout | null): ViewId {
    if (!schema) return DEFAULT_VIEW_ID;
    const id = this._getViewForSchema(schema);
    return this._views.has(id) ? id : DEFAULT_VIEW_ID;
  }

  /** All registered view ids (for view switcher UI). */
  getViewIds(): ViewId[] {
    return Array.from(this._views.keys());
  }

  /** Get registration for a view id. */
  getRegistration(viewId: ViewId): ViewRegistration | undefined {
    return this._views.get(viewId);
  }

  /** Check if a view supports the given schema (for optional view switcher filtering). */
  viewSupportsSchema(viewId: ViewId, schema: ListLayout | null): boolean {
    if (!schema) return false;
    const reg = this._views.get(viewId);
    return reg?.supportsSchema?.(schema) ?? false;
  }
}

/** Default singleton registry. Apps can create their own or customize this one. */
export const defaultViewRegistry = new ViewRegistry();
