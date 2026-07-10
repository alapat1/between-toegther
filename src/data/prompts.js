// Real WYR/TOD prompt content now lives in Supabase (`public.prompts`) and is
// fetched via `engine/promptsRepo.js`. This file only keeps SPIN_SEGMENTS —
// wheel layout/weighting is presentation, not content, so it stays local.
export const SPIN_SEGMENTS = [
  { symbol: '?', label: 'mystery', tier: 'easy', type: 'truth', weight: 3 },
  { symbol: '★', label: 'star', tier: 'easy', type: 'dare', weight: 3 },
  { symbol: '??', label: 'double', tier: 'fun', type: 'truth', weight: 2 },
  { symbol: '⚡', label: 'lightning', tier: 'fun', type: 'dare', weight: 2 },
  { symbol: '♦', label: 'diamond', tier: 'wild', type: 'truth', weight: 2 },
  { symbol: '◈', label: 'target', tier: 'wild', type: 'dare', weight: 2 },
  { symbol: '!!!', label: 'danger', tier: 'spicy', type: 'truth', weight: 1 },
  { symbol: '♠', label: 'spade', tier: 'spicy', type: 'dare', weight: 1 },
  { symbol: '???', label: 'triple', tier: 'spicy', type: 'truth', weight: 1 },
  { symbol: '∞', label: 'infinite', tier: 'spicy', type: 'dare', weight: 1 }
];
