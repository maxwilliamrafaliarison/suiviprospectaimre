/* === AIMRE — Configuration === */

const CONFIG = {
  // Google Sheets
  SPREADSHEET_ID: '150T793FvIRKjQ1-poH1MTt1Xzj8He8qgTChiyEWEnYk',
  // IMPORTANT: Remplacez par votre clé API Google (voir README)
  API_KEY: 'AIzaSyAobaumv-Stbp67kAGEYE0jliwERgJj8TU',
  // Client ID OAuth 2.0
  CLIENT_ID: '89019221813-j7vt8ma7hlc1oomtcuhtrgs5dpnrj7r2.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',

  // Noms des onglets Google Sheets
  SHEETS: {
    PROSPECTS: 'Prospects',
    IMMEUBLES: 'Immeubles',
    PROPRIETAIRES: 'Propriétaires',
    UTILISATEURS: 'Utilisateurs'
  },

  // Statuts du pipeline (ordre d'affichage)
  STATUTS: [
    { id: 'Nouveau', label: 'Nouveau', color: '#9E9E9E', class: 'nouveau' },
    { id: 'Contacté', label: 'Contacté', color: '#2196F3', class: 'contacte' },
    { id: 'Visite planifiée', label: 'Visite planifiée', color: '#FF9800', class: 'visite-planifiee' },
    { id: 'Visite effectuée', label: 'Visite effectuée', color: '#FF5722', class: 'visite-effectuee' },
    { id: 'Offre reçue', label: 'Offre reçue', color: '#9C27B0', class: 'offre' },
    { id: 'Négociation', label: 'Négociation', color: '#F44336', class: 'negociation' },
    { id: 'Bail signé', label: 'Bail signé', color: '#4CAF50', class: 'signe' },
    { id: 'Perdu', label: 'Perdu', color: '#607D8B', class: 'perdu' }
  ],

  // Cache (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,

  // Infos AIMRE
  AIMRE: {
    name: 'AIMRE',
    fullName: 'Asset & Investment Management Real Estate',
    address: 'Avenue de Tervuren 242A, 1150 Bruxelles',
    phone: '+32 2 426 24 14',
    email: 'info@aimre.com',
    vat: 'BE0679845977',
    team: [
      { name: 'Guillaume MEERT', role: 'Asset & Investment Manager', phone: '+32 472 71 77 80', email: 'gm@aimre.com' },
      { name: 'Marine de Radiguès', role: 'Asset Manager', phone: '+32 483 027 655', email: 'mdr@aimre.com' }
    ]
  },

  // Mode démo activé si pas de clé API
  get DEMO_MODE() {
    return !this.API_KEY || this.API_KEY === '';
  }
};
