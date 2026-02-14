import type { DataProvider } from './DataProvider.js';
import type { TableRecord } from './ListLayout.js';

const STATES = ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
const PRIORITIES = ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low', '5 - Planning'];
const ASSIGNEES = ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', '—'];
/** lat,lng for map view — empty string means no location */
const LOCATIONS = [
  '37.7749,-122.4194',
  '40.7128,-74.0060',
  '41.8781,-87.6298',
  '34.0522,-118.2437',
  '29.7604,-95.3698',
  '33.4484,-112.0740',
  '39.7392,-104.9903',
  '',
  '',
  '',
];
const DESCRIPTIONS = [
  'Email server not responding',
  'VPN connection drops intermittently',
  'Password reset request',
  'Application slow during peak hours',
  'New employee onboarding access',
  'Printer not working in building B',
  'Database backup failed',
  'SSO login timeout',
  'Laptop won\'t connect to WiFi',
  'SharePoint sync issues',
  'Outlook calendar not syncing',
  'Access request for SAP',
  'Monitor display flickering',
  'Keyboard keys sticking',
  'Software installation request',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Mock DataProvider — generates N incident records for demo/testing */
export class MockDataProvider implements DataProvider {
  constructor(private count: number = 10_000) {}

  async getRecords(): Promise<TableRecord[]> {
    const records: TableRecord[] = [];
    const start = new Date('2025-01-01');
    const end = new Date('2025-02-14');

    const EMAILS = ['john.smith@company.com', 'jane.doe@company.com', 'bob.wilson@company.com', 'alice.brown@company.com', ''];
    for (let i = 0; i < this.count; i++) {
      const n = String(i + 1).padStart(7, '0');
      const num = `INC001${n}`;
      records.push({
        id: `inc${n}`,
        number: num,
        short_description: randomChoice(DESCRIPTIONS),
        state: randomChoice(STATES),
        progress: Math.floor(Math.random() * 5),
        priority: randomChoice(PRIORITIES),
        assigned_to: randomChoice(ASSIGNEES),
        opened_at: randomDate(start, end),
        contact_email: randomChoice(EMAILS),
        kb_article: i % 5 === 0 ? `https://kb.company.com/article/${i + 1000}` : '',
        location: randomChoice(LOCATIONS),
      });
    }

    return records;
  }

  async getTotalCount(): Promise<number> {
    return this.count;
  }
}
