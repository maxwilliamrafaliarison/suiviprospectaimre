/* === AIMRE — Calendrier / Timeline des actions === */

let calendarView = 'upcoming';

function renderCalendar() {
  const container = document.getElementById('calendarList');
  if (!container) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let actions = AppData.prospects
    .filter(p => p.Statut !== 'Perdu' && p.Statut !== 'Bail signé')
    .filter(p => p['Date prochaine action'] || p['Prochaine action'])
    .map(p => {
      const dateStr = p['Date prochaine action'];
      const date = dateStr ? new Date(dateStr) : null;
      const daysDiff = date ? daysUntil(dateStr) : null;

      return {
        id: p.ID,
        date: dateStr,
        dateObj: date,
        daysDiff: daysDiff,
        prospect: p['Nom prospect'],
        building: p.Immeuble,
        owner: p.Propriétaire,
        action: p['Prochaine action'] || 'Action à définir',
        status: p.Statut,
        agent: p['Responsable AIMRE'],
        overdue: daysDiff !== null && daysDiff < 0,
        today: daysDiff === 0,
        upcoming: daysDiff !== null && daysDiff > 0
      };
    });

  // Filtrer selon la vue
  switch (calendarView) {
    case 'upcoming':
      actions = actions.filter(a => a.daysDiff === null || a.daysDiff >= 0);
      break;
    case 'overdue':
      actions = actions.filter(a => a.overdue);
      break;
    // 'all' : pas de filtre
  }

  // Trier par date
  actions.sort((a, b) => {
    if (!a.dateObj && !b.dateObj) return 0;
    if (!a.dateObj) return 1;
    if (!b.dateObj) return -1;
    return a.dateObj - b.dateObj;
  });

  if (actions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>
        <h3>${calendarView === 'overdue' ? 'Aucune action en retard' : 'Aucune action planifiée'}</h3>
        <p>${calendarView === 'overdue' ? 'Toutes les actions sont à jour.' : 'Ajoutez des prochaines actions aux prospects.'}</p>
      </div>
    `;
    return;
  }

  // Grouper par date
  let lastDateGroup = '';
  container.innerHTML = actions.map(a => {
    const dateGroup = a.date ? formatDateGroup(a.dateObj) : 'Sans date';
    let header = '';
    if (dateGroup !== lastDateGroup) {
      lastDateGroup = dateGroup;
      header = `<div style="font-size:0.8rem;font-weight:600;color:var(--primary);padding:var(--space-sm) 0;margin-top:var(--space-md);border-bottom:1px solid var(--border-light)">${dateGroup}</div>`;
    }

    return `
      ${header}
      <div class="timeline-item ${a.overdue ? 'urgent' : a.today ? '' : ''}" style="cursor:pointer" onclick="${Auth.canEdit() ? `openProspectDetail('${a.id}')` : ''}">
        <div class="timeline-date">
          ${a.date ? formatDateShort(a.date) : '—'}
          ${a.daysDiff !== null ? `<div style="font-size:0.65rem;${a.overdue ? 'color:var(--danger);font-weight:600' : a.today ? 'color:var(--warning);font-weight:600' : 'color:var(--text-light)'}">
            ${a.overdue ? Math.abs(a.daysDiff) + 'j retard' : a.today ? "Aujourd'hui" : 'dans ' + a.daysDiff + 'j'}
          </div>` : ''}
        </div>
        <div class="timeline-content">
          <h4>${escapeHtml(a.prospect)}</h4>
          <p>${escapeHtml(a.action)}</p>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;margin-top:4px">
            <span class="tag">${escapeHtml(a.building)}</span>
            <span class="badge ${getStatusBadgeClass(a.status)}">${escapeHtml(a.status)}</span>
            ${a.agent ? `<span style="font-size:0.7rem;color:var(--text-light)">${escapeHtml(a.agent)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDateGroup(date) {
  if (!date || isNaN(date.getTime())) return 'Sans date';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'En retard';
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff <= 7) return 'Cette semaine';
  if (diff <= 14) return 'Semaine prochaine';
  if (diff <= 30) return 'Ce mois-ci';
  return MOIS[date.getMonth()] + ' ' + date.getFullYear();
}

function switchCalendarView(view) {
  calendarView = view;

  // Mettre à jour les onglets
  document.querySelectorAll('#page-calendrier .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  renderCalendar();
}
