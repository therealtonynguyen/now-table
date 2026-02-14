export {
  ViewRegistry,
  defaultViewRegistry,
  type ViewId,
  type ViewRegistration,
  type GetViewForSchemaHook,
} from './ViewRegistry.js';
export type { ViewProps } from './view-props.js';

import { defaultViewRegistry } from './ViewRegistry.js';
import type { ListLayout } from '../data/ListLayout.js';

import './kanban-view.js';
import './gallery-view.js';
import './forms-view.js';
import './calendar-view.js';
import './map-view.js';

function hasChoiceOrReference(s: ListLayout) {
  return s.columns?.some((c) => c.type === 'choice' || c.type === 'reference');
}
function hasDateColumn(s: ListLayout) {
  return s.columns?.some((c) => ['glide_date', 'glide_date_time', 'datetime'].includes(c.type));
}
function hasLocationColumn(s: ListLayout) {
  const keys = ['address', 'location', 'lat', 'lng', 'geo'];
  return s.columns?.some((c) => keys.some((k) => `${c.id} ${c.label}`.toLowerCase().includes(k)));
}

defaultViewRegistry.register({ viewId: 'kanban', label: 'Kanban', supportsSchema: hasChoiceOrReference });
defaultViewRegistry.register({ viewId: 'gallery', label: 'Gallery', supportsSchema: () => true });
defaultViewRegistry.register({ viewId: 'forms', label: 'Forms', supportsSchema: () => true });
defaultViewRegistry.register({ viewId: 'calendar', label: 'Calendar', supportsSchema: hasDateColumn });
defaultViewRegistry.register({ viewId: 'map', label: 'Map', supportsSchema: hasLocationColumn });
