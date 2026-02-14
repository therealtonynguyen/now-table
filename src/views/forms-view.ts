import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ViewProps } from './view-props.js';
import type { TableRecord } from '../data/ListLayout.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

@customElement('now-table-forms-view')
export class NowTableFormsView extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: 280px 1fr;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0;
    }
    .record-list {
      border-right: 1px solid oklch(var(--b3));
      overflow-y: auto;
      background: oklch(var(--b2) / 0.3);
    }
    .record-list-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.8125rem;
      border-bottom: 1px solid oklch(var(--b3));
    }
    .record-item {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      cursor: pointer;
      border-bottom: 1px solid oklch(var(--b3) / 0.5);
    }
    .record-item:hover {
      background: oklch(var(--b3) / 0.3);
    }
    .record-item.active {
      background: oklch(var(--p) / 0.15);
      font-weight: 500;
    }
    .form-area {
      overflow-y: auto;
      padding: 1.5rem;
      background: oklch(var(--b1));
    }
    .form-placeholder {
      color: oklch(var(--bc) / 0.6);
      font-size: 0.875rem;
      text-align: center;
      padding: 3rem 2rem;
    }
    .form-fields {
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .form-field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: oklch(var(--bc) / 0.8);
    }
    .form-field input,
    .form-field select {
      padding: 0.5rem 0.75rem;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.375rem;
      font-size: 0.8125rem;
    }
  `;

  @property({ type: Object }) viewProps: ViewProps | null = null;

  private _primaryColumn(): ColumnDefinition | undefined {
    return this.viewProps?.columns?.[0];
  }

  private _recordLabel(record: TableRecord): string {
    const col = this._primaryColumn();
    if (col && record[col.id] != null && record[col.id] !== '') return String(record[col.id]);
    return record.id;
  }

  override render() {
    const props = this.viewProps;
    const records = props?.records ?? [];
    const formLayout = props?.formLayout;
    const selectedId = props?.selectedRecordId;
    const selected = selectedId ? records.find((r) => r.id === selectedId) : null;

    if (!props) return html`<div></div>`;

    return html`
      <div class="record-list">
        <div class="record-list-header">Records</div>
        ${records.map(
          (r) => html`
            <div
              class="record-item ${selectedId === r.id ? 'active' : ''}"
              @click=${() => props.onRecordSelect(r.id)}
            >
              ${this._recordLabel(r)}
            </div>
          `
        )}
      </div>
      <div class="form-area">
        ${selected && formLayout
          ? html`
              <div class="form-fields">
                ${formLayout.fields.map(
                  (f) => html`
                    <div class="form-field">
                      <label>${f.label}</label>
                      <input type="text" .value=${String(selected[f.id] ?? '')} readonly />
                    </div>
                  `
                )}
              </div>
            `
          : html`<div class="form-placeholder">Select a record to view details</div>`}
      </div>
    `;
  }
}
