import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FormLayout, TableRecord } from '../data/ListLayout.js';

@customElement('form-panel')
export class FormPanel extends LitElement {
  static override styles = css`
    .panel-overlay {
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.3);
      z-index: 200;
      animation: fadeIn 0.2s ease;
    }
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 90vw;
      height: 100%;
      background: oklch(var(--b1));
      box-shadow: -4px 0 24px oklch(0 0 0 / 0.15);
      z-index: 201;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .panel-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid oklch(var(--b3));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-title {
      font-weight: 600;
      font-size: 1rem;
    }
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: oklch(var(--bc) / 0.8);
      margin-bottom: 0.25rem;
    }
    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .form-input:focus {
      outline: 2px solid oklch(var(--p));
      outline-offset: 0;
    }
    .panel-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid oklch(var(--b3));
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      border: 1px solid oklch(var(--b3));
    }
    .btn-primary {
      background: oklch(var(--p));
      color: oklch(var(--pc));
      border-color: oklch(var(--p));
    }
  `;

  @property({ type: Object }) formLayout: FormLayout | null = null;
  @property({ type: Object }) record: TableRecord | null = null;
  @property({ type: Object }) layoutColumns: { id: string; label: string; type: string; choices?: string[] }[] = [];

  @state() private _draft: Record<string, unknown> = {};

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('record') && this.record) {
      this._draft = { ...this.record };
    }
  }

  private _getFields() {
    if (this.formLayout?.fields?.length) {
      return this.formLayout.fields;
    }
    return this.layoutColumns.map((c) => ({
      id: c.id,
      label: c.label,
      type: c.type,
      choices: c.choices,
    }));
  }

  private _renderField(id: string, _label: string, type: string, choices?: string[]) {
    const value = this._draft[id];
    if (type === 'boolean') {
      return html`
        <input
          type="checkbox"
          ?checked=${!!value}
          @change=${(e: Event) => { this._draft = { ...this._draft, [id]: (e.target as HTMLInputElement).checked }; }}
        />
      `;
    }
    if (['choice', 'multi_choice', 'reference'].includes(type) && choices?.length) {
      return html`
        <select
          class="form-input"
          .value=${String(value ?? '')}
          @change=${(e: Event) => { this._draft = { ...this._draft, [id]: (e.target as HTMLSelectElement).value }; }}
        >
          <option value="">—</option>
          ${choices.map((c) => html`<option value=${c}>${c}</option>`)}
        </select>
      `;
    }
    if (['glide_date', 'glide_date_time', 'datetime'].includes(type)) {
      let inputValue = '';
      if (value) {
        try {
          const d = new Date(String(value));
          if (!isNaN(d.getTime())) {
            inputValue = type === 'glide_date' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 16);
          }
        } catch { /* ignore */ }
      }
      return html`
        <input
          class="form-input"
          type=${type === 'glide_date' ? 'date' : 'datetime-local'}
          .value=${inputValue}
          @input=${(e: Event) => { this._draft = { ...this._draft, [id]: (e.target as HTMLInputElement).value }; }}
        />
      `;
    }
    return html`
      <input
        class="form-input"
        type="text"
        .value=${String(value ?? '')}
        @input=${(e: Event) => { this._draft = { ...this._draft, [id]: (e.target as HTMLInputElement).value }; }}
      />
    `;
  }

  private _save() {
    this.dispatchEvent(new CustomEvent('save', { detail: { record: this._draft }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _cancel() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  override render() {
    if (!this.record) return '';
    const fields = this._getFields();
    return html`
      <div class="panel-overlay" @click=${this._cancel}></div>
      <div class="panel" @click=${(e: Event) => e.stopPropagation()}>
        <div class="panel-header">
          <span class="panel-title">Edit Record</span>
          <button class="btn" @click=${this._cancel}>✕</button>
        </div>
        <div class="panel-body">
          ${fields.map((f) => html`
            <div class="form-group">
              <label class="form-label">${f.label}</label>
              ${this._renderField(f.id, f.label, f.type, f.choices)}
            </div>
          `)}
        </div>
        <div class="panel-footer">
          <button class="btn" @click=${this._cancel}>Cancel</button>
          <button class="btn btn-primary" @click=${this._save}>Save</button>
        </div>
      </div>
    `;
  }
}
