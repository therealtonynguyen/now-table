import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ViewProps } from './view-props.js';
import type { TableRecord } from '../data/ListLayout.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

@customElement('now-table-gallery-view')
export class NowTableGalleryView extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }
    .card {
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      padding: 1rem;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .card:hover {
      box-shadow: 0 4px 12px oklch(0 0 0 / 0.1);
      border-color: oklch(var(--b4));
    }
    .card.active {
      border-color: oklch(var(--p));
      background: oklch(var(--p) / 0.08);
    }
    .card-title {
      font-weight: 600;
      font-size: 0.9375rem;
      margin-bottom: 0.5rem;
      color: oklch(var(--bc));
    }
    .card-fields {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: oklch(var(--bc) / 0.8);
    }
    .card-field {
      display: flex;
      gap: 0.5rem;
    }
    .card-field-label {
      flex: 0 0 80px;
      color: oklch(var(--bc) / 0.6);
    }
  `;

  @property({ type: Object }) viewProps: ViewProps | null = null;

  private _displayColumns(): ColumnDefinition[] {
    const cols = this.viewProps?.columns ?? [];
    return cols.slice(0, 4);
  }

  private _formatValue(record: TableRecord, col: ColumnDefinition): string {
    const v = record[col.id];
    if (v == null || v === '') return '—';
    if (['glide_date', 'glide_date_time', 'datetime'].includes(col.type)) {
      try {
        const d = new Date(String(v));
        if (!isNaN(d.getTime())) return col.type === 'glide_date' ? d.toLocaleDateString() : d.toLocaleString();
      } catch {}
    }
    return String(v);
  }

  private _onCardClick(record: TableRecord) {
    this.viewProps?.onRecordSelect(record.id);
  }

  override render() {
    const records = this.viewProps?.records ?? [];
    const displayCols = this._displayColumns();
    const titleCol = displayCols[0];
    const restCols = displayCols.slice(1);

    if (!this.viewProps) return html`<div></div>`;

    return html`
      <div class="gallery">
        ${records.map(
          (record) => html`
            <div
              class="card ${this.viewProps!.selectedRecordId === record.id ? 'active' : ''}"
              @click=${() => this._onCardClick(record)}
            >
              <div class="card-title">${titleCol ? (record[titleCol.id] != null ? String(record[titleCol.id]) : record.id) : record.id}</div>
              <div class="card-fields">
                ${restCols.map(
                  (col) => html`
                    <div class="card-field">
                      <span class="card-field-label">${col.label}:</span>
                      <span>${this._formatValue(record, col)}</span>
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
