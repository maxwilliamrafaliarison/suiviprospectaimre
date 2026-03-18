/* === AIMRE Prospect Tracker — Point d'entrée === */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AIMRE] Démarrage...');

  // Date courante
  const now = new Date();
  document.getElementById('dashboardDate').textContent =
    now.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('printDate').textContent =
    'Généré le ' + now.toLocaleDateString('fr-BE');

  // Mode démo ?
  if (CONFIG.DEMO_MODE) {
    console.log('[AIMRE] Mode démo — Configurez API_KEY dans js/config.js');
    showToast('Mode démo — Données locales', 'warning');
  }

  // Restaurer la session si existante
  Auth.restoreSession();

  // Charger les données
  await refreshData();

  // Responsive
  checkMobileView();
  window.addEventListener('resize', checkMobileView);

  // Navigation par hash
  handleHashNavigation();
  window.addEventListener('hashchange', handleHashNavigation);

  // Écouter les changements de page
  window.addEventListener('pageChange', (e) => renderPage(e.detail.page));

  console.log('[AIMRE] Prêt.');
});

// Chargement / rafraîchissement
async function refreshData() {
  try {
    await SheetsAPI.loadAll();
    renderCurrentPage();
    updateAuthUI();
  } catch (e) {
    console.error('[AIMRE] Erreur chargement:', e);
    showToast('Erreur de chargement des données', 'error');
  }
}

// Rendu page courante
function renderCurrentPage() {
  const activePage = document.querySelector('.nav-item.active');
  const page = activePage ? activePage.dataset.page : 'dashboard';
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'pipeline': renderPipeline(); break;
    case 'prospects': renderProspects(); break;
    case 'immeubles': renderImmeubles(); break;
    case 'proprietaires': renderProprietaires(); break;
    case 'calendrier': renderCalendar(); break;
    case 'rapport': initReportSelectors(); break;
    case 'utilisateurs': renderUsers(); break;
    case 'wiki': /* contenu statique HTML */ break;
  }
}

// Gestion utilisateurs (admin)
function renderUsers() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;

  tbody.innerHTML = AppData.utilisateurs.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.Nom)}</strong></td>
      <td>${escapeHtml(u.Email)}</td>
      <td><span class="badge ${(u['Rôle'] || u.Role || '') === 'Admin' ? 'badge-negociation' : (u['Rôle'] || u.Role || '') === 'Editeur' ? 'badge-contacte' : 'badge-nouveau'}">${escapeHtml(u['Rôle'] || u.Role || '')}</span></td>
      <td>${(u.Actif || '').toLowerCase() === 'oui' ? '<span style="color:var(--success)">Actif</span>' : '<span style="color:var(--danger)">Inactif</span>'}</td>
      <td>${Auth.canManageUsers() ? '<button class="btn btn-sm btn-secondary">Modifier</button>' : '—'}</td>
    </tr>
  `).join('');
}

function openUserModal() {
  showToast('Ajoutez les utilisateurs dans l\'onglet "Utilisateurs" du Google Sheet', 'info');
}

// Navigation hash
function handleHashNavigation() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.querySelector(`.nav-item[data-page="${hash}"]`)) {
    navigateTo(hash);
  }
}

// Détection mobile
function checkMobileView() {
  const toggle = document.getElementById('mobileToggle');
  if (window.innerWidth <= 768) {
    toggle.style.display = 'flex';
  } else {
    toggle.style.display = 'none';
    document.getElementById('sidebar').classList.remove('open');
  }
}

// Fermer sidebar mobile au clic dehors
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('mobileToggle');
  if (window.innerWidth <= 768 &&
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});
