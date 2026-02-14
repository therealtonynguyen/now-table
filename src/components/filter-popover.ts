import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ColumnDefinition, FilterConfig, FilterOperator } from '../data/ListLayout.js';

@customElement('filter-popover')
export class FilterPopover extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .popover {
      position: fixed;
      z-index: 100;
      background: oklch(var(--b1));
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px oklch(0 0 0 / 0.15);
      min-width: 240px;
      max-width: 320px;
    }
    .popover-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid oklch(var(--b3));
      font-weight: 600;
      font-size: 0.875rem;
    }
    .popover-body {
      padding: 0.75rem 1rem;
    }
    .filter-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .filter-row:last-child {
      margin-bottom: 0;
    }
    select, input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.25rem;
      font-size: 0.8125rem;
    }
    .btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      border: 1px solid oklch(var(--b3));
      background: oklch(var(--b2));
    }
    .btn-ghost {
      background: transparent;
      border: none;
      color: oklch(var(--bc) / 0.7);
    }
    .choices-list {
      max-height: 160px;
      overflow-y: auto;
    }
    .choice-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .choice-item input[type="checkbox"] {
      flex: none;
      width: 1rem;
      height: 1rem;
    }
  `;

  @property({ type: Object }) column!: ColumnDefinition;
  @property({ type: Object }) filter: FilterConfig | null = null;
  @property({ type: Array }) choiceValues: string[] = [];
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;

  @state() private _operator: FilterOperator = 'contains';
  @state() private _value = '';
  @state() private _value2 = '';
  @state() private _selectedChoices = new Set<string>();

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('filter') && this.filter) {
      this._operator = this.filter.operator;
      this._value = String(this.filter.value ?? '');
      this._value2 = String(this.filter.value2 ?? '');
      if (this.filter.operator === 'in' && Array.isArray(this.filter.value)) {
        this._selectedChoices = new Set(this.filter.value as string[]);
      }
    }
  }

  private _getStringOperators(): { op: FilterOperator; label: string }[] {
    return [
      { op: 'contains', label: 'Contains' },
      { op: 'equals', label: 'Equals' },
      { op: 'startsWith', label: 'Starts with' },
      { op: 'empty', label: 'Is empty' },
    ];
  }

  private _getChoiceOperators(): { op: FilterOperator; label: string }[] {
    return [
      { op: 'equals', label: 'Equals' },
      { op: 'in', label: 'Is any of' },
      { op: 'empty', label: 'Is empty' },
    ];
  }

  private _getDateOperators(): { op: FilterOperator; label: string }[] {
    return [
      { op: 'equals', label: 'Is' },
      { op: 'before', label: 'Is before' },
      { op: 'after', label: 'Is after' },
      { op: 'empty', label: 'Is empty' },
    ];
  }

  private _getOperators() {
    const choiceTypes = ['choice', 'multi_choice', 'reference'];
    const dateTypes = ['datetime', 'glide_date', 'glide_date_time'];
    if (choiceTypes.includes(this.column.type)) return this._getChoiceOperators();
    if (dateTypes.includes(this.column.type)) return this._getDateOperators();
    return this._getStringOperators();
  }

  private _apply() {
    let value: unknown = this._value;
    if (this.column.type === 'choice' || this.column.type === 'multi_choice') {
      if (this._operator === 'in') value = [...this._selectedChoices];
      else value = this._value || null;
    }
    if (['datetime', 'glide_date', 'glide_date_time'].includes(this.column.type) && this._value) {
      value = this._value;
    }
    this.dispatchEvent(new CustomEvent('filter-apply', {
      detail: { columnId: this.column.id, operator: this._operator, value, value2: this._value2 || undefined },
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _clear() {
    this.dispatchEvent(new CustomEvent('filter-clear', {
      detail: { columnId: this.column.id },
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _toggleChoice(v: string) {
    const next = new Set(this._selectedChoices);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    this._selectedChoices = next;
  }

  override render() {
    const ops = this._getOperators();
    const isChoice = ['choice', 'multi_choice'].includes(this.column.type);
    const isDate = ['datetime', 'glide_date', 'glide_date_time'].includes(this.column.type);
    const hideValue = this._operator === 'empty';

    return html`
      <div class="popover" style="left: ${this.x}px; top: ${this.y}px">
        <div class="popover-header">Filter: ${this.column.label}</div>
        <div class="popover-body">
          <div class="filter-row">
            <select .value=${this._operator} @change=${(e: Event) => { this._operator = (e.target as HTMLSelectElement).value as FilterOperator; }}>
              ${ops.map((o) => html`<option value=${o.op}>${o.label}</option>`)}
            </select>
          </div>
          ${hideValue ? '' : isChoice && this._operator === 'in'
            ? html`
                <div class="choices-list">
                  ${(this.column.choices ?? this.choiceValues).map((c) => html`
                    <label class="choice-item">
                      <input type="checkbox" ?checked=${this._selectedChoices.has(c)} @change=${() => this._toggleChoice(c)} />
                      ${c}
                    </label>
                  `)}
                </div>
              `
            : html`
                <div class="filter-row">
                  <input
                    type=${isDate ? 'date' : 'text'}
                    .value=${this._value}
                    @input=${(e: Event) => { this._value = (e.target as HTMLInputElement).value; }}
                    placeholder="Value"
                  />
                </div>
              `}
          <div class="filter-row" style="margin-top: 0.75rem; justify-content: flex-end; gap: 0.5rem;">
            <button class="btn btn-ghost" @click=${this._clear}>Clear</button>
            <button class="btn" @click=${this._apply}>Apply</button>
          </div>
        </div>
      </div>
    `;
  }
}
