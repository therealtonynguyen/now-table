# ServiceNow Integration Plan: now-table as a Jelly List Replacement

This guide explains how to incorporate **now-table** into ServiceNow and use it to replace the existing Jelly-based list experience. It includes a high-level plan, how it maps to Jelly lists, and a step-by-step path from developer instance to a working list replacement.

---

## 1. How now-table Replaces Jelly-Based Lists

### Where Jelly lists appear in ServiceNow

In ServiceNow, list layouts are rendered with **Jelly** (XML-based server-side templates) in these main places:

| Context | What users see | Jelly / tech |
|--------|----------------|--------------|
| **List view (classic UI)** | Table of records (e.g. Incident list) | Jelly list layout, `list.xml` / list scripts |
| **Related lists** | Lists on form views (e.g. Tasks related to an Incident) | Jelly related list layout |
| **Service Portal** | Custom list widgets | Often Jelly or custom Angular/JS |
| **UI Builder / Workspace** | List components | Newer stack; can still back onto list APIs |

Replacing “the list” means: **instead of rendering rows via Jelly on the server, the browser loads a modern list component (now-table) and gets data via REST (or a server-side script that bridges GlideRecord).**

### What now-table provides vs Jelly lists

| Capability | Jelly list | now-table |
|------------|------------|-----------|
| Rendering | Server-rendered HTML per request | Client-side Lit component; one load, then data only |
| Large lists | Full DOM or legacy pagination | Virtualized rows (10K+), smooth scroll |
| Sort/filter | Round-trip or list filter UI | Client-side or hybrid; sub-100ms feedback |
| Inline edit | Limited / scripted | Built-in; event bus for persistence |
| Column resize/reorder | Limited or list layout config | Full UX; persist in layout |
| Accessibility | Varies | WCAG 2.2 AA, keyboard, ARIA grid |
| Theming | ServiceNow styles | DaisyUI; can align with Now Design System |
| Extensibility | Jelly + server scripts | Metadata + hooks; no DOM hacking |

### Integration architecture (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│  ServiceNow                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Service Portal page (or UI Builder / Workspace)            │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │  Widget: "now-table list"                            │    │  │
│  │  │  - Loads now-table bundle (JS + CSS) from SN asset    │    │  │
│  │  │  - Gets ListLayout + data from REST / Script Include  │    │  │
│  │  │  - Renders <now-table>                               │    │  │
│  │  └─────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │  REST API (Table API) or Scripted REST + GlideRecord       │  │
│  │  - GET list layout (columns, sort, filters from table)     │  │
│  │  - GET records (paginated or full for virtualization)      │  │
│  │  - PATCH/PUT for inline edit / form save                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

So the “replacement” is: **same list data and table, but the UI is now-table in the browser, fed by REST (or a GlideRecord-backed REST endpoint).**

---

## 2. Step-by-Step: Get a Developer Instance

### Option A: ServiceNow Developer Program (recommended)

1. **Sign up**
   - Go to [developer.servicenow.com](https://developer.servicenow.com).
   - Create an account or sign in.

2. **Request a personal developer instance**
   - From the developer site, use **Manage instance** (or **Get an instance**).
   - Request a **Personal Developer** instance (free).
   - Choose a release (e.g. Washington, Yukon) and region.
   - Wait for the email with instance URL and credentials (usually a few minutes).

3. **Access the instance**
   - Instance URL looks like: `https://<your-instance>.service-now.com`
   - Log in with the provided admin username and password.

4. **Optional: Reset instance**
   - If you need a clean state: Developer site → Manage instance → Reset. Use this when you want to re-run the “replace the list” steps from scratch.

### Option B: Internal / PDI from your org

If your organization already uses ServiceNow:

1. Request a **Personal Developer Instance (PDI)** from your ServiceNow admin or via the internal portal.
2. Use the URL and credentials they provide; the rest of the guide is the same.

---

## 3. Step-by-Step: Replace the List with now-table

Below is a minimal path: **build now-table, host it in ServiceNow, add a Service Portal widget that loads it and backs it with the Table API**, then open a page that shows the “new” list instead of the Jelly list.

### Phase 1: Build and prepare the now-table bundle

**Step 1.1 — Build for production**

From the `now-table` repo:

```bash
cd /path/to/now-table
npm ci
npm run build
```

Use a build that produces a **single (or few) JS bundle(s)** and one CSS file. If the current Vite build outputs multiple chunks, consider a Vite config that rolls `now-table` and its dependencies into one (or two) file(s) for easier upload (e.g. `now-table.js`, `now-table.css`).

**Step 1.2 — Decide how to host the static assets**

- **Option A — ServiceNow UI Scripts / CSS (recommended for a first pass)**  
  - In the instance: **System Definition → UI Scripts** and **Style Sheets**.  
  - Create a **Script** that contains the contents of your main JS bundle (or use **Script Includes** if you prefer server-side; for a Lit component you typically want the script run in the browser).  
  - Create a **Style Sheet** with the contents of `now-table.css` (or the Tailwind/DaisyUI-built CSS).  
  - Alternatively, use **Atf host** or a **Static content** module if your instance has it, and reference the script/link from there.

- **Option B — Scoped application file**  
  - In a Scoped App: **Store your built JS/CSS as static resources** and reference them from a Service Portal widget or a script that injects `<script>` / `<link>` tags.

- **Option C — External CDN**  
  - Host the built files on a CDN and reference them from the widget (simplest for development; ensure CORS and security policies allow it).

For the rest of the steps we assume **Option A**: you have a **UI Script** (e.g. name `now_table_bundle`) and a **Style Sheet** (e.g. `now_table_styles`) that contain the compiled JS and CSS.

---

### Phase 2: Expose list layout and data (REST)

now-table needs:

1. **ListLayout** — `tableId`, `columns[]`, `defaultSort`, `freezeColumns`, etc.
2. **Records** — array of `{ id, ...fields }` (and optionally total count).

You can do this in two ways.

**Step 2.1 — Use Table API only (no custom backend)**

- **List layout:**  
  - Use the **Table API** to read table metadata (e.g. `GET /api/now/table/sys_metadata?sysparm_query=name=incident` or the table definition endpoints).  
  - In the widget, **map** that metadata to `ListLayout` (column id = element name, label = label, type from element type).  
  - Alternatively, define a **fixed ListLayout** in the widget for one table (e.g. Incident) and skip dynamic metadata for the first iteration.

- **Records:**  
  - `GET /api/now/table/{tableName}?sysparm_limit=...&sysparm_offset=...` (and optional `sysparm_query`, `sysparm_order`).  
  - Map each result to `TableRecord`: `id` = `sys_id`, other keys = element names.

**Step 2.2 — Optional: Scripted REST API (GlideRecord)**

- Create a **Scripted REST API** (e.g. `now_table`) with:
  - **Resource:** e.g. `layout/{tableName}` → returns `ListLayout` (columns, defaultSort, etc.) for that table, derived from `sys_metadata` / dictionary or a script.
  - **Resource:** e.g. `records/{tableName}` → query params: `limit`, `offset`, `order`, `query`. Script runs GlideRecord, returns JSON array of records plus optional total count.
- This gives you one place to add ACLs, computed columns, and field-type mapping (e.g. choice lists, references) into now-table’s `ListLayout` and record shape.

For “replace the list” you only need **one** of the two: either Table API + client-side mapping, or Scripted REST. Start with Table API for speed; add Scripted REST if you need server-side control.

---

### Phase 3: Service Portal widget that uses now-table

**Step 3.1 — Create the widget**

1. In the developer instance: **Service Portal → Widgets** (or **Experience → Service Portal → Widgets** depending on release).
2. **New** → create a widget, e.g. **Now Table List**.
3. **HTML** (Body) — provide a container and ensure the script/style are loaded:

```html
<div id="now-table-list-container" class="now-table-list"></div>
```

4. **Client script** (or “Script” depending on UI):
   - Load your bundle: either by including the UI Script by name (e.g. `$sp.getWidget().addScript('now_table_bundle')` or by injecting a `<script src="...">` that points to your JS).
   - Load your CSS: e.g. add a link to the Style Sheet or inject `<link rel="stylesheet" href="...">`.
   - When the script runs, it should:
     - Fetch list layout (from Table API or your Scripted REST).
     - Fetch records (Table API or Scripted REST).
     - Map to `ListLayout` and `TableRecord[]`.
     - Create `<now-table>`, set `layout`, `records`, and optionally `formLayout`, `eventBus`.
     - Append to `#now-table-list-container`.
   - Optional: subscribe to `eventBus` and on `cell-change` / `record-save` call Table API (PATCH) or your REST to persist.

5. **Server script** (optional):  
   - If you need table name or options from the portal page (e.g. “table=incident”), use `data.table` or options and pass to the client so it knows which table to load.

**Step 3.2 — Create a Service Portal page**

1. **Service Portal → Pages** → New (or clone an existing list page).
2. Add the **Now Table List** widget to the page.
3. Configure the widget (if you added options): e.g. table = `incident`.
4. Set the page as the target for “list” access (e.g. add to the application menu or use as the default list view for a table if your process allows).

**Step 3.3 — Replace the list entry point**

- **Classic UI:** Users normally open a module and see a Jelly list. To “replace” it:
  - Either change the module to open the **Service Portal page** that contains the now-table widget (so the list is now now-table),  
  - Or add a link in the application menu to “New Incident List (now-table)” that goes to that page.
- **Service Portal only:** If your list is already in the portal, swap the old list widget for **Now Table List** on the same page.

At this point, the “list” users see is now-table, backed by the same table (e.g. Incident) via REST.

---

### Phase 4: Persist edits (inline / form)

- On **cell-change** or **record-save**, call:
  - **Table API:** `PATCH /api/now/table/{tableName}/{sys_id}` with the changed fields, or  
  - Your **Scripted REST** endpoint that updates via GlideRecord.
- Then either refresh the record in the client or optimistically update the in-memory `records` array so the table doesn’t need a full reload.

---

### Phase 5: Map ServiceNow field types to now-table

Use the mapping from `DEVELOPMENT_PLAN.md` (e.g. `string` → single line, `journal` → long text, `glide_date` / `glide_date_time` → date, `choice` → single select, etc.). When you build `ListLayout` from table metadata (or in your Scripted REST), set each column’s `type` and `choices` (for choice/reference) so now-table’s cell renderers and editors match.

---

## 4. Summary Checklist

| Step | Action |
|------|--------|
| 1 | Get developer instance (developer.servicenow.com or org PDI). |
| 2 | Build now-table (`npm run build`); produce one JS bundle + one CSS file. |
| 3 | Upload JS as UI Script (or scoped static resource); upload CSS as Style Sheet. |
| 4 | Expose list data: Table API and client-side ListLayout mapping, or Scripted REST with GlideRecord. |
| 5 | Create Service Portal widget: load script/CSS, fetch layout + records, instantiate `<now-table>`, append to container. |
| 6 | Create or edit a Service Portal page; add the widget; point users to this page instead of the Jelly list. |
| 7 | Wire event bus to Table API (or REST) for cell-change / record-save. |
| 8 | Map SN field types to now-table `ListLayout` types and test. |

---

## 5. Next Steps (after first replacement)

- **Related lists:** Use the same widget on a form page; pass `table` and a **query** (e.g. `parent=<current_sys_id>`) so the widget shows related records only.
- **List layout persistence:** Store user preferences (column order, width, visibility, sort, filter) in user preferences or a sys_properties/list_layout table and restore in the widget.
- **ACLs and security:** All data access goes through Table API or your Scripted REST; enforce ACLs there. now-table does not bypass security.
- **Theming:** Align DaisyUI theme variables with Now Design System or your portal theme so the list matches the rest of the UI.

Once the widget is on a page and users use that page instead of the Jelly list, the list has been replaced by now-table.
