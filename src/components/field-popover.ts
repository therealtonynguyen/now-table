import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnDefinition, TableRecord } from '../data/ListLayout.js';

@customElement('field-popover')
export class FieldPopover extends LitElement {
  static override styles = css`
    .popover {
      position: fixed;
      z-index: 150;
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px oklch(0 0 0 / 0.15);
      min-width: 200px;
      padding: 0.75rem;
    }
    .form-group { margin-bottom: 0.5rem; }
    .form-label { font-size: 0.75rem; color: oklch(var(--bc) / 0.8); margin-bottom: 0.25rem; display: block; }
    .form-input { width: 100%; padding: 0.375rem; border: 1px solid oklch(var(--b3)); border-radius: 0.25rem; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.75rem; }
    .btn { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 0.25rem; cursor: pointer; border: 1px solid oklch(var(--b3)); }
    .btn-primary { background: oklch(var(--p)); color: oklch(var(--pc)); border-color: oklch(var(--p)); }
  `;

  @property({ type: Object }) column!: ColumnDefinition;
  @property({ type: Object }) record!: TableRecord;
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;

  @state() private _value: unknown;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('record') && this.record) {
      this._value = this.record[this.column.id];
    }
  }

  private _renderInput() {
    const col = this.column;
    if (col.type === 'boolean') {
      return html`
        <input type="checkbox" ?checked=${!!this._value}
          @change=${(e: Event) => { this._value = (e.target as HTMLInputElement).checked; }} />
      `;
    }
    if (['choice', 'reference'].includes(col.type) && col.choices?.length) {
      return html`
        <select class="form-input" .value=${String(this._value ?? '')}
          @change=${(e: Event) => { this._value = (e.target as HTMLSelectElement).value; }}>
          <option value="">—</option>
          ${col.choices.map((c) => html`<option value=${c}>${c}</option>`)}
        </select>
      `;
    }
    if (['glide_date', 'glide_date_time', 'datetime'].includes(col.type)) {
      let v = '';
      if (this._value) {
        try {
          const d = new Date(String(this._value));
          if (!isNaN(d.getTime())) v = col.type === 'glide_date' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 16);
        } catch { /* ignore */ }
      }
      return html`
        <input class="form-input" type=${col.type === 'glide_date' ? 'date' : 'datetime-local'} .value=${v}
          @input=${(e: Event) => { this._value = (e.target as HTMLInputElement).value; }} />
      `;
    }
    return html`
      <input class="form-input" type="text" .value=${String(this._value ?? '')}
        @input=${(e: Event) => { this._value = (e.target as HTMLInputElement).value; }} />
    `;
  }

  private _save() {
    this.dispatchEvent(new CustomEvent('save', { detail: { columnId: this.column.id, value: this._value }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <div class="popover" style="left: ${this.x}px; top: ${this.y}px">
        <div class="form-group">
          <label class="form-label">${this.column.label}</label>
          ${this._renderInput()}
        </div>
        <div class="form-actions">
          <button class="btn" @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}>Cancel</button>
          <button class="btn btn-primary" @click=${this._save}>Save</button>
        </div>
      </div>
    `;
  }
}
