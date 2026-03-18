/* === AIMRE — Pipeline Kanban === */

let draggedCard = null;

// Rendu du pipeline
function renderPipeline() {
  const container = document.getElementById('pipelineContainer');
  if (!container) return;

  // Filtres
  const filterBuilding = document.getElementById('pipelineFilterBuilding').value;
  const filterOwner = document.getElementById('pipelineFilterOwner').value;

  let prospects = AppData.prospects;
  if (filterBuilding) prospects = prospects.filter(p => p.Immeuble === filterBuilding);
  if (filterOwner) prospects = prospects.filter(p => p.Propriétaire === filterOwner);

  container.innerHTML = CONFIG.STATUTS.map(statut => {
    const items = prospects.filter(p => p.Statut === statut.id);
    return `
      <div class="pipeline-column" data-status="${statut.id}">
        <div class="pipeline-header ${statut.class}">
          ${statut.label}
          <span class="count">${items.length}</span>
        </div>
        <div class="pipeline-body" data-status="${statut.id}"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event)">
          ${items.map(p => renderPipelineCard(p)).join('')}
          ${items.length === 0 ? '<div style="text-align:center;color:#bbb;font-size:0.75rem;padding:8px">Aucun prospect</div>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Remplir les filtres
  populatePipelineFilters();
}

function renderPipelineCard(prospect) {
  const days = daysUntil(prospect['Date prochaine action']);
  let daysLabel = '';
  if (days !== null) {
    if (days < 0) daysLabel = `<span style="color:var(--danger);font-weight:600">${Math.abs(days)}j retard</span>`;
    else if (days === 0) daysLabel = `<span style="color:var(--warning);font-weight:600">Aujourd'hui</span>`;
    else daysLabel = `<span>${days}j</span>`;
  }

  return `
    <div class="pipeline-card" draggable="true"
         data-id="${prospect.ID}"
         data-row="${prospect._rowIndex}"
         ondragstart="handleDragStart(event)"
         ondragend="handleDragEnd(event)"
         onclick="openProspectDetail('${prospect.ID}')">
      <div class="pipeline-card-title">${escapeHtml(prospect['Nom prospect'])}</div>
      <div class="pipeline-card-building">
        <span class="building-dot"></span>
        ${escapeHtml(prospect.Immeuble)}
      </div>
      <div class="pipeline-card-meta">
        ${prospect['Surface (m²)'] ? `<span class="pipeline-card-surface">${escapeHtml(prospect['Surface (m²)'])} m²</span>` : '<span></span>'}
        ${daysLabel}
      </div>
      ${prospect.Prochaine?.action ? `<div style="font-size:0.7rem;color:var(--text-secondary);margin-top:4px">${escapeHtml(prospect['Prochaine action'])}</div>` : ''}
    </div>
  `;
}

// === DRAG & DROP ===
function handleDragStart(e) {
  draggedCard = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedCard = null;
  // Retirer les indicateurs visuels
  document.querySelectorAll('.pipeline-body').forEach(b => b.style.background = '');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.style.background = 'rgba(33,150,243,0.08)';
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.style.background = '';

  if (!Auth.canEdit()) {
    showToast('Connectez-vous pour modifier les statuts', 'warning');
    return;
  }

  const prospectId = e.dataTransfer.getData('text/plain');
  const newStatus = e.currentTarget.dataset.status;

  // Trouver le prospect
  const prospect = AppData.prospects.find(p => p.ID === prospectId);
  if (!prospect || prospect.Statut === newStatus) return;

  const oldStatus = prospect.Statut;
  prospect.Statut = newStatus;
  prospect['Date dernière action'] = new Date().toISOString().split('T')[0];

  // Sauvegarder dans Google Sheets
  const headers = Object.keys(prospect).filter(k => k !== '_rowIndex');
  const values = headers.map(h => prospect[h]);
  await SheetsAPI.updateRow(CONFIG.SHEETS.PROSPECTS, prospect._rowIndex, values);

  showToast(`${prospect['Nom prospect']} : ${oldStatus} → ${newStatus}`, 'success');
  renderPipeline();
  renderDashboard();
}

// Filtres du pipeline
function populatePipelineFilters() {
  const buildingSelect = document.getElementById('pipelineFilterBuilding');
  const ownerSelect = document.getElementById('pipelineFilterOwner');

  // Ne remplir que si vides
  if (buildingSelect.options.length <= 1) {
    const buildings = [...new Set(AppData.prospects.map(p => p.Immeuble))].filter(Boolean).sort();
    buildings.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      buildingSelect.appendChild(opt);
    });
  }

  if (ownerSelect.options.length <= 1) {
    const owners = [...new Set(AppData.prospects.map(p => p.Propriétaire))].filter(Boolean).sort();
    owners.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      ownerSelect.appendChild(opt);
    });
  }
}

function filterPipeline() {
  renderPipeline();
}

// Ouvrir le détail d'un prospect (pour l'édition)
function openProspectDetail(prospectId) {
  const prospect = AppData.prospects.find(p => p.ID === prospectId);
  if (!prospect) return;

  if (Auth.canEdit()) {
    openProspectModalEdit(prospect);
  }
}
