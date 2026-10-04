/**
 * formatters.test.ts — premiers tests unitaires de l'application client.
 *
 * AUDIT 2026-08 (constat A-17) : ce dépôt comptait 0 test sur 221 fichiers.
 *
 * Cible choisie délibérément : le formatage monétaire. Les champs Decimal de
 * Prisma sont sérialisés en chaîne sur le fil, et les champs absents arrivent
 * en `undefined`. Sans garde, `undefined / 100` s'affiche « NaN € » à un client
 * qui regarde un devis. Ces fonctions sont la dernière barrière avant l'écran.
 */
import {
  formatCurrency,
  formatEuros,
  formatRate,
  formatDate,
  formatTime,
  formatDuration,
  getInitials,
  toNumber,
} from '@utils/formatters';

// Les Intl produisent des espaces insécables (U+00A0 / U+202F) autour du
// symbole et des séparateurs de milliers. Les comparer littéralement rendrait
// les tests fragiles selon la version d'ICU : on normalise.
const norm = (s: string) => s.replace(/[\u00A0\u202F\s]/g, ' ');

describe('formatCurrency — centimes vers euros', () => {
  it('convertit des centimes en montant euro', () => {
    expect(norm(formatCurrency(125000))).toBe('1 250,00 €');
  });

  it('gère zéro sans le confondre avec une absence de valeur', () => {
    // Piège classique : un `if (!cents)` renverrait « — » pour 0 €, ce qui est
    // faux — 0 € est un montant, pas une donnée manquante.
    expect(norm(formatCurrency(0))).toBe('0,00 €');
  });

  it('accepte une chaîne numérique (Decimal Prisma sérialisé)', () => {
    expect(norm(formatCurrency('125000' as unknown as number))).toBe('1 250,00 €');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['chaîne non numérique', 'abc'],
  ])('renvoie un tiret plutôt que « NaN € » pour %s', (_label, input) => {
    expect(formatCurrency(input as unknown as number)).toBe('—');
  });
});

describe('formatEuros / formatRate — montants déjà en euros', () => {
  it('formate un montant en euros', () => {
    expect(norm(formatEuros(125.5))).toBe('125,50 €');
  });

  it('formate un taux horaire', () => {
    expect(norm(formatRate(18.5))).toBe('18,50 €/h');
  });

  it('protège le taux horaire des valeurs non finies', () => {
    expect(formatRate(undefined as unknown as number)).toBe('—');
  });
});

describe('toNumber — coercition sûre des Decimal', () => {
  it('laisse passer un nombre fini', () => {
    expect(toNumber(42.5)).toBe(42.5);
  });

  it('parse une chaîne décimale', () => {
    expect(toNumber('42.50')).toBe(42.5);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['chaîne vide', ''],
    ['objet', {}],
  ])('renvoie 0 plutôt que NaN pour %s', (_label, input) => {
    expect(toNumber(input)).toBe(0);
  });

  it('ne propage jamais NaN dans un calcul en aval', () => {
    // C'est la raison d'être de la fonction : un NaN qui entre dans une somme
    // contamine tout le total affiché.
    const total = [12.5, undefined, '7.5', null].reduce<number>(
      (acc, v) => acc + toNumber(v),
      0,
    );
    expect(total).toBe(20);
  });
});

describe('dates — tolérance aux entrées invalides', () => {
  it('formate une date ISO', () => {
    expect(formatDate('2026-03-26T10:00:00Z')).toContain('2026');
  });

  it('formate une heure', () => {
    expect(formatTime('2026-03-26T14:30:00Z')).toMatch(/\d{2}[:h]\d{2}/);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['chaîne non parsable', 'pas-une-date'],
  ])('renvoie un tiret pour %s', (_label, input) => {
    expect(formatDate(input as string)).toBe('—');
    expect(formatTime(input as string)).toBe('—');
  });
});

describe('formatDuration', () => {
  it.each([
    [45, '45min'],
    [60, '1h'],
    [150, '2h 30min'],
    [0, '0min'],
  ])('%i minutes -> %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('getInitials', () => {
  it('prend les deux premiers mots', () => {
    expect(getInitials('Jean Dupont')).toBe('JD');
  });

  it('ignore les espaces multiples', () => {
    expect(getInitials('  Jean   Dupont  ')).toBe('JD');
  });

  it('se limite à deux initiales sur un nom composé', () => {
    expect(getInitials('Jean Pierre Dupont')).toBe('JP');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
  ])('renvoie « ? » pour %s', (_label, input) => {
    expect(getInitials(input as string)).toBe('?');
  });
});
