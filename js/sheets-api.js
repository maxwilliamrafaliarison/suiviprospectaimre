/* === AIMRE — Google Sheets API === */

// Stockage des données en mémoire
const AppData = {
  prospects: [],
  immeubles: [],
  proprietaires: [],
  utilisateurs: [],
  lastFetch: null
};

// Lecture des données depuis Google Sheets
const SheetsAPI = {

  // Lecture d'un onglet complet
  async readSheet(sheetName) {
    if (CONFIG.DEMO_MODE) {
      return DemoData[sheetName] || [];
    }

    // Vérifier le cache
    const cached = Cache.get(sheetName);
    if (cached) return cached;

    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${sheetName}!A:Z`
      });

      const rows = response.result.values || [];
      if (rows.length < 2) return [];

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 }; // +2 car header=1, index 0-based
        headers.forEach((h, i) => {
          obj[h] = row[i] || '';
        });
        return obj;
      });

      Cache.set(sheetName, data);
      return data;
    } catch (e) {
      console.error(`[Sheets] Erreur lecture ${sheetName}:`, e);
      showToast(`Erreur de lecture: ${sheetName}`, 'error');
      // Fallback sur le cache expiré ou les données démo
      const expired = localStorage.getItem('aimre_' + sheetName);
      if (expired) {
        try { return JSON.parse(expired).data; } catch {}
      }
      return DemoData[sheetName] || [];
    }
  },

  // Écriture d'une nouvelle ligne
  async appendRow(sheetName, values) {
    if (CONFIG.DEMO_MODE) {
      return this._demoAppend(sheetName, values);
    }

    if (!Auth.canEdit()) {
      showToast('Vous n\'avez pas les droits d\'édition', 'error');
      return null;
    }

    try {
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [values] }
      });
      Cache.clear();
      return response;
    } catch (e) {
      console.error(`[Sheets] Erreur écriture ${sheetName}:`, e);
      showToast('Erreur lors de l\'enregistrement', 'error');
      return null;
    }
  },

  // Mise à jour d'une ligne existante
  async updateRow(sheetName, rowIndex, values) {
    if (CONFIG.DEMO_MODE) {
      return this._demoUpdate(sheetName, rowIndex, values);
    }

    if (!Auth.canEdit()) {
      showToast('Vous n\'avez pas les droits d\'édition', 'error');
      return null;
    }

    try {
      const response = await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [values] }
      });
      Cache.clear();
      return response;
    } catch (e) {
      console.error(`[Sheets] Erreur mise à jour ${sheetName}:`, e);
      showToast('Erreur lors de la mise à jour', 'error');
      return null;
    }
  },

  // Suppression d'une ligne (effacement du contenu)
  async deleteRow(sheetName, rowIndex) {
    if (CONFIG.DEMO_MODE) {
      return this._demoDelete(sheetName, rowIndex);
    }

    if (!Auth.canDelete()) {
      showToast('Seuls les administrateurs peuvent supprimer', 'error');
      return null;
    }

    try {
      const response = await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${sheetName}!A${rowIndex}:Z${rowIndex}`
      });
      Cache.clear();
      return response;
    } catch (e) {
      console.error(`[Sheets] Erreur suppression ${sheetName}:`, e);
      showToast('Erreur lors de la suppression', 'error');
      return null;
    }
  },

  // Chargement de toutes les données
  async loadAll() {
    const [prospects, immeubles, proprietaires, utilisateurs] = await Promise.all([
      this.readSheet(CONFIG.SHEETS.PROSPECTS),
      this.readSheet(CONFIG.SHEETS.IMMEUBLES),
      this.readSheet(CONFIG.SHEETS.PROPRIETAIRES),
      this.readSheet(CONFIG.SHEETS.UTILISATEURS)
    ]);

    AppData.prospects = prospects.filter(p => p.ID || p['Nom prospect']);
    AppData.immeubles = immeubles.filter(i => i.ID || i.Nom);
    AppData.proprietaires = proprietaires.filter(p => p.ID || p.Nom);
    AppData.utilisateurs = utilisateurs;
    AppData.lastFetch = new Date();

    return AppData;
  },

  // === Opérations démo (mode hors ligne) ===

  _demoAppend(sheetName, values) {
    const data = DemoData[sheetName];
    if (!data) return null;
    const headers = Object.keys(data[0] || {}).filter(k => k !== '_rowIndex');
    const obj = { _rowIndex: data.length + 2 };
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    data.push(obj);
    showToast('Enregistré (mode démo — non sauvegardé sur Google Sheets)', 'warning');
    return { result: { updates: { updatedRows: 1 } } };
  },

  _demoUpdate(sheetName, rowIndex, values) {
    const data = DemoData[sheetName];
    if (!data) return null;
    const item = data.find(d => d._rowIndex === rowIndex);
    if (item) {
      const headers = Object.keys(item).filter(k => k !== '_rowIndex');
      headers.forEach((h, i) => { item[h] = values[i] || ''; });
    }
    showToast('Mis à jour (mode démo)', 'warning');
    return { result: { updatedRows: 1 } };
  },

  _demoDelete(sheetName, rowIndex) {
    const data = DemoData[sheetName];
    if (!data) return null;
    const idx = data.findIndex(d => d._rowIndex === rowIndex);
    if (idx !== -1) data.splice(idx, 1);
    showToast('Supprimé (mode démo)', 'warning');
    return { result: { clearedRange: sheetName } };
  }
};
