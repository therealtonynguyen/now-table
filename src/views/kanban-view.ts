import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ViewProps } from './view-props.js';
import type { TableRecord } from '../data/ListLayout.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

@customElement('now-table-kanban-view')
export class NowTableKanbanView extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .kanban {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      min-height: 100%;
      align-items: flex-start;
    }
    .lane {
      flex: 0 0 280px;
      background: oklch(var(--b2) / 0.4);
      border-radius: 0.5rem;
      border: 1px solid oklch(var(--b3));
      max-height: 100%;
      display: flex;
      flex-direction: column;
      min-height: 200px;
    }
    .lane-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.8125rem;
      border-bottom: 1px solid oklch(var(--b3));
      flex-shrink: 0;
    }
    .lane-cards {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card {
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: box-shadow 0.15s;
    }
    .card:hover {
      box-shadow: 0 2px 8px oklch(0 0 0 / 0.1);
    }
    .card.active {
      border-color: oklch(var(--p));
      background: oklch(var(--p) / 0.1);
    }
    .card.dragging {
      opacity: 0.6;
    }
    .lane.drag-over .lane-cards {
      background: oklch(var(--p) / 0.08);
      border-radius: 0.25rem;
    }
    .card-title {
      font-weight: 600;
      font-size: 0.8125rem;
      margin-bottom: 0.25rem;
    }
    .card-meta {
      font-size: 0.75rem;
      color: oklch(var(--bc) / 0.7);
    }
  `;

  @property({ type: Object }) viewProps: ViewProps | null = null;
  @property({ type: String }) groupByColumnId: string = '';

  private _dragOverLane: string | null = null;

  private get _groupColumn(): ColumnDefinition | undefined {
    const cols = this.viewProps?.columns ?? [];
    if (this.groupByColumnId) return cols.find((c) => c.id === this.groupByColumnId);
    return cols.find((c) => c.type === 'choice' || c.type === 'reference');
  }

  private get _lanes(): { value: string; label: string }[] {
    const col = this._groupColumn;
    if (!col) return [];
    if (!col.choices?.length) {
      const records = this.viewProps?.records ?? [];
      const set = new Set<string>();
      records.forEach((r) => {
        const v = r[col.id];
        if (v != null && v !== '') set.add(String(v));
      });
      return [...set].sort().map((v) => ({ value: v, label: v }));
    }
    return col.choices.map((v) => ({ value: v, label: v }));
  }

  private _recordsByLane(laneValue: string): TableRecord[] {
    const col = this._groupColumn;
    const records = this.viewProps?.records ?? [];
    if (!col) return records;
    const colId = col.id;
    return records.filter((r) => String(r[colId] ?? '') === laneValue);
  }

  private _displayColumns(): ColumnDefinition[] {
    const cols = this.viewProps?.columns ?? [];
    const groupId = this._groupColumn?.id;
    return cols.filter((c) => c.id !== groupId).slice(0, 3);
  }

  private _onCardClick(ev: Event, record: TableRecord) {
    ev.stopPropagation();
    this.viewProps?.onRecordSelect(record.id);
  }

  private _onDragStart(e: DragEvent, record: TableRecord) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/now-table-record', record.id);
    }
    (e.target as HTMLElement).classList.add('dragging');
  }

  private _onDragEnd() {
    this._dragOverLane = null;
    this.shadowRoot?.querySelectorAll('.card').forEach((el) => el.classList.remove('dragging'));
    this.shadowRoot?.querySelectorAll('.lane').forEach((el) => el.classList.remove('drag-over'));
  }

  private _onDragOver(e: DragEvent, laneValue: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this._dragOverLane = laneValue;
    const lane = (e.currentTarget as HTMLElement).closest('.lane');
    this.shadowRoot?.querySelectorAll('.lane').forEach((el) => el.classList.toggle('drag-over', el === lane));
  }

  private _onDrop(e: DragEvent, laneValue: string): void {
    e.preventDefault();
    this._dragOverLane = null;
    this.shadowRoot?.querySelectorAll('.lane').forEach((el) => el.classList.remove('drag-over'));
    const recordId = e.dataTransfer?.getData('application/now-table-record');
    const col = this._groupColumn;
    if (!recordId || !col || !this.viewProps) return;
    this.viewProps.onRecordUpdate(recordId, col.id, laneValue);
    this.viewProps.eventBus?.emit({ type: 'cell-change', recordId, columnId: col.id, oldValue: undefined, newValue: laneValue });
  }

  override render() {
    const col = this._groupColumn;
    const displayCols = this._displayColumns();
    if (!col || !this.viewProps) {
      return html`
        <div style="padding: 2rem; text-align: center; color: oklch(var(--bc) / 0.6);">
          No choice or reference column for Kanban. Add a column with choices to use this view.
        </div>
      `;
    }

    const lanes = this._lanes;
    return html`
      <div class="kanban" @dragend=${this._onDragEnd}>
        ${lanes.map(
          (lane) => html`
            <div
              class="lane ${this._dragOverLane === lane.value ? 'drag-over' : ''}"
              @dragover=${(e: DragEvent) => this._onDragOver(e, lane.value)}
              @drop=${(e: DragEvent) => this._onDrop(e, lane.value)}
            >
              <div class="lane-header">${lane.label}</div>
              <div class="lane-cards">
                ${this._recordsByLane(lane.value).map(
                  (record) => html`
                    <div
                      class="card ${this.viewProps!.selectedRecordId === record.id ? 'active' : ''}"
                      draggable="true"
                      @click=${(e: Event) => this._onCardClick(e, record)}
                      @dragstart=${(e: DragEvent) => this._onDragStart(e, record)}
                    >
                      <div class="card-title">${record[displayCols[0]?.id] ?? record.id}</div>
                      ${displayCols[1] ? html`<div class="card-meta">${String(record[displayCols[1].id] ?? '')}</div>` : ''}
                    </div>
                  `
                )}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}
