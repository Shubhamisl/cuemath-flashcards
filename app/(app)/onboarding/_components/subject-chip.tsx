import type { subjectFamily } from '@/lib/brand/tokens'
import { subjectTint } from '@/lib/brand/tokens'

const LABEL: Record<subjectFamily, string> = {
  math: 'Math',
  language: 'Language',
  science: 'Science',
  humanities: 'History / Humanities',
  other: 'Something else',
}

export function SubjectChip({ subject }: { subject: subjectFamily }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-[0.06em] text-ink-black"
      style={{ backgroundColor: subjectTint(subject) }}
    >
      {LABEL[subject]}
    </span>
  )
}
