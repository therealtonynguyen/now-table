import './index.css';
import './now-table.js';
import type { ListLayout } from './data/ListLayout.js';
import type { TableRecord } from './data/ListLayout.js';
import { MockDataProvider } from './data/MockDataProvider.js';
import { NowTableEventBus } from './automations/EventBus.js';
import { defaultViewRegistry } from './views/ViewRegistry.js';

const eventBus = new NowTableEventBus();
eventBus.on((e) => console.log('[now-table]', e.type, e));

const demoFormLayout = {
  tableId: 'incident',
  fields: [
    { id: 'number', label: 'Number', type: 'string' as const },
    { id: 'short_description', label: 'Short Description', type: 'string' as const },
    { id: 'state', label: 'State', type: 'choice' as const, choices: ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed'] },
    { id: 'progress', label: 'Progress', type: 'integer' as const },
    { id: 'priority', label: 'Priority', type: 'choice' as const, choices: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low', '5 - Planning'] },
    { id: 'assigned_to', label: 'Assigned To', type: 'reference' as const, choices: ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', '—'] },
    { id: 'opened_at', label: 'Opened', type: 'glide_date_time' as const },
    { id: 'contact_email', label: 'Contact Email', type: 'email' as const },
    { id: 'kb_article', label: 'KB Article', type: 'url' as const },
    { id: 'location', label: 'Location', type: 'string' as const },
  ],
};

function makeLayout(freezeColumns: number): ListLayout {
  return {
    tableId: 'incident',
    columns: [
      { id: 'number', label: 'Number', type: 'string', width: 120, order: 0, editable: false },
      { id: 'short_description', label: 'Short Description', type: 'string', width: 280, order: 1 },
      { id: 'state', label: 'State', type: 'choice', width: 110, order: 2, choices: ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed'] },
      { id: 'progress', label: 'Progress', type: 'integer', width: 100, order: 3 },
      { id: 'priority', label: 'Priority', type: 'choice', width: 100, order: 4, choices: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low', '5 - Planning'], editMode: 'popover' },
      { id: 'assigned_to', label: 'Assigned To', type: 'reference', width: 180, order: 5, choices: ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', '—'] },
      { id: 'opened_at', label: 'Opened', type: 'glide_date_time', width: 160, order: 6 },
      { id: 'contact_email', label: 'Email', type: 'email', width: 200, order: 7 },
      { id: 'kb_article', label: 'KB Article', type: 'url', width: 180, order: 8 },
      { id: 'location', label: 'Location', type: 'string', width: 200, order: 9 },
    ],
    defaultSort: [{ columnId: 'number', direction: 'asc' }],
    freezeColumns,
  };
}

const sampleRecords: TableRecord[] = [
  { id: 'inc1', number: 'INC0010001', short_description: 'Email server not responding', state: 'New', progress: 0, priority: '2 - High', assigned_to: 'John Smith', opened_at: '2025-01-15 09:30:00', contact_email: 'john@company.com', kb_article: 'https://kb.company.com/article/1001', location: '37.7749,-122.4194' },
  { id: 'inc2', number: 'INC0010002', short_description: 'VPN connection drops', state: 'In Progress', progress: 2, priority: '1 - Critical', assigned_to: 'Jane Doe', opened_at: '2025-01-16 14:00:00', contact_email: '', kb_article: '', location: '40.7128,-74.0060' },
  { id: 'inc3', number: 'INC0010003', short_description: 'Password reset request', state: 'Resolved', progress: 4, priority: '4 - Low', assigned_to: 'Bob Wilson', opened_at: '2025-01-17 11:15:00', contact_email: 'bob@company.com', kb_article: '', location: '41.8781,-87.6298' },
];

type ScrollMode = 'virtualization' | 'pagination';
type ViewType = 'grid' | 'kanban' | 'gallery' | 'forms' | 'calendar' | 'map';
type Density = 'comfortable' | 'compact';

defaultViewRegistry.setGetViewForSchema((_schema) => 'grid');

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  let scrollMode: ScrollMode = 'virtualization';
  let currentPage = 1;
  const pageSize = 50;
  let viewType: ViewType = 'grid';
  let freezeColumns = 1;
  let dataSize = 10_000;
  let density: Density = 'comfortable';
  let zebraStripes = false;
  let googleMapsApiKey = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY ?? '';
  let allRecords: TableRecord[] = sampleRecords;

  const table = document.createElement('now-table') as import('./now-table.js').NowTable;
  table.setAttribute('style', 'display: flex; flex-direction: column; flex: 1; min-height: 0; width: 100%; box-sizing: border-box;');
  table.layout = makeLayout(freezeColumns);
  table.formLayout = demoFormLayout;
  table.eventBus = eventBus;
  table.records = sampleRecords;
  table.viewType = 'grid';
  table.calendarDateColumnId = 'opened_at';
  table.googleMapsApiKey = googleMapsApiKey;

  function applyState() {
    table.layout = makeLayout(freezeColumns);
    table.viewType = viewType;
    table.density = density;
    table.zebraStripes = zebraStripes;
    table.googleMapsApiKey = googleMapsApiKey;
    if (scrollMode === 'virtualization') {
      table.records = allRecords;
    } else {
      const start = (currentPage - 1) * pageSize;
      table.records = allRecords.slice(start, start + pageSize);
    }
    updateControlsUI();
  }

  function updateControlsUI() {
    const paginationInfo = document.getElementById('pagination-info');
    const paginationPrev = document.getElementById('pagination-prev');
    const paginationNext = document.getElementById('pagination-next');
    if (!paginationInfo || !paginationPrev || !paginationNext) return;
    const totalPages = Math.max(1, Math.ceil(allRecords.length / pageSize));
    paginationInfo.textContent = scrollMode === 'pagination'
      ? `Page ${currentPage} of ${totalPages} (${allRecords.length} records)`
      : `Virtualized (${allRecords.length} records)`;
    paginationPrev.toggleAttribute('disabled', scrollMode !== 'pagination' || currentPage <= 1);
    paginationNext.toggleAttribute('disabled', scrollMode !== 'pagination' || currentPage >= totalPages);
  }

  app.innerHTML = `
    <div class="flex flex-col bg-base-200 p-8" style="height: 100vh; box-sizing: border-box;">
      <header class="flex-shrink-0 mb-4">
        <div class="flex items-center gap-3 mb-2">
          <span class="badge badge-primary badge-lg font-medium">now-table v1.0.0</span>
          <span class="text-base-content/60 text-sm">Views + Extensions — ViewRegistry, Grid, getViewForSchema(schema)</span>
        </div>
        <h1 class="text-3xl font-bold text-base-content tracking-tight">now-table</h1>
        <p class="text-base-content/70 mt-1 max-w-2xl">
          List/table component for ServiceNow. Built with Lit + DaisyUI.
        </p>
      </header>

      <div class="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-base-100 border border-base-300 mb-4 flex-shrink-0">
        <fieldset class="flex items-center gap-2">
          <legend class="sr-only">Scroll mode</legend>
          <span class="text-sm font-medium text-base-content/80">Scroll:</span>
          <label class="label cursor-pointer gap-2">
            <input type="radio" name="scrollMode" value="virtualization" class="radio radio-sm" ${scrollMode === 'virtualization' ? 'checked' : ''}>
            <span class="text-sm">Virtualization</span>
          </label>
          <label class="label cursor-pointer gap-2">
            <input type="radio" name="scrollMode" value="pagination" class="radio radio-sm" ${scrollMode !== 'virtualization' ? 'checked' : ''}>
            <span class="text-sm">Pagination</span>
          </label>
        </fieldset>
        <div id="pagination-nav" class="flex items-center gap-2">
          <span id="pagination-info" class="text-sm text-base-content/70">Virtualized (${allRecords.length} records)</span>
          <button id="pagination-prev" type="button" class="btn btn-sm btn-ghost" disabled>Prev</button>
          <button id="pagination-next" type="button" class="btn btn-sm btn-ghost" disabled>Next</button>
        </div>
        <div class="divider divider-horizontal mx-0"></div>
        <fieldset class="flex items-center gap-2">
          <label class="text-sm font-medium text-base-content/80" for="view-select">View:</label>
          <select id="view-select" class="select select-bordered select-sm w-32">
            <option value="grid">Grid</option>
            <option value="kanban">Kanban</option>
            <option value="gallery">Gallery</option>
            <option value="forms">Forms</option>
            <option value="calendar">Calendar</option>
            <option value="map">Map</option>
          </select>
        </fieldset>
        <fieldset class="flex items-center gap-2">
          <label class="text-sm font-medium text-base-content/80" for="freeze-select">Freeze columns:</label>
          <select id="freeze-select" class="select select-bordered select-sm w-20">
            <option value="0" ${freezeColumns === 0 ? 'selected' : ''}>0</option>
            <option value="1" ${freezeColumns === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${freezeColumns === 2 ? 'selected' : ''}>2</option>
          </select>
        </fieldset>
        <fieldset class="flex items-center gap-2">
          <label class="text-sm font-medium text-base-content/80" for="data-size-select">Data size:</label>
          <select id="data-size-select" class="select select-bordered select-sm w-28">
            <option value="100" ${dataSize === 100 ? 'selected' : ''}>100</option>
            <option value="1000" ${dataSize === 1000 ? 'selected' : ''}>1,000</option>
            <option value="10000" ${dataSize === 10000 ? 'selected' : ''}>10,000</option>
          </select>
        </fieldset>
        <div class="divider divider-horizontal mx-0"></div>
        <fieldset class="flex items-center gap-2">
          <legend class="sr-only">Density</legend>
          <span class="text-sm font-medium text-base-content/80">Density:</span>
          <label class="label cursor-pointer gap-2">
            <input type="radio" name="density" value="comfortable" class="radio radio-sm" ?checked=${(density as Density) === 'comfortable'}>
            <span class="text-sm">Comfortable</span>
          </label>
          <label class="label cursor-pointer gap-2">
            <input type="radio" name="density" value="compact" class="radio radio-sm" ?checked=${(density as Density) === 'compact'}>
            <span class="text-sm">Compact</span>
          </label>
        </fieldset>
        <fieldset class="flex items-center gap-2">
          <label class="label cursor-pointer gap-2">
            <input type="checkbox" id="zebra-stripes" class="checkbox checkbox-sm" ${zebraStripes ? 'checked' : ''}>
            <span class="text-sm">Zebra stripes</span>
          </label>
        </fieldset>
        <div class="divider divider-horizontal mx-0"></div>
        <fieldset class="flex items-center gap-2">
          <label class="text-sm font-medium text-base-content/80" for="google-maps-key">Google Maps API key:</label>
          <input type="password" id="google-maps-key" class="input input-bordered input-sm w-48" placeholder="Optional for Map view" autocomplete="off">
        </fieldset>
      </div>

      <div id="table-container" class="rounded-lg border border-base-300 bg-base-100 shadow-sm overflow-hidden" style="flex: 1; min-height: 400px; display: flex; flex-direction: column;">
      </div>
      <footer class="flex-shrink-0 mt-4 text-sm text-base-content/50">
        Arrow keys • Enter to edit • Escape to cancel • Drag freeze handle to pin columns
      </footer>
    </div>
  `;

  const tableContainer = app.querySelector('#table-container');
  tableContainer?.appendChild(table);

  const googleMapsKeyInput = document.getElementById('google-maps-key') as HTMLInputElement | null;
  if (googleMapsKeyInput) googleMapsKeyInput.value = googleMapsApiKey;

  app.querySelectorAll('input[name="scrollMode"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).value;
      scrollMode = v === 'pagination' ? 'pagination' : 'virtualization';
      if (scrollMode === 'pagination') currentPage = 1;
      applyState();
    });
  });
  document.getElementById('pagination-prev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      applyState();
    }
  });
  document.getElementById('pagination-next')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(allRecords.length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      applyState();
    }
  });
  document.getElementById('view-select')?.addEventListener('change', (e) => {
    viewType = (e.target as HTMLSelectElement).value as ViewType;
    applyState();
  });
  document.getElementById('freeze-select')?.addEventListener('change', (e) => {
    freezeColumns = parseInt((e.target as HTMLSelectElement).value, 10);
    applyState();
  });
  app.querySelectorAll('input[name="density"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      density = (e.target as HTMLInputElement).value as Density;
      applyState();
    });
  });
  document.getElementById('zebra-stripes')?.addEventListener('change', (e) => {
    zebraStripes = (e.target as HTMLInputElement).checked;
    applyState();
  });
  document.getElementById('data-size-select')?.addEventListener('change', async (e) => {
    dataSize = parseInt((e.target as HTMLSelectElement).value, 10);
    const provider = new MockDataProvider(dataSize);
    allRecords = await provider.getRecords();
    if (scrollMode === 'pagination') currentPage = 1;
    applyState();
  });
  document.getElementById('google-maps-key')?.addEventListener('input', (e) => {
    googleMapsApiKey = (e.target as HTMLInputElement).value.trim();
    table.googleMapsApiKey = googleMapsApiKey;
  });

  const provider = new MockDataProvider(dataSize);
  allRecords = await provider.getRecords();
  applyState();
});
