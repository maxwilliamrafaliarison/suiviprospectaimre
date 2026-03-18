/* === AIMRE — Authentification Google === */

let currentUser = null;
let tokenClient = null;
let gapiInited = false;
let gisInited = false;

// État de l'utilisateur
const Auth = {
  user: null,
  role: 'visiteur', // visiteur, lecteur, editeur, admin

  isAuthenticated() {
    return this.user !== null;
  },

  canRead() {
    return true; // Tout le monde peut lire (mode visiteur)
  },

  canEdit() {
    return ['editeur', 'admin'].includes(this.role);
  },

  canDelete() {
    return this.role === 'admin';
  },

  canManageUsers() {
    return this.role === 'admin';
  }
};

// Initialisation de l'API Google
function initGapiClient() {
  if (CONFIG.DEMO_MODE) {
    console.log('[Auth] Mode démo — pas d\'authentification Google');
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      gapiInited = true;
      maybeEnableAuth();
    } catch (e) {
      console.error('[Auth] Erreur initialisation GAPI:', e);
      showToast('Erreur de connexion à Google API', 'error');
    }
  });
}

// Initialisation Google Identity Services
function initGIS() {
  if (CONFIG.DEMO_MODE) return;

  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: handleTokenResponse,
    });
    gisInited = true;
    maybeEnableAuth();
  } catch (e) {
    console.error('[Auth] Erreur initialisation GIS:', e);
  }
}

function maybeEnableAuth() {
  if (gapiInited && gisInited) {
    console.log('[Auth] Google API et GIS initialisés');
  }
}

// Gestion du token OAuth
function handleTokenResponse(resp) {
  if (resp.error) {
    console.error('[Auth] Erreur token:', resp);
    showToast('Erreur d\'authentification', 'error');
    return;
  }

  // Récupérer les infos utilisateur
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${resp.access_token}` }
  })
    .then(r => r.json())
    .then(userInfo => {
      Auth.user = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };

      // Vérifier le rôle dans le Google Sheet (onglet Utilisateurs)
      checkUserRole(userInfo.email);
    })
    .catch(e => {
      console.error('[Auth] Erreur récupération profil:', e);
      Auth.user = { email: 'unknown', name: 'Utilisateur', picture: null };
      Auth.role = 'lecteur';
      updateAuthUI();
    });
}

// Vérifier le rôle de l'utilisateur dans Google Sheets
async function checkUserRole(email) {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEETS.UTILISATEURS}!A:D`
    });

    const rows = response.result.values || [];
    const userRow = rows.find(r => r[0] && r[0].toLowerCase() === email.toLowerCase());

    if (userRow) {
      Auth.role = (userRow[2] || 'lecteur').toLowerCase();
      const isActive = (userRow[3] || 'Oui').toLowerCase() === 'oui';
      if (!isActive) {
        Auth.role = 'visiteur';
        showToast('Votre compte est désactivé', 'warning');
      }
    } else {
      Auth.role = 'lecteur';
      showToast('Connecté en lecture seule (compte non enregistré)', 'warning');
    }
  } catch (e) {
    console.error('[Auth] Erreur vérification rôle:', e);
    Auth.role = 'lecteur';
  }

  updateAuthUI();
  showToast(`Connecté en tant que ${Auth.user.name} (${Auth.role})`, 'success');
  refreshData();
}

// Connexion / Déconnexion
function handleAuth() {
  if (CONFIG.DEMO_MODE) {
    showToast('Mode démo — Configurez les clés API pour l\'authentification (voir README)', 'warning');
    return;
  }

  if (Auth.isAuthenticated()) {
    // Déconnexion
    const token = gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken('');
    }
    Auth.user = null;
    Auth.role = 'visiteur';
    updateAuthUI();
    showToast('Déconnecté', 'info');
    refreshData();
  } else {
    // Connexion
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      showToast('Service d\'authentification non disponible', 'error');
    }
  }
}

// Mise à jour de l'interface selon l'état d'auth
function updateAuthUI() {
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  const role = document.getElementById('userRole');
  const authBtn = document.getElementById('authBtn');

  if (Auth.isAuthenticated()) {
    name.textContent = Auth.user.name;
    role.textContent = Auth.role.charAt(0).toUpperCase() + Auth.role.slice(1);

    if (Auth.user.picture) {
      avatar.innerHTML = `<img src="${escapeHtml(Auth.user.picture)}" alt="">`;
    } else {
      avatar.textContent = Auth.user.name.charAt(0).toUpperCase();
    }

    // Icône déconnexion
    authBtn.title = 'Se déconnecter';
    authBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  } else {
    avatar.textContent = '?';
    avatar.innerHTML = '?';
    name.textContent = 'Non connecté';
    role.textContent = 'Visiteur';
    authBtn.title = 'Se connecter';
    authBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
  }

  // Afficher/masquer les boutons d'édition
  document.querySelectorAll('.auth-required').forEach(el => {
    el.style.display = Auth.canEdit() ? '' : 'none';
  });

  // Afficher/masquer les colonnes admin
  document.querySelectorAll('.auth-only-cell').forEach(el => {
    el.style.display = Auth.isAuthenticated() ? '' : 'none';
  });

  // Menu admin
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = Auth.canManageUsers() ? '' : 'none';
  });

  // Masquer les données sensibles pour les visiteurs
  document.querySelectorAll('.sensitive-data').forEach(el => {
    el.style.display = Auth.isAuthenticated() ? '' : 'none';
  });
}
