/* === AIMRE Prospect Tracker — Point d'entrée === */

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AIMRE] Démarrage de l\'application...');

  // Date courante
  const now = new Date();
  document.getElementById('dashboardDate').textContent =
    now.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('printDate').textContent =
    'Généré le ' + now.toLocaleDateString('fr-BE');

  // Détecter le mode (démo ou API)
  if (CONFIG.DEMO_MODE) {
    console.log('[AIMRE] Mode démo activé — Configurez les clés API dans js/config.js');
    showToast('Mode démo — Les données ne sont pas connectées à Google Sheets', 'warning');
  } else {
    // Initialiser Google API
    initGapiClient();
    window.addEventListener('load', initGIS);
  }

  // Charger les données
  await refreshData();

  // Responsive : afficher le bouton menu mobile
  checkMobileView();
  window.addEventListener('resize', checkMobileView);

  // Navigation par hash
  handleHashNavigation();
  window.addEventListener('hashchange', handleHashNavigation);

  // Écouter les changements de page
  window.addEventListener('pageChange', (e) => {
    const page = e.detail.page;
    renderPage(page);
  });

  console.log('[AIMRE] Application prête.');
});

// Chargement / rafraîchissement des données
async function refreshData() {
  try {
    await SheetsAPI.loadAll();
    renderCurrentPage();
    updateAuthUI();
  } catch (e) {
    console.error('[AIMRE] Erreur chargement données:', e);
    showToast('Erreur de chargement des données', 'error');
  }
}

// Rendu de la page courante
function renderCurrentPage() {
  const activePage = document.querySelector('.nav-item.active');
  const page = activePage ? activePage.dataset.page : 'dashboard';
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'pipeline':
      renderPipeline();
      break;
    case 'prospects':
      renderProspects();
      break;
    case 'immeubles':
      renderImmeubles();
      break;
    case 'proprietaires':
      renderProprietaires();
      break;
    case 'calendrier':
      renderCalendar();
      break;
    case 'rapport':
      initReportSelectors();
      break;
    case 'utilisateurs':
      renderUsers();
      break;
  }
}

// Gestion des utilisateurs (admin)
function renderUsers() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;

  tbody.innerHTML = AppData.utilisateurs.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.Nom)}</strong></td>
      <td>${escapeHtml(u.Email)}</td>
      <td><span class="badge ${u.Rôle === 'Admin' ? 'badge-negociation' : u.Rôle === 'Editeur' ? 'badge-contacte' : 'badge-nouveau'}">${escapeHtml(u.Rôle)}</span></td>
      <td>${u.Actif === 'Oui' ? '<span style="color:var(--success)">Actif</span>' : '<span style="color:var(--danger)">Inactif</span>'}</td>
      <td>
        ${Auth.canManageUsers() ? `<button class="btn btn-sm btn-secondary">Modifier</button>` : '—'}
      </td>
    </tr>
  `).join('');
}

function openUserModal() {
  showToast('Ajoutez directement les utilisateurs dans l\'onglet "Utilisateurs" du Google Sheet', 'info');
}

// Navigation par URL hash
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

// Fermer sidebar au clic en dehors (mobile)
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
  // Escape : fermer les modales
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});
