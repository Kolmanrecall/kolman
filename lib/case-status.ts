import type { PropertyCaseStatus } from '@/lib/types';

export const CASE_STATUS_OPTIONS: Array<{ value: PropertyCaseStatus; label: string }> = [
  { value: 'lead', label: 'Lead' },
  { value: 'valuation', label: 'Vurdering' },
  { value: 'befaring', label: 'Befaring' },
  { value: 'assignment', label: 'Oppdrag' },
  { value: 'sold', label: 'Solgt' },
  { value: 'lost', label: 'Tapt' },
  { value: 'archived', label: 'Arkivert' },
];

export const CASE_STATUS_VALUES = CASE_STATUS_OPTIONS.map((option) => option.value) as [PropertyCaseStatus, ...PropertyCaseStatus[]];

export function getCaseStatusLabel(status?: string | null) {
  if (status === 'active') return 'Lead';
  if (status === 'paused') return 'Vurdering';
  if (status === 'closed') return 'Arkivert';
  return CASE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Lead';
}

export function getCaseStatusTone(status?: string | null): 'hot' | 'warm' | 'cold' | 'client' | 'neutral' {
  if (status === 'assignment' || status === 'sold') return 'hot';
  if (status === 'valuation' || status === 'befaring' || status === 'paused') return 'warm';
  if (status === 'lost' || status === 'archived' || status === 'closed') return 'cold';
  return 'neutral';
}

export function isOpenCaseStatus(status?: string | null) {
  return !['sold', 'lost', 'archived', 'closed'].includes(status ?? '');
}
