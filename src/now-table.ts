import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@lit-labs/virtualizer';
import './components/filter-popover.js';
import './components/column-picker.js';
import './components/form-panel.js';
import './components/field-popover.js';
import type {
  ListLayout,
  ColumnDefinition,
  TableRecord,
  SortConfig,
  FilterConfig,
  FormLayout,
} from './data/ListLayout.js';
import type { DataProvider } from './data/DataProvider.js';
import { NowTableEventBus } from './automations/EventBus.js';
import {
  defaultViewRegistry,
  type ViewRegistry,
  type ViewId,
} from './views/ViewRegistry.js';
import './views/index.js';
import type { ViewProps } from './views/view-props.js';

type VirtualRow =
  | { type: 'data'; record: TableRecord; dataRowIndex: number }
  | { type: 'group'; key: string; label: string; count: number };

/**
 * now-table — List/table component
 * Architecture: Data | Automations | Interfaces | Forms
 */
@customElement('now-table')
export class NowTable extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      font-family: var(--now-table-font, 'Inter', system-ui, sans-serif);
      min-height: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    .table-container {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
      min-height: 0;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      background: oklch(var(--b1));
    }

    .table-scroll {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    .table-scroll-content {
      display: flex;
      flex-direction: column;
      min-width: min-content;
      min-height: min-content;
    }

    .header-row {
      display: grid;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      background: oklch(var(--b2));
      box-shadow: 0 1px 0 oklch(var(--b3));
      z-index: 1;
    }

    .header-cell {
      position: relative;
      padding: 0.75rem 1rem;
      padding-right: 1.5rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.8125rem;
      color: oklch(var(--bc));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-right: 1px solid oklch(var(--b3) / 0.5);
      cursor: pointer;
      user-select: none;
    }

    .header-cell:hover {
      background: oklch(var(--b3) / 0.3);
    }

    .header-cell:last-child {
      border-right: none;
    }

    .header-cell-actions {
      min-width: 96px;
      max-width: 96px;
      width: 96px;
      box-sizing: border-box;
      overflow: hidden;
      cursor: default;
      display: flex;
      align-items: center;
      justify-content: center;
      position: sticky;
      left: 0;
      z-index: 3;
      background: oklch(var(--b2)) !important;
      border-right: 1px solid oklch(var(--b3) / 0.6);
    }

    .header-cell-actions:hover {
      background: oklch(var(--b2));
    }

    .data-cell-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-width: 96px;
      max-width: 96px;
      width: 96px;
      box-sizing: border-box;
      overflow: hidden;
      border-right: 1px solid oklch(var(--b3) / 0.5);
      position: sticky;
      left: 0;
      z-index: 2;
      background: oklch(var(--b1)) !important;
    }

    .data-row:hover .data-cell-actions {
      background: oklch(var(--b2)) !important;
    }

    .data-row.selected-row .data-cell-actions {
      background: oklch(var(--p) / 0.12) !important;
    }

    .data-row.selected-row:hover .data-cell-actions {
      background: oklch(var(--p) / 0.18) !important;
    }

    .actions-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      margin: 0;
    }

    .actions-checkbox input {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
    }

    .actions-btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      min-width: 1.5rem;
      min-height: 1.5rem;
      border: 1px solid oklch(var(--b3));
      background: oklch(var(--b2) / 0.6);
      border-radius: 0.25rem;
      cursor: pointer;
      color: oklch(var(--bc) / 0.85);
    }

    .actions-btn-icon:hover {
      background: oklch(var(--b3) / 0.5);
      border-color: oklch(var(--b4));
      color: oklch(var(--bc));
    }

    .actions-icon {
      width: 0.875rem;
      height: 0.875rem;
    }

    .header-cell-sortable {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .header-cell-first-data .header-cell-label {
      flex-shrink: 0;
    }

    .header-cell-first-data {
      padding-left: 1.25rem;
    }

    .header-cell-first-data.frozen-cell {
      z-index: 4;
    }

    .data-cell-first-data.frozen-cell {
      z-index: 3;
    }

    .sort-indicator {
      font-size: 0.7rem;
      opacity: 0.7;
    }

    .sort-order-badge {
      font-size: 0.65rem;
      font-weight: 500;
      color: oklch(var(--bc) / 0.6);
      min-width: 1ch;
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 6px;
      height: 100%;
      cursor: col-resize;
      background: transparent;
    }

    .resize-handle:hover,
    .resize-handle:focus {
      background: oklch(var(--p) / 0.2);
    }

    .resize-handle::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 2px;
      transform: translateY(-50%);
      width: 2px;
      height: 16px;
      background: oklch(var(--b4));
      border-radius: 1px;
    }

    .header-cell.dragging {
      opacity: 0.6;
    }

    .header-cell.drag-over {
      border-left: 2px solid oklch(var(--p));
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      margin-left: auto;
    }

    .header-actions-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }

    .header-btn .glyph {
      font-size: 1rem;
      line-height: 1;
      opacity: 0.9;
    }

    .header-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.375rem;
      background: oklch(var(--b1));
      color: oklch(var(--bc));
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .header-btn:hover {
      background: oklch(var(--b2));
      border-color: oklch(var(--b4));
    }

    .header-btn.active {
      background: oklch(var(--p) / 0.15);
      border-color: oklch(var(--p));
      color: oklch(var(--p));
    }

    .header-btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border: none;
      border-radius: 0.25rem;
      background: transparent;
      cursor: pointer;
      color: oklch(var(--bc) / 0.7);
    }

    .header-btn-icon:hover {
      background: oklch(var(--b3) / 0.5);
      color: oklch(var(--bc));
    }

    .header-btn-icon.active {
      background: oklch(var(--p) / 0.2);
      color: oklch(var(--p));
    }

    .filter-funnel-icon {
      width: 0.875rem;
      height: 0.875rem;
      display: block;
      color: currentColor;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.3);
      z-index: 99;
    }

    .overlay-modal {
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .modal-focus-panel {
      position: fixed;
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px oklch(0 0 0 / 0.15);
      z-index: 101;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
    }

    .modal-focus-panel.columns-panel {
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
    }

    .modal-focus-panel .popover-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid oklch(var(--b3));
      font-weight: 600;
      font-size: 0.875rem;
    }

    .group-by-option {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      text-align: left;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-size: 0.8125rem;
      color: oklch(var(--bc));
      background: transparent;
    }

    .group-by-option:hover {
      background: oklch(var(--b2) / 0.5);
    }

    .group-by-option.active {
      background: oklch(var(--p) / 0.2);
    }

    .context-menu-option {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      text-align: left;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-size: 0.8125rem;
      color: oklch(var(--bc));
      background: transparent;
    }

    .context-menu-option:hover:not(:disabled) {
      background: oklch(var(--b2) / 0.5);
    }

    .context-menu-option:disabled {
      cursor: default;
      color: oklch(var(--bc) / 0.5);
    }

    .freeze-handle {
      position: sticky;
      top: 0;
      width: 6px;
      margin-left: -3px;
      z-index: 3;
      cursor: col-resize;
      background: transparent;
      flex-shrink: 0;
    }

    .freeze-handle::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 20%;
      bottom: 20%;
      width: 2px;
      transform: translateX(-50%);
      background: oklch(var(--b4));
      border-radius: 1px;
      opacity: 0.6;
    }

    .freeze-handle:hover::after,
    .freeze-handle.dragging::after {
      background: oklch(var(--p));
      opacity: 1;
      width: 3px;
    }

    .group-header {
      display: grid;
      min-height: 36px;
      align-items: center;
      background: oklch(var(--b3) / 0.3);
      font-weight: 600;
      font-size: 0.75rem;
      padding: 0 1rem;
      cursor: pointer;
      user-select: none;
    }

    .group-header:hover {
      background: oklch(var(--b3) / 0.4);
    }

    .group-toggle {
      margin-right: 0.5rem;
      font-size: 0.7rem;
    }

    .frozen-cell {
      position: sticky;
      z-index: 2;
      box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.08);
    }

    .header-row .frozen-cell {
      background: oklch(var(--b2)) !important;
    }

    .header-cell.frozen-cell:hover {
      background: oklch(var(--b3)) !important;
    }

    .data-row .frozen-cell {
      background: oklch(var(--b1)) !important;
    }

    .data-row:hover .frozen-cell {
      background: oklch(var(--b2)) !important;
    }

    .data-row.selected-row .frozen-cell {
      background: oklch(var(--p) / 0.12) !important;
    }

    .data-row.selected-row:hover .frozen-cell {
      background: oklch(var(--p) / 0.18) !important;
    }

    .group-header .frozen-cell {
      background: oklch(var(--b3)) !important;
    }

    .group-header:hover .frozen-cell {
      background: oklch(var(--b4)) !important;
    }

    .virtualizer-wrapper {
      min-width: 0;
      position: relative;
    }

    lit-virtualizer {
      display: block !important;
      position: relative !important;
    }

    .data-row {
      display: grid;
      min-height: 40px;
      border-bottom: 1px solid oklch(var(--b3) / 0.4);
      background: oklch(var(--b1));
    }

    .data-row:hover {
      background: oklch(var(--b2) / 0.5);
    }

    .data-row.selected-row {
      background: oklch(var(--p) / 0.12);
    }

    .data-row.selected-row:hover {
      background: oklch(var(--p) / 0.18);
    }

    .data-row.zebra-even {
      background: oklch(var(--b3) / 0.55);
    }

    .data-row.zebra-even .data-cell-actions {
      background: oklch(var(--b3) / 0.55) !important;
    }

    .data-row.zebra-even .frozen-cell {
      background: oklch(var(--b3) / 0.55) !important;
    }

    .data-row.zebra-even:hover {
      background: oklch(var(--b3) / 0.7);
    }

    .data-row.zebra-even:hover .data-cell-actions,
    .data-row.zebra-even:hover .frozen-cell {
      background: oklch(var(--b3) / 0.7) !important;
    }

    .data-row.zebra-even.selected-row {
      background: oklch(var(--p) / 0.18);
    }

    .data-row.zebra-even.selected-row .data-cell-actions,
    .data-row.zebra-even.selected-row .frozen-cell {
      background: oklch(var(--p) / 0.18) !important;
    }

    .data-row.zebra-even.selected-row:hover {
      background: oklch(var(--p) / 0.25);
    }

    .data-row.zebra-even.selected-row:hover .data-cell-actions,
    .data-row.zebra-even.selected-row:hover .frozen-cell {
      background: oklch(var(--p) / 0.25) !important;
    }

    .data-cell {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      color: oklch(var(--bc));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-right: 1px solid oklch(var(--b3) / 0.3);
    }

    .data-cell:last-child {
      border-right: none;
    }

    .cell-checkbox {
      width: 1rem;
      height: 1rem;
      accent-color: oklch(var(--p));
    }

    .cell-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      background: oklch(var(--b3) / 0.5);
    }

    .cell-badge-state-new { background: oklch(0.65 0.2 250 / 0.25); color: oklch(0.35 0.2 250); }
    .cell-badge-state-in-progress { background: oklch(0.75 0.15 85 / 0.3); color: oklch(0.45 0.15 85); }
    .cell-badge-state-on-hold { background: oklch(var(--b3) / 0.6); color: oklch(var(--bc) / 0.9); }
    .cell-badge-state-resolved { background: oklch(0.55 0.18 145 / 0.25); color: oklch(0.4 0.18 145); }
    .cell-badge-state-closed { background: oklch(var(--b4) / 0.5); color: oklch(var(--bc) / 0.8); }

    .cell-stepper {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .cell-stepper-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: oklch(var(--b3) / 0.5);
      flex-shrink: 0;
    }
    .cell-stepper-dot.done {
      background: oklch(var(--p));
    }

    .data-cell.editable-cell,
    .data-cell[data-editable] {
      cursor: pointer;
    }

    .data-cell.editable-cell:hover,
    .data-cell[data-editable]:hover {
      background: oklch(var(--b3) / 0.2);
    }

    .cell-edit-input {
      width: 100%;
      min-width: 0;
      padding: 0.25rem 0.5rem;
      border: 2px solid oklch(var(--p));
      border-radius: 0.25rem;
      font-size: inherit;
      background: oklch(var(--b1));
    }

    .data-cell:focus-visible,
    .header-cell:focus-visible,
    .header-btn:focus-visible,
    .header-btn-icon:focus-visible {
      outline: 2px solid oklch(var(--p));
      outline-offset: 2px;
    }

    .cell-link {
      color: oklch(var(--p));
      text-decoration: underline;
      cursor: pointer;
    }

    .cell-link:hover {
      text-decoration-thickness: 2px;
    }

    .cell-link:focus-visible {
      outline: 2px solid oklch(var(--p));
      outline-offset: 2px;
      border-radius: 2px;
    }

    .cell-formula {
      font-style: italic;
      color: oklch(var(--bc) / 0.85);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: oklch(var(--bc) / 0.6);
      font-size: 0.875rem;
    }

    .loading-state {
      padding: 2rem;
      text-align: center;
      color: oklch(var(--bc) / 0.6);
      font-size: 0.875rem;
    }

    /* Density: Compact (Jelly-style) — minimal whitespace, fits more rows/columns */
    :host([density='compact']) .header-cell {
      padding: 0.0625rem 0.1875rem;
      padding-right: 0.3125rem;
      font-size: 0.5rem;
    }

    :host([density='compact']) .header-cell-first-data {
      padding-left: 0.1875rem;
    }

    :host([density='compact']) .header-actions,
    :host([density='compact']) [style*='flex-shrink: 0'][style*='border-bottom'] {
      padding: 0.0625rem 0.1875rem;
      min-height: 0;
    }

    :host([density='compact']) .header-btn {
      padding: 0.0625rem 0.1875rem;
      font-size: 0.5rem;
    }

    :host([density='compact']) .header-cell-sortable {
      gap: 0.0625rem;
    }

    :host([density='compact']) .sort-indicator {
      font-size: 0.4375rem;
    }

    :host([density='compact']) .sort-order-badge {
      font-size: 0.4375rem;
    }

    :host([density='compact']) .data-row {
      min-height: 14px;
      border-bottom-width: 1px;
    }

    :host([density='compact']) .data-cell {
      padding: 0.0625rem 0.1875rem;
      font-size: 0.5rem;
    }

    :host([density='compact']) .group-header {
      min-height: 14px;
      padding: 0 0.1875rem;
      font-size: 0.4375rem;
    }

    :host([density='compact']) .group-toggle {
      font-size: 0.4375rem;
      margin-right: 0.125rem;
    }

    :host([density='compact']) .header-cell-actions,
    :host([density='compact']) .data-cell-actions {
      min-width: 40px;
      max-width: 40px;
      width: 40px;
      gap: 0.125rem;
    }

    :host([density='compact']) .actions-checkbox input {
      width: 0.5625rem;
      height: 0.5625rem;
    }

    :host([density='compact']) .actions-btn-icon {
      padding: 0.0625rem;
      min-width: 0.8125rem;
      min-height: 0.8125rem;
    }

    :host([density='compact']) .actions-icon {
      width: 0.5rem;
      height: 0.5rem;
    }

    :host([density='compact']) .cell-checkbox {
      width: 0.5625rem;
      height: 0.5625rem;
    }

    :host([density='compact']) .cell-badge {
      padding: 0 0.125rem;
      font-size: 0.4375rem;
    }

    :host([density='compact']) .filter-funnel-icon,
    :host([density='compact']) .header-btn-icon svg {
      width: 0.5rem;
      height: 0.5rem;
    }

    :host([density='compact']) .header-btn-icon {
      min-width: 0.9375rem;
      min-height: 0.9375rem;
      padding: 0.0625rem;
    }

    :host([density='compact']) .resize-handle {
      width: 4px;
    }
  `;

  @property({ type: Object })
  layout: ListLayout | null = null;

  @property({ type: Object })
  formLayout: FormLayout | null = null;

  @property({ type: Object })
  provider: DataProvider | null = null;

  @property({ type: Object })
  eventBus: NowTableEventBus | null = null;

  /** View registry for pluggable views (Grid, Kanban, Gallery, etc.). Default uses getViewForSchema(schema). */
  @property({ type: Object })
  viewRegistry: ViewRegistry | null = null;

  /** Override view selected by getViewForSchema (e.g. "grid" | "kanban" | "gallery"). */
  @property({ type: String, attribute: 'view-type' })
  viewType: ViewId | '' = '';

  /** Column id used for calendar event dates (e.g. "opened_at"). Default "opened_at". */
  @property({ type: String, attribute: 'calendar-date-column-id' })
  calendarDateColumnId: string = 'opened_at';

  /** Google Maps API key for Map view. If not set, map view shows a message to add a key. */
  @property({ type: String, attribute: 'google-maps-api-key' })
  googleMapsApiKey: string = '';

  /** Row density: "comfortable" (default, more whitespace) or "compact" (Jelly-style, minimal whitespace). */
  @property({ type: String, reflect: true })
  density: 'comfortable' | 'compact' = 'comfortable';

  /** Enable zebra striping (alternating row background) for data rows. */
  @property({ type: Boolean, attribute: 'zebra-stripes' })
  zebraStripes = false;

  @property({ type: Array, hasChanged: (a: TableRecord[], b: TableRecord[]) => a !== b })
  records: TableRecord[] = [];

  @state()
  private _records: TableRecord[] = [];

  @state()
  private _loading = false;

  @state()
  private _sortConfig: SortConfig[] = [];

  @state()
  private _columnWidths: Record<string, number> = {};

  @state()
  private _columnOrder: string[] = [];

  @state()
  private _filterConfig: FilterConfig[] = [];

  @state()
  private _hiddenColumns = new Set<string>();

  @state()
  private _groupByColumn: string | null = null;

  @state()
  private _collapsedGroups = new Set<string>();

  @state()
  private _filterPopover: { columnId: string; x: number; y: number } | null = null;

  @state()
  private _columnPickerOpen = false;

  @state()
  private _columnPickerAnchor: DOMRect | null = null;

  @state()
  private _groupByOpen = false;

  @state()
  private _groupByAnchor: DOMRect | null = null;

  @state()
  private _columnContextMenu: { column: ColumnDefinition; colIndex: number; x: number; y: number } | null = null;

  @state()
  private _editingCell: { recordId: string; columnId: string } | null = null;

  @state()
  private _editValue = '';

  @state()
  private _selectedRecordId: string | null = null;

  /** When set, the right-side form panel is open for this record (Map Edit or Grid magnify). */
  @state()
  private _formPanelRecordId: string | null = null;

  @state()
  private _fieldPopover: { recordId: string; columnId: string; x: number; y: number } | null = null;

  @state()
  private _focusedCell: { rowIndex: number; colIndex: number } | null = null;

  @state()
  private _liveRegionText = '';

  /** User-controlled freeze column count. Null means use layout.freezeColumns. */
  @state()
  private _freezeColumns: number | null = null;

  private _virtualizerRef: import('@lit-labs/virtualizer').LitVirtualizer | null = null;

  private _resizeState: { columnId: string; startX: number; startWidth: number } | null = null;

  private _freezeDrag: { startX: number; startCount: number; columnWidths: number[] } | null = null;

  private get _registry(): ViewRegistry {
    return this.viewRegistry ?? defaultViewRegistry;
  }

  /** Active view id: viewType override or getViewForSchema(layout). */
  private get _currentViewId(): ViewId {
    if (this.viewType) return this.viewType;
    return this._registry.getViewForSchema(this.layout);
  }

  private get visibleColumns(): ColumnDefinition[] {
    if (!this.layout?.columns) return [];
    const cols = this.layout.columns.filter((c) => !this._hiddenColumns.has(c.id));
    if (this._columnOrder.length > 0) {
      const orderMap = new Map(this._columnOrder.map((id, i) => [id, i]));
      return [...cols].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 999;
        const bi = orderMap.get(b.id) ?? 999;
        return ai - bi;
      });
    }
    return cols.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private get gridTemplateColumns(): string {
    const cols = this.visibleColumns;
    return cols
      .map((c, i) => {
        const w = this._columnWidths[c.id] ?? c.width ?? 180;
        const min = c.minWidth ?? 60;
        const effectiveMin = i === 0 ? Math.max(min, NowTable._FIRST_DATA_COLUMN_MIN_WIDTH) : min;
        const max = c.maxWidth ?? 800;
        const clamped = Math.max(effectiveMin, Math.min(max, w));
        return `${clamped}px`;
      })
      .join(' ');
  }

  private get totalColumnsWidth(): number {
    const cols = this.visibleColumns;
    return cols.reduce((sum, c, i) => {
      const w = this._columnWidths[c.id] ?? c.width ?? 180;
      const min = c.minWidth ?? 60;
      const effectiveMin = i === 0 ? Math.max(min, NowTable._FIRST_DATA_COLUMN_MIN_WIDTH) : min;
      const max = c.maxWidth ?? 800;
      return sum + Math.max(effectiveMin, Math.min(max, w));
    }, 0);
  }

  /** Minimum width for first data column so "Number" (or similar) header isn't cut off. */
  private static readonly _FIRST_DATA_COLUMN_MIN_WIDTH = 140;

  /** Column widths as array (for freeze handle drag). */
  private get _columnWidthsArray(): number[] {
    return this.visibleColumns.map((c, i) => {
      const w = this._columnWidths[c.id] ?? c.width ?? 180;
      const min = c.minWidth ?? 60;
      const effectiveMin = i === 0 ? Math.max(min, NowTable._FIRST_DATA_COLUMN_MIN_WIDTH) : min;
      const max = c.maxWidth ?? 800;
      return Math.max(effectiveMin, Math.min(max, w));
    });
  }

  /** Effective freeze count: user-set or layout. */
  private get _effectiveFreezeCount(): number {
    if (this._freezeColumns !== null) return this._freezeColumns;
    return this.layout?.freezeColumns ?? 0;
  }

  private static readonly _ACTIONS_COLUMN_WIDTH = 96;
  private static readonly _ACTIONS_COLUMN_WIDTH_COMPACT = 40;

  /** Gap between Actions column and first frozen data column so the header label isn't clipped on the left. */
  private static readonly _GAP_AFTER_ACTIONS = 4;

  private get _actionsColumnWidth(): number {
    return this.density === 'compact' ? NowTable._ACTIONS_COLUMN_WIDTH_COMPACT : NowTable._ACTIONS_COLUMN_WIDTH;
  }

  /** Grid template: actions column + 6px freeze-handle after frozen columns + data columns. */
  private get _gridTemplateColumnsWithHandle(): string {
    const widths = this._columnWidthsArray;
    const fc = this._effectiveFreezeCount;
    const parts = [this._actionsColumnWidth, ...widths].map((w) => `${w}px`);
    parts.splice(fc + 1, 0, '6px');
    return parts.join(' ');
  }

  private get _totalWidthWithHandle(): number {
    return this._actionsColumnWidth + this.totalColumnsWidth + 6;
  }

  private _frozenWidthSum(): number {
    return this._columnWidthsArray
      .slice(0, this._effectiveFreezeCount)
      .reduce((a, b) => a + b, 0);
  }

  private get effectiveRecords(): TableRecord[] {
    if (this._records.length > 0) return this._records;
    return this.records;
  }

  private _matchesFilter(record: TableRecord, f: FilterConfig): boolean {
    const col =
      this.visibleColumns.find((c) => c.id === f.columnId) ??
      this.layout?.columns?.find((c) => c.id === f.columnId);
    if (!col) return true;
    const v = record[col.id];
    const isEmpty = v == null || v === '';

    if (f.operator === 'empty') return isEmpty;
    if (isEmpty) return false;

    const sv = String(v);
    switch (f.operator) {
      case 'contains':
        return sv.toLowerCase().includes(String(f.value ?? '').toLowerCase());
      case 'equals':
        return sv === String(f.value ?? '');
      case 'startsWith':
        return sv.toLowerCase().startsWith(String(f.value ?? '').toLowerCase());
      case 'in':
        return Array.isArray(f.value) && f.value.includes(v);
      case 'before':
        return new Date(sv).getTime() < new Date(String(f.value ?? '')).getTime();
      case 'after':
        return new Date(sv).getTime() > new Date(String(f.value ?? '')).getTime();
      default:
        return true;
    }
  }

  private get filteredRecords(): TableRecord[] {
    let list = this.sortedRecords;
    for (const f of this._filterConfig) {
      list = list.filter((r) => this._matchesFilter(r, f));
    }
    return list;
  }

  private get virtualRows(): VirtualRow[] {
    const records = this.filteredRecords;
    const groupCol = this._groupByColumn
      ? this.visibleColumns.find((c) => c.id === this._groupByColumn)
      : null;
    if (!groupCol) {
      return records.map((r, i) => ({ type: 'data' as const, record: r, dataRowIndex: i }));
    }

    const groups = new Map<string, TableRecord[]>();
    for (const r of records) {
      const key = String(r[groupCol.id] ?? '—');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const sortedKeys = [...groups.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    const out: VirtualRow[] = [];
    let dataIdx = 0;
    for (const key of sortedKeys) {
      const recs = groups.get(key)!;
      out.push({ type: 'group', key, label: key, count: recs.length });
      if (!this._collapsedGroups.has(key)) {
        recs.forEach((r) => out.push({ type: 'data', record: r, dataRowIndex: dataIdx++ }));
      }
    }
    return out;
  }

  private _toggleGroup(key: string): void {
    const next = new Set(this._collapsedGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this._collapsedGroups = next;
  }

  private get sortedRecords(): TableRecord[] {
    const list = [...this.effectiveRecords];
    const sort = this._sortConfig.length > 0 ? this._sortConfig : this._defaultSortConfig;
    if (sort.length === 0) return list;

    const cols = this.visibleColumns;
    const getCol = (id: string) => cols.find((c) => c.id === id);

    return list.sort((a, b) => {
      for (const s of sort) {
        const col = getCol(s.columnId);
        if (!col) continue;
        const cmp = this._compareValues(a[col.id], b[col.id], col);
        if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  private get _defaultSortConfig(): SortConfig[] {
    if (this.layout?.defaultSort?.length) return this.layout.defaultSort;
    const first = this.visibleColumns[0];
    return first ? [{ columnId: first.id, direction: 'asc' }] : [];
  }

  private _compareValues(a: unknown, b: unknown, col: ColumnDefinition): number {
    const av = a == null || a === '' ? null : a;
    const bv = b == null || b === '' ? null : b;
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    const numeric = ['integer', 'decimal', 'currency', 'glide_duration'];
    const date = ['datetime', 'glide_date', 'glide_date_time'];

    if (numeric.includes(col.type)) {
      return Number(av) - Number(bv);
    }
    if (date.includes(col.type)) {
      return new Date(String(av)).getTime() - new Date(String(bv)).getTime();
    }
    if (col.type === 'boolean') {
      return (!!av ? 1 : 0) - (!!bv ? 1 : 0);
    }
    return String(av).localeCompare(String(bv), undefined, { numeric: true });
  }

  private _getSortForColumn(colId: string): SortConfig | undefined {
    return this._sortConfig.find((s) => s.columnId === colId);
  }

  private _getSortOrder(colId: string): number {
    const idx = this._sortConfig.findIndex((s) => s.columnId === colId);
    return idx >= 0 ? idx + 1 : 0;
  }

  private _stateBadgeClass(value: string): string {
    const slug = value.toLowerCase().replace(/\s+/g, '-');
    const map: Record<string, string> = {
      'new': 'cell-badge-state-new',
      'in-progress': 'cell-badge-state-in-progress',
      'on-hold': 'cell-badge-state-on-hold',
      'resolved': 'cell-badge-state-resolved',
      'closed': 'cell-badge-state-closed',
    };
    return map[slug] ?? '';
  }

  private _initColumnOrder(): void {
    if (this._columnOrder.length > 0) return;
    const cols = this.layout?.columns?.filter((c) => !c.hidden) ?? [];
    if (cols.length === 0) return;
    const sorted = [...cols].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this._columnOrder = sorted.map((c) => c.id);
  }

  private _onResizeStart(e: MouseEvent, colId: string): void {
    e.preventDefault();
    e.stopPropagation();
    const col = this.visibleColumns.find((c) => c.id === colId);
    if (!col) return;
    const w = this._columnWidths[colId] ?? col.width ?? 180;
    this._resizeState = { columnId: colId, startX: e.clientX, startWidth: w };
    const onMove = (ev: MouseEvent) => this._onResizeMove(ev);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this._resizeState = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private _onResizeMove(e: MouseEvent): void {
    if (!this._resizeState) return;
    const col = this.visibleColumns.find((c) => c.id === this._resizeState!.columnId);
    if (!col) return;
    const delta = e.clientX - this._resizeState.startX;
    let w = this._resizeState.startWidth + delta;
    const min = col.minWidth ?? 60;
    const max = col.maxWidth ?? 800;
    w = Math.max(min, Math.min(max, w));
    this._columnWidths = { ...this._columnWidths, [this._resizeState.columnId]: w };
  }

  private _onDragStart(e: DragEvent, colId: string): void {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', colId);
      e.dataTransfer.setData('application/now-table-column', colId);
      (e.target as HTMLElement).classList.add('dragging');
    }
  }

  private _onDragEnd(): void {
    this.shadowRoot?.querySelectorAll('.header-cell').forEach((el) => {
      el.classList.remove('dragging', 'drag-over');
    });
  }

  private _onDragOver(e: DragEvent, colId: string): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.shadowRoot?.querySelectorAll('.header-cell').forEach((el) => {
      el.classList.toggle('drag-over', (el as HTMLElement).dataset.columnId === colId);
    });
  }

  private _onDrop(e: DragEvent, colId: string): void {
    e.preventDefault();
    this.shadowRoot?.querySelectorAll('.header-cell').forEach((el) =>
      el.classList.remove('drag-over')
    );
    const srcId = e.dataTransfer?.getData('application/now-table-column');
    if (!srcId || srcId === colId) return;

    this._initColumnOrder();
    const order = [...this._columnOrder];
    const srcIdx = order.indexOf(srcId);
    const tgtIdx = order.indexOf(colId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    order.splice(srcIdx, 1);
    order.splice(order.indexOf(colId), 0, srcId);
    this._columnOrder = order;
  }

  private _onHeaderClick(e: MouseEvent, colId: string): void {
    this._editingCell = null;
    const idx = this._sortConfig.findIndex((s) => s.columnId === colId);
    const existing = idx >= 0 ? this._sortConfig[idx] : null;

    if (e.shiftKey) {
      const next = [...this._sortConfig];
      if (idx >= 0) {
        next[idx] = {
          columnId: colId,
          direction: existing!.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        next.push({ columnId: colId, direction: 'asc' });
      }
      this._sortConfig = next;
    } else {
      this._sortConfig = [
        { columnId: colId, direction: existing?.direction === 'asc' ? 'desc' : 'asc' },
      ];
    }

    this.eventBus?.emit({ type: 'sort-change', sortConfig: this._sortConfig });
    const col = this.visibleColumns.find((c) => c.id === colId);
    this._announce(
      `Sort by ${col?.label ?? colId} ${existing?.direction === 'asc' ? 'descending' : 'ascending'}`
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadFromProvider();
    if (this._sortConfig.length === 0 && this.layout?.defaultSort?.length) {
      this._sortConfig = [...this.layout.defaultSort];
    }
    this._initColumnOrder();
  }

  override updated(changed: Map<string, unknown>): void {
    this._virtualizerRef = this.renderRoot?.querySelector('lit-virtualizer') ?? null;

    if (changed.has('provider')) this._loadFromProvider();

    if (changed.has('layout')) {
      if (this._sortConfig.length === 0 && this.layout?.defaultSort?.length) {
        this._sortConfig = [...this.layout.defaultSort];
      }
      if (this._columnOrder.length === 0) this._initColumnOrder();

      const hidden = new Set(
        (this.layout?.columns ?? []).filter((c) => c.hidden).map((c) => c.id)
      );
      if (hidden.size > 0 && this._hiddenColumns.size === 0) {
        this._hiddenColumns = new Set(hidden);
      }
    }
  }

  private _onVisibilityChange(e: CustomEvent<{ hidden: Set<string> }>): void {
    this._hiddenColumns = new Set(e.detail.hidden);
  }

  private _toggleColumnPicker(e: MouseEvent): void {
    this._filterPopover = null;
    const opening = !this._columnPickerOpen;
    if (opening) {
      this._columnPickerAnchor = (e.currentTarget as HTMLElement).getBoundingClientRect();
    }
    this._columnPickerOpen = opening;
  }

  private _toggleGroupBy(e: MouseEvent): void {
    const opening = !this._groupByOpen;
    if (opening) {
      this._groupByAnchor = (e.currentTarget as HTMLElement).getBoundingClientRect();
    }
    this._groupByOpen = opening;
  }

  private _onHeaderContextMenu(e: MouseEvent, col: ColumnDefinition, colIndex: number): void {
    e.preventDefault();
    e.stopPropagation();
    this._columnContextMenu = { column: col, colIndex, x: e.clientX, y: e.clientY };
  }

  private _getColumnVisualizationOptions(col: ColumnDefinition): { id: string; label: string; disabled?: boolean }[] {
    const opts: { id: string; label: string; disabled?: boolean }[] = [];
    opts.push({ id: 'groupBy', label: 'Group by this column' });
    const dateTypes = ['glide_date', 'glide_date_time', 'datetime'];
    if (dateTypes.includes(col.type)) {
      opts.push({ id: 'viewCalendar', label: 'View in Calendar', disabled: true });
    }
    const locKeys = ['address', 'location', 'lat', 'lng', 'geo', 'coordinates'];
    const colHint = `${col.id} ${col.label}`.toLowerCase();
    if (locKeys.some((k) => colHint.includes(k))) {
      opts.push({ id: 'viewMap', label: 'View in Map', disabled: true });
    }
    opts.push({ id: 'freezeUpTo', label: 'Freeze columns up to here' });
    return opts;
  }

  private _onColumnContextMenuAction(actionId: string): void {
    const menu = this._columnContextMenu;
    if (!menu) return;
    const { column, colIndex } = menu;
    if (actionId === 'groupBy') {
      this._groupByColumn = this._groupByColumn === column.id ? null : column.id;
    } else if (actionId === 'viewCalendar') {
      this.viewType = 'calendar';
    } else if (actionId === 'viewMap') {
      this.viewType = 'map';
    } else if (actionId === 'freezeUpTo') {
      this._freezeColumns = colIndex + 1;
    }
    this._columnContextMenu = null;
  }

  private _onFreezeHandleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const fc = this._effectiveFreezeCount;
    this._freezeDrag = {
      startX: e.clientX,
      startCount: fc,
      columnWidths: this._columnWidthsArray,
    };
    const onMove = (ev: MouseEvent) => this._onFreezeHandleMouseMove(ev);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this._freezeDrag = null;
      this.shadowRoot?.querySelector('.freeze-handle')?.classList.remove('dragging');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    this.shadowRoot?.querySelector('.freeze-handle')?.classList.add('dragging');
  }

  private _onFreezeHandleMouseMove(e: MouseEvent): void {
    if (!this._freezeDrag) return;
    const { startCount, columnWidths } = this._freezeDrag;
    const scrollEl = this.shadowRoot?.querySelector('.table-scroll') as HTMLElement | null;
    if (!scrollEl) return;
    const contentLeft = scrollEl.getBoundingClientRect().left - scrollEl.scrollLeft;
    const x = e.clientX - contentLeft;
    let cumSum = 0;
    let newCount = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      if (x > cumSum) newCount = i + 1;
      cumSum += columnWidths[i];
      if (i === startCount - 1) cumSum += 6; // handle column between frozen and rest
    }
    if (x > cumSum) newCount = columnWidths.length;
    this._freezeColumns = Math.max(0, Math.min(columnWidths.length, newCount));
  }

  private _openFilterPopover(e: MouseEvent, col: ColumnDefinition): void {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this._filterPopover = { columnId: col.id, x: rect.left, y: rect.bottom + 4 };
  }

  private _onFilterClear(e: CustomEvent<{ columnId: string }>): void {
    this._filterConfig = this._filterConfig.filter((f) => f.columnId !== e.detail.columnId);
    this.eventBus?.emit({ type: 'filter-change', filterConfig: this._filterConfig });
    this._announce(
      `Filter cleared. ${this._filterConfig.length} filter${this._filterConfig.length === 1 ? '' : 's'} active`
    );
  }

  private _onFilterApply(e: CustomEvent<{ columnId: string; operator: FilterConfig['operator']; value?: unknown; value2?: unknown }>): void {
    const { columnId, operator, value, value2 } = e.detail;
    const next = this._filterConfig.filter((f) => f.columnId !== columnId);
    next.push({ columnId, operator, value, value2 });
    this._filterConfig = next;
    this.eventBus?.emit({ type: 'filter-change', filterConfig: this._filterConfig });
    this._announce(
      `Filter applied: ${next.length} filter${next.length === 1 ? '' : 's'} active`
    );
  }

  private _updateRecord(recordId: string, colId: string, value: unknown): void {
    const list = this._records.length > 0 ? this._records : this.records;
    const idx = list.findIndex((r) => r.id === recordId);
    if (idx < 0) return;
    const rec = list[idx];
    const oldVal = rec[colId];
    rec[colId] = value;
    if (this._records.length > 0) {
      this._records = [...this._records];
    } else {
      this.records = [...this.records];
    }
    this.eventBus?.emit({
      type: 'cell-change',
      recordId,
      columnId: colId,
      oldValue: oldVal,
      newValue: value,
    });
  }

  private _onCellClick(record: TableRecord, col: ColumnDefinition, e: Event): void {
    if (col.editable === false) return;
    if (col.editMode === 'popover') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this._fieldPopover = { recordId: record.id, columnId: col.id, x: rect.left, y: rect.bottom + 4 };
      return;
    }
    this._editingCell = { recordId: record.id, columnId: col.id };
    this._editValue = record[col.id] == null ? '' : String(record[col.id]);
    requestAnimationFrame(() => {
      const input = this.shadowRoot?.querySelector('.cell-edit-input') as HTMLInputElement | null;
      input?.focus();
    });
  }

  private _commitEdit(): void {
    if (!this._editingCell) return;
    const { recordId, columnId } = this._editingCell;
    const col = this.layout?.columns?.find((c) => c.id === columnId);
    let value: unknown = this._editValue;
    if (col?.type === 'boolean') {
      value = this._editValue === 'true' || this._editValue === '1';
    } else if (['integer', 'decimal', 'currency'].includes(col?.type ?? '')) {
      value = this._editValue ? Number(this._editValue) : null;
    }
    this._updateRecord(recordId, columnId, value);
    this._editingCell = null;
  }

  private _cancelEdit(): void {
    this._editingCell = null;
  }

  private _onFieldPopoverSave(e: CustomEvent<{ columnId: string; value: unknown }>): void {
    const rec = this.effectiveRecords.find((r) => r.id === this._fieldPopover?.recordId);
    if (rec && this._fieldPopover) {
      this._updateRecord(rec.id, e.detail.columnId, e.detail.value);
    }
    this._fieldPopover = null;
  }

  private _onFormPanelSave(e: CustomEvent<{ record: TableRecord }>): void {
    const list = this._records.length > 0 ? this._records : this.records;
    const idx = list.findIndex((r) => r.id === this._selectedRecordId);
    if (idx < 0) return;
    const rec = list[idx];
    const updated = e.detail.record;
    for (const [k, v] of Object.entries(updated)) {
      if (k !== 'id') (rec as Record<string, unknown>)[k] = v;
    }
    if (this._records.length > 0) {
      this._records = [...this._records];
    } else {
      this.records = [...this.records];
    }
    this.eventBus?.emit({ type: 'record-save', recordId: rec.id, record: { ...rec, ...updated } });
    this._selectedRecordId = null;
  }

  private async _loadFromProvider(): Promise<void> {
    if (!this.provider) return;
    this._loading = true;
    try {
      const records = await this.provider.getRecords();
      this._records = records;
      this.requestUpdate();
    } catch (e) {
      console.error('[now-table] Failed to load records:', e);
    } finally {
      this._loading = false;
    }
  }

  private _announce(text: string): void {
    this._liveRegionText = '';
    requestAnimationFrame(() => {
      this._liveRegionText = text;
      setTimeout(() => {
        this._liveRegionText = '';
      }, 500);
    });
  }

  private _onGridKeydown(e: KeyboardEvent): void {
    if (
      this._editingCell ||
      this._columnPickerOpen ||
      this._filterPopover ||
      this._fieldPopover
    ) {
      return;
    }

    const cols = this.visibleColumns;
    const rows = this.virtualRows;
    const dataRows = rows.filter((r): r is { type: 'data'; record: TableRecord; dataRowIndex: number } => r.type === 'data');
    if (cols.length === 0 || dataRows.length === 0) return;

    const rowCount = dataRows.length;
    const colCount = cols.length;
    let rowIdx = this._focusedCell?.rowIndex ?? 0;
    let colIdx = this._focusedCell?.colIndex ?? 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        rowIdx = Math.min(rowIdx + 1, rowCount - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        rowIdx = Math.max(rowIdx - 1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        colIdx = Math.min(colIdx + 1, colCount - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        colIdx = Math.max(colIdx - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        const row = dataRows[rowIdx];
        const col = cols[colIdx];
        if (row && col && col.editable !== false) {
          if (col.editMode === 'popover') {
            const cell = this.shadowRoot?.querySelector(
              `[data-focus-row="${rowIdx}"][data-focus-col="${colIdx}"]`
            );
            const rect = (cell as HTMLElement)?.getBoundingClientRect();
            this._fieldPopover = {
              recordId: row.record.id,
              columnId: col.id,
              x: rect?.left ?? 100,
              y: (rect?.bottom ?? 100) + 4,
            };
          } else {
            this._editingCell = { recordId: row.record.id, columnId: col.id };
            this._editValue = row.record[col.id] == null ? '' : String(row.record[col.id]);
            requestAnimationFrame(() => {
              const input = this.shadowRoot?.querySelector('.cell-edit-input') as HTMLInputElement | null;
              input?.focus();
            });
          }
        } else if (row) {
          this._selectedRecordId = row.record.id;
          this.eventBus?.emit({ type: 'record-select', recordId: row.record.id });
        }
        return;
      case 'Escape':
        e.preventDefault();
        this._editingCell = null;
        this._fieldPopover = null;
        this._selectedRecordId = null;
        return;
      case 'Tab':
        return;
      default:
        return;
    }

    this._focusedCell = { rowIndex: rowIdx, colIndex: colIdx };
    const focusedRow = dataRows[rowIdx];
    const virtualIdx = rows.findIndex(
      (r) => r.type === 'data' && r.record === focusedRow?.record
    );
    if (virtualIdx >= 0 && this._virtualizerRef?.scrollToIndex) {
      this._virtualizerRef.scrollToIndex(virtualIdx, 'nearest');
    }
    requestAnimationFrame(() => {
      const cell = this.shadowRoot?.querySelector(
        `[data-focus-row="${rowIdx}"][data-focus-col="${colIdx}"]`
      ) as HTMLElement | null;
      cell?.focus();
    });
  }

  private _renderCell(record: TableRecord, col: ColumnDefinition) {
    const isEditing =
      this._editingCell?.recordId === record.id && this._editingCell?.columnId === col.id;
    const editable = col.editable !== false;

    if (isEditing && editable) {
      if (col.type === 'boolean') {
        return html`
          <input
            type="checkbox"
            class="cell-checkbox"
            ?checked=${!!record[col.id]}
            @change=${(e: Event) => {
              this._updateRecord(record.id, col.id, (e.target as HTMLInputElement).checked);
              this._editingCell = null;
            }}
            @blur=${() => (this._editingCell = null)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Escape') this._cancelEdit();
            }}
          />
        `;
      }
      if (['choice', 'reference'].includes(col.type) && col.choices?.length) {
        return html`
          <select
            class="cell-edit-input"
            .value=${String(record[col.id] ?? '')}
            @change=${(e: Event) => {
              this._updateRecord(record.id, col.id, (e.target as HTMLSelectElement).value);
              this._editingCell = null;
            }}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Escape') this._cancelEdit();
            }}
          >
            <option value="">—</option>
            ${col.choices!.map((opt) => html`<option value=${opt}>${opt}</option>`)}
          </select>
        `;
      }
      if (['glide_date', 'glide_date_time', 'datetime'].includes(col.type)) {
        let val = '';
        const v = record[col.id];
        if (v) {
          try {
            const d = new Date(String(v));
            if (!isNaN(d.getTime())) {
              val =
                col.type === 'glide_date'
                  ? d.toISOString().slice(0, 10)
                  : d.toISOString().slice(0, 16);
            }
          } catch {}
        }
        return html`
          <input
            class="cell-edit-input"
            type=${col.type === 'glide_date' ? 'date' : 'datetime-local'}
            .value=${val}
            @change=${(e: Event) => {
              this._updateRecord(record.id, col.id, (e.target as HTMLInputElement).value || null);
              this._editingCell = null;
            }}
            @blur=${() => (this._editingCell = null)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Escape') this._cancelEdit();
            }}
          />
        `;
      }
      return html`
        <input
          class="cell-edit-input"
          type="text"
          .value=${this._editValue}
          @input=${(e: Event) => (this._editValue = (e.target as HTMLInputElement).value)}
          @blur=${this._commitEdit}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._commitEdit();
            if (e.key === 'Escape') this._cancelEdit();
          }}
        />
      `;
    }

    const value = record[col.id];
    if (col.id === 'progress' && typeof value === 'number') {
      const step = Math.max(0, Math.min(4, Math.floor(Number(value))));
      return html`
        <div class="cell-stepper" role="img" aria-label="Progress step ${step + 1} of 5">
          ${[0, 1, 2, 3, 4].map((i) => html`
            <span class="cell-stepper-dot ${i <= step ? 'done' : ''}"></span>
          `)}
        </div>
      `;
    }
    if (col.type === 'boolean') {
      return html`<input type="checkbox" class="cell-checkbox" ?checked=${!!value} disabled />`;
    }
    if (col.type === 'url' && value) {
      const href = String(value).startsWith('http') ? String(value) : `https://${value}`;
      return html`<a
        href="${href}"
        target="_blank"
        rel="noopener noreferrer"
        class="cell-link"
        @click=${(ev: Event) => ev.stopPropagation()}
        >${String(value)}</a
      >`;
    }
    if (col.type === 'email' && value) {
      return html`<a
        href="mailto:${String(value)}"
        class="cell-link"
        @click=${(ev: Event) => ev.stopPropagation()}
        >${String(value)}</a
      >`;
    }
    if (col.type === 'reference' && value != null && value !== '') {
      return html`<span class="cell-badge">${String(value)}</span>`;
    }
    if (['choice', 'multi_choice'].includes(col.type) && value != null && value !== '') {
      const stateClass = col.id === 'state' ? this._stateBadgeClass(String(value)) : '';
      return html`<span class="cell-badge ${stateClass}">${String(value)}</span>`;
    }
    if (['formula', 'template'].includes(col.type) && value != null && value !== '') {
      return html`<span class="cell-formula">${String(value)}</span>`;
    }
    if (['glide_date', 'glide_date_time', 'datetime'].includes(col.type) && value) {
      try {
        const d = new Date(String(value));
        if (!isNaN(d.getTime())) {
          return col.type === 'glide_date' ? d.toLocaleDateString() : d.toLocaleString();
        }
      } catch {}
    }
    return value == null || value === '' ? '—' : String(value);
  }

  private _renderRow = (row: VirtualRow, index: number) => {
    if (row.type === 'group') {
      return html`
        <div
          class="group-header"
          @click=${() => this._toggleGroup(row.key)}
          role="row"
        >
          <span class="group-toggle"
            >${this._collapsedGroups.has(row.key) ? '▶' : '▼'}</span
          >
          ${row.label} (${row.count})
        </div>
      `;
    }

    const { record, dataRowIndex } = row;
    const cols = this.visibleColumns;
    const freezeCount = this._effectiveFreezeCount;
    const isFocusedRow =
      (this._focusedCell?.rowIndex ?? 0) === dataRowIndex;

    const widths = this._columnWidthsArray;
    const renderCell = (col: ColumnDefinition, colIdx: number) => {
      const isFrozen = freezeCount > 0 && colIdx < freezeCount;
      const left =
        (isFrozen ? this._actionsColumnWidth + NowTable._GAP_AFTER_ACTIONS : 0) +
        (isFrozen && colIdx > 0 ? widths.slice(0, colIdx).reduce((a, b) => a + b, 0) : 0);
      const editable = col.editable !== false;
      const isFocusedCell = isFocusedRow && (this._focusedCell?.colIndex ?? 0) === colIdx;

      return html`
        <div
          class="data-cell ${colIdx === 0 ? 'data-cell-first-data' : ''} ${isFrozen ? 'frozen-cell' : ''} ${editable ? 'editable-cell' : ''}"
          style="${isFrozen ? `left: ${left}px;` : ''}"
          role="gridcell"
          tabindex="${isFocusedCell ? 0 : -1}"
          aria-colindex="${colIdx + 2}"
          aria-rowindex="${index + 2}"
          aria-readonly="${editable ? 'false' : 'true'}"
          data-column-id="${col.id}"
          data-record-id="${record.id}"
          data-focus-row="${dataRowIndex}"
          data-focus-col="${colIdx}"
          data-editable="${editable ? 'true' : ''}"
          @click=${editable ? (ev: Event) => this._onCellClick(record, col, ev) : undefined}
          @dblclick=${() => {
            this._selectedRecordId = record.id;
            this.eventBus?.emit({ type: 'record-select', recordId: record.id });
          }}
          @focus=${() => (this._focusedCell = { rowIndex: dataRowIndex, colIndex: colIdx })}
        >
          ${this._renderCell(record, col)}
        </div>
      `;
    };

    const spacer = html`<div style="grid-column: auto;" aria-hidden="true"></div>`;
    const actionsCell = html`
      <div
        class="data-cell data-cell-actions"
        role="gridcell"
        aria-colindex="1"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <label class="actions-checkbox" title="Select row" @click=${(e: Event) => e.stopPropagation()}>
          <input
            type="checkbox"
            ?checked=${this._selectedRecordId === record.id}
            @change=${() => {
              this._selectedRecordId = record.id;
              this.eventBus?.emit({ type: 'record-select', recordId: record.id });
            }}
          />
        </label>
        <button
          type="button"
          class="actions-btn-icon"
          title="Edit"
          aria-label="Edit"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._formPanelRecordId = record.id;
            this._selectedRecordId = record.id;
            this.eventBus?.emit({ type: 'record-select', recordId: record.id });
          }}
        >
          <svg class="actions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
      </div>
    `;
    const cells = [
      actionsCell,
      ...cols.slice(0, freezeCount).map((col, colIdx) => renderCell(col, colIdx)),
      spacer,
      ...cols.slice(freezeCount).map((col, colIdx) => renderCell(col, freezeCount + colIdx)),
    ];

    const isSelectedRow = this._selectedRecordId === record.id;
    const zebraClass = this.zebraStripes ? (dataRowIndex % 2 === 0 ? 'zebra-even' : '') : '';
    return html`
      <div
        class="data-row ${isSelectedRow ? 'selected-row' : ''} ${zebraClass}"
        role="row"
        aria-rowindex="${index + 2}"
        style="grid-template-columns: ${this._gridTemplateColumnsWithHandle}"
      >
        ${cells}
      </div>
    `;
  };

  private _getViewProps(): ViewProps {
    const viewId = this._currentViewId;
    return {
      layout: this.layout,
      formLayout: this.formLayout,
      records: this.effectiveRecords,
      columns: this.visibleColumns,
      eventBus: this.eventBus,
      selectedRecordId: this._selectedRecordId,
      onRecordSelect: (id) => {
        this._selectedRecordId = id;
        if (id) this.eventBus?.emit({ type: 'record-select', recordId: id });
        if (id && viewId !== 'forms' && viewId !== 'map') this._formPanelRecordId = id;
      },
      onRecordUpdate: (recordId, columnId, value) => this._updateRecord(recordId, columnId, value),
      onRecordEdit: (recordId) => {
        this._formPanelRecordId = recordId;
        this._selectedRecordId = recordId;
        this.eventBus?.emit({ type: 'record-select', recordId: recordId });
      },
    };
  }

  private _formPanelRecord(): TableRecord | null {
    const id = this._formPanelRecordId;
    if (!id) return null;
    return this.effectiveRecords.find((r) => r.id === id) ?? null;
  }

  private _renderFormPanel() {
    const viewId = this._currentViewId;
    if (viewId === 'forms') return '';
    const rec = this._formPanelRecord();
    if (!rec) return '';
    const columns = this.visibleColumns;
    return html`
      <form-panel
        .formLayout=${this.formLayout}
        .record=${rec}
        .layoutColumns=${columns}
        @save=${this._onFormPanelSave}
        @close=${() => (this._formPanelRecordId = null)}
      ></form-panel>
    `;
  }

  override render() {
    const viewId = this._currentViewId;
    if (viewId !== 'grid') {
      const viewProps = this._getViewProps();
      return html`
        <div class="table-container" role="region" aria-label="${viewId} view">
          <div class="header-actions" style="flex-shrink: 0; border-bottom: 1px solid oklch(var(--b3));">
            <span class="text-sm font-medium text-base-content/80">View: ${viewId}</span>
          </div>
          ${viewId === 'kanban'
            ? html`<now-table-kanban-view .viewProps=${viewProps} .groupByColumnId=${this._groupByColumn ?? ''}></now-table-kanban-view>`
            : ''}
          ${viewId === 'gallery' ? html`<now-table-gallery-view .viewProps=${viewProps}></now-table-gallery-view>` : ''}
          ${viewId === 'forms' ? html`<now-table-forms-view .viewProps=${viewProps}></now-table-forms-view>` : ''}
          ${viewId === 'calendar' ? html`<now-table-calendar-view .viewProps=${viewProps} .dateColumnId=${this.calendarDateColumnId || 'opened_at'}></now-table-calendar-view>` : ''}
          ${viewId === 'map' ? html`<now-table-map-view .viewProps=${viewProps} .googleMapsApiKey=${this.googleMapsApiKey}></now-table-map-view>` : ''}
          ${this._renderFormPanel()}
        </div>
      `;
    }
    return this._renderGridView();
  }

  private _renderGridView() {
    const columns = this.visibleColumns;

    if (!columns.length) {
      return html`
        <div class="table-container">
          <div class="empty-state">
            Configure columns via <code>layout.columns</code> to render the table.
          </div>
        </div>
      `;
    }

    if (this._loading) {
      return html`
        <div class="table-container">
          <div
            class="header-row"
            style="grid-template-columns: ${this.gridTemplateColumns}"
            role="rowgroup"
          >
            ${columns.map((col, i) => html`
              <div class="header-cell" role="columnheader" aria-colindex="${i + 1}">
                ${col.label}
                <span class="resize-handle" role="separator" aria-hidden="true" title="Resize column"></span>
              </div>
            `)}
          </div>
          <div class="loading-state">Loading records…</div>
        </div>
      `;
    }

    const rowCount = this.virtualRows.length + 1;
    const freezeCount = this._effectiveFreezeCount;
    const allColumns = this.layout?.columns ?? [];
    const hiddenSet = new Set([
      ...this._hiddenColumns,
      ...allColumns.filter((c) => c.hidden).map((c) => c.id),
    ]);

    return html`
      <div
        class="table-container"
        role="grid"
        aria-rowcount="${rowCount}"
        aria-colcount="${columns.length}"
        aria-label="Data table"
        tabindex="0"
        @keydown=${this._onGridKeydown}
      >
        <div aria-live="polite" aria-atomic="true" class="sr-only">${this._liveRegionText}</div>
        <div style="display: flex; align-items: center; flex-shrink: 0; border-bottom: 1px solid oklch(var(--b3)); padding: 0 0.5rem;">
          <div class="header-actions-left">
            <span style="font-size: 0.75rem; color: oklch(var(--bc) / 0.7);"
              >${this._filterConfig.length ? `Filters: ${this._filterConfig.length}` : ''}</span
            >
          </div>
          <div class="header-actions">
            <button
              class="header-btn"
              title="Show/hide columns"
              @click=${(e: MouseEvent) => this._toggleColumnPicker(e)}
            >
              <span class="glyph" aria-hidden="true">▦</span>
              <span>Columns</span>
            </button>
            <button
              class="header-btn ${this._groupByColumn ? 'active' : ''}"
              title="Group by column"
              @click=${(e: MouseEvent) => this._toggleGroupBy(e)}
            >
              <span class="glyph" aria-hidden="true">⊞</span>
              <span>${this._groupByColumn
                ? `Group: ${columns.find((c) => c.id === this._groupByColumn)?.label ?? ''} ✕`
                : 'Group by'}</span>
            </button>
          </div>
          ${this._groupByOpen
            ? html`
                <div class="overlay-modal" @click=${() => (this._groupByOpen = false)}></div>
                <div
                  class="modal-focus-panel"
                  style="top: ${(this._groupByAnchor?.bottom ?? 0) + 4}px; left: ${this._groupByAnchor?.left ?? 0}px;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <div class="popover-header">Group by column</div>
                  ${columns.map((col) => html`
                    <button
                      class="group-by-option ${this._groupByColumn === col.id ? 'active' : ''}"
                      @click=${() => {
                        this._groupByColumn = this._groupByColumn === col.id ? null : col.id;
                        this._groupByOpen = false;
                      }}
                    >
                      ${col.label}
                    </button>
                  `)}
                </div>
              `
            : ''}
        </div>
        ${this._columnPickerOpen
          ? html`
              <div class="overlay-modal" @click=${() => (this._columnPickerOpen = false)}></div>
              <div
                class="modal-focus-panel columns-panel"
                style="top: ${(this._columnPickerAnchor?.bottom ?? 0) + 4}px; left: ${this._columnPickerAnchor?.left ?? 0}px;"
                @click=${(e: Event) => e.stopPropagation()}
                @visibility-change=${this._onVisibilityChange}
              >
                <column-picker .columns=${allColumns} .hiddenIds=${hiddenSet}></column-picker>
              </div>
            `
          : ''}
        ${this._columnContextMenu
          ? (() => {
              const { column, x, y } = this._columnContextMenu;
              const options = this._getColumnVisualizationOptions(column);
              return html`
                <div class="overlay-modal" @click=${() => (this._columnContextMenu = null)}></div>
                <div
                  class="modal-focus-panel"
                  style="top: ${y + 4}px; left: ${x}px;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <div class="popover-header">${column.label}</div>
                  ${options.map(
                    (opt) => html`
                      <button
                        class="context-menu-option"
                        ?disabled=${opt.disabled}
                        @click=${() => !opt.disabled && this._onColumnContextMenuAction(opt.id)}
                      >
                        ${opt.label}${opt.disabled ? ' (soon)' : ''}
                      </button>
                    `
                  )}
                </div>
              `;
            })()
          : ''}
        ${this._filterPopover
          ? (() => {
              const col = this.layout?.columns?.find((c) => c.id === this._filterPopover!.columnId);
              if (!col) return '';
              const choiceValues =
                col.choices ??
                [...new Set(this.effectiveRecords.map((r) => String(r[col.id] ?? '')).filter(Boolean))].slice(0, 50);
              return html`
                <div class="overlay" @click=${() => (this._filterPopover = null)}></div>
                <filter-popover
                  .column=${col}
                  .filter=${this._filterConfig.find((f) => f.columnId === this._filterPopover!.columnId) ?? null}
                  .choiceValues=${choiceValues}
                  .x=${this._filterPopover!.x}
                  .y=${this._filterPopover!.y}
                  @filter-apply=${this._onFilterApply}
                  @filter-clear=${this._onFilterClear}
                  @close=${() => (this._filterPopover = null)}
                ></filter-popover>
              `;
            })()
          : ''}
        ${this._fieldPopover
          ? (() => {
              const rec = this.effectiveRecords.find((r) => r.id === this._fieldPopover!.recordId);
              const col = this.layout?.columns?.find((c) => c.id === this._fieldPopover!.columnId);
              if (!rec || !col) return '';
              return html`
                <div class="overlay" @click=${() => (this._fieldPopover = null)}></div>
                <field-popover
                  .column=${col}
                  .record=${rec}
                  .x=${this._fieldPopover!.x}
                  .y=${this._fieldPopover!.y}
                  @save=${this._onFieldPopoverSave}
                  @close=${() => (this._fieldPopover = null)}
                ></field-popover>
              `;
            })()
          : ''}
        ${this._formPanelRecord()
          ? (() => {
              const rec = this._formPanelRecord();
              if (!rec) return '';
              return html`
                <form-panel
                  .formLayout=${this.formLayout}
                  .record=${rec}
                  .layoutColumns=${columns}
                  @save=${this._onFormPanelSave}
                  @close=${() => (this._formPanelRecordId = null)}
                ></form-panel>
              `;
            })()
          : ''}
        <div class="table-scroll">
          <div class="table-scroll-content" style="min-width: ${this._totalWidthWithHandle}px;">
            <div
              class="header-row"
              style="grid-template-columns: ${this._gridTemplateColumnsWithHandle}; min-width: ${this._totalWidthWithHandle}px;"
              role="row"
              aria-rowindex="1"
            >
              <div class="header-cell header-cell-actions" role="columnheader" aria-colindex="1" title="Actions column">
                <span class="header-cell-actions-inner">Actions</span>
              </div>
              ${columns.map((col, i) => {
                const sort = this._getSortForColumn(col.id);
                const order = this._getSortOrder(col.id);
                const isFrozen = freezeCount > 0 && i < freezeCount;
                const widths = this._columnWidthsArray;
                const left =
                  (isFrozen ? this._actionsColumnWidth + NowTable._GAP_AFTER_ACTIONS : 0) +
                  (isFrozen && i > 0 ? widths.slice(0, i).reduce((a, b) => a + b, 0) : 0);
                const cell = html`
                  <div
                    class="header-cell ${isFrozen ? 'frozen-cell' : ''} ${i === 0 ? 'header-cell-first-data' : ''}"
                    style="${isFrozen ? `left: ${left}px;` : ''}"
                    role="columnheader"
                    aria-colindex="${i + 2}"
                    aria-sort="${sort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"
                    data-column-id="${col.id}"
                    draggable="true"
                    @click=${(e: MouseEvent) => this._onHeaderClick(e, col.id)}
                    @contextmenu=${(e: MouseEvent) => this._onHeaderContextMenu(e, col, i)}
                    @dragstart=${(e: DragEvent) => this._onDragStart(e, col.id)}
                    @dragend=${this._onDragEnd}
                    @dragover=${(e: DragEvent) => this._onDragOver(e, col.id)}
                    @drop=${(e: DragEvent) => this._onDrop(e, col.id)}
                    title="${sort ? 'Click to change sort. ' : 'Click to sort. '}Shift+click for multi-sort. Right-click for options. Drag to reorder."
                  >
                    <span class="header-cell-sortable">
                      <span class="header-cell-label">${col.label}</span>
                      ${sort
                        ? html`
                            <span class="sort-indicator" aria-hidden="true"
                              >${sort.direction === 'asc' ? '▲' : '▼'}</span
                            >
                            ${order > 1 ? html`<span class="sort-order-badge">${order}</span>` : ''}
                          `
                        : ''}
                      <button
                        class="header-btn-icon ${this._filterConfig.some((f) => f.columnId === col.id) ? 'active' : ''}"
                        title="Filter column"
                        @click=${(e: MouseEvent) => this._openFilterPopover(e, col)}
                        aria-label="Filter column"
                      >
                        <svg class="filter-funnel-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M1 2h14l-3.5 5v5H4.5V7L1 2z"/>
                        </svg>
                      </button>
                    </span>
                    <span
                      class="resize-handle"
                      role="separator"
                      aria-hidden="true"
                      title="Drag to resize column"
                      @mousedown=${(e: MouseEvent) => this._onResizeStart(e, col.id)}
                      @click=${(e: Event) => e.stopPropagation()}
                    ></span>
                  </div>
                `;
                if (i === freezeCount) {
                  const handleLeft = this._actionsColumnWidth + NowTable._GAP_AFTER_ACTIONS + this._frozenWidthSum() - 3;
                  return html`
                    <div
                      class="freeze-handle"
                      style="left: ${handleLeft}px;"
                      title="Drag to freeze or unfreeze columns"
                      role="separator"
                      aria-label="Freeze columns handle"
                      @mousedown=${this._onFreezeHandleMouseDown}
                    ></div>
                    ${cell}
                  `;
                }
                return cell;
              })}
            </div>
            <div class="virtualizer-wrapper" style="min-width: ${this._totalWidthWithHandle}px;">
              <lit-virtualizer
                .items=${this.virtualRows}
                .renderItem=${this._renderRow}
                .keyFunction=${(r: VirtualRow) => (r.type === 'data' ? r.record.id : `group-${r.key}`)}
              ></lit-virtualizer>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'now-table': NowTable;
  }
}
