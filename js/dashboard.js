/* === AIMRE — Dashboard (KPIs + Graphiques) === */

let chartStatut, chartImmeuble, chartEvolution, chartOccupation;

// Rendu complet du dashboard
function renderDashboard() {
  renderKPIs();
  renderCharts();
  renderTimeline();
}

// === KPIs ===
function renderKPIs() {
  const prospects = AppData.prospects;
  const immeubles = AppData.immeubles;

  // Prospects actifs (hors Perdu et Bail signé)
  const actifs = prospects.filter(p =>
    p.Statut !== 'Perdu' && p.Statut !== 'Bail signé'
  ).length;

  // Taux d'occupation global
  let totalLots = 0, totalVacants = 0;
  immeubles.forEach(i => {
    totalLots += parseInt(i['Nombre de lots']) || 0;
    totalVacants += parseInt(i['Lots vacants']) || 0;
  });
  const tauxOccupation = totalLots > 0 ? Math.round(((totalLots - totalVacants) / totalLots) * 100) : 0;

  // Baux signés ce mois
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const bauxSignes = prospects.filter(p => {
    if (p.Statut !== 'Bail signé') return false;
    const d = new Date(p['Date dernière action']);
    return d >= debutMois;
  }).length;

  // Actions en retard
  const retard = prospects.filter(p => {
    if (p.Statut === 'Perdu' || p.Statut === 'Bail signé') return false;
    return isOverdue(p['Date prochaine action']);
  }).length;

  document.getElementById('kpiProspectsActifs').textContent = actifs;
  document.getElementById('kpiTauxOccupation').textContent = tauxOccupation + '%';
  document.getElementById('kpiLotsVacants').textContent = totalVacants;
  document.getElementById('kpiBauxSignes').textContent = bauxSignes;
  document.getElementById('kpiActionsRetard').textContent = retard;
}

// === GRAPHIQUES ===
function renderCharts() {
  renderChartStatut();
  renderChartImmeuble();
  renderChartEvolution();
  renderChartOccupation();
}

function renderChartStatut() {
  const ctx = document.getElementById('chartStatut');
  if (!ctx) return;

  const counts = {};
  CONFIG.STATUTS.forEach(s => { counts[s.id] = 0; });
  AppData.prospects.forEach(p => {
    if (counts[p.Statut] !== undefined) counts[p.Statut]++;
  });

  if (chartStatut) chartStatut.destroy();
  chartStatut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CONFIG.STATUTS.map(s => s.label),
      datasets: [{
        data: CONFIG.STATUTS.map(s => counts[s.id]),
        backgroundColor: CONFIG.STATUTS.map(s => s.color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
      }
    }
  });
}

function renderChartImmeuble() {
  const ctx = document.getElementById('chartImmeuble');
  if (!ctx) return;

  const counts = {};
  AppData.prospects.forEach(p => {
    if (p.Statut === 'Perdu') return;
    const bld = p.Immeuble || 'Inconnu';
    counts[bld] = (counts[bld] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  if (chartImmeuble) chartImmeuble.destroy();
  chartImmeuble = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Prospects actifs',
        data: sorted.map(s => s[1]),
        backgroundColor: '#2196F3',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderChartEvolution() {
  const ctx = document.getElementById('chartEvolution');
  if (!ctx) return;

  // 6 derniers mois
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: MOIS[d.getMonth()].substring(0, 3) + ' ' + d.getFullYear(),
      year: d.getFullYear(),
      month: d.getMonth()
    });
  }

  const nouveaux = months.map(m => {
    return AppData.prospects.filter(p => {
      const d = new Date(p['Date premier contact']);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
  });

  const signes = months.map(m => {
    return AppData.prospects.filter(p => {
      if (p.Statut !== 'Bail signé') return false;
      const d = new Date(p['Date dernière action']);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
  });

  if (chartEvolution) chartEvolution.destroy();
  chartEvolution = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Nouveaux prospects',
          data: nouveaux,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Baux signés',
          data: signes,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76,175,80,0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 12 } } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function renderChartOccupation() {
  const ctx = document.getElementById('chartOccupation');
  if (!ctx) return;

  // Grouper par propriétaire
  const owners = {};
  AppData.immeubles.forEach(i => {
    const owner = i.Propriétaire || 'Inconnu';
    if (!owners[owner]) owners[owner] = { lots: 0, vacants: 0 };
    owners[owner].lots += parseInt(i['Nombre de lots']) || 0;
    owners[owner].vacants += parseInt(i['Lots vacants']) || 0;
  });

  const labels = Object.keys(owners);
  const rates = labels.map(l => {
    const o = owners[l];
    return o.lots > 0 ? Math.round(((o.lots - o.vacants) / o.lots) * 100) : 0;
  });

  const colors = rates.map(r => r >= 80 ? '#4CAF50' : r >= 60 ? '#FF9800' : '#F44336');

  if (chartOccupation) chartOccupation.destroy();
  chartOccupation = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Taux d\'occupation (%)',
        data: rates,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

// === TIMELINE ===
function renderTimeline() {
  const container = document.getElementById('timelineList');
  if (!container) return;

  // Prochaines actions triées par date
  const actions = AppData.prospects
    .filter(p => p['Date prochaine action'] && p.Statut !== 'Perdu' && p.Statut !== 'Bail signé')
    .map(p => ({
      date: p['Date prochaine action'],
      prospect: p['Nom prospect'],
      building: p.Immeuble,
      action: p['Prochaine action'] || 'Action à définir',
      status: p.Statut,
      overdue: isOverdue(p['Date prochaine action'])
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);

  if (actions.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Aucune action planifiée</p></div>';
    return;
  }

  container.innerHTML = actions.map(a => `
    <div class="timeline-item ${a.overdue ? 'urgent' : ''}">
      <div class="timeline-date">${formatDateShort(a.date)}</div>
      <div class="timeline-content">
        <h4>${escapeHtml(a.prospect)}</h4>
        <p>${escapeHtml(a.action)}</p>
        <span class="tag">${escapeHtml(a.building)}</span>
        <span class="badge ${getStatusBadgeClass(a.status)}" style="margin-left:4px">${escapeHtml(a.status)}</span>
        ${a.overdue ? '<span class="badge" style="background:#FFCDD2;color:#B71C1C;margin-left:4px">En retard</span>' : ''}
      </div>
    </div>
  `).join('');
}
