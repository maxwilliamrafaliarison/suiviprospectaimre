/* === AIMRE — Authentification simple (email + mot de passe) === */

const Auth = {
  user: null,
  role: 'visiteur',

  isAuthenticated() { return this.user !== null; },
  canRead() { return true; },
  canEdit() { return ['editeur', 'admin'].includes(this.role); },
  canDelete() { return this.role === 'admin'; },
  canManageUsers() { return this.role === 'admin'; },

  // Connexion : vérifie email + mot de passe contre l'onglet Utilisateurs
  async login(email, password) {
    if (!email || !password) return { success: false, message: 'Email et mot de passe requis' };

    try {
      // Lire l'onglet Utilisateurs via API Key (lecture publique)
      let users = [];

      if (CONFIG.DEMO_MODE) {
        users = DemoData['Utilisateurs'];
      } else {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.UTILISATEURS}!A:E?key=${CONFIG.API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.values && data.values.length > 1) {
          const headers = data.values[0];
          users = data.values.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] || ''; });
            return obj;
          });
        }
      }

      // Chercher l'utilisateur
      const found = users.find(u =>
        u.Email && u.Email.toLowerCase() === email.toLowerCase()
      );

      if (!found) return { success: false, message: 'Email non reconnu' };

      // Vérifier mot de passe
      const storedPwd = found['Mot de passe'] || found.Password || '';
      if (storedPwd !== password) return { success: false, message: 'Mot de passe incorrect' };

      // Vérifier si actif
      if (found.Actif && found.Actif.toLowerCase() !== 'oui') {
        return { success: false, message: 'Compte désactivé' };
      }

      // Connexion réussie
      this.user = {
        email: found.Email,
        name: found.Nom || email.split('@')[0],
        role: found['Rôle'] || found.Role || 'lecteur'
      };
      this.role = this.user.role.toLowerCase();

      // Sauvegarder en localStorage
      localStorage.setItem('aimre_auth', JSON.stringify({
        email: this.user.email,
        name: this.user.name,
        role: this.role,
        timestamp: Date.now()
      }));

      updateAuthUI();
      showToast(`Bienvenue ${this.user.name} (${this.role})`, 'success');
      return { success: true };

    } catch (e) {
      console.error('[Auth] Erreur login:', e);
      return { success: false, message: 'Erreur de connexion au serveur' };
    }
  },

  // Déconnexion
  logout() {
    const name = this.user ? this.user.name : '';
    this.user = null;
    this.role = 'visiteur';
    localStorage.removeItem('aimre_auth');
    updateAuthUI();
    showToast(`${name} déconnecté`, 'info');
    refreshData();
  },

  // Restaurer la session depuis localStorage
  restoreSession() {
    try {
      const saved = localStorage.getItem('aimre_auth');
      if (!saved) return;
      const data = JSON.parse(saved);
      // Session expire après 24h
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('aimre_auth');
        return;
      }
      this.user = { email: data.email, name: data.name, role: data.role };
      this.role = data.role;
      updateAuthUI();
    } catch (e) {
      localStorage.removeItem('aimre_auth');
    }
  }
};

// Gestion du bouton connexion/déconnexion
function handleAuth() {
  if (Auth.isAuthenticated()) {
    Auth.logout();
  } else {
    openModal('loginModal');
  }
}

// Soumission du formulaire de connexion
async function handleLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';

  const result = await Auth.login(email, password);

  if (result.success) {
    closeModal('loginModal');
    document.getElementById('loginForm').reset();
    refreshData();
  } else {
    errorEl.textContent = result.message;
    errorEl.style.display = 'block';
  }
}

// Mise à jour de l'interface
function updateAuthUI() {
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const authBtn = document.getElementById('authBtn');
  const statusEl = document.getElementById('connectionStatus');

  if (Auth.isAuthenticated()) {
    name.textContent = Auth.user.name;
    roleEl.textContent = Auth.role.charAt(0).toUpperCase() + Auth.role.slice(1);
    roleEl.className = 'user-role ' + Auth.role;
    avatar.textContent = Auth.user.name.charAt(0).toUpperCase();
    avatar.style.background = Auth.role === 'admin' ? 'var(--accent)' : 'var(--accent-blue)';

    // Bouton déconnexion
    authBtn.title = 'Se déconnecter';
    authBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

    // Status connecté
    if (statusEl) {
      statusEl.className = 'connection-status connected';
      statusEl.innerHTML = '<span class="status-dot"></span>Connect\u00e9 \u2014 ' + Auth.role;
    }
  } else {
    avatar.textContent = '?';
    avatar.style.background = 'rgba(255,255,255,0.1)';
    name.textContent = 'Non connect\u00e9';
    roleEl.textContent = 'Visiteur';
    roleEl.className = 'user-role visiteur';
    authBtn.title = 'Se connecter';
    authBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';

    if (statusEl) {
      statusEl.className = 'connection-status disconnected';
      statusEl.innerHTML = '<span class="status-dot"></span>D\u00e9connect\u00e9';
    }
  }

  // Afficher/masquer les éléments selon le rôle
  document.querySelectorAll('.auth-required').forEach(el => {
    el.style.display = Auth.canEdit() ? '' : 'none';
  });
  document.querySelectorAll('.auth-only-cell').forEach(el => {
    el.style.display = Auth.isAuthenticated() ? '' : 'none';
  });
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = Auth.canManageUsers() ? '' : 'none';
  });
  document.querySelectorAll('.sensitive-data').forEach(el => {
    el.style.display = Auth.isAuthenticated() ? '' : 'none';
  });
}

// Initialisation Google Sheets API pour la lecture (sans OAuth)
function initGapiClient() {
  if (CONFIG.DEMO_MODE) return;
  // Pas besoin d'initialiser gapi pour la lecture simple avec API key
  // On utilise fetch() directement
}

function initGIS() {
  // Pas besoin de GIS — authentification simple
}
