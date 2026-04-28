// ——— Dades de demo per al mode preview ———

export const mockKpis = {
  total_candidats: 247,
  encarrecs_oberts: 8,
  encarrecs_coberts: 34,
  candidats_contractats: 21,
  total_clients: 19,
  taxa_exit_pct: 68.4,
  total_proposats: 138,
}

export const mockAlertes = {
  alertes: [
    { assignment_id: 3, titol: "Responsable de Compres Senior", hores_obert: 51 },
    { assignment_id: 7, titol: "Tècnic/a de RRHH", hores_obert: 73 },
  ],
  total: 2,
}

export const mockCandidats = [
  {
    id: 1, nom: "Marta", cognom: "Puigdomènech", email: "marta.p@gmail.com",
    telefon: "612 345 678", ubicacio: "Barcelona", linkedin: null, foto_url: null,
    ultima_posicio: "Cap de Selecció", ultima_empresa: "Talent Partners SL",
    anys_exp_total: 9, anys_ultima_posicio: 3.5,
    habilitats_tecniques: ["SAP HCM", "LinkedIn Recruiter", "Excel", "Workday"],
    habilitats_soft: ["Lideratge", "Comunicació", "Negociació"],
    idiomes: [{ idioma: "Català", nivell: "Natiu" }, { idioma: "Castellà", nivell: "Natiu" }, { idioma: "Anglès", nivell: "C1" }],
    disponibilitat: "actiu", teletreball: true, mobilitat: false,
    pretensions_sal: "45.000–52.000 €",
    resum_ia: "Professional de RRHH amb 9 anys d'experiència en selecció i gestió de talent. Ha liderat equips de fins a 5 reclutadors i gestionat processos end-to-end per a perfils tècnics i directius. Forta orientació als resultats i habilitat per treballar en entorns d'alta rotació.",
    creat_el: "2025-09-15T10:30:00",
    formacions: [{ titol: "Llicenciatura en Psicologia", centre: "UAB", any: 2013, tipus: "universitaria" }],
    experiencies: [
      { empresa: "Talent Partners SL", posicio: "Cap de Selecció", inici: "2021-06-01", fi: null, descripcio: "Gestió de l'àrea de selecció amb un equip de 5 persones." },
      { empresa: "Adecco", posicio: "Tècnica de Selecció", inici: "2017-03-01", fi: "2021-05-31", descripcio: "Selecció de perfils industrials i logístics." },
    ],
  },
  {
    id: 2, nom: "Jordi", cognom: "Ferrer", email: "jordi.ferrer@outlook.com",
    telefon: "634 987 123", ubicacio: "Sabadell", linkedin: null, foto_url: null,
    ultima_posicio: "HR Business Partner", ultima_empresa: "Inditex",
    anys_exp_total: 12, anys_ultima_posicio: 4,
    habilitats_tecniques: ["SuccessFactors", "Power BI", "Python", "Excel Avançat"],
    habilitats_soft: ["Pensament analític", "Orientació estratègica", "Treball en equip"],
    idiomes: [{ idioma: "Castellà", nivell: "Natiu" }, { idioma: "Anglès", nivell: "B2" }, { idioma: "Francès", nivell: "A2" }],
    disponibilitat: "passiu", teletreball: true, mobilitat: true,
    pretensions_sal: "55.000–65.000 €",
    resum_ia: "HRBP amb 12 anys d'experiència en grans corporacions. Especialitzat en gestió del canvi, people analytics i disseny de polítiques de compensació. Perfil estratègic amb capacitat per connectar l'àrea de persones amb el negoci.",
    creat_el: "2025-10-02T08:15:00",
    formacions: [{ titol: "MBA", centre: "ESADE", any: 2015, tipus: "universitaria" }],
    experiencies: [
      { empresa: "Inditex", posicio: "HR Business Partner", inici: "2020-01-01", fi: null, descripcio: "Partner estratègic per a 3 unitats de negoci amb 1.200 empleats." },
    ],
  },
  {
    id: 3, nom: "Laia", cognom: "Solà", email: "laia.sola@gmail.com",
    telefon: "699 234 567", ubicacio: "Girona", foto_url: null,
    ultima_posicio: "Tècnica de Selecció", ultima_empresa: "Randstad",
    anys_exp_total: 4, anys_ultima_posicio: 2,
    habilitats_tecniques: ["LinkedIn Recruiter", "Infojobs", "Excel", "Canva"],
    habilitats_soft: ["Empatia", "Organització", "Proactivitat"],
    idiomes: [{ idioma: "Català", nivell: "Natiu" }, { idioma: "Castellà", nivell: "Natiu" }, { idioma: "Anglès", nivell: "B1" }],
    disponibilitat: "actiu", teletreball: true, mobilitat: false,
    pretensions_sal: "28.000–33.000 €",
    resum_ia: "Tècnica de selecció amb 4 anys d'experiència en ETT. Especialitzada en perfils de logística, distribució i atenció al client. Molt orientada a la satisfacció del candidat i del client empresarial.",
    creat_el: "2025-11-10T14:00:00",
    formacions: [{ titol: "Grau en Relacions Laborals", centre: "UdG", any: 2020, tipus: "universitaria" }],
    experiencies: [],
  },
  {
    id: 4, nom: "Marc", cognom: "Oliveras", email: "m.oliveras@proton.me",
    telefon: "611 876 543", ubicacio: "Tarragona", foto_url: null,
    ultima_posicio: "Director de RRHH", ultima_empresa: "Bon Preu SAU",
    anys_exp_total: 18, anys_ultima_posicio: 6,
    habilitats_tecniques: ["SAP HCM", "Workday", "Power BI", "Nòmines A3"],
    habilitats_soft: ["Lideratge", "Visió estratègica", "Gestió del canvi", "Coaching"],
    idiomes: [{ idioma: "Català", nivell: "Natiu" }, { idioma: "Castellà", nivell: "Natiu" }, { idioma: "Anglès", nivell: "C2" }],
    disponibilitat: "passiu", teletreball: false, mobilitat: true,
    pretensions_sal: "80.000–95.000 €",
    resum_ia: "Director de RRHH amb 18 anys d'experiència en retail i distribució. Ha liderat transformacions organitzatives de gran escala i implementat sistemes HRIS en empreses de més de 5.000 empleats. Perfil C-level amb visió de negoci.",
    creat_el: "2025-08-20T09:00:00",
    formacions: [{ titol: "Llicenciatura en Dret Laboral", centre: "URV", any: 2005, tipus: "universitaria" }],
    experiencies: [],
  },
]

export const mockClients = [
  { id: 1, nom: "Bon Preu SAU", sector: "Distribució i Retail", contacte: "Anna Mas", email: "anna.mas@bonpreu.com" },
  { id: 2, nom: "Laboratoris Almirall", sector: "Farmacèutic", contacte: "Pep Roca", email: "p.roca@almirall.com" },
  { id: 3, nom: "Port de Barcelona", sector: "Logística i Transport", contacte: "Marta Gil", email: "m.gil@portbcn.cat" },
  { id: 4, nom: "Banc Sabadell", sector: "Banca i Finances", contacte: "Joan Puig", email: "j.puig@bancsabadell.com" },
]

export const mockEncarrecs = [
  {
    id: 1, titol: "Responsable de Selecció de Personal", client_id: 1, estat: "obert",
    prioritat: 1, data_limit: "2026-05-15T00:00:00",
    creat_el: "2026-04-10T09:00:00",
    requisits_habilitats: ["LinkedIn Recruiter", "SAP HCM", "Excel"],
    anys_exp_min: 5,
    pipeline: [
      { candidate_id: 1, estat: "entrevista", puntuacio_global: 87.3, fortaleses_top3: ["Habilitats tècniques", "Experiència", "Idiomes"] },
      { candidate_id: 2, estat: "proposat",   puntuacio_global: 74.1, fortaleses_top3: ["Experiència", "Formació", "Idiomes"] },
    ],
  },
  {
    id: 2, titol: "HR Business Partner", client_id: 2, estat: "en_curs",
    prioritat: 2, data_limit: "2026-06-01T00:00:00",
    creat_el: "2026-04-05T11:00:00",
    requisits_habilitats: ["SuccessFactors", "Power BI", "Anglès C1"],
    anys_exp_min: 8,
    pipeline: [
      { candidate_id: 2, estat: "oferta", puntuacio_global: 91.0, fortaleses_top3: ["Experiència", "Habilitats tècniques", "Formació"] },
    ],
  },
  {
    id: 3, titol: "Responsable de Compres Senior", client_id: 3, estat: "obert",
    prioritat: 1, data_limit: null,
    creat_el: "2026-04-24T08:00:00",
    requisits_habilitats: ["SAP MM", "Negociació", "Anglès B2"],
    anys_exp_min: 6,
    pipeline: [],
  },
  {
    id: 4, titol: "Director/a de Recursos Humans", client_id: 4, estat: "cobert",
    prioritat: 2, data_limit: "2026-03-01T00:00:00",
    creat_el: "2026-02-10T10:00:00",
    requisits_habilitats: ["Workday", "Lideratge", "Anglès C1"],
    anys_exp_min: 12,
    pipeline: [
      { candidate_id: 4, estat: "contractat", puntuacio_global: 94.5, fortaleses_top3: ["Experiència", "Lideratge", "Idiomes"] },
    ],
  },
]

export const mockMatchingResults = {
  1: [
    { candidate_id: 1, nom: "Marta Puigdomènech", ultima_posicio: "Cap de Selecció", ultima_empresa: "Talent Partners SL", anys_exp_total: 9, ubicacio: "Barcelona", foto_url: null, puntuacio_global: 87.3, puntuacio_habilitats: 92.0, puntuacio_experiencia: 88.0, puntuacio_formacio: 80.0, puntuacio_idiomes: 90.0, puntuacio_ubicacio: 85.0, fortaleses_top3: ["Habilitats tècniques", "Idiomes", "Experiència"], mancances: [], resum_ia: "Professional de RRHH amb 9 anys en selecció. Ha liderat equips i gestionat processos end-to-end." },
    { candidate_id: 2, nom: "Jordi Ferrer", ultima_posicio: "HR Business Partner", ultima_empresa: "Inditex", anys_exp_total: 12, ubicacio: "Sabadell", foto_url: null, puntuacio_global: 74.1, puntuacio_habilitats: 70.0, puntuacio_experiencia: 95.0, puntuacio_formacio: 90.0, puntuacio_idiomes: 75.0, puntuacio_ubicacio: 80.0, fortaleses_top3: ["Experiència", "Formació", "Ubicació"], mancances: [], resum_ia: "HRBP estratègic amb 12 anys en grans corporacions i expertise en people analytics." },
    { candidate_id: 4, nom: "Marc Oliveras", ultima_posicio: "Director de RRHH", ultima_empresa: "Bon Preu SAU", anys_exp_total: 18, ubicacio: "Tarragona", foto_url: null, puntuacio_global: 65.2, puntuacio_habilitats: 75.0, puntuacio_experiencia: 100.0, puntuacio_formacio: 70.0, puntuacio_idiomes: 85.0, puntuacio_ubicacio: 40.0, fortaleses_top3: ["Experiència", "Idiomes", "Habilitats tècniques"], mancances: ["Ubicació"], resum_ia: "Director de RRHH amb 18 anys. Perfil sènior, possible sobre-qualificació per al rol." },
    { candidate_id: 3, nom: "Laia Solà", ultima_posicio: "Tècnica de Selecció", ultima_empresa: "Randstad", anys_exp_total: 4, ubicacio: "Girona", foto_url: null, puntuacio_global: 52.8, puntuacio_habilitats: 60.0, puntuacio_experiencia: 45.0, puntuacio_formacio: 65.0, puntuacio_idiomes: 55.0, puntuacio_ubicacio: 40.0, fortaleses_top3: ["Formació", "Habilitats tècniques", "Idiomes"], mancances: ["Experiència", "Ubicació"], resum_ia: "Perfil júnior amb bona base. Li manquen anys d'experiència per al rol." },
  ],
}
