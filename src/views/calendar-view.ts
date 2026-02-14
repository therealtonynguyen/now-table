import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ViewProps } from './view-props.js';
import type { TableRecord } from '../data/ListLayout.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

@customElement('now-table-calendar-view')
export class NowTableCalendarView extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .calendar {
      padding: 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .calendar-title {
      font-weight: 600;
      font-size: 1.125rem;
    }
    .calendar-nav {
      display: flex;
      gap: 0.5rem;
    }
    .calendar-nav button {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.375rem;
      background: oklch(var(--b1));
      cursor: pointer;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .day-name {
      padding: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      background: oklch(var(--b2));
      border-right: 1px solid oklch(var(--b3));
      border-bottom: 1px solid oklch(var(--b3));
    }
    .day-name:last-child {
      border-right: none;
    }
    .day-cell {
      min-height: 100px;
      padding: 0.25rem;
      background: oklch(var(--b1));
      border-right: 1px solid oklch(var(--b3) / 0.5);
      border-bottom: 1px solid oklch(var(--b3) / 0.5);
    }
    .day-cell:last-child {
      border-right: none;
    }
    .day-cell.other-month {
      background: oklch(var(--b2) / 0.3);
      color: oklch(var(--bc) / 0.6);
    }
    .day-num {
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .day-events {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .day-event {
      font-size: 0.6875rem;
      padding: 0.125rem 0.25rem;
      background: oklch(var(--p) / 0.2);
      border-radius: 0.2rem;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .day-event:hover {
      background: oklch(var(--p) / 0.35);
    }
  `;

  @property({ type: Object }) viewProps: ViewProps | null = null;
  @property({ type: String }) dateColumnId: string = '';

  @state() private _currentMonth = new Date();

  private get _dateColumn(): ColumnDefinition | undefined {
    const cols = this.viewProps?.columns ?? [];
    if (this.dateColumnId) return cols.find((c) => c.id === this.dateColumnId);
    return cols.find((c) => ['glide_date', 'glide_date_time', 'datetime'].includes(c.type));
  }

  private _recordsByDate(): Map<string, TableRecord[]> {
    const col = this._dateColumn;
    const records = this.viewProps?.records ?? [];
    const map = new Map<string, TableRecord[]>();
    if (!col) return map;
    records.forEach((r) => {
      const v = r[col.id];
      if (v == null || v === '') return;
      try {
        const d = new Date(String(v));
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      } catch {}
    });
    return map;
  }

  private _titleColumn(): ColumnDefinition | undefined {
    return this.viewProps?.columns?.[0];
  }

  private _eventLabel(record: TableRecord): string {
    const col = this._titleColumn();
    if (col && record[col.id] != null && record[col.id] !== '') return String(record[col.id]);
    return record.id;
  }

  private _monthDays(): { date: Date; isCurrentMonth: boolean }[] {
    const y = this._currentMonth.getFullYear();
    const m = this._currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const start = new Date(first);
    start.setDate(start.getDate() - startPad);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d, isCurrentMonth: d.getMonth() === m });
    }
    return days;
  }

  private _onPrevMonth() {
    this._currentMonth = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth() - 1);
  }

  private _onNextMonth() {
    this._currentMonth = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth() + 1);
  }

  private _onEventClick(e: Event, record: TableRecord) {
    e.stopPropagation();
    this.viewProps?.onRecordSelect(record.id);
  }

  override render() {
    const col = this._dateColumn;
    const recordsByDate = this._recordsByDate();
    const days = this._monthDays();
    const monthLabel = this._currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    if (!col || !this.viewProps) {
      return html`
        <div style="padding: 2rem; text-align: center; color: oklch(var(--bc) / 0.6);">
          No date column for Calendar. Add a date or datetime column to use this view.
        </div>
      `;
    }

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return html`
      <div class="calendar">
        <div class="calendar-header">
          <span class="calendar-title">${monthLabel}</span>
          <div class="calendar-nav">
            <button type="button" @click=${this._onPrevMonth}>← Prev</button>
            <button type="button" @click=${this._onNextMonth}>Next →</button>
          </div>
        </div>
        <div class="calendar-grid">
          ${weekdays.map((name) => html`<div class="day-name">${name}</div>`)}
          ${days.map(
            ({ date, isCurrentMonth }) => {
              const key = date.toISOString().slice(0, 10);
              const events = recordsByDate.get(key) ?? [];
              return html`
                <div class="day-cell ${!isCurrentMonth ? 'other-month' : ''}">
                  <div class="day-num">${date.getDate()}</div>
                  <div class="day-events">
                    ${events.slice(0, 3).map(
                      (rec) => html`
                        <div class="day-event" @click=${(e: Event) => this._onEventClick(e, rec)}>
                          ${this._eventLabel(rec)}
                        </div>
                      `
                    )}
                    ${events.length > 3 ? html`<div class="day-num">+${events.length - 3}</div>` : ''}
                  </div>
                </div>
              `;
            }
          )}
        </div>
      </div>
    `;
  }
}
