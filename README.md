# CV Hunter — Sistema Intel·ligent de Gestió de Talent

Plataforma multi-tenant per a consultores de selecció: puja CVs, la IA els estructura,
defineix encàrrecs de client i el motor de matching puntua i compara candidats.
La IA funciona amb **models locals** (Ollama) per defecte: cap clau d'API, cap cost i els CVs no surten
de la teva màquina. Opcionalment es pot canviar a Claude (Anthropic) amb una variable d'entorn.
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
└── backend/    FastAPI + SQLAlchemy async + PostgreSQL/pgvector + LLM (Ollama local o Anthropic)
    └── app/
        ├── api/              routers: auth, clients, candidates, assignments, matching, analytics, skill_tests
        ├── models/           Tenant, User, Client, Candidate, Assignment, SkillTestAttempt
        ├── services/         llm (proveïdor), cv_parser, matching_engine, pdf_exporter, skill_tests
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

### Tot el sistema amb IA local (mode real)

```bash
cp backend/.env.example backend/.env   # omple SECRET_KEY; la resta ja apunta a Ollama
docker compose up --build              # db + redis + ollama + backend :8000 + frontend :5173
```

El servei `ollama-pull` descarrega el model la primera vegada (`qwen2.5:7b`, uns 4,7 GB) i acaba.
El frontend de compose ja arrenca amb `VITE_DEMO=false`, així que puja un CV real i veuràs el model
local convertir-lo en perfil. Comprova l'estat de la IA a http://localhost:8000/health
(`llm.model_carregat` ha de ser `true`). Documentació de l'API a http://localhost:8000/docs.

**Triar model.** Per defecte `qwen2.5:7b` (bon JSON, entén català i castellà). En un portàtil sense GPU
és lent (1-3 min per CV); posa `OLLAMA_MODEL=qwen2.5:3b` al `.env` o `OLLAMA_MODEL=qwen2.5:3b docker compose up`.
Qualsevol model d'Ollama que suporti sortida estructurada serveix (`llama3.2`, `mistral`, `gemma3`...).

**Sense Docker.** Instal·la [Ollama](https://ollama.com), fes `ollama pull qwen2.5:7b`, arrenca el backend
amb `uvicorn app.main:app --reload` (necessita PostgreSQL) i el frontend amb `VITE_DEMO=false npm run dev`.

**Claude en lloc de models locals.** `LLM_PROVIDER=anthropic` i `ANTHROPIC_API_KEY` al `.env`. El codi de
parsing és el mateix; només canvia el proveïdor a `backend/app/services/llm.py`.

### Tests del backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

Els tests són unitaris (motor de matching, mini-proves i proveïdor Ollama simulat) i no necessiten
PostgreSQL, Ollama ni cap clau d'API.

## Rols

| Rol | Permisos |
|-----|----------|
| `admin` | Tot, inclòs eliminar candidats |
| `reclutador` | Crear i modificar candidats, encàrrecs, clients, invitacions |
| `visor` | Només lectura (l'accés convidat de la demo) |

## CI

`.github/workflows/ci.yml` executa vitest + build del frontend i pytest del backend a cada push.
`.github/workflows/deploy-pages.yml` publica la demo a GitHub Pages en fer push a `main`.
