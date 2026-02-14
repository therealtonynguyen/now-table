import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ViewProps } from './view-props.js';
import type { TableRecord } from '../data/ListLayout.js';
import type { ColumnDefinition } from '../data/ListLayout.js';

/** Parse "lat,lng" or "lat, lng" into [lat, lng] or null */
function parseLatLng(value: unknown): [number, number] | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const parts = s.split(/\s*,\s*/);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

declare global {
  interface Window {
    google?: typeof google;
    _nowTableMapInit?: () => void;
  }
}

@customElement('now-table-map-view')
export class NowTableMapView extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0;
    }
    .list-panel {
      border-right: 1px solid oklch(var(--b3));
      overflow-y: auto;
      background: oklch(var(--b1));
      display: flex;
      flex-direction: column;
    }
    .list-panel-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.8125rem;
      border-bottom: 1px solid oklch(var(--b3));
      flex-shrink: 0;
    }
    .list-cards {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .incident-card {
      background: oklch(var(--b2) / 0.5);
      border: 1px solid oklch(var(--b3));
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .incident-card:hover {
      box-shadow: 0 2px 8px oklch(0 0 0 / 0.08);
      border-color: oklch(var(--b4));
    }
    .incident-card.active {
      border-color: oklch(var(--p));
      background: oklch(var(--p) / 0.1);
      box-shadow: 0 0 0 2px oklch(var(--p) / 0.3);
    }
    .incident-card-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: oklch(var(--bc) / 0.8);
      margin-bottom: 0.25rem;
    }
    .incident-card-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: oklch(var(--bc));
      margin-bottom: 0.375rem;
    }
    .incident-card-meta {
      font-size: 0.75rem;
      color: oklch(var(--bc) / 0.7);
    }
    .incident-card-location {
      font-size: 0.75rem;
      color: oklch(var(--bc) / 0.6);
      margin-top: 0.25rem;
    }
    .map-container {
      position: relative;
      min-height: 200px;
      background: oklch(var(--b2) / 0.5);
    }
    #map {
      width: 100%;
      height: 100%;
      min-height: 200px;
    }
    .map-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: oklch(var(--bc) / 0.6);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem;
    }
  `;

  @property({ type: Object }) viewProps: ViewProps | null = null;
  @property({ type: String }) locationColumnId: string = '';
  @property({ type: String }) googleMapsApiKey: string = '';
  @state() private _map: google.maps.Map | null = null;
  @state() private _apiReady = false;
  @state() private _apiError = '';
  private _markersByRecordId = new Map<string, google.maps.Marker>();
  private _infoWindow: google.maps.InfoWindow | null = null;

  private _locationColumn(): ColumnDefinition | undefined {
    const cols = this.viewProps?.columns ?? [];
    if (this.locationColumnId) return cols.find((c) => c.id === this.locationColumnId);
    const locKeys = ['address', 'location', 'lat', 'lng', 'geo'];
    return cols.find((c) => locKeys.some((k) => `${c.id} ${c.label}`.toLowerCase().includes(k)));
  }

  private _recordsWithLocation(): TableRecord[] {
    const col = this._locationColumn();
    const records = this.viewProps?.records ?? [];
    if (!col) return [];
    return records.filter((r) => {
      const v = r[col.id];
      return v != null && v !== '' && parseLatLng(v) !== null;
    });
  }

  private _titleColumn(): ColumnDefinition | undefined {
    return this.viewProps?.columns?.[0];
  }

  private _recordTitle(record: TableRecord): string {
    const col = this._titleColumn();
    if (col && record[col.id] != null && record[col.id] !== '') return String(record[col.id]);
    return record.id;
  }

  private _formatValue(record: TableRecord, colId: string): string {
    const v = record[colId];
    if (v == null || v === '') return '—';
    return String(v);
  }

  private _loadGoogleMaps(): void {
    if (typeof window === 'undefined' || !this.googleMapsApiKey) {
      this._apiError = this.googleMapsApiKey ? '' : 'Set googleMapsApiKey to use the Map view.';
      return;
    }
    if (window.google?.maps) {
      this._apiReady = true;
      this._apiError = '';
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      window._nowTableMapInit = () => {
        this._apiReady = true;
        this._apiError = '';
        this._initMap();
      };
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.googleMapsApiKey)}&callback=_nowTableMapInit`;
    script.async = true;
    script.defer = true;
    window._nowTableMapInit = () => {
      this._apiReady = true;
      this._apiError = '';
      this._initMap();
    };
    script.onerror = () => {
      this._apiError = 'Failed to load Google Maps. Check your API key and Maps JavaScript API is enabled.';
    };
    document.head.appendChild(script);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadGoogleMaps();
  }

  override firstUpdated(): void {
    if (window.google?.maps && this._apiReady && !this._map) this._initMap();
  }

  override updated(changed: Map<string, unknown>): void {
    if (this._apiReady && this._map == null && this.renderRoot.querySelector('#map')) {
      this._initMap();
    }
    if (changed.has('viewProps') && this._map) this._updateMarkers();
    if (changed.has('viewProps') && this.viewProps?.selectedRecordId) {
      this._focusMarker(this.viewProps.selectedRecordId);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._infoWindow?.close();
    this._infoWindow = null;
    this._clearMarkers();
    this._map = null;
    this._apiReady = false;
  }

  private _initMap(): void {
    const container = this.renderRoot.querySelector('#map') as HTMLElement;
    if (!container || this._map) return;
    this._map = new google.maps.Map(container, {
      center: { lat: 39.5, lng: -98.5 },
      zoom: 4,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });
    this._infoWindow = new google.maps.InfoWindow();
    this._updateMarkers();
    const selectedId = this.viewProps?.selectedRecordId;
    if (selectedId) this._focusMarker(selectedId);
  }

  private _clearMarkers(): void {
    for (const m of this._markersByRecordId.values()) m.setMap(null);
    this._markersByRecordId.clear();
  }

  private _updateMarkers(): void {
    if (!this._map || !window.google) return;
    this._clearMarkers();
    const col = this._locationColumn();
    const records = this._recordsWithLocation();
    if (!col) return;

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    for (const record of records) {
      const latLng = parseLatLng(record[col.id]);
      if (!latLng) continue;
      const [lat, lng] = latLng;
      const position = { lat, lng };
      bounds.extend(position);
      hasBounds = true;

      const title = this._recordTitle(record);
      const marker = new google.maps.Marker({
        position,
        map: this._map,
        title,
      });
      const openCallout = () => {
        this.viewProps?.onRecordSelect(record.id);
        this._openMarkerInfoWindow(marker, record);
        this._focusMarker(record.id);
      };
      marker.addListener('mousedown', openCallout);
      this._markersByRecordId.set(record.id, marker);
    }

    if (hasBounds && records.length > 1) {
      this._map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
    } else if (hasBounds && records.length === 1) {
      const pos = records[0] ? parseLatLng(records[0][col.id]) : null;
      this._map.setCenter(pos ? { lat: pos[0], lng: pos[1] } : { lat: 39.5, lng: -98.5 });
      this._map.setZoom(10);
    }
  }

  private _focusMarker(recordId: string): void {
    const marker = this._markersByRecordId.get(recordId);
    if (!this._map || !marker) return;
    const position = marker.getPosition();
    if (!position) return;
    this._map.panTo(position);
    this._map.setZoom(14);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1500);
  }

  private _openMarkerInfoWindow(marker: google.maps.Marker, record: TableRecord): void {
    if (!this._infoWindow || !this._map || !this.viewProps) return;
    const columns = this.viewProps.columns ?? [];
    const number = this._formatValue(record, 'number');
    const title = this._recordTitle(record);
    const state = columns.find((c) => c.id === 'state') ? this._formatValue(record, 'state') : '';
    const priority = columns.find((c) => c.id === 'priority') ? this._formatValue(record, 'priority') : '';
    const locationCol = this._locationColumn();
    const location = locationCol ? String(record[locationCol.id] ?? '') : '';

    const div = document.createElement('div');
    div.className = 'map-infowindow';
    div.innerHTML = `
      <div class="map-callout">
        <div class="map-callout-header">${escapeHtml(number)}</div>
        <div class="map-callout-body">
          <div class="map-callout-title">${escapeHtml(title)}</div>
          ${state || priority ? `<div class="map-callout-meta">${escapeHtml([state, priority].filter(Boolean).join(' · '))}</div>` : ''}
          ${location ? `<div class="map-callout-location">${escapeHtml(location)}</div>` : ''}
          <button type="button" class="map-callout-edit-btn" data-record-id="${escapeHtml(record.id)}" title="Edit">
            <svg class="map-callout-pencil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit
          </button>
        </div>
      </div>
    `;
    div.addEventListener('click', (e: Event) => {
      const target = (e.target as HTMLElement).closest('.map-callout-edit-btn');
      if (target) {
        e.preventDefault();
        const id = (target as HTMLElement).getAttribute('data-record-id');
        if (id) this.viewProps?.onRecordEdit?.(id);
        this._infoWindow?.close();
      }
    });
    this._injectMapCalloutStyles(div);
    this._infoWindow.setContent(div);
    this._infoWindow.open(this._map, marker);
  }

  private _injectMapCalloutStyles(container: HTMLElement): void {
    const style = document.createElement('style');
    style.textContent = `
      .map-callout { min-width: 220px; max-width: 300px; font-family: system-ui, -apple-system, sans-serif; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
      .map-callout-header { font-size: 0.8125rem; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
      .map-callout-body { padding: 12px; background: #fff; }
      .map-callout-title { font-size: 0.9375rem; font-weight: 600; color: #1e293b; margin-bottom: 6px; line-height: 1.35; }
      .map-callout-meta { font-size: 0.8125rem; color: #475569; margin-bottom: 4px; }
      .map-callout-location { font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px; }
      .map-callout-edit-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.8125rem; font-weight: 500; color: #334155; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
      .map-callout-edit-btn:hover { background: #e2e8f0; color: #1e293b; }
      .map-callout-pencil { width: 14px; height: 14px; flex-shrink: 0; }
    `;
    container.appendChild(style);
  }

  private _onCardClick(record: TableRecord): void {
    this.viewProps?.onRecordSelect(record.id);
  }

  override render() {
    const col = this._locationColumn();
    const records = this._recordsWithLocation();

    if (!this.viewProps) return html`<div></div>`;

    if (!col) {
      return html`
        <div style="padding: 2rem; text-align: center; color: oklch(var(--bc) / 0.6); grid-column: 1 / -1;">
          No location column for Map. Add a column with "address" or "location" in the name to use this view.
        </div>
      `;
    }

    if (!this.googleMapsApiKey) {
      return html`
        <div style="padding: 2rem; text-align: center; color: oklch(var(--bc) / 0.6); grid-column: 1 / -1;">
          Set the <code>google-maps-api-key</code> attribute on &lt;now-table&gt; to use the Map view.
        </div>
      `;
    }

    if (this._apiError) {
      return html`
        <div style="padding: 2rem; text-align: center; color: oklch(var(--bc) / 0.6); grid-column: 1 / -1;">
          ${this._apiError}
        </div>
      `;
    }

    const selectedId = this.viewProps.selectedRecordId;
    const columns = this.viewProps.columns ?? [];

    return html`
      <div class="list-panel">
        <div class="list-panel-header">Incidents (${records.length})</div>
        <div class="list-cards">
          ${records.map(
            (r) => html`
              <div
                class="incident-card ${selectedId === r.id ? 'active' : ''}"
                @click=${() => this._onCardClick(r)}
              >
                <div class="incident-card-number">${this._formatValue(r, 'number')}</div>
                <div class="incident-card-title">${this._recordTitle(r)}</div>
                <div class="incident-card-meta">
                  ${columns.find((c) => c.id === 'state') ? `${this._formatValue(r, 'state')} · ${this._formatValue(r, 'priority')}` : ''}
                </div>
                <div class="incident-card-location">${String(r[col.id])}</div>
              </div>
            `
          )}
        </div>
      </div>
      <div class="map-container">
        <div id="map"></div>
        ${!this._apiReady && !this._apiError ? html`<div class="map-placeholder">Loading map…</div>` : ''}
      </div>
    `;
  }
}
