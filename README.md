# AIMRE Prospect Tracker

Tableau de bord de suivi de prospection locative pour AIMRE (Asset & Investment Management Real Estate).

Site statique (HTML/CSS/JS) deployable sur GitHub Pages, connecte a Google Sheets comme base de donnees.

---

## Fonctionnalites

- **Dashboard** : KPIs, graphiques (statuts, immeubles, evolution, occupation)
- **Pipeline Kanban** : Vue visuelle des prospects par statut avec drag & drop
- **CRUD complet** : Ajouter, modifier, supprimer prospects/immeubles/proprietaires
- **Calendrier** : Timeline des prochaines actions et alertes retard
- **Rapport PPTX** : Generation de rapports PowerPoint par proprietaire/immeuble
- **Authentification Google** : Roles Admin/Editeur/Lecteur/Visiteur
- **Mode demo** : Fonctionne avec des donnees fictives sans configuration Google
- **Impression** : Optimise pour impression A4
- **Responsive** : Desktop + tablette + mobile

---

## Deploiement rapide (10 minutes)

### Etape 1 : Preparer le Google Sheet

1. Ouvrez votre Google Sheet : `https://docs.google.com/spreadsheets/d/150T793FvIRKjQ1-poH1MTt1Xzj8He8qgTChiyEWEnYk/`
2. Importez le fichier `AIMRE_Google_Sheet_Template.xlsx` (Fichier > Importer > Remplacer la feuille de calcul)
3. Verifiez que les 4 onglets sont presents : Prospects, Immeubles, Proprietaires, Utilisateurs
4. **Partagez le Sheet en lecture publique** : Partager > Toute personne disposant du lien > Lecteur

### Etape 2 : Configurer Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Creez un nouveau projet (ex: "AIMRE Prospect Tracker")
3. Activez l'API :
   - Recherchez "Google Sheets API" > Activer
4. Creez une cle API :
   - APIs et services > Identifiants > Creer des identifiants > Cle API
   - Copiez la cle
   - (Optionnel) Restreignez la cle : HTTP referrers + Google Sheets API uniquement
5. Creez un ID Client OAuth 2.0 :
   - APIs et services > Identifiants > Creer des identifiants > ID client OAuth
   - Type : Application Web
   - Nom : "AIMRE Tracker"
   - Origines JavaScript autorisees :
     - `https://VOTRE-USERNAME.github.io`
     - `http://localhost` (pour le dev local)
   - Copiez le Client ID

### Etape 3 : Configurer le projet

1. Ouvrez `js/config.js`
2. Remplacez les valeurs :

```javascript
API_KEY: 'VOTRE_CLE_API_ICI',
CLIENT_ID: 'VOTRE_CLIENT_ID_ICI.apps.googleusercontent.com',
```

### Etape 4 : Deployer sur GitHub Pages

```bash
# Creez un repository GitHub
git init
git add .
git commit -m "Initial commit - AIMRE Prospect Tracker"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/aimre-prospect-tracker.git
git push -u origin main
```

Sur GitHub :
1. Settings > Pages
2. Source : Deploy from a branch
3. Branch : main, dossier / (root)
4. Save

Le site sera accessible a : `https://VOTRE-USERNAME.github.io/aimre-prospect-tracker/`

### Etape 5 : Ajouter des utilisateurs

Dans l'onglet "Utilisateurs" du Google Sheet, ajoutez les emails Google des utilisateurs avec leurs roles :

| Email | Nom | Role | Actif |
|-------|-----|------|-------|
| gm@aimre.com | Guillaume MEERT | Admin | Oui |
| mdr@aimre.com | Marine de Radiguès | Editeur | Oui |

Roles disponibles :
- **Admin** : Tout voir + editer + supprimer + gerer les utilisateurs
- **Editeur** : Tout voir + editer
- **Lecteur** : Tout voir (y compris donnees sensibles)
- **Visiteur** : Vue publique en lecture seule (sans contacts/notes)

---

## Structure du projet

```
aimre-prospect-tracker/
├── index.html                    # Page unique (SPA)
├── css/
│   ├── variables.css             # Variables CSS (couleurs, typo, espacements)
│   ├── main.css                  # Styles globaux
│   ├── dashboard.css             # Styles dashboard specifiques
│   └── print.css                 # Styles impression
├── js/
│   ├── config.js                 # Configuration (cles API, statuts)
│   ├── utils.js                  # Utilitaires (dates, cache, toast)
│   ├── auth.js                   # Authentification Google OAuth
│   ├── sheets-api.js             # Connexion Google Sheets API
│   ├── demo-data.js              # Donnees fictives mode demo
│   ├── dashboard.js              # KPIs et graphiques Chart.js
│   ├── pipeline.js               # Vue Kanban avec drag & drop
│   ├── crud.js                   # Operations CRUD
│   ├── calendar.js               # Calendrier / timeline
│   ├── report.js                 # Generation PPTX
│   └── app.js                    # Point d'entree
├── AIMRE_Google_Sheet_Template.xlsx  # Template a importer dans Google Sheets
└── README.md
```

---

## Mode demo

Si les cles API ne sont pas configurees dans `config.js`, le site demarre automatiquement en mode demo avec les donnees fictives de `demo-data.js`. Utile pour tester le site avant la configuration Google.

---

## Developpement local

```bash
# Serveur local simple
python3 -m http.server 8000
# ou
npx serve .
```

Ouvrez `http://localhost:8000`

---

## Technologies

- HTML5 / CSS3 / JavaScript ES6+ (vanilla, pas de framework)
- [Chart.js 4](https://www.chartjs.org/) — Graphiques
- [PptxGenJS 3](https://gitbrent.github.io/PptxGenJS/) — Generation PPTX
- [Google Sheets API v4](https://developers.google.com/sheets/api) — Base de donnees
- [Google Identity Services](https://developers.google.com/identity) — Authentification OAuth 2.0

---

## Contact

**AIMRE** — Asset & Investment Management Real Estate
Avenue de Tervuren 242A, 1150 Bruxelles
+32 2 426 24 14 | info@aimre.com
