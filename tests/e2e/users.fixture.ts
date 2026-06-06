// Aggiungi qui ogni nuovo utente creato dal Superadmin.
// Il team DEVE corrispondere a quello assegnato in Firestore (planners/{uid}.team).
//
// Uso: il file viene importato da planner-access.spec.ts per eseguire
// automaticamente la matrice di permessi su ogni utente.

export type Team = 'TeQF' | 'XB';

export interface TestUser {
  label: string;   // identificatore leggibile nei report
  emailEnvKey: string;
  passEnvKey: string;
  team: Team;
}

export const TEST_USERS: TestUser[] = [
  {
    label: 'teqftest1 (TeQF)',
    emailEnvKey: 'TEQF_TEST1_EMAIL',
    passEnvKey: 'TEQF_TEST1_PASS',
    team: 'TeQF',
  },
  {
    label: 'teqftest2 (TeQF)',
    emailEnvKey: 'TEQF_TEST2_EMAIL',
    passEnvKey: 'TEQF_TEST2_PASS',
    team: 'TeQF',
  },
  {
    label: 'xbtest1 (XB)',
    emailEnvKey: 'XB_TEST1_EMAIL',
    passEnvKey: 'XB_TEST1_PASS',
    team: 'XB',
  },
  {
    label: 'xbtest2 (XB)',
    emailEnvKey: 'XB_TEST2_EMAIL',
    passEnvKey: 'XB_TEST2_PASS',
    team: 'XB',
  },
];

// ── Permission matrix ────────────────────────────────────────────────────────

export interface SectionPolicy {
  path: string;
  label: string;
  teqf: 'edit' | 'read' | 'none';
  xb:   'edit' | 'read' | 'none';
}

export const SECTIONS: SectionPolicy[] = [
  { path: '/planner/events',           label: 'Eventi',          teqf: 'read', xb: 'edit'  },
  { path: '/planner/furniture',        label: 'Mobili',          teqf: 'edit', xb: 'read'  },
  { path: '/planner/flowers',          label: 'Fiori',           teqf: 'edit', xb: 'read'  },
  { path: '/planner/cash-control',     label: 'Cash Control',    teqf: 'edit', xb: 'none'  },
  { path: '/planner/orario-di-lavoro', label: 'Orario lavoro',   teqf: 'edit', xb: 'none'  },
];

export function policyFor(team: Team, section: SectionPolicy): 'edit' | 'read' | 'none' {
  return team === 'TeQF' ? section.teqf : section.xb;
}
