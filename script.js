/**
 * WINISIS Pro - Premium Edition Logic
 */

// --- Core Architecture: Database Manager ---
class DatabaseManager {
    constructor() {
        this.databases = this.loadDatabases();
    }

    loadDatabases() {
        const stored = localStorage.getItem('winisis_dbs');
        return stored ? JSON.parse(stored) : {};
    }

    saveDatabases() {
        localStorage.setItem('winisis_dbs', JSON.stringify(this.databases));
    }

    createDatabase(name, fdt) {
        if (this.databases[name]) {
            throw new Error('Database already exists');
        }
        this.databases[name] = {
            name: name,
            fdt: fdt, // Field Definition Table
            created: new Date().toISOString(),
            recordCount: 0
        };
        this.saveDatabases();
        localStorage.setItem(`winisis_records_${name}`, JSON.stringify([]));
    }

    deleteDatabase(name) {
        if (!this.databases[name]) return;
        delete this.databases[name];
        this.saveDatabases();
        localStorage.removeItem(`winisis_records_${name}`);
    }

    getDatabase(name) {
        return this.databases[name];
    }

    listDatabases() {
        return Object.keys(this.databases);
    }
}

// --- Core Architecture: Record Manager ---
class RecordManager {
    constructor() {
        this.records = [];
        this.currentDbName = null;
    }

    loadRecords(dbName) {
        this.currentDbName = dbName;
        const stored = localStorage.getItem(`winisis_records_${dbName}`);
        this.records = stored ? JSON.parse(stored) : [];
        return this.records;
    }

    saveRecord(record) {
        if (!this.currentDbName) throw new Error('No DB loaded');

        if (record.mfn) {
            const index = this.records.findIndex(r => r.mfn === record.mfn);
            if (index !== -1) {
                this.records[index] = record;
            } else {
                this.records.push(record);
            }
        } else {
            record.mfn = this.records.length + 1;
            this.records.push(record);
        }

        this.persist();
        return record;
    }

    persist() {
        localStorage.setItem(`winisis_records_${this.currentDbName}`, JSON.stringify(this.records));
    }

    getRecord(mfn) {
        return this.records.find(r => r.mfn === mfn);
    }

    getAllRecords() {
        return this.records;
    }
}

// --- UI Module: FDTEditor ---
class FDTEditor {
    constructor(dbManager, onSave) {
        this.dbManager = dbManager;
        this.onSave = onSave;
        this.marcTags = this.getMarcTags();
    }

    getMarcTags() {
        return [
            { tag: "010", name: "Library of Congress Control Number" },
            { tag: "020", name: "International Standard Book Number (ISBN)" },
            { tag: "022", name: "International Standard Serial Number (ISSN)" },
            { tag: "040", name: "Cataloging Source" },
            { tag: "041", name: "Language Code" },
            { tag: "043", name: "Geographic Area Code" },
            { tag: "050", name: "Library of Congress Call Number" },
            { tag: "082", name: "Dewey Decimal Classification Number" },
            { tag: "100", name: "Main Entry-Personal Name" },
            { tag: "110", name: "Main Entry-Corporate Name" },
            { tag: "111", name: "Main Entry-Meeting Name" },
            { tag: "130", name: "Main Entry-Uniform Title" },
            { tag: "240", name: "Uniform Title" },
            { tag: "245", name: "Title Statement" },
            { tag: "246", name: "Varying Form of Title" },
            { tag: "250", name: "Edition Statement" },
            { tag: "260", name: "Publication, Distribution, etc. (Imprint)" },
            { tag: "264", name: "Production, Publication, Distribution, Manufacture, and Copyright Notice" },
            { tag: "300", name: "Physical Description" },
            { tag: "336", name: "Content Type" },
            { tag: "337", name: "Media Type" },
            { tag: "338", name: "Carrier Type" },
            { tag: "440", name: "Series Statement / Added Entry-Title" },
            { tag: "490", name: "Series Statement" },
            { tag: "500", name: "General Note" },
            { tag: "504", name: "Bibliography, Etc. Note" },
            { tag: "505", name: "Formatted Contents Note" },
            { tag: "520", name: "Summary, Etc." },
            { tag: "600", name: "Subject Added Entry-Personal Name" },
            { tag: "610", name: "Subject Added Entry-Corporate Name" },
            { tag: "650", name: "Subject Added Entry-Topical Term" },
            { tag: "651", name: "Subject Added Entry-Geographic Name" },
            { tag: "700", name: "Added Entry-Personal Name" },
            { tag: "710", name: "Added Entry-Corporate Name" },
            { tag: "740", name: "Added Entry-Uncontrolled Related/Analytical Title" },
            { tag: "800", name: "Series Added Entry-Personal Name" },
            { tag: "810", name: "Series Added Entry-Corporate Name" },
            { tag: "830", name: "Series Added Entry-Uniform Title" },
            { tag: "856", name: "Electronic Location and Access" },
            { tag: "900", name: "Local Definitions" }
        ];
    }

    render() {
        const dataListOptions = this.marcTags.map(t => `<option value="${t.tag}">${t.tag} - ${t.name}</option>`).join('');

        return `
            <div class="premium-card">
                <datalist id="marc-tags-list">
                    ${dataListOptions}
                </datalist>

                <h3 style="margin-bottom:20px; color:var(--accent-gold);">Define New Database</h3>
                
                <div class="form-group" style="max-width: 400px;">
                    <label class="form-label">Database Name</label>
                    <input type="text" id="db-name" class="form-input" placeholder="e.g. LIBRARY_V1">
                </div>

                <div class="table-container" style="margin-bottom:20px;">
                    <table class="data-table" id="fdt-table">
                        <thead>
                            <tr>
                                <th style="width:120px;">Tag (MARC)</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th style="width:50px;">Rep</th>
                                <th>Indexing</th>
                                <th style="width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody id="fdt-body">
                            <!-- Rows -->
                        </tbody>
                    </table>
                </div>

                <div class="flex gap-2" style="margin-bottom: 24px;">
                    <button class="btn btn-secondary" onclick="app.fdtEditor.addFieldRow()">+ Add Field</button>
                    <button class="btn btn-link" onclick="app.fdtEditor.loadTemplate('Common')" style="margin-left:auto;">Load Common MARC Tags</button>
                </div>

                <div style="border-top:1px solid var(--border-color); padding-top:20px; text-align:right;">
                    <button class="btn btn-primary" onclick="app.fdtEditor.save()">Create Database</button>
                </div>
            </div>
        `;
    }

    addFieldRow(data = {}) {
        const tbody = document.getElementById('fdt-body');
        const tr = document.createElement('tr');
        tr.className = "fade-in-row";

        const tagValue = data.tag || '';
        const nameValue = data.name || '';
        const typeValue = data.type || 'alphanumeric';

        tr.innerHTML = `
            <td><input type="text" list="marc-tags-list" class="table-input tag-input" placeholder="Tag" value="${tagValue}" onchange="app.fdtEditor.onTagChange(this)"></td>
            <td><input type="text" class="table-input name-input" placeholder="Field Name" value="${nameValue}"></td>
            <td>
                <select class="table-select type-input">
                    <option value="alphanumeric" ${typeValue === 'alphanumeric' ? 'selected' : ''}>Alphanumeric</option>
                    <option value="numeric" ${typeValue === 'numeric' ? 'selected' : ''}>Numeric</option>
                    <option value="alphabetic" ${typeValue === 'alphabetic' ? 'selected' : ''}>Alphabetic</option>
                </select>
            </td>
            <td class="text-center"><input type="checkbox" class="rep-input" style="width:16px; height:16px;"></td>
            <td>
                <select class="table-select indexing-input">
                    <option value="">None</option>
                    <option value="4">Word (Technique 4)</option>
                    <option value="0">Whole (Technique 0)</option>
                </select>
            </td>
            <td><button class="btn btn-secondary" style="padding:4px 8px;" onclick="this.closest('tr').remove()">×</button></td>
        `;
        tbody.appendChild(tr);
    }

    onTagChange(input) {
        const val = input.value;
        const found = this.marcTags.find(t => t.tag === val || (t.tag + " - " + t.name) === val);
        if (found) {
            // Fill name if empty or close match
            const row = input.closest('tr');
            const nameInput = row.querySelector('.name-input');
            if (nameInput && !nameInput.value) {
                nameInput.value = found.name;
            }
        }
    }

    loadTemplate(type) {
        // Clear existing
        document.getElementById('fdt-body').innerHTML = '';

        // Add common ones
        const common = [
            { tag: "020", name: "ISBN" },
            { tag: "100", name: "Author" },
            { tag: "245", name: "Title" },
            { tag: "260", name: "Imprint" },
            { tag: "300", name: "Physical Description" },
            { tag: "650", name: "Subject" }
        ];

        common.forEach(c => this.addFieldRow(c));
    }

    save() {
        const dbName = document.getElementById('db-name').value.trim();
        if (!dbName) {
            alert('Please enter a database name');
            return;
        }

        const rows = document.querySelectorAll('#fdt-body tr');
        const fdt = [];

        rows.forEach(row => {
            const tag = row.querySelector('.tag-input').value;
            const name = row.querySelector('.name-input').value;
            const type = row.querySelector('.type-input').value;
            const rep = row.querySelector('.rep-input').checked;
            const indexing = row.querySelector('.indexing-input').value;

            if (tag && name) {
                fdt.push({ tag, name, type, rep, indexing });
            }
        });

        if (fdt.length === 0) {
            alert('Please define at least one field');
            return;
        }

        try {
            this.dbManager.createDatabase(dbName, fdt);
            if (this.onSave) this.onSave(dbName);
        } catch (e) {
            alert(e.message);
        }
    }
}

// --- UI Module: Data Entry Form ---
class DataEntryForm {
    constructor(dbManager, recordManager) {
        this.dbManager = dbManager;
        this.recordManager = recordManager;
        this.currentMfn = 0;
        this.fdt = [];
    }

    setDatabase(dbName) {
        const db = this.dbManager.getDatabase(dbName);
        if (db) {
            this.fdt = db.fdt;
            this.recordManager.loadRecords(dbName);
        }
    }

    render() {
        if (!this.fdt || this.fdt.length === 0) return '<div class="premium-card">No Definition loaded.</div>';

        const record = this.currentMfn > 0 ? this.recordManager.getRecord(this.currentMfn) : {};
        const isNew = this.currentMfn === 0;

        const fieldsHtml = this.fdt.map(field => {
            const val = record && record.fields && record.fields[field.tag] ? record.fields[field.tag] : '';
            return `
                <div class="form-group">
                    <label class="form-label">
                        <span style="color:var(--accent-gold); margin-right:4px;">${field.tag}</span> ${field.name}
                    </label>
                    <textarea class="form-input field-input" data-tag="${field.tag}" rows="1" style="min-height:38px; resize:vertical;">${val || ''}</textarea>
                </div>
            `;
        }).join('');

        return `
            <div class="premium-card" style="display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                     <div class="flex gap-2">
                        <button class="btn btn-secondary" onclick="app.dataEntry.navCheck(-1)" ${this.currentMfn <= 1 ? 'disabled' : ''}>&larr; Prev</button>
                        <button class="btn btn-secondary" onclick="app.dataEntry.navCheck(1)" ${!isNew && this.currentMfn >= this.recordManager.records.length ? 'disabled' : ''}>Next &rarr;</button>
                     </div>
                     <div style="font-family:var(--font-mono); color:var(--accent-gold); font-size:16px;">
                        MFN: <b>${isNew ? 'NEW' : this.currentMfn}</b>
                     </div>
                     <button class="btn btn-primary" onclick="app.dataEntry.newRecord()">+ New Record</button>
                </div>

                <div class="form-canvas" style="flex:1; overflow-y:auto; padding-right:10px;">
                    ${fieldsHtml}
                </div>

                <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border-color); text-align:right;">
                    <button class="btn btn-secondary" onclick="app.navigateTo('dashboard')">Cancel</button>
                    <button class="btn btn-primary" style="margin-left:10px;" onclick="app.dataEntry.save()">Save Record</button>
                </div>
            </div>
        `;
    }

    newRecord() {
        this.currentMfn = 0;
        this.renderView();
    }

    navCheck(direction) {
        const max = this.recordManager.records.length;
        if (direction === -1 && this.currentMfn > 1) {
            this.currentMfn--;
        } else if (direction === 1) {
            if (this.currentMfn < max) this.currentMfn++;
        }
        this.renderView();
    }

    save() {
        const inputs = document.querySelectorAll('.field-input');
        const fields = {};
        let hasData = false;

        inputs.forEach(input => {
            const tag = input.dataset.tag;
            const value = input.value;
            if (value) {
                fields[tag] = value;
                hasData = true;
            }
        });

        if (!hasData) {
            alert("Empty record - ignored.");
            return;
        }

        const record = {
            mfn: this.currentMfn > 0 ? this.currentMfn : null,
            fields: fields
        };

        const saved = this.recordManager.saveRecord(record);
        this.currentMfn = saved.mfn;
        app.updateStatus(`Record saved successfully. MFN ${saved.mfn}`);
        this.renderView();
    }

    renderView() {
        document.getElementById('content-area').innerHTML = this.render();
    }
}

// --- Retrieval Module ---
class Indexer {
    constructor(recordManager, dbManager) {
        this.recordManager = recordManager;
        this.dbManager = dbManager;
    }

    // Returns a simple Inverted File object: { term: Set(mfns), ... }
    buildIndex() {
        const records = this.recordManager.getAllRecords();
        const dbName = this.recordManager.currentDbName;
        const db = this.dbManager.getDatabase(dbName);
        const fdt = db ? db.fdt : [];
        const index = {};

        records.forEach(record => {
            if (!record.fields) return;

            fdt.forEach(field => {
                const tag = field.tag;
                const value = record.fields[tag];
                const technique = field.indexing; // "0" or "4"

                if (!value || !technique) return;

                const processTerm = (term) => {
                    const t = term.toString().toLowerCase().trim();
                    if (t.length > 1) {
                        if (!index[t]) index[t] = new Set();
                        index[t].add(record.mfn);
                        const scopedKey = `${tag}:${t}`;
                        if (!index[scopedKey]) index[scopedKey] = new Set();
                        index[scopedKey].add(record.mfn);
                    }
                };

                if (technique === "4") { // Word
                    const tokens = value.toString().toLowerCase()
                        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
                        .split(/\s+/);
                    tokens.forEach(processTerm);
                } else if (technique === "0") { // Whole
                    processTerm(value);
                }
            });
        });
        return index;
    }

    getDictionary() {
        const index = this.buildIndex();
        const terms = Object.keys(index).filter(k => !k.includes(':')).sort(); // Filter out scoped keys for general dictionary
        return terms.map(t => ({
            term: t,
            count: index[t].size
        }));
    }
}

class SearchEngine {
    constructor(indexer) {
        this.indexer = indexer;
    }

    search(query) {
        if (!query.trim()) return [];
        const index = this.indexer.buildIndex();
        const terms = query.toLowerCase().trim().split(/\s+/);

        const getSet = (term) => index[term] || new Set();

        let initialSet = getSet(terms[0]);
        let result = new Set([...initialSet]);

        for (let i = 1; i < terms.length; i++) {
            const termSet = getSet(terms[i]);
            result = new Set([...result].filter(x => termSet.has(x)));
        }

        return Array.from(result).sort((a, b) => a - b);
    }
}

class FormatEngine {
    format(record, pft) { // Simple PFT parsing
        if (!record || !pft) return '';
        let result = "";
        let i = 0;
        try {
            while (i < pft.length) {
                const char = pft[i];
                if (char === '"' || char === "'") {
                    const quote = char;
                    i++;
                    let start = i;
                    while (i < pft.length && pft[i] !== quote) i++;
                    result += pft.substring(start, i);
                    i++;
                } else if (char.toLowerCase() === 'v') {
                    i++;
                    let start = i;
                    while (i < pft.length && /\d/.test(pft[i])) i++;
                    const tag = pft.substring(start, i);
                    if (tag && record.fields[tag]) result += record.fields[tag];
                } else if (pft.substring(i, i + 3).toLowerCase() === 'mfn') {
                    result += record.mfn;
                    i += 3;
                } else if (char === '/') {
                    result += '<br>';
                    i++;
                } else {
                    result += char;
                    i++;
                }
            }
        } catch (e) { return "Format Error"; }
        return result;
    }
}

class SearchUI {
    constructor(dbManager, recordManager) {
        this.dbManager = dbManager;
        this.recordManager = recordManager;
        this.indexer = new Indexer(recordManager, dbManager);
        this.searchEngine = new SearchEngine(this.indexer);
        this.formatEngine = new FormatEngine();
        this.lastResults = null;
        this.customPft = null;
        this.mode = 'expert';
        this.guidedRows = [{ field: '', value: '' }];
    }

    render() {
        if (!this.recordManager.currentDbName) return `<div class="premium-card center">No database selected.</div>`;

        // Default PFT
        if (!this.customPft) {
            const db = this.dbManager.getDatabase(this.recordManager.currentDbName);
            if (db && db.fdt.length > 0) {
                // Simple Default Format
                this.customPft = `"MFN: " mfn /`;
                db.fdt.forEach(f => {
                    this.customPft += ` "<b>${f.name}:</b> " v${f.tag} /`;
                });
            } else {
                this.customPft = `"MFN: " mfn`;
            }
        }

        return `
            <div class="premium-card">
                 <div class="flex gap-2" style="border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:20px;">
                    <button class="btn ${this.mode === 'expert' ? 'btn-primary' : 'btn-secondary'}" onclick="app.searchUI.setMode('expert')">Expert Search</button>
                    <button class="btn ${this.mode === 'guided' ? 'btn-primary' : 'btn-secondary'}" onclick="app.searchUI.setMode('guided')">Guided Search</button>
                </div>

                <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                    ${this.mode === 'expert' ? this.renderExpert() : this.renderGuided()}
                </div>

                 <div class="flex justify-between items-center" style="margin: 10px 0;">
                    <h3 style="color:var(--text-secondary); font-size:14px;">RESULTS</h3>
                    <button class="btn btn-link" style="font-size:11px;" onclick="app.searchUI.togglePft()">Format Settings</button>
                 </div>

                 <div id="pft-settings" class="hidden" style="margin-bottom:10px; background:rgba(0,0,0,0.3); padding:10px; border-radius:4px;">
                    <label class="form-label">PFT Format</label>
                    <textarea id="pft-input" class="form-input" rows="2">${this.customPft}</textarea>
                    <div style="text-align:right; margin-top:5px;"><button class="btn btn-secondary" onclick="app.searchUI.applyPft()">Apply</button></div>
                 </div>

                <div id="search-results-area" style="flex:1; overflow-y:auto; min-height:200px;">
                    ${this.renderResults()}
                </div>
            </div>
        `;
    }

    setMode(mode) {
        this.mode = mode;
        this.updateUI();
    }

    renderExpert() {
        return `
            <div class="flex gap-2">
                <input type="text" id="search-input" class="form-input" placeholder="Enter query (e.g. water 100:history)..." onkeypress="if(event.key==='Enter') app.searchUI.executeSearch()">
                <button class="btn btn-primary" onclick="app.searchUI.executeSearch()">Search</button>
            </div>
        `;
    }

    renderGuided() {
        const db = this.dbManager.getDatabase(this.recordManager.currentDbName);
        const options = db.fdt.map(f => `<option value="${f.tag}">${f.name}</option>`).join('');

        const rows = this.guidedRows.map((row, i) => `
            <div class="flex gap-2" style="margin-bottom:8px;">
                <select class="table-select guided-field" onchange="app.searchUI.updateRow(${i}, 'field', this.value)" style="width:150px;">
                    <option value="">Any Field</option>
                    ${options}
                </select>
                <input type="text" class="form-input guided-value" value="${row.value}" onchange="app.searchUI.updateRow(${i}, 'value', this.value)" style="flex:1;" placeholder="Term">
                <button class="btn btn-secondary" onclick="app.searchUI.removeRow(${i})">×</button>
            </div>
        `).join('');

        return `
            <div>
                ${rows}
                <div class="mt-4 flex gap-2">
                     <button class="btn btn-secondary" onclick="app.searchUI.addRow()">+ Add Line</button>
                     <button class="btn btn-primary" onclick="app.searchUI.executeGuided()">Search</button>
                </div>
            </div>
        `;
    }

    updateRow(index, key, val) { this.guidedRows[index][key] = val; }
    addRow() { this.guidedRows.push({ field: '', value: '' }); this.updateUI(); }
    removeRow(index) { this.guidedRows.splice(index, 1); this.updateUI(); }

    updateUI() {
        document.getElementById('content-area').innerHTML = this.render();
        if (this.mode === 'guided') {
            const selects = document.querySelectorAll('.guided-field');
            const inputs = document.querySelectorAll('.guided-value');
            this.guidedRows.forEach((row, i) => {
                if (selects[i]) selects[i].value = row.field;
                if (inputs[i]) inputs[i].value = row.value;
            });
        }
    }

    executeSearch() {
        const query = document.getElementById('search-input').value;
        this.runQuery(query);
    }

    executeGuided() {
        const parts = [];
        this.guidedRows.forEach(row => {
            const val = row.value.trim();
            if (val) parts.push(row.field ? `${row.field}:${val}` : val);
        });
        this.runQuery(parts.join(' '));
    }

    runQuery(query) {
        const mfns = this.searchEngine.search(query);
        this.lastResults = mfns;
        app.updateStatus(`Search completed. Found ${mfns.length} records.`);
        const records = mfns.map(mfn => this.recordManager.getRecord(mfn));
        document.getElementById('search-results-area').innerHTML = this.renderDisplayList(records);
    }

    renderResults() {
        if (!this.lastResults) return '<div class="text-center" style="color:var(--text-muted); padding:20px;">Ready to search.</div>';
        return this.renderDisplayList(this.lastResults.map(mfn => this.recordManager.getRecord(mfn)));
    }

    renderDisplayList(records) {
        if (records.length === 0) return '<div class="text-center" style="padding:20px;">No matches found.</div>';
        return records.map(rec => `
            <div class="record-card">
                <div style="font-size:13px; line-height:1.6;">${this.formatEngine.format(rec, this.customPft)}</div>
                <div style="margin-top:8px; text-align:right;">
                    <button class="btn btn-link" onclick="app.editRecord(${rec.mfn})" style="font-size:11px; color:var(--accent-gold);">Edit Record</button>
                </div>
            </div>
        `).join('');
    }

    togglePft() {
        const el = document.getElementById('pft-settings');
        el.classList.toggle('hidden');
    }

    applyPft() {
        this.customPft = document.getElementById('pft-input').value;
        if (this.lastResults) {
            const records = this.lastResults.map(mfn => this.recordManager.getRecord(mfn));
            document.getElementById('search-results-area').innerHTML = this.renderDisplayList(records);
        }
    }
}

// --- Dictionary UI Module ---
class DictionaryUI {
    constructor(dbManager, recordManager) {
        this.dbManager = dbManager;
        this.recordManager = recordManager;
        this.indexer = new Indexer(recordManager, dbManager);
    }

    render() {
        if (!this.recordManager.currentDbName) return `<div class="premium-card center">No database selected.</div>`;

        try {
            const terms = this.indexer.getDictionary();

            const listHtml = terms.length === 0
                ? `<div class="text-center text-muted">Dictionary is empty. Add records with indexed fields.</div>`
                : `<table class="data-table">
                    <thead><tr><th>Term</th><th style="width:80px">Count</th></tr></thead>
                    <tbody>
                        ${terms.map(t => `<tr><td>${t.term}</td><td>${t.count}</td></tr>`).join('')}
                    </tbody>
                   </table>`;

            return `
                <div class="premium-card">
                    <h3 style="margin-bottom:10px; color:var(--accent-gold);">Dictionary Terms</h3>
                    <p style="margin-bottom:20px; font-size:12px; color:var(--text-muted);">List of all indexed terms in the current database.</p>
                    <div style="flex:1; overflow-y:auto; max-height: 400px; border:1px solid var(--border-color); border-radius:4px;">
                        ${listHtml}
                    </div>
                </div>
            `;
        } catch (e) {
            return `<div class="premium-card">Error loading dictionary: ${e.message}</div>`;
        }
    }
}

// --- AI Assistant Module ---
class AIAssistant {
    constructor(appController) {
        this.app = appController;
        this.recognition = null;
        this.isListening = false;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.updateUI(`Heard: "${transcript}"`);
                this.processCommand(transcript);
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.isListening = false;
                    this.updateUI("Listening stopped.");
                    setTimeout(() => this.deactivate(), 2000);
                }
            };

            this.recognition.onerror = (event) => {
                this.updateUI("Error: " + event.error);
                this.speak("Sorry, I didn't catch that.");
            };
        }
    }

    activate() {
        const overlay = document.getElementById('ai-overlay');
        if (overlay) overlay.classList.remove('hidden');

        this.updateUI("Listening...");
        this.speak("Welcome to the world of records.");

        if (this.recognition) {
            this.isListening = true;
            // Delay start slightly to avoid picking up the system voice
            setTimeout(() => {
                try { this.recognition.start(); } catch (e) { }
            }, 2000);
        } else {
            this.updateUI("Voice recognition not supported.");
        }
    }

    deactivate(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const overlay = document.getElementById('ai-overlay');
        if (overlay) overlay.classList.add('hidden');
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    updateUI(status) {
        const el = document.getElementById('ai-status');
        if (el) el.textContent = status;
        const sub = document.getElementById('ai-transcript');
        if (sub && status.startsWith("Heard")) sub.textContent = status;
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance();
            msg.text = text;
            const voices = window.speechSynthesis.getVoices();
            // Reuse the voice logic from App or standard logic
            const femaleVoice = voices.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female'));
            if (femaleVoice) msg.voice = femaleVoice;
            msg.rate = 1.0;
            msg.pitch = 1.2;
            window.speechSynthesis.speak(msg);
        }
    }

    processCommand(cmd) {
        if (cmd.includes('dashboard') || cmd.includes('home')) {
            this.speak("Opening Dashboard.");
            this.app.navigateTo('dashboard');
        } else if (cmd.includes('definition') || cmd.includes('create')) {
            this.speak("Opening Database Definition.");
            this.app.navigateTo('definition');
        } else if (cmd.includes('data') || cmd.includes('entry')) {
            this.speak("Opening Data Entry.");
            this.app.navigateTo('data-entry');
        } else if (cmd.includes('search') || cmd.includes('find')) {
            this.speak("Opening Search.");
            this.app.navigateTo('search');
        } else if (cmd.includes('dictionary') || cmd.includes('term')) {
            this.speak("Opening Dictionary.");
            this.app.navigateTo('dictionary');
        } else if (cmd.includes('help')) {
            this.speak("Showing Help.");
            this.app.navigateTo('help');
        } else {
            this.speak("Sorry, I don't know that command yet.");
        }
    }
}

// --- Help UI Module ---
class HelpUI {
    render() {
        return `
            <div class="premium-card">
                <h2 style="color:var(--accent-gold); margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">Welcome to WINISIS PRO</h2>
                
                <div class="help-section" style="margin-bottom:30px;">
                    <h3 style="color:var(--text-primary); margin-bottom:10px;">🚀 Getting Started</h3>
                    <p style="color:var(--text-secondary);">WINISIS PRO is a premium interface for managing structured databases. Follow these steps to manage your data effectively:</p>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <div class="help-card" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="color:var(--accent-gold); margin-bottom:8px;">🏠 Dashboard</h4>
                        <p style="font-size:13px; color:var(--text-muted);">View all your available database projects. You can open an existing one or create a new definition from here.</p>
                    </div>
                    
                    <div class="help-card" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="color:var(--accent-gold); margin-bottom:8px;">📝 Definition</h4>
                        <p style="font-size:13px; color:var(--text-muted);">Define the structure of your database using the Field Definition Table (FDT). Specify tags, names, and indexing techniques.</p>
                    </div>

                    <div class="help-card" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="color:var(--accent-gold); margin-bottom:8px;">⌨️ Data Entry</h4>
                        <p style="font-size:13px; color:var(--text-muted);">Add new records or edit existing ones. Use the navigation buttons to flip through the Master File (MFN).</p>
                    </div>

                    <div class="help-card" style="background:rgba(255,255,255,0.03); padding:15px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="color:var(--accent-gold); margin-bottom:8px;">🔍 Search</h4>
                        <p style="font-size:13px; color:var(--text-muted);">Retrieve information using Expert or Guided search. Customize how records are displayed using PFT formats.</p>
                    </div>
                </div>

                <div 
                    onclick="app.aiAssistant.activate()"
                    style="margin-top:30px; padding:20px; background:var(--bg-glass); border-radius:var(--radius-md); text-align:center; border:1px dashed var(--accent-gold); cursor:pointer; transition:all 0.3s;"
                    onmouseover="this.style.background='rgba(197, 163, 101, 0.1)'"
                    onmouseout="this.style.background='var(--bg-glass)'"
                >
                    <p style="color:var(--accent-gold); font-weight:500;">🤖 Need more help? Click here to ask our AI Assistant!</p>
                </div>
            </div>
        `;
    }
}

// --- App Controller ---
class App {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.recordManager = new RecordManager();
        this.fdtEditor = new FDTEditor(this.dbManager, (name) => this.onDatabaseCreated(name));
        this.dataEntry = new DataEntryForm(this.dbManager, this.recordManager);
        this.searchUI = new SearchUI(this.dbManager, this.recordManager);
        this.dictionaryUI = new DictionaryUI(this.dbManager, this.recordManager);
        this.helpUI = new HelpUI();
        this.aiAssistant = new AIAssistant(this); // Initialize AI Assistant
        this.state = { currentView: 'dashboard', currentDb: null };

        // Preload voices
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }

        this.init();
    }

    init() {
        const lastDb = localStorage.getItem('last_db');
        if (this.dbManager.getDatabase(lastDb)) this.selectDb(lastDb, false);
        this.navigateTo('dashboard');
        // No automatic welcome or overlay
    }

    onDatabaseCreated(name) {
        this.selectDb(name);
    }

    // ... (rest of App methods)

    // Deprecated welcomeUser - logic moved to AI Assistant

    navigateTo(viewName) {
        this.state.currentView = viewName;

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navId = `nav-${viewName}`;
        const navEl = document.getElementById(navId);
        if (navEl) navEl.classList.add('active');

        const titles = {
            'dashboard': 'Dashboard',
            'definition': 'Database Definition',
            'data-entry': 'Data Entry',
            'search': 'Search & Retrieval',
            'dictionary': 'Dictionary',
            'browse': 'Browse Master File',
            'help': 'System Help'
        };
        document.getElementById('page-title-text').textContent = titles[viewName] || 'WinISIS';

        const contentArea = document.getElementById('content-area');

        if (viewName === 'definition') {
            contentArea.innerHTML = this.fdtEditor.render();
            setTimeout(() => {
                if (document.querySelectorAll('#fdt-body tr').length === 0) this.fdtEditor.addFieldRow();
            }, 0);
        } else if (viewName === 'dashboard') {
            this.renderDashboard(contentArea);
        } else if (viewName === 'data-entry') {
            this.checkDb(() => contentArea.innerHTML = this.dataEntry.render());
        } else if (viewName === 'search') {
            this.checkDb(() => contentArea.innerHTML = this.searchUI.render());
        } else if (viewName === 'dictionary') {
            this.checkDb(() => contentArea.innerHTML = this.dictionaryUI.render());
        } else if (viewName === 'help') {
            contentArea.innerHTML = this.helpUI.render();
        } else {
            contentArea.innerHTML = `<div class="premium-card text-center" style="padding:40px;">Module ${viewName} coming soon.</div>`;
        }
    }

    checkDb(callback) {
        if (!this.state.currentDb) {
            this.updateStatus("Please select a database first.");
            this.navigateTo('dashboard');
        } else {
            callback();
        }
    }

    renderDashboard(container) {
        const dbs = this.dbManager.listDatabases();
        if (dbs.length === 0) {
            container.innerHTML = `
                <div class="premium-card text-center" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                    <div style="font-size:60px; margin-bottom:20px;">📂</div>
                    <h3 style="color:var(--text-primary); margin-bottom:10px;">No Databases Found</h3>
                    <p style="color:var(--text-secondary); margin-bottom:20px;">Get started by defining your first database structure.</p>
                    <button class="btn btn-primary" onclick="app.navigateTo('definition')">Create New Database</button>
                </div>
            `;
            return;
        }

        const cards = dbs.map(db => `
            <div class="db-card-item" style="position:relative;">
                <div onclick="app.selectDb('${db}')" style="display:flex; flex-direction:column; align-items:center; width:100%;">
                    <div class="db-icon">🗄️</div>
                    <div class="db-name">${db}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Click to Open</div>
                </div>
                <button 
                    onclick="event.stopPropagation(); app.deleteDb('${db}')" 
                    title="Delete Database"
                    style="position:absolute; top:10px; right:10px; background:transparent; border:none; color:var(--text-muted); opacity:0.5; font-size:16px;">
                    🗑️
                </button>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="premium-card">
                <h3 style="margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">Available Projects</h3>
                <div class="db-grid">
                    ${cards}
                    <div class="db-card-item" style="border-style:dashed; background:rgba(255,255,255,0.02);" onclick="app.navigateTo('definition')">
                        <div class="db-icon" style="opacity:0.5;">➕</div>
                        <div class="db-name" style="color:var(--accent-gold);">Create New</div>
                    </div>
                </div>
            </div>
        `;
    }

    selectDb(name, navigate = true) {
        this.state.currentDb = name;
        this.dataEntry.setDatabase(name); // Fix: Load FDT into Data Entry form
        this.recordManager.loadRecords(name);
        localStorage.setItem('last_db', name);

        const ind = document.getElementById('current-db-ind');
        if (ind) ind.textContent = name;

        this.updateStatus(`Active Database: ${name}`);
        if (navigate) this.navigateTo('data-entry');
    }

    deleteDb(name) {
        if (confirm(`Are you sure you want to delete database '${name}'? This cannot be undone.`)) {
            this.dbManager.deleteDatabase(name);
            if (this.state.currentDb === name) {
                this.state.currentDb = null;
                localStorage.removeItem('last_db');
                document.getElementById('current-db-ind').textContent = 'No Database';
            }
            this.renderDashboard(document.getElementById('content-area'));
            this.updateStatus(`Database ${name} deleted.`);
        }
    }

    editRecord(mfn) {
        this.navigateTo('data-entry');
        this.dataEntry.currentMfn = mfn;
        this.dataEntry.renderView();
    }

    updateStatus(msg) {
        console.log("Status:", msg);
    }
}

// Init
const app = new App();
window.app = app;
