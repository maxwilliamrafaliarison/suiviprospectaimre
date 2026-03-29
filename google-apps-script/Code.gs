/**
 * AIMRE Prospect Tracker — Google Apps Script (Web App)
 * Ce script sert de proxy pour écrire dans le Google Sheet
 * depuis le dashboard (contourne les limitations CORS/OAuth).
 *
 * INSTALLATION :
 * 1. Ouvrir le Google Sheet → Extensions → Apps Script
 * 2. Coller ce code dans l'éditeur (remplacer le contenu existant)
 * 3. Cliquer "Déployer" → "Nouveau déploiement"
 * 4. Type = "Application Web"
 * 5. Exécuter en tant que = "Moi"
 * 6. Accès = "Tout le monde" (pour que le dashboard puisse y accéder)
 * 7. Copier l'URL et la coller dans config.js → APPS_SCRIPT_URL
 */

// ID du Google Sheet (automatiquement détecté si lié au Sheet)
const SPREADSHEET_ID = '150T793FvIRKjQ1-poH1MTt1Xzj8He8qgTChiyEWEnYk';

/**
 * Gère les requêtes POST du dashboard
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { action, sheet, row, values, user } = data;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName(sheet);

    if (!ws) {
      return jsonResponse({ error: `Onglet "${sheet}" introuvable` });
    }

    let result;

    switch (action) {
      case 'append':
        result = appendRow(ws, values, user);
        break;
      case 'update':
        result = updateRow(ws, row, values, user);
        break;
      case 'delete':
        result = deleteRow(ws, row, user);
        break;
      default:
        return jsonResponse({ error: `Action "${action}" non reconnue` });
    }

    // Log de l'action
    logAction(ss, action, sheet, user, values);

    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

/**
 * Gère les requêtes GET (test de connexion)
 */
function doGet(e) {
  return jsonResponse({
    status: 'ok',
    message: 'AIMRE Prospect Tracker API — connecté',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * Ajouter une ligne à la fin de l'onglet
 */
function appendRow(ws, values, user) {
  if (!values || !Array.isArray(values)) {
    return { error: 'Valeurs manquantes ou invalides' };
  }

  const lastRow = ws.getLastRow();
  const newRow = lastRow + 1;

  // Écrire les valeurs
  ws.getRange(newRow, 1, 1, values.length).setValues([values]);

  return {
    success: true,
    action: 'append',
    row: newRow,
    message: `Ligne ajoutée en position ${newRow}`
  };
}

/**
 * Modifier une ligne existante
 */
function updateRow(ws, rowIndex, values, user) {
  if (!rowIndex || rowIndex < 2) {
    return { error: 'Index de ligne invalide (doit être >= 2)' };
  }
  if (!values || !Array.isArray(values)) {
    return { error: 'Valeurs manquantes ou invalides' };
  }

  const lastRow = ws.getLastRow();
  if (rowIndex > lastRow) {
    return { error: `Ligne ${rowIndex} n'existe pas (dernière ligne: ${lastRow})` };
  }

  // Écrire les nouvelles valeurs
  ws.getRange(rowIndex, 1, 1, values.length).setValues([values]);

  return {
    success: true,
    action: 'update',
    row: rowIndex,
    message: `Ligne ${rowIndex} mise à jour`
  };
}

/**
 * Supprimer une ligne
 */
function deleteRow(ws, rowIndex, user) {
  if (!rowIndex || rowIndex < 2) {
    return { error: 'Index de ligne invalide (doit être >= 2)' };
  }

  const lastRow = ws.getLastRow();
  if (rowIndex > lastRow) {
    return { error: `Ligne ${rowIndex} n'existe pas (dernière ligne: ${lastRow})` };
  }

  ws.deleteRow(rowIndex);

  return {
    success: true,
    action: 'delete',
    row: rowIndex,
    message: `Ligne ${rowIndex} supprimée`
  };
}

/**
 * Journal des modifications (onglet "Logs" créé auto si besoin)
 */
function logAction(ss, action, sheet, user, values) {
  try {
    let logSheet = ss.getSheetByName('Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Logs');
      logSheet.appendRow(['Timestamp', 'Action', 'Onglet', 'Utilisateur', 'Détails']);
      logSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }

    const timestamp = new Date().toISOString();
    const details = values ? JSON.stringify(values).substring(0, 500) : '-';
    logSheet.appendRow([timestamp, action, sheet, user || 'anonymous', details]);

  } catch (e) {
    // Log silencieux en cas d'erreur
    console.log('Erreur log:', e.message);
  }
}

/**
 * Réponse JSON (avec en-têtes CORS)
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
