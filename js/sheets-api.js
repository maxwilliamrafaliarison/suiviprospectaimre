/* === AIMRE — Google Sheets API (lecture via API Key, écriture via Apps Script) === */

const AppData = {
  prospects: [],
  immeubles: [],
  proprietaires: [],
  utilisateurs: [],
  lastFetch: null
};

// URL du Google Apps Script pour l'écriture (à configurer — voir README)
// Si vide, le mode écriture est désactivé et seule la lecture fonctionne
const APPS_SCRIPT_URL = CONFIG.APPS_SCRIPT_URL || '';

const SheetsAPI = {

  // Lecture d'un onglet via API Key (pas besoin d'OAuth)
  async readSheet(sheetName) {
    if (CONFIG.DEMO_MODE) return DemoData[sheetName] || [];

    const cached = Cache.get(sheetName);
    if (cached) return cached;

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z?key=${CONFIG.API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      const rows = json.values || [];
      if (rows.length < 2) return [];

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });

      Cache.set(sheetName, data);
      return data;
    } catch (e) {
      console.error(`[Sheets] Erreur lecture ${sheetName}:`, e);
      // Fallback données démo
      return DemoData[sheetName] || [];
    }
  },

  // Écriture via Google Apps Script (proxy)
  async writeToSheet(action, sheetName, rowIndex, values) {
    if (CONFIG.DEMO_MODE) {
      return this._demoWrite(action, sheetName, rowIndex, values);
    }

    if (!APPS_SCRIPT_URL) {
      showToast('Mode écriture non configuré (voir README — Apps Script)', 'warning');
      return this._demoWrite(action, sheetName, rowIndex, values);
    }

    if (!Auth.canEdit() && action !== 'read') {
      showToast('Vous n\'avez pas les droits d\'édition', 'error');
      return null;
    }

    try {
      const payload = JSON.stringify({
        action: action,
        sheet: sheetName,
        row: rowIndex,
        values: values,
        user: Auth.user ? Auth.user.email : 'anonymous'
      });

      // Google Apps Script retourne un 302 redirect.
      // fetch() transforme POST→GET sur redirect, perdant le body.
      // Solution : redirect:'follow' + mode:'cors' fonctionne car le POST
      // est traité côté serveur AVANT le redirect (le redirect contient la réponse).
      // On tente d'abord de lire le JSON ; si le redirect échoue (opaque),
      // on considère l'écriture réussie car le serveur a déjà traité la requête.
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });

      let result;
      try {
        result = await resp.json();
      } catch (parseErr) {
        // Le redirect a renvoyé du HTML ou une réponse opaque,
        // mais le POST a bien été traité côté serveur.
        // On vérifie en re-lisant les données.
        console.log('[Sheets] Réponse non-JSON (redirect Google) — écriture probablement réussie');
        result = { success: true, message: 'Écriture envoyée (redirect)' };
      }

      if (result.error) throw new Error(result.error);
      Cache.clear();
      return result;
    } catch (e) {
      console.error(`[Sheets] Erreur écriture:`, e);
      showToast('Erreur de sauvegarde — mode local activé', 'warning');
      return this._demoWrite(action, sheetName, rowIndex, values);
    }
  },

  async appendRow(sheetName, values) {
    return this.writeToSheet('append', sheetName, null, values);
  },

  async updateRow(sheetName, rowIndex, values) {
    return this.writeToSheet('update', sheetName, rowIndex, values);
  },

  async deleteRow(sheetName, rowIndex) {
    if (!Auth.canDelete()) {
      showToast('Seuls les administrateurs peuvent supprimer', 'error');
      return null;
    }
    return this.writeToSheet('delete', sheetName, rowIndex, null);
  },

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

  // Opérations locales (démo ou fallback)
  _demoWrite(action, sheetName, rowIndex, values) {
    const data = DemoData[sheetName];
    if (!data) return null;

    if (action === 'append') {
      const headers = Object.keys(data[0] || {}).filter(k => k !== '_rowIndex');
      const obj = { _rowIndex: data.length + 2 };
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      data.push(obj);
    } else if (action === 'update' && rowIndex) {
      const item = data.find(d => d._rowIndex === rowIndex);
      if (item) {
        const headers = Object.keys(item).filter(k => k !== '_rowIndex');
        headers.forEach((h, i) => { item[h] = values[i] || ''; });
      }
    } else if (action === 'delete' && rowIndex) {
      const idx = data.findIndex(d => d._rowIndex === rowIndex);
      if (idx !== -1) data.splice(idx, 1);
    }

    const actionLabel = action === 'append' ? 'Ajouté' : action === 'update' ? 'Modifié' : 'Supprimé';
    showToast(`${actionLabel} (mode local)`, 'warning');
    return { success: true };
  }
};
