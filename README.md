# CV Hunter — Sistema Intel·ligent de Gestió de Talent

Plataforma multi-tenant per a consultores de selecció: puja CVs, la IA els estructura,
defineix encàrrecs de client i el motor de matching puntua i compara candidats.
Inclou un mòdul de **mini-proves d'habilitats** perquè els candidats acreditin el que
diuen al CV i les empreses s'estalviïn la prova tècnica.

- **Demo pública** (sense backend): https://gemmagf.github.io/cv_HR/ → botó «Veure demo sense registre»
- **Estat del projecte i pendents**: [PROJECT_LOG.md](PROJECT_LOG.md)

## Arquitectura

```
cv_HR/
├── frontend/   React 18 + Vite + Tailwind + Zustand + i18next (9 idiomes) + Recharts
│   └── src/
│       ├── pages/            una pàgina per ruta (carregades amb React.lazy)
│       ├── components/       ui/ (genèrics) i modules/ (de domini)
│       ├── utils/api.js      capa d'API amb mode demo (VITE_DEMO)
│       ├── utils/skillsEngine.js   motor de recomanació i correcció de mini-proves
│       ├── data/skillTests.json    catàleg de mini-proves (font única, copiada al backend)
│       └── i18n/             locales/<lang>.js + locales/skills/<lang>.js
└── backend/    FastAPI + SQLAlchemy async + PostgreSQL/pgvector + Anthropic SDK
    └── app/
        ├── api/              routers: auth, clients, candidates, assignments, matching, analytics, skill_tests
        ├── models/           Tenant, User, Client, Candidate, Assignment, SkillTestAttempt
        ├── services/         cv_parser (Claude), matching_engine, pdf_exporter, skill_tests
        └── data/skill_tests.json
```

## Mini-proves d'habilitats (Skill Checks)

| Per a qui | Què fa | On |
|-----------|--------|----|
| **Candidat** (proactiu) | En pujar un CV, el sistema detecta les habilitats declarades i proposa mini-proves de 5 preguntes (6-10 min). El candidat les fa des d'un enllaç públic, sense registrar-se. Si les supera, l'habilitat queda **verificada** al seu perfil. | Pujar CV → panell «Següent pas proactiu»; Detall de candidat → «Proves recomanades»; ruta pública `/#/prova/<token>` |
| **Empresa / reclutador** | En crear un encàrrec, mentre s'escriu el títol i les habilitats requerides, apareixen les **proves tècniques rellevants** per a la posició; es marquen i queden associades. Al pipeline es veu quins candidats ja les han superat («no cal prova tècnica»). | Encàrrecs → «Nou encàrrec»; Detall d'encàrrec |
| **Matching** | Una habilitat requerida puntua 100% si està verificada, 85% si només consta al CV. | `matching_engine.score_habilitats` |
| **Catàleg** | 11 proves (Excel, SQL, Python, Power BI, SAP HCM, Workday, LinkedIn Recruiter, Anglès B2, Nòmines, Compres, Selecció per competències), preguntes en català i anglès. | Secció «Proves» |

En mode demo els resultats es desen al `localStorage` del navegador; en mode real, a la taula `skill_test_attempts`
i al camp `candidates.habilitats_verificades`.

## Posar-ho en marxa

### Frontend (mode demo, sense backend)

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173
npm test           # vitest (motor de mini-proves)
npm run build
```

### Backend + base de dades (mode real)

```bash
cp backend/.env.example backend/.env   # omple SECRET_KEY, ANTHROPIC_API_KEY, PUBLIC_APP_URL
docker compose up --build              # db (pgvector) + redis + backend :8000 + frontend :5173
```

Per connectar el frontend al backend real, crea `frontend/.env` amb `VITE_DEMO=false` (i `VITE_API_URL` si
el backend no és al mateix origen). Documentació interactiva de l'API a http://localhost:8000/docs.

### Tests del backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

Els tests són unitaris (motor de matching i servei de mini-proves) i no necessiten PostgreSQL ni clau d'Anthropic.

## Rols

| Rol | Permisos |
|-----|----------|
| `admin` | Tot, inclòs eliminar candidats |
| `reclutador` | Crear i modificar candidats, encàrrecs, clients, invitacions |
| `visor` | Només lectura (l'accés convidat de la demo) |

## CI

`.github/workflows/ci.yml` executa vitest + build del frontend i pytest del backend a cada push.
`.github/workflows/deploy-pages.yml` publica la demo a GitHub Pages en fer push a `main`.
