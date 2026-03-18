/* === AIMRE — Opérations CRUD === */

// === PROSPECTS ===

function renderProspects() {
  const tbody = document.getElementById('prospectsBody');
  if (!tbody) return;

  const search = (document.getElementById('prospectSearch')?.value || '').toLowerCase();
  let prospects = AppData.prospects;

  if (search) {
    prospects = prospects.filter(p =>
      (p['Nom prospect'] || '').toLowerCase().includes(search) ||
      (p.Immeuble || '').toLowerCase().includes(search) ||
      (p.Statut || '').toLowerCase().includes(search) ||
      (p['Responsable AIMRE'] || '').toLowerCase().includes(search) ||
      (p.Notes || '').toLowerCase().includes(search)
    );
  }

  document.getElementById('prospectCount').textContent = `${prospects.length} prospect(s)`;

  tbody.innerHTML = prospects.map(p => `
    <tr class="prospect-row" onclick="${Auth.canEdit() ? `openProspectModalEdit(AppData.prospects.find(x => x.ID === '${p.ID}'))` : ''}">
      <td>
        <div class="prospect-name">${escapeHtml(p['Nom prospect'])}</div>
        ${Auth.isAuthenticated() && p.Contact ? `<div class="sensitive-data" style="font-size:0.75rem;color:var(--text-secondary)">${escapeHtml(p.Contact)}</div>` : ''}
      </td>
      <td>
        <div class="prospect-building">
          <span class="building-dot"></span>
          ${escapeHtml(p.Immeuble)}
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary)">${escapeHtml(p.Propriétaire)}</div>
      </td>
      <td><span class="badge ${getStatusBadgeClass(p.Statut)}">${escapeHtml(p.Statut)}</span></td>
      <td>${escapeHtml(p['Surface (m²)'] || '—')}</td>
      <td>${escapeHtml(p['Responsable AIMRE'] || '—')}</td>
      <td>${formatDate(p['Date dernière action'])}</td>
      <td>
        ${p['Prochaine action'] ? `<div style="font-size:0.8rem">${escapeHtml(p['Prochaine action'])}</div>` : '—'}
        ${p['Date prochaine action'] ? `<div style="font-size:0.7rem;color:${isOverdue(p['Date prochaine action']) ? 'var(--danger)' : 'var(--text-secondary)'}">${formatDate(p['Date prochaine action'])}${isOverdue(p['Date prochaine action']) ? ' (retard)' : ''}</div>` : ''}
      </td>
      <td class="auth-only-cell" style="display:${Auth.isAuthenticated() ? '' : 'none'}">
        ${Auth.canEdit() ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openProspectModalEdit(AppData.prospects.find(x => x.ID === '${p.ID}'))">Modifier</button>` : ''}
        ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();confirmDelete('${CONFIG.SHEETS.PROSPECTS}', ${p._rowIndex}, '${escapeHtml(p['Nom prospect'])}')">Suppr.</button>` : ''}
      </td>
    </tr>
  `).join('');

  // Filtres rapides par statut
  renderProspectFilters();
}

function renderProspectFilters() {
  const container = document.getElementById('prospectFilters');
  if (!container) return;

  const counts = {};
  CONFIG.STATUTS.forEach(s => { counts[s.id] = 0; });
  AppData.prospects.forEach(p => {
    if (counts[p.Statut] !== undefined) counts[p.Statut]++;
  });

  container.innerHTML = `
    <span class="filter-chip active" onclick="filterProspectsByStatus('')">Tous (${AppData.prospects.length})</span>
    ${CONFIG.STATUTS.map(s => `
      <span class="filter-chip" onclick="filterProspectsByStatus('${s.id}')">${s.label} (${counts[s.id]})</span>
    `).join('')}
  `;
}

function filterProspectsByStatus(status) {
  document.querySelectorAll('#prospectFilters .filter-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');

  const tbody = document.getElementById('prospectsBody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    if (!status) { row.style.display = ''; return; }
    const badge = row.querySelector('.badge');
    row.style.display = badge && badge.textContent.trim() === status ? '' : 'none';
  });
}

const filterProspects = debounce(() => renderProspects(), 300);

// Ouvrir la modale prospect (nouveau)
function openProspectModal() {
  document.getElementById('prospectModalTitle').textContent = 'Nouveau prospect';
  document.getElementById('prospectForm').reset();
  document.getElementById('prospectId').value = '';

  // Remplir la liste des immeubles
  populateImmeubleSelect('prospectImmeuble');

  openModal('prospectModal');
}

// Ouvrir la modale prospect (édition)
function openProspectModalEdit(prospect) {
  if (!prospect) return;

  document.getElementById('prospectModalTitle').textContent = 'Modifier — ' + prospect['Nom prospect'];
  document.getElementById('prospectId').value = prospect.ID;

  populateImmeubleSelect('prospectImmeuble');

  document.getElementById('prospectNom').value = prospect['Nom prospect'] || '';
  document.getElementById('prospectContact').value = prospect.Contact || '';
  document.getElementById('prospectImmeuble').value = prospect.Immeuble || '';
  document.getElementById('prospectSurface').value = prospect['Surface (m²)'] || '';
  document.getElementById('prospectStatut').value = prospect.Statut || 'Nouveau';
  document.getElementById('prospectSource').value = prospect.Source || '';
  document.getElementById('prospectLoyer').value = prospect['Loyer demandé (€/mois)'] || '';
  document.getElementById('prospectAgent').value = prospect['Responsable AIMRE'] || '';
  document.getElementById('prospectDateContact').value = prospect['Date premier contact'] || '';
  document.getElementById('prospectDureeBail').value = prospect['Durée bail'] || '';
  document.getElementById('prospectProchaineAction').value = prospect['Prochaine action'] || '';
  document.getElementById('prospectDateProchaine').value = prospect['Date prochaine action'] || '';
  document.getElementById('prospectResponsable').value = prospect['Responsable AIMRE'] || '';
  document.getElementById('prospectNotes').value = prospect.Notes || '';

  openModal('prospectModal');
}

// Sauvegarder un prospect
async function saveProspect(e) {
  e.preventDefault();

  const id = document.getElementById('prospectId').value;
  const immeuble = document.getElementById('prospectImmeuble').value;
  const proprietaire = AppData.immeubles.find(i => i.Nom === immeuble)?.Propriétaire || '';

  const values = [
    id || generateId(),
    immeuble,
    proprietaire,
    '', // Lot / Unité
    document.getElementById('prospectSurface').value,
    document.getElementById('prospectLoyer').value,
    document.getElementById('prospectNom').value,
    document.getElementById('prospectContact').value,
    document.getElementById('prospectSource').value,
    document.getElementById('prospectStatut').value,
    document.getElementById('prospectDateContact').value || new Date().toISOString().split('T')[0],
    new Date().toISOString().split('T')[0], // Date dernière action
    document.getElementById('prospectProchaineAction').value,
    document.getElementById('prospectDateProchaine').value,
    document.getElementById('prospectNotes').value,
    document.getElementById('prospectResponsable').value
  ];

  let result;
  if (id) {
    // Mise à jour
    const existing = AppData.prospects.find(p => p.ID === id);
    if (existing) {
      result = await SheetsAPI.updateRow(CONFIG.SHEETS.PROSPECTS, existing._rowIndex, values);
    }
  } else {
    // Création
    result = await SheetsAPI.appendRow(CONFIG.SHEETS.PROSPECTS, values);
  }

  if (result) {
    showToast(id ? 'Prospect mis à jour' : 'Prospect créé', 'success');
    closeModal('prospectModal');
    await refreshData();
  }
}

// === IMMEUBLES ===

function renderImmeubles() {
  const grid = document.getElementById('immeublesGrid');
  if (!grid) return;

  const search = (document.getElementById('immeublesSearch')?.value || '').toLowerCase();
  let immeubles = AppData.immeubles;

  if (search) {
    immeubles = immeubles.filter(i =>
      (i.Nom || '').toLowerCase().includes(search) ||
      (i.Propriétaire || '').toLowerCase().includes(search) ||
      (i.Adresse || '').toLowerCase().includes(search)
    );
  }

  document.getElementById('immeublesCount').textContent = `${immeubles.length} immeuble(s)`;

  grid.innerHTML = immeubles.map(i => {
    const lots = parseInt(i['Nombre de lots']) || 0;
    const vacants = parseInt(i['Lots vacants']) || 0;
    const taux = lots > 0 ? Math.round(((lots - vacants) / lots) * 100) : 0;
    const prospectsCount = AppData.prospects.filter(p => p.Immeuble === i.Nom && p.Statut !== 'Perdu').length;
    const gaugeClass = taux >= 80 ? 'high' : taux >= 60 ? 'medium' : 'low';

    return `
      <div class="card" style="cursor:pointer" onclick="${Auth.canEdit() ? `openImmeubleModalEdit(AppData.immeubles.find(x => x.ID === '${i.ID}'))` : ''}">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:var(--space-md)">
            <div>
              <h3 style="font-size:1rem;font-weight:700;color:var(--primary)">${escapeHtml(i.Nom)}</h3>
              <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(i.Propriétaire)}</div>
              ${i.Adresse ? `<div style="font-size:0.75rem;color:var(--text-light);margin-top:2px">${escapeHtml(i.Adresse)}</div>` : ''}
            </div>
            <span class="badge ${taux >= 80 ? 'badge-signe' : taux >= 60 ? 'badge-visite-planifiee' : 'badge-negociation'}">${taux}%</span>
          </div>
          <div class="gauge-container" style="margin-bottom:var(--space-md)">
            <div class="gauge-bar"><div class="gauge-fill ${gaugeClass}" style="width:${taux}%"></div></div>
            <span class="gauge-label">${taux}%</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-sm);font-size:0.8rem;text-align:center">
            <div>
              <div style="font-weight:600;color:var(--primary)">${escapeHtml(i['Surface totale (m²)'] || '—')}</div>
              <div style="color:var(--text-secondary);font-size:0.7rem">m² total</div>
            </div>
            <div>
              <div style="font-weight:600;color:var(--danger)">${vacants}</div>
              <div style="color:var(--text-secondary);font-size:0.7rem">lots vacants</div>
            </div>
            <div>
              <div style="font-weight:600;color:var(--accent)">${prospectsCount}</div>
              <div style="color:var(--text-secondary);font-size:0.7rem">prospects</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

const filterImmeubles = debounce(() => renderImmeubles(), 300);

function openImmeubleModal() {
  document.getElementById('immeubleModalTitle').textContent = 'Nouvel immeuble';
  document.getElementById('immeubleForm').reset();
  document.getElementById('immeubleId').value = '';
  populateProprietaireSelect('immeubleProprietaire');
  openModal('immeubleModal');
}

function openImmeubleModalEdit(immeuble) {
  if (!immeuble) return;
  document.getElementById('immeubleModalTitle').textContent = 'Modifier — ' + immeuble.Nom;
  document.getElementById('immeubleId').value = immeuble.ID;
  populateProprietaireSelect('immeubleProprietaire');

  document.getElementById('immeubleNom').value = immeuble.Nom || '';
  document.getElementById('immeubleProprietaire').value = immeuble.Propriétaire || '';
  document.getElementById('immeubleAdresse').value = immeuble.Adresse || '';
  document.getElementById('immeubleType').value = immeuble.Type || 'Bureau';
  document.getElementById('immeubleSurface').value = immeuble['Surface totale (m²)'] || '';
  document.getElementById('immeubleLots').value = immeuble['Nombre de lots'] || '';
  document.getElementById('immeubleVacants').value = immeuble['Lots vacants'] || '';
  document.getElementById('immeublePhoto').value = immeuble['Photo URL'] || '';

  openModal('immeubleModal');
}

async function saveImmeuble(e) {
  e.preventDefault();
  const id = document.getElementById('immeubleId').value;
  const lots = parseInt(document.getElementById('immeubleLots').value) || 0;
  const vacants = parseInt(document.getElementById('immeubleVacants').value) || 0;
  const taux = lots > 0 ? Math.round(((lots - vacants) / lots) * 100) + '%' : '';

  const values = [
    id || 'BLD' + Date.now().toString(36),
    document.getElementById('immeubleNom').value,
    document.getElementById('immeubleProprietaire').value,
    document.getElementById('immeubleAdresse').value,
    document.getElementById('immeubleType').value,
    document.getElementById('immeubleSurface').value,
    lots.toString(),
    vacants.toString(),
    taux,
    document.getElementById('immeublePhoto').value
  ];

  let result;
  if (id) {
    const existing = AppData.immeubles.find(i => i.ID === id);
    if (existing) result = await SheetsAPI.updateRow(CONFIG.SHEETS.IMMEUBLES, existing._rowIndex, values);
  } else {
    result = await SheetsAPI.appendRow(CONFIG.SHEETS.IMMEUBLES, values);
  }

  if (result) {
    showToast(id ? 'Immeuble mis à jour' : 'Immeuble créé', 'success');
    closeModal('immeubleModal');
    await refreshData();
  }
}

// === PROPRIÉTAIRES ===

function renderProprietaires() {
  const grid = document.getElementById('proprietairesGrid');
  if (!grid) return;

  document.getElementById('proprietairesCount').textContent = `${AppData.proprietaires.length} propriétaire(s)`;

  grid.innerHTML = AppData.proprietaires.map(p => {
    const nbImmeubles = AppData.immeubles.filter(i => i.Propriétaire === p.Nom).length;
    const nbProspects = AppData.prospects.filter(pr =>
      pr.Propriétaire === p.Nom && pr.Statut !== 'Perdu'
    ).length;

    return `
      <div class="card" onclick="${Auth.canEdit() ? `openProprietaireModalEdit(AppData.proprietaires.find(x => x.ID === '${p.ID}'))` : ''}" style="cursor:pointer">
        <div class="card-body">
          <h3 style="font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:var(--space-sm)">${escapeHtml(p.Nom)}</h3>
          ${Auth.isAuthenticated() ? `
            <div class="sensitive-data" style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--space-sm)">
              ${p['Contact principal'] ? `<div>${escapeHtml(p['Contact principal'])}</div>` : ''}
              ${p.Email ? `<div>${escapeHtml(p.Email)}</div>` : ''}
              ${p.Téléphone ? `<div>${escapeHtml(p.Téléphone)}</div>` : ''}
            </div>
          ` : ''}
          <div style="display:flex;gap:var(--space-lg);font-size:0.85rem;margin-top:var(--space-md)">
            <div>
              <div style="font-weight:600;color:var(--primary);font-size:1.2rem">${nbImmeubles}</div>
              <div style="color:var(--text-secondary);font-size:0.75rem">immeuble(s)</div>
            </div>
            <div>
              <div style="font-weight:600;color:var(--accent);font-size:1.2rem">${nbProspects}</div>
              <div style="color:var(--text-secondary);font-size:0.75rem">prospect(s) actifs</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openProprietaireModal() {
  document.getElementById('proprietaireModalTitle').textContent = 'Nouveau propriétaire';
  document.getElementById('proprietaireForm').reset();
  document.getElementById('proprietaireId').value = '';
  openModal('proprietaireModal');
}

function openProprietaireModalEdit(prop) {
  if (!prop) return;
  document.getElementById('proprietaireModalTitle').textContent = 'Modifier — ' + prop.Nom;
  document.getElementById('proprietaireId').value = prop.ID;
  document.getElementById('proprietaireNom').value = prop.Nom || '';
  document.getElementById('proprietaireContact').value = prop['Contact principal'] || '';
  document.getElementById('proprietaireEmail').value = prop.Email || '';
  document.getElementById('proprietaireTel').value = prop.Téléphone || '';
  document.getElementById('proprietaireNotes').value = prop.Notes || '';
  openModal('proprietaireModal');
}

async function saveProprietaire(e) {
  e.preventDefault();
  const id = document.getElementById('proprietaireId').value;
  const nom = document.getElementById('proprietaireNom').value;
  const nbImmeubles = AppData.immeubles.filter(i => i.Propriétaire === nom).length;

  const values = [
    id || 'OWN' + Date.now().toString(36),
    nom,
    document.getElementById('proprietaireContact').value,
    document.getElementById('proprietaireEmail').value,
    document.getElementById('proprietaireTel').value,
    nbImmeubles.toString(),
    document.getElementById('proprietaireNotes').value
  ];

  let result;
  if (id) {
    const existing = AppData.proprietaires.find(p => p.ID === id);
    if (existing) result = await SheetsAPI.updateRow(CONFIG.SHEETS.PROPRIETAIRES, existing._rowIndex, values);
  } else {
    result = await SheetsAPI.appendRow(CONFIG.SHEETS.PROPRIETAIRES, values);
  }

  if (result) {
    showToast(id ? 'Propriétaire mis à jour' : 'Propriétaire créé', 'success');
    closeModal('proprietaireModal');
    await refreshData();
  }
}

// === SUPPRESSION ===
function confirmDelete(sheetName, rowIndex, name) {
  document.getElementById('deleteMessage').textContent =
    `Voulez-vous vraiment supprimer "${name}" ? Cette action est irréversible.`;
  document.getElementById('deleteConfirmBtn').onclick = async () => {
    await SheetsAPI.deleteRow(sheetName, rowIndex);
    showToast(`"${name}" supprimé`, 'success');
    closeModal('deleteModal');
    await refreshData();
  };
  openModal('deleteModal');
}

// === HELPERS ===
function populateImmeubleSelect(selectId) {
  const select = document.getElementById(selectId);
  const current = select.value;
  select.innerHTML = '<option value="">— Sélectionner —</option>';
  AppData.immeubles.forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.Nom;
    opt.textContent = `${i.Nom} (${i.Propriétaire})`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

function populateProprietaireSelect(selectId) {
  const select = document.getElementById(selectId);
  const current = select.value;
  select.innerHTML = '<option value="">— Sélectionner —</option>';
  AppData.proprietaires.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.Nom;
    opt.textContent = p.Nom;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}
