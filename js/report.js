/* === AIMRE — Génération de rapport PPTX === */

// Initialiser les sélecteurs du rapport
function initReportSelectors() {
  // Mois
  const monthSelect = document.getElementById('reportMonth');
  if (monthSelect && monthSelect.options.length === 0) {
    MOIS.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      if (i === new Date().getMonth()) opt.selected = true;
      monthSelect.appendChild(opt);
    });
  }

  // Année
  const yearSelect = document.getElementById('reportYear');
  if (yearSelect && yearSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  // Propriétaires
  const ownerSelect = document.getElementById('reportOwner');
  if (ownerSelect && ownerSelect.options.length <= 1) {
    AppData.proprietaires.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.Nom;
      opt.textContent = p.Nom;
      ownerSelect.appendChild(opt);
    });
  }

  // Immeubles
  const buildingSelect = document.getElementById('reportBuilding');
  if (buildingSelect && buildingSelect.options.length <= 1) {
    AppData.immeubles.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.Nom;
      opt.textContent = `${i.Nom} (${i.Propriétaire})`;
      buildingSelect.appendChild(opt);
    });
  }
}

// Génération du PPTX
function generatePPTX() {
  const owner = document.getElementById('reportOwner').value;
  const building = document.getElementById('reportBuilding').value;
  const month = parseInt(document.getElementById('reportMonth').value);
  const year = parseInt(document.getElementById('reportYear').value);
  const monthName = MOIS[month];
  const period = `${String(month + 1).padStart(2, '0')}/${year}`;

  // Filtrer les données
  let prospects = AppData.prospects;
  let immeubles = AppData.immeubles;

  if (owner) {
    prospects = prospects.filter(p => p.Propriétaire === owner);
    immeubles = immeubles.filter(i => i.Propriétaire === owner);
  }
  if (building) {
    prospects = prospects.filter(p => p.Immeuble === building);
    immeubles = immeubles.filter(i => i.Nom === building);
  }

  const prospectsActifs = prospects.filter(p => p.Statut !== 'Perdu');

  // Créer la présentation
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 pouces
  pptx.author = 'AIMRE Prospect Tracker';
  pptx.subject = `Rapport de prospection — ${period}`;

  // Couleurs AIMRE
  const COLORS = {
    primary: '1A2744',
    accent: '2196F3',
    white: 'FFFFFF',
    gray: 'F8F9FA',
    text: '212121',
    textLight: '757575',
    success: '4CAF50',
    danger: 'E74C3C',
    warning: 'FF9800'
  };

  // === SLIDE 1 : COUVERTURE ===
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLORS.primary };

  // Titre de l'immeuble ou propriétaire
  const reportTitle = building || owner || 'PORTEFEUILLE GLOBAL';
  slide1.addText(reportTitle, {
    x: 0.8, y: 1.5, w: 11.7, h: 1.2,
    fontSize: 40, fontFace: 'Arial', color: COLORS.white,
    bold: true
  });

  slide1.addText('ASSET REPORTING', {
    x: 0.8, y: 2.7, w: 11.7, h: 0.6,
    fontSize: 20, fontFace: 'Arial', color: COLORS.accent,
    bold: true, letterSpacing: 3
  });

  slide1.addText(period, {
    x: 0.8, y: 3.5, w: 11.7, h: 0.5,
    fontSize: 16, fontFace: 'Arial', color: COLORS.white
  });

  // Adresse si immeuble spécifique
  if (building && immeubles.length > 0) {
    const addr = immeubles[0].Adresse || '';
    if (addr) {
      slide1.addText(addr, {
        x: 0.8, y: 4.2, w: 11.7, h: 0.4,
        fontSize: 12, fontFace: 'Arial', color: '999999'
      });
    }
  }

  // Logo texte AIMRE
  slide1.addText('AIMRE', {
    x: 0.8, y: 6.2, w: 3, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: COLORS.accent, bold: true
  });

  slide1.addText('Asset & Investment Management Real Estate', {
    x: 0.8, y: 6.6, w: 5, h: 0.3,
    fontSize: 9, fontFace: 'Arial', color: '999999'
  });

  // === SLIDE 2 : RÉSUMÉ KPI ===
  const slide2 = pptx.addSlide();
  slide2.background = { color: COLORS.white };

  addSlideHeader(slide2, 'Résumé', reportTitle, period, COLORS);

  // KPIs
  const totalLots = immeubles.reduce((s, i) => s + (parseInt(i['Nombre de lots']) || 0), 0);
  const totalVacants = immeubles.reduce((s, i) => s + (parseInt(i['Lots vacants']) || 0), 0);
  const tauxOcc = totalLots > 0 ? Math.round(((totalLots - totalVacants) / totalLots) * 100) : 0;

  const kpis = [
    { label: 'Prospects\nactifs', value: prospectsActifs.length.toString(), color: COLORS.accent },
    { label: 'Taux\nd\'occupation', value: tauxOcc + '%', color: tauxOcc >= 80 ? COLORS.success : COLORS.warning },
    { label: 'Lots\nvacants', value: totalVacants.toString(), color: totalVacants > 5 ? COLORS.danger : COLORS.warning },
    { label: 'Immeubles', value: immeubles.length.toString(), color: COLORS.primary }
  ];

  kpis.forEach((kpi, i) => {
    const x = 0.8 + i * 3;
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: x, y: 1.8, w: 2.6, h: 1.5,
      fill: { color: COLORS.gray },
      rectRadius: 0.1
    });
    slide2.addText(kpi.value, {
      x: x, y: 1.9, w: 2.6, h: 0.8,
      fontSize: 36, fontFace: 'Arial', color: kpi.color,
      bold: true, align: 'center'
    });
    slide2.addText(kpi.label, {
      x: x, y: 2.7, w: 2.6, h: 0.5,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight,
      align: 'center'
    });
  });

  // Répartition par statut
  const statusCounts = {};
  CONFIG.STATUTS.forEach(s => { statusCounts[s.id] = 0; });
  prospectsActifs.forEach(p => {
    if (statusCounts[p.Statut] !== undefined) statusCounts[p.Statut]++;
  });

  let yPos = 3.8;
  slide2.addText('Répartition par statut', {
    x: 0.8, y: yPos, w: 5, h: 0.4,
    fontSize: 12, fontFace: 'Arial', color: COLORS.primary, bold: true
  });

  yPos += 0.5;
  CONFIG.STATUTS.forEach(s => {
    if (statusCounts[s.id] === 0) return;
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 0.2, h: 0.2,
      fill: { color: s.color.replace('#', '') },
      rectRadius: 0.02
    });
    slide2.addText(`${s.label}: ${statusCounts[s.id]}`, {
      x: 1.1, y: yPos - 0.02, w: 3, h: 0.25,
      fontSize: 10, fontFace: 'Arial', color: COLORS.text
    });
    yPos += 0.3;
  });

  // === SLIDE 3 : PROSPECT TRACKING ===
  const slide3 = pptx.addSlide();
  slide3.background = { color: COLORS.white };
  addSlideHeader(slide3, 'Prospect Tracking', reportTitle, period, COLORS);

  if (prospectsActifs.length > 0) {
    const tableRows = [
      [
        { text: 'Prospect', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Immeuble', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Surface', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Statut', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Agent', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Prochaine étape', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } }
      ]
    ];

    prospectsActifs.slice(0, 18).forEach(p => {
      tableRows.push([
        { text: p['Nom prospect'] || '', options: { fontSize: 8, bold: true } },
        { text: p.Immeuble || '', options: { fontSize: 8 } },
        { text: (p['Surface (m²)'] || '—') + ' m²', options: { fontSize: 8 } },
        { text: p.Statut || '', options: { fontSize: 8 } },
        { text: p['Responsable AIMRE'] || '', options: { fontSize: 8 } },
        { text: (p['Prochaine action'] || '').substring(0, 80), options: { fontSize: 7 } }
      ]);
    });

    slide3.addTable(tableRows, {
      x: 0.5, y: 1.6, w: 12.3,
      border: { type: 'solid', pt: 0.5, color: 'DDDDDD' },
      rowH: 0.35,
      colW: [2, 1.8, 1.2, 1.5, 2, 3.8],
      autoPage: true,
      autoPageRepeatHeader: true
    });
  } else {
    slide3.addText('Aucun prospect actif pour cette période.', {
      x: 0.8, y: 3, w: 11, h: 1,
      fontSize: 14, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  }

  // === SLIDE 4 : DÉTAILS PAR IMMEUBLE ===
  immeubles.forEach(imm => {
    const immProspects = prospectsActifs.filter(p => p.Immeuble === imm.Nom);
    if (immProspects.length === 0) return;

    const slide = pptx.addSlide();
    slide.background = { color: COLORS.white };
    addSlideHeader(slide, imm.Nom, reportTitle, period, COLORS);

    // Infos immeuble
    const lots = parseInt(imm['Nombre de lots']) || 0;
    const vac = parseInt(imm['Lots vacants']) || 0;
    const occ = lots > 0 ? Math.round(((lots - vac) / lots) * 100) : 0;

    slide.addText(`${imm.Adresse || 'Adresse non renseignée'}  |  ${imm['Surface totale (m²)'] || '—'} m²  |  Occupation: ${occ}%  |  ${vac} lots vacants`, {
      x: 0.5, y: 1.4, w: 12, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight
    });

    // Tableau prospects
    const rows = [
      [
        { text: 'Prospect', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Surface', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Statut', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Agent', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
        { text: 'Notes / Prochaine étape', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } }
      ]
    ];

    immProspects.forEach(p => {
      const notes = [p['Prochaine action'], p.Notes].filter(Boolean).join(' — ');
      rows.push([
        { text: p['Nom prospect'] || '', options: { fontSize: 9, bold: true } },
        { text: (p['Surface (m²)'] || '—') + ' m²', options: { fontSize: 9 } },
        { text: p.Statut || '', options: { fontSize: 9 } },
        { text: p['Responsable AIMRE'] || '', options: { fontSize: 9 } },
        { text: notes.substring(0, 120), options: { fontSize: 8 } }
      ]);
    });

    slide.addTable(rows, {
      x: 0.5, y: 1.9, w: 12.3,
      border: { type: 'solid', pt: 0.5, color: 'DDDDDD' },
      rowH: 0.4,
      colW: [2.2, 1.3, 1.5, 2, 5.3]
    });
  });

  // === SLIDE FINALE : CONTACTS ===
  const lastSlide = pptx.addSlide();
  lastSlide.background = { color: COLORS.primary };

  lastSlide.addText('Contacts', {
    x: 0.8, y: 0.8, w: 11, h: 0.6,
    fontSize: 24, fontFace: 'Arial', color: COLORS.white, bold: true
  });

  CONFIG.AIMRE.team.forEach((member, i) => {
    const x = 0.8 + i * 4;
    lastSlide.addText(member.name, {
      x: x, y: 2, w: 3.5, h: 0.4,
      fontSize: 16, fontFace: 'Arial', color: COLORS.white, bold: true
    });
    lastSlide.addText(member.role.toUpperCase(), {
      x: x, y: 2.4, w: 3.5, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: COLORS.accent, letterSpacing: 1
    });
    lastSlide.addText(`${member.phone}\n${member.email}`, {
      x: x, y: 2.9, w: 3.5, h: 0.5,
      fontSize: 10, fontFace: 'Arial', color: '999999'
    });
  });

  // Infos AIMRE
  lastSlide.addText('Asset & Investment Management Real Estate', {
    x: 0.8, y: 5, w: 5, h: 0.3,
    fontSize: 10, fontFace: 'Arial', color: COLORS.accent
  });
  lastSlide.addText(`${CONFIG.AIMRE.address}\n${CONFIG.AIMRE.vat}`, {
    x: 0.8, y: 5.3, w: 5, h: 0.5,
    fontSize: 9, fontFace: 'Arial', color: '999999'
  });

  // Pied de page
  const footerText = `${reportTitle} ASSET REPORTING — ${period}`;
  lastSlide.addText(footerText, {
    x: 0.5, y: 6.8, w: 12.3, h: 0.3,
    fontSize: 7, fontFace: 'Arial', color: '666666', align: 'center'
  });

  // Téléchargement
  const filename = `${(building || owner || 'AIMRE').replace(/\s+/g, '_')}_Asset_Reporting_${period.replace('/', '-')}`;
  pptx.writeFile({ fileName: filename + '.pptx' })
    .then(() => showToast('Rapport PPTX généré avec succès', 'success'))
    .catch(err => {
      console.error('[Report] Erreur génération PPTX:', err);
      showToast('Erreur lors de la génération du rapport', 'error');
    });
}

// Helper : en-tête de slide standard
function addSlideHeader(slide, title, subtitle, period, colors) {
  // Barre supérieure
  slide.addShape(slide._slideLayout?._presLayout ? 'rect' : 'rect', {
    x: 0, y: 0, w: 13.33, h: 0.06,
    fill: { color: colors.accent }
  });

  // Titre
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 8, h: 0.5,
    fontSize: 20, fontFace: 'Arial', color: colors.primary, bold: true
  });

  // Sous-titre + période
  slide.addText(`${subtitle} ASSET REPORTING`, {
    x: 0.5, y: 0.8, w: 5, h: 0.3,
    fontSize: 9, fontFace: 'Arial', color: colors.textLight
  });

  slide.addText(period, {
    x: 10, y: 0.3, w: 2.8, h: 0.5,
    fontSize: 14, fontFace: 'Arial', color: colors.accent, align: 'right', bold: true
  });

  // Ligne séparatrice
  slide.addShape('line', {
    x: 0.5, y: 1.2, w: 12.3, h: 0,
    line: { color: 'DDDDDD', width: 0.5 }
  });
}
