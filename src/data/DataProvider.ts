import type { TableRecord } from './ListLayout.js';

/**
 * DataProvider — Abstract interface for fetching table records.
 * Backend-agnostic: REST, GraphQL, GlideRecord adapters implement this.
 */
export interface DataProvider {
  /** Fetch all records (or a page). Virtualization handles viewport. */
  getRecords(): Promise<TableRecord[]>;
  /** Total count for scroll height / pagination UI */
  getTotalCount?(): Promise<number>;
}
