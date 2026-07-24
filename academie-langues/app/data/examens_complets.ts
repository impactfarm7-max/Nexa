// app/data/examens_complets.ts
// Chaque examen associe une série CE (1-40), CO (1-40), EE (1-29) et EO (1-29).
// Les séries sont choisies de façon équitable pour éviter les répétitions.

export const examensComplets = [
  {
    id: 1,
    titre: "Examen Officiel 01",
    sujet_ce: 3,   // Compréhension Écrite — Série 3
    sujet_co: 7,   // Compréhension Orale  — Série 7
    sujet_ee: 4,   // Expression Écrite    — Sujet 4
    sujet_eo: 6,   // Expression Orale     — Sujet 6
  },
  {
    id: 2,
    titre: "Examen Officiel 02",
    sujet_ce: 10,
    sujet_co: 15,
    sujet_ee: 8,
    sujet_eo: 11,
  },
  {
    id: 3,
    titre: "Examen Officiel 03",
    sujet_ce: 18,
    sujet_co: 22,
    sujet_ee: 12,
    sujet_eo: 16,
  },
  {
    id: 4,
    titre: "Examen Officiel 04",
    sujet_ce: 25,
    sujet_co: 29,
    sujet_ee: 17,
    sujet_eo: 20,
  },
  {
    id: 5,
    titre: "Examen Officiel 05",
    sujet_ce: 32,
    sujet_co: 36,
    sujet_ee: 21,
    sujet_eo: 24,
  },
  {
    id: 6,
    titre: "Examen Officiel 06",
    sujet_ce: 38,
    sujet_co: 2,
    sujet_ee: 25,
    sujet_eo: 28,
  },
  {
    id: 7,
    titre: "Examen Officiel 07",
    sujet_ce: 5,
    sujet_co: 11,
    sujet_ee: 2,
    sujet_eo: 3,
  },
  {
    id: 8,
    titre: "Examen Officiel 08",
    sujet_ce: 13,
    sujet_co: 18,
    sujet_ee: 6,
    sujet_eo: 9,
  },
  {
    id: 9,
    titre: "Examen Officiel 09",
    sujet_ce: 20,
    sujet_co: 25,
    sujet_ee: 10,
    sujet_eo: 14,
  },
  {
    id: 10,
    titre: "Examen Officiel 10",
    sujet_ce: 7,
    sujet_co: 12,
    sujet_ee: 3,
    sujet_eo: 1,
  },
  {
    id: 11,
    titre: "Examen Officiel 11",
    sujet_ce: 14,
    sujet_co: 19,
    sujet_ee: 7,
    sujet_eo: 5,
  },
  {
    id: 12,
    titre: "Examen Officiel 12",
    sujet_ce: 21,
    sujet_co: 26,
    sujet_ee: 11,
    sujet_eo: 10,
  },
  {
    id: 13,
    titre: "Examen Officiel 13",
    sujet_ce: 28,
    sujet_co: 32,
    sujet_ee: 5,
    sujet_eo: 2,
  },
  {
    id: 14,
    titre: "Examen Officiel 14",
    sujet_ce: 35,
    sujet_co: 38,
    sujet_ee: 9,
    sujet_eo: 7,
  },
  {
    id: 15,
    titre: "Examen Officiel 15",
    sujet_ce: 1,
    sujet_co: 4,
    sujet_ee: 13,
    sujet_eo: 12,
  },
  {
    id: 16,
    titre: "Examen Officiel 16",
    sujet_ce: 6,
    sujet_co: 9,
    sujet_ee: 1,
    sujet_eo: 4,
  },
  {
    id: 17,
    titre: "Examen Officiel 17",
    sujet_ce: 16,
    sujet_co: 20,
    sujet_ee: 14,
    sujet_eo: 8,
  },
  {
    id: 18,
    titre: "Examen Officiel 18",
    sujet_ce: 23,
    sujet_co: 27,
    sujet_ee: 15,
    sujet_eo: 13,
  },
  {
    id: 19,
    titre: "Examen Officiel 19",
    sujet_ce: 4,
    sujet_co: 1,
    sujet_ee: 16,
    sujet_eo: 15,
  },
  {
    id: 20,
    titre: "Examen Officiel 20",
    sujet_ce: 9,
    sujet_co: 5,
    sujet_ee: 18,
    sujet_eo: 17,
  },
  {
    id: 21,
    titre: "Examen Officiel 21",
    sujet_ce: 12,
    sujet_co: 8,
    sujet_ee: 19,
    sujet_eo: 18,
  },
  {
    id: 22,
    titre: "Examen Officiel 22",
    sujet_ce: 17,
    sujet_co: 10,
    sujet_ee: 20,
    sujet_eo: 19,
  },
  {
    id: 23,
    titre: "Examen Officiel 23",
    sujet_ce: 8,
    sujet_co: 3,
    sujet_ee: 22,
    sujet_eo: 21,
  },
  {
    id: 24,
    titre: "Examen Officiel 24",
    sujet_ce: 11,
    sujet_co: 6,
    sujet_ee: 23,
    sujet_eo: 22,
  },
  {
    id: 25,
    titre: "Examen Officiel 25",
    sujet_ce: 15,
    sujet_co: 13,
    sujet_ee: 24,
    sujet_eo: 23,
  },
  // Tu pourras en ajouter autant que tu veux ici !
  // Distribution conseillée (éviter les répétitions) :
  // Examen 03 : ce=18, co=22, ee=12, eo=16
  // Examen 04 : ce=25, co=29, ee=17, eo=20
  // Examen 05 : ce=32, co=36, ee=21, eo=24
  // Examen 06 : ce=38, co=2,  ee=25, eo=28
  // Examen 07 : ce=5,  co=11, ee=2,  eo=3
];
