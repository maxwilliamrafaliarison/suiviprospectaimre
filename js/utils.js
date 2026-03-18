/* === AIMRE — Utilitaires === */

// Navigation entre pages
function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('page-' + page);
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (section) section.style.display = 'block';
  if (navItem) navItem.classList.add('active');

  // Fermer sidebar mobile
  document.getElementById('sidebar').classList.remove('open');

  // Déclencher le rendu de la page
  window.dispatchEvent(new CustomEvent('pageChange', { detail: { page } }));
}

// Toggle sidebar mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Ouvrir/Fermer modales
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Formatage dates
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return d < new Date() && !isNaN(d.getTime());
  } catch { return false; }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

// Classe badge selon statut
function getStatusBadgeClass(status) {
  const map = {
    'Nouveau': 'badge-nouveau',
    'Contacté': 'badge-contacte',
    'Visite planifiée': 'badge-visite-planifiee',
    'Visite effectuée': 'badge-visite-effectuee',
    'Offre reçue': 'badge-offre',
    'Négociation': 'badge-negociation',
    'Bail signé': 'badge-signe',
    'Perdu': 'badge-perdu'
  };
  return map[status] || 'badge-nouveau';
}

// Génération d'ID unique
function generateId() {
  return 'P' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// Échappement HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Mois en français
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Debounce
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Cache localStorage
const Cache = {
  set(key, data) {
    try {
      localStorage.setItem('aimre_' + key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) { /* quota dépassé, on ignore */ }
  },

  get(key) {
    try {
      const item = localStorage.getItem('aimre_' + key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > CONFIG.CACHE_DURATION) {
        localStorage.removeItem('aimre_' + key);
        return null;
      }
      return parsed.data;
    } catch { return null; }
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('aimre_'))
      .forEach(k => localStorage.removeItem(k));
  }
};
