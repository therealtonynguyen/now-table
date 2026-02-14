import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

@customElement('column-picker')
export class ColumnPicker extends LitElement {
  static override styles = css`
    :host { display: block; }
    .popover {
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px oklch(0 0 0 / 0.15);
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
    }
    .popover-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid oklch(var(--b3));
      font-weight: 600;
      font-size: 0.875rem;
    }
    .column-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .column-item:hover {
      background: oklch(var(--b2) / 0.5);
    }
    .column-item input {
      flex-shrink: 0;
    }
  `;

  @property({ type: Array }) columns: ColumnDefinition[] = [];
  @property({ type: Object }) hiddenIds: Set<string> = new Set();

  private _toggle(col: ColumnDefinition) {
    const next = new Set(this.hiddenIds);
    if (next.has(col.id)) next.delete(col.id);
    else next.add(col.id);
    this.dispatchEvent(new CustomEvent('visibility-change', {
      detail: { hidden: next },
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    return html`
      <div class="popover">
        <div class="popover-header">Columns</div>
        ${this.columns.map((col) => html`
          <label class="column-item">
            <input
              type="checkbox"
              ?checked=${!this.hiddenIds.has(col.id)}
              @change=${() => this._toggle(col)}
            />
            ${col.label}
          </label>
        `)}
      </div>
    `;
  }
}
