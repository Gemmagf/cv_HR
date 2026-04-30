# CV Hunter — Project Log
**Massiu Soft SL** | Darrera actualització: 2026-04-30

---

## ✅ FET (Completat)

### Arquitectura i estructura
- [x] Estructura completa monorepo `frontend/` + `backend/`
- [x] **Frontend**: React 18 + Vite + TailwindCSS + Zustand (persist) + Recharts + react-router-dom
- [x] **Backend** (esquelet complet): FastAPI + SQLAlchemy async + PostgreSQL/pgvector + Redis + Celery
- [x] `docker-compose.yml` amb tots els serveis (db, redis, backend, frontend, nginx)
- [x] Configuració d'entorn `.env.example` documentada

### Mòdul d'autenticació
- [x] JWT multi-tenant (empresa_id en payload)
- [x] `bcrypt` per hash de contrasenyes
- [x] OAuth2PasswordBearer + guards de rols (`administrador`, `recrutador`, `visor`)
- [x] Endpoint `/auth/login`, `/auth/register`, `/auth/me`

### Motor de matching IA
- [x] Scoring 5 dimensions: habilitats, experiència, educació, idiomes, ubicació
- [x] Pesos configurables per encàrrec (sumant 100)
- [x] Penalització per sobrequalificació
- [x] Comparació nivells CEFR (A1→C2→Natiu)
- [x] Lògica treball remot / presencial / híbrid

### Parser de CV amb Claude
- [x] Integració API Anthropic (`claude-opus-4-5`)
- [x] Extracció 30+ camps estructurats (habilitats, idiomes, experiència, educació…)
- [x] `prompt_caching` per reducció de costos (cache_control: ephemeral)
- [x] SHA-256 per deduplicació de CVs
- [x] Endpoint multipart `/cv/upload`

### Mode Demo (sense backend)
- [x] `DEMO = true` constant a `frontend/src/utils/api.js`
- [x] Totes les crides API retornen dades simulades amb delay
- [x] 4 candidats, 4 clients, 4 encàrrecs amb puntuacions mock
- [x] Candidats reals del sector RH de Catalunya
- [x] Clients: Bon Preu, Almirall, Port de Barcelona, Banc Sabadell

### Internacionalització (i18n)
- [x] `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- [x] **10 idiomes europeus**: Català 🇨🇦, Castellà 🇪🇸, Anglès 🇬🇧, Francès 🇫🇷, Alemany 🇩🇪, Italià 🇮🇹, Portuguès 🇵🇹, Polonès 🇵🇱, Romanès 🇷🇴, Neerlandès 🇳🇱
- [x] Detecció automàtica del idioma del navegador
- [x] Persistència a `localStorage` (clau: `cvhunter-lang`)
- [x] `LanguageSwitcher` component amb bandera + nom + checkmark actiu
- [x] Fallback: **Català**

### Pàgines traduïdes
- [x] `LoginPage` — login + accés convidat
- [x] `Layout` / `Sidebar` — navegació i capçalera
- [x] `DashboardPage` — KPIs i estadístiques
- [x] `CandidatesPage` — llistat i filtres
- [x] `MatchingPage` — resultats de matching + gràfic radar

### Accés convidat (demo pública)
- [x] Botó "Veure demo sense registre" a la pàgina de login
- [x] Token `demo-token`, rol `visor`, empresa_id `1`
- [x] Toast de benvinguda en l'idioma actiu

### Desplegament GitHub Pages
- [x] `HashRouter` per compatibilitat amb SPA estàtic
- [x] `vite.config.js`: `base: './'`
- [x] GitHub Actions workflow `.github/workflows/deploy-pages.yml`
- [x] Deploy automàtic en push a `master`/`main`
- [x] **URL pública**: https://gemmagf.github.io/cv_HR/

### Repositori GitHub
- [x] Repositori: https://github.com/Gemmagf/cv_HR
- [x] 3 commits inicials, 58 fitxers, 11.630+ línies de codi
- [x] `package.json` arrel amb script `dev` que llença frontend

---

## 🔧 DECIDIT (Decisions de disseny)

| Decisió | Raó |
|---------|-----|
| `DEMO = true` per defecte | No cal backend per fer demo pública — accessibilitat màxima |
| `HashRouter` en lloc de `BrowserRouter` | GitHub Pages no suporta redirecció de SPAs; `/#/` evita 404 |
| `base: './'` a Vite | Paths relatius per GitHub Pages (no servit des d'arrel) |
| Català com a `fallbackLng` | Empresa catalana; coherència amb identitat de marca |
| Neerlandès en lloc de Rus | Rus és top-10 per parlants nadius però manca cobertura geogràfica occidental; el neerlandès és llengua oficial de 2 estats de la UE |
| Arquitectura monorepo | Frontend i backend al mateix repo → CI/CD simplificat |
| `pgvector` per similitud semàntica | Futura cerca vectorial de CVs sense dependre d'eines externes |
| Pesos de matching configurables | Cada encàrrec té necessitats diferentes (p.ex. idiomes crítics vs. habilitats) |
| `prompt_caching` a Claude | Estalvi ~60% de tokens en crides repetitives de parsing |
| Zustand + persist | Context d'autenticació i preferències sense boilerplate de Redux |

---

## ⏳ PENDENT

### Alta prioritat

- [ ] **Traduir pàgines restants** (6 pàgines pendents):
  - `AssignmentsPage` — llistat d'encàrrecs
  - `AssignmentDetailPage` — detall d'encàrrec + matching
  - `ClientsPage` — gestió de clients
  - `CandidateDetailPage` — perfil complet + radar
  - `RegisterPage` — registre de nova empresa
  - `UploadPage` — pujada i parsing de CVs

- [ ] **Optimització del bundle** (⚠️ advertència Vite: chunk 827KB):
  - Afegir `manualChunks` a `vite.config.js`
  - Code-splitting per rutes amb `React.lazy` + `Suspense`
  - Objectiu: cap chunk > 300KB

### Backend (per activar mode real)

- [ ] **Configurar base de dades**:
  - PostgreSQL 15 + extensió `pgvector`
  - Migracions amb Alembic
  - Variables d'entorn: `DATABASE_URL`, `SECRET_KEY`, `ANTHROPIC_API_KEY`

- [ ] **Desplegar backend**:
  - Opcions: Railway / Render / Fly.io (tier gratuït disponible)
  - `Dockerfile` ja existent a `backend/`

- [ ] **Connectar frontend al backend real**:
  - Canviar `DEMO = false` a `frontend/src/utils/api.js`
  - Afegir `VITE_API_URL=https://<backend-url>` a variables d'entorn de GitHub Actions

- [ ] **Configurar Redis + Celery**:
  - Tasques asíncrones: parsing de CVs, notificacions, reports
  - `REDIS_URL` a variables d'entorn

### Funcionalitats noves

- [ ] **Export PDF** de proposta de candidat (ReportLab ja implementat al backend)
- [ ] **Cerca semàntica** de candidats per embedding vectorial
- [ ] **Panel d'administració** per gestió multi-empresa
- [ ] **Notificacions** en temps real (WebSocket o polling)
- [ ] **Tests** unitaris (pytest + vitest) — cobertura 0% actualment

### Infraestructura i qualitat

- [ ] **Recuperar entorn local**: `git clone https://github.com/Gemmagf/cv_HR.git`
- [ ] **Variables d'entorn a GitHub Secrets** per CI/CD de backend
- [ ] **Domini personalitzat** per GitHub Pages (opcional)
- [ ] **README.md** complet amb instruccions d'instal·lació i arquitectura

---

## 📊 Estat general

```
Frontend Demo:     ████████████████████ 100% ✅
i18n (traducció):  ████████████░░░░░░░░  60% ⚠️  (5/11 pàgines)
Backend (esquelet):████████████████░░░░  80% 🔧  (falta deploy)
Matching Engine:   ████████████████████ 100% ✅
CI/CD Pages:       ████████████████████ 100% ✅
Tests:             ░░░░░░░░░░░░░░░░░░░░   0% ❌
```

---

## 🔗 Enllaços ràpids

- **Demo en viu**: https://gemmagf.github.io/cv_HR/
- **Repositori**: https://github.com/Gemmagf/cv_HR
- **Accés demo**: botó "Veure demo sense registre" a la pàgina de login

---

*Generat automàticament com a part del procés de desenvolupament de CV Hunter — Massiu Soft SL*
