/**
 * ListLayout — Backend contract for table configuration
 */

export type FieldType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'reference'
  | 'choice'
  | 'multi_choice'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'glide_date'
  | 'glide_date_time'
  | 'glide_duration'
  | 'document_id'
  | 'attachment'
  | 'journal'
  | 'full_name'
  | 'formula'
  | 'dependent'
  | 'template';

export interface ColumnDefinition {
  id: string;
  label: string;
  type: FieldType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  editable?: boolean;
  required?: boolean;
  hidden?: boolean;
  order?: number;
  choices?: string[];
  editMode?: 'inline' | 'popover';
}

export type FilterOperator =
  | 'contains' | 'equals' | 'startsWith' | 'empty'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'in' | 'before' | 'after';

export interface FilterConfig {
  columnId: string;
  operator: FilterOperator;
  value?: unknown;
  value2?: unknown;
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface ListLayout {
  tableId: string;
  columns: ColumnDefinition[];
  defaultSort?: SortConfig[];
  freezeRows?: number;
  freezeColumns?: number;
  grouping?: { columnId: string };
}

/** Record shape — field values keyed by column id */
export interface TableRecord {
  id: string;
  [fieldId: string]: unknown;
}

/** FormLayout — schema for record edit form (right panel or popover) */
export interface FormLayout {
  tableId: string;
  sections?: { title?: string; fieldIds: string[] }[];
  fields: { id: string; label: string; type: FieldType; required?: boolean; choices?: string[] }[];
}
