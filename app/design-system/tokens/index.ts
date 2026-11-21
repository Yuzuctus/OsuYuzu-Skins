export type FilmMode = 'positive' | 'negative';

export interface SwatchToken {
  name: string;
  cssVar: string;
  role: string;
  positive: string;
  negative: string;
  contrastNote: string;
}

export const SOLARIZED_SWATCHES: SwatchToken[] = [
  {
    name: 'Ground',
    cssVar: '--yz-ground',
    role: 'Sable désert chaud / Obsidienne minérale',
    positive: '#F5EEE0',
    negative: '#0B0F0E',
    contrastNote: 'Surface racine (0 violet)',
  },
  {
    name: 'Surface',
    cssVar: '--yz-surface',
    role: 'Dune claire / Basalte doux',
    positive: '#EBE1CD',
    negative: '#121816',
    contrastNote: 'Relief calme',
  },
  {
    name: 'Ink',
    cssVar: '--yz-ink',
    role: 'Encre cactus / Sable-craie lumineux',
    positive: '#0D2019',
    negative: '#F4EFE2',
    contrastNote: '≥ 15:1 AAA',
  },
  {
    name: 'Mint Identity',
    cssVar: '--yz-identity',
    role: 'Chevelure Yuzu, statut live & signaux actifs',
    positive: '#087E55',
    negative: '#5DF2BC',
    contrastNote: '≥ 4.9:1 / 13.8:1',
  },
  {
    name: 'Yuzu Solar',
    cssVar: '--yz-accent',
    role: 'Agrume yuzu, actions & mise en lumière',
    positive: '#F3D838',
    negative: '#F7DF4A',
    contrastNote: 'Avec --yz-accent-ink',
  },
  {
    name: 'Oasis Sky',
    cssVar: '--yz-secondary',
    role: 'Goggles & col marin de Yuzu',
    positive: '#0F7EA6',
    negative: '#5AD2F4',
    contrastNote: '≥ 4.7:1 / 11.2:1',
  },
  {
    name: 'Cactus Coral',
    cssVar: '--yz-signal',
    role: 'Fleur de cactus & liseré KouriHase',
    positive: '#D6335D',
    negative: '#FF6B8B',
    contrastNote: '≥ 4.8:1 / 7.6:1',
  },
];
