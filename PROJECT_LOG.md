# CV Hunter — Project Log
Darrera actualització: 2026-09-30

---

## ✅ FET (Completat)

### Arquitectura i estructura
- [x] Monorepo `frontend/` + `backend/` amb `docker-compose.yml` (db pgvector, redis, backend, frontend)
- [x] **Frontend**: React 18 + Vite + TailwindCSS + Zustand (persist) + Recharts + react-router-dom (HashRouter)
- [x] **Backend**: FastAPI + SQLAlchemy async + PostgreSQL/pgvector + Anthropic SDK (Celery/Redis previstos, no cablejats)
- [x] `README.md` amb arquitectura, posada en marxa i rols
- [x] **CI** (`.github/workflows/ci.yml`): vitest + build del frontend i pytest del backend a cada push

### Mòdul d'autenticació
- [x] JWT multi-tenant (tenant_id al payload), bcrypt, `/auth/login`, `/auth/registre`, slug de tenant únic
- [x] **Guards de rol** (`require_rol`): `visor` és només lectura; `admin` i `reclutador` poden crear/modificar; només `admin` elimina

### Motor de matching
- [x] Scoring 5 dimensions amb pesos configurables per encàrrec
- [x] **Scoring de formació** implementat (abans era un 70 fix): compara nivell requerit vs. titulació màxima i formacions
- [x] Habilitats **verificades** amb mini-prova puntuen 100%; només declarades al CV, 85%
- [x] Comparació insensible a accents i majúscules; nivells CEFR; remot/presencial/híbrid
- [x] Corregit `cand.teletreball or True` (ignorava el `False` del candidat)

### Parser de CV amb Claude
- [x] Client **asíncron** (`AsyncAnthropic`), model per defecte `claude-opus-5-5` (configurable amb `CLAUDE_MODEL`)
- [x] **Sortida estructurada** amb JSON Schema (`output_config.format`): JSON sempre vàlid
- [x] Prompt caching del system prompt; fallback de seguretat (`fallbacks="default"`); `stop_reason=refusal` → HTTP 422
- [x] SHA-256 per deduplicació; endpoints `/candidates/upload` i `/upload-massiu` retornen les proves recomanades

### 🆕 Mini-proves d'habilitats (Skill Checks) — Mòdul F
- [x] **Catàleg** d'11 proves (5 preguntes, 6-10 min, ca+en): Excel, SQL, Python, Power BI, SAP HCM, Workday, LinkedIn Recruiter, Anglès B2, Nòmines, Compres, Selecció per competències. Font única `frontend/src/data/skillTests.json` (còpia a `backend/app/data/`, test de sincronització)
- [x] **Candidat (proactiu)**: en pujar un CV i al detall del candidat es proposen les proves segons habilitats, idiomes i rol; invitació per enllaç públic `/#/prova/<token>` sense registre; temporitzador; correcció; insígnia «Habilitat verificada · No cal prova tècnica»
- [x] **Empresa**: al formulari de nou encàrrec apareixen en directe les proves rellevants per a la posició (per requisits i per títol) amb checkbox; al detall de l'encàrrec es poden canviar i es veu per candidat «n/m proves superades»
- [x] Secció **Proves** (`/proves`): catàleg filtrable + verificacions recents + KPIs; KPIs també al dashboard
- [x] Backend: model `SkillTestAttempt`, camps `Candidate.habilitats_verificades` i `Assignment.proves_requerides`, router `/api/skill-tests` (catàleg, recomanacions, invitacions, rutes públiques) i `PATCH /assignments/{id}/proves`
- [x] Frontend demo: resultats persistits a `localStorage` (`cv-hunter-skills`)

### Internacionalització (i18n)
- [x] **9 idiomes**: ca, es, en, fr, de, it, pt, pl, ro (el neerlandès s'havia retirat del selector; fitxer mort eliminat)
- [x] **Totes les pàgines traduïdes** (Register, Upload, Assignments, AssignmentDetail, Clients, CandidateDetail incloses)
- [x] Claus del mòdul de proves a `locales/skills/<lang>.js`, fusionades amb `deepMerge` a `i18n/index.js`
- [x] Preguntes de les proves en català i anglès (altres idiomes → anglès)

### Rendiment i qualitat
- [x] **Code-splitting** per ruta (`React.lazy`) + `manualChunks`: chunk més gran 821 KB → 353 KB (recharts)
- [x] **Tests**: 22 tests vitest (motor de proves) + 23 tests pytest (matching + proves)
- [x] Favicon inclòs i amb path relatiu (abans apuntava a `/favicon.svg`, trencat a GitHub Pages)
- [x] Mode demo per variable d'entorn (`VITE_DEMO`, `VITE_API_URL`) en lloc d'una constant al codi
- [x] Redirecció 401 compatible amb HashRouter; port de Vite/compose/launch.json unificat a 5173

### Bugs corregits a la revisió
- [x] `GET /candidates` petava amb `TypeError` (`creat_el` passat dues vegades a `CandidateOut`)
- [x] `GET /assignments/alertes` petava amb `MultipleResultsFound` quan un encàrrec tenia més d'un candidat
- [x] Registre de dues empreses amb el mateix nom → `IntegrityError` pel slug
- [x] Pipeline mostrava «Candidat #id» en lloc del nom; formulari de clients no tenia camp telèfon
- [x] Import inútil del client d'Anthropic al motor de matching; `__import__("sqlalchemy")` a database.py

---

## 🔧 DECIDIT (Decisions de disseny)

| Decisió | Raó |
|---------|-----|
| Catàleg de proves en JSON compartit (no BD) | Versionat amb el codi, mateixa lògica al frontend (demo) i backend; un test garanteix que les còpies coincideixen |
| Preguntes tipus test de 5 ítems, llindar 60% | Prou curt perquè el candidat ho faci de seguida; discrimina sense substituir una entrevista tècnica profunda |
| Enllaç públic amb token (sense compte de candidat) | Fricció mínima; en mode real el token és aleatori i caduca (14 dies per defecte) |
| Verificada 100% / declarada 85% al matching | Premia acreditar sense penalitzar en excés qui encara no ha fet la prova |
| `claude-opus-5-5` + sortida estructurada | Model actual per defecte; el JSON Schema elimina el parsing fràgil de blocs ```json |
| `AsyncAnthropic` | Les crides síncrones bloquejaven l'event loop de FastAPI durant tot el parsing |
| `DEMO` per variable d'entorn | Permet desplegar el mateix codi a GitHub Pages (demo) i contra un backend real sense tocar-lo |
| Claus i18n del mòdul en fitxers a part | Els locales base es mantenen llegibles; `deepMerge` les incorpora en temps de càrrega |
| HashRouter + `base: './'` | GitHub Pages no redirigeix SPAs |

---

## ⏳ PENDENT

### Alta prioritat
- [ ] **Migracions amb Alembic** (ara `create_all`): els camps nous `habilitats_verificades`, `proves_requerides` i la taula `skill_test_attempts` necessiten migració en bases existents
- [ ] **Desplegar backend** (Railway / Render / Fly.io) i posar `VITE_DEMO=false` + `VITE_API_URL` al workflow de Pages
- [ ] **Enviament d'invitacions per correu** (ara es copia l'enllaç al porta-retalls): plantilla + proveïdor SMTP/Resend
- [ ] **Anti-frau bàsic** a les proves: barrejar l'ordre de preguntes/opcions per intent, limitar reintents, registrar temps per pregunta

### Mòdul de proves (evolució)
- [ ] Preguntes en els 9 idiomes (ara ca+en)
- [ ] Banc de preguntes més gran per prova (rotació aleatòria de 5 entre 15-20)
- [ ] Proves pràctiques (fitxer Excel a completar, consulta SQL a executar) corregides amb Claude
- [ ] Certificat PDF de l'habilitat verificada per al candidat
- [ ] Caducitat de la verificació (p. ex. 12 mesos)

### Backend
- [ ] Celery/Redis per al parsing massiu (ara síncron dins la petició)
- [ ] Cerca semàntica amb pgvector (columna `embedding` comentada)
- [ ] Substituir `python-jose` (sense manteniment) per `PyJWT` i `passlib` per `bcrypt` directe
- [ ] Tests d'integració de l'API amb una BD de proves (ara només unitaris)
- [ ] Comprovar `trial_fi` i `is_active` del tenant a `get_current_user`

### Frontend
- [ ] Configuració ESLint 9 (`eslint.config.js`): l'script `lint` existeix però no té config
- [ ] Notificacions (la campana de la capçalera no fa res)
- [ ] Tests de components amb Testing Library

---

## 📊 Estat general

```
Frontend Demo:        ████████████████████ 100% ✅
Mini-proves (F):      ████████████████░░░░  80% ✅  (falta email + anti-frau)
i18n (traducció):     ████████████████████ 100% ✅  (9 idiomes, totes les pàgines)
Backend (esquelet):   █████████████████░░░  85% 🔧  (falta deploy + Alembic)
Matching Engine:      ████████████████████ 100% ✅
CI/CD:                ████████████████████ 100% ✅  (tests + Pages)
Tests:                ████████████░░░░░░░░  60% ⚠️  (unitaris sí; integració/API no)
```

---

## 🔗 Enllaços ràpids

- **Demo en viu**: https://gemmagf.github.io/cv_HR/ (botó «Veure demo sense registre»)
- **Repositori**: https://github.com/Gemmagf/cv_HR
- **Secció de proves a la demo**: menú «Proves»; perfil de candidat → «Proves recomanades»; «Nou encàrrec» → «Proves tècniques de la posició»
