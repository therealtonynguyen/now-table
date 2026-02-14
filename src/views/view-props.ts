/**
 * Shared props passed to all view components from now-table.
 */

import type { ListLayout, FormLayout, TableRecord, ColumnDefinition } from '../data/ListLayout.js';
import type { NowTableEventBus } from '../automations/EventBus.js';

export interface ViewProps {
  layout: ListLayout | null;
  formLayout: FormLayout | null;
  records: TableRecord[];
  columns: ColumnDefinition[];
  eventBus: NowTableEventBus | null;
  selectedRecordId: string | null;
  onRecordSelect: (recordId: string | null) => void;
  onRecordUpdate: (recordId: string, columnId: string, value: unknown) => void;
  /** Open the right-side form panel for this record (e.g. Map "Edit" or Grid magnify). */
  onRecordEdit?: (recordId: string) => void;
}
