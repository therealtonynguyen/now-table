/**
 * NowTableEventBus — Emit events for automations, rules engine, AI extensibility
 */

export type NowTableEvent =
  | { type: 'cell-change'; recordId: string; columnId: string; oldValue: unknown; newValue: unknown }
  | { type: 'sort-change'; sortConfig: { columnId: string; direction: 'asc' | 'desc' }[] }
  | { type: 'filter-change'; filterConfig: unknown[] }
  | { type: 'record-select'; recordId: string }
  | { type: 'record-save'; recordId: string; record: Record<string, unknown> };

export type EventHandler = (event: NowTableEvent) => void;

export class NowTableEventBus {
  private handlers = new Set<EventHandler>();

  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: NowTableEvent): void {
    this.handlers.forEach((h) => {
      try {
        h(event);
      } catch (e) {
        console.error('[now-table] Event handler error:', e);
      }
    });
  }
}
