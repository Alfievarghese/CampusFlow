import { formatDateTime, eventDuration } from '@/lib/utils';

interface Props {
  startTime: string;
  endTime: string;
  hallName: string;
  hallLocation: string;
  rsvpCount: number;
}

export default function EventMeta({ startTime, endTime, hallName, hallLocation, rsvpCount }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
      <div>📅 {formatDateTime(startTime)} ({eventDuration(startTime, endTime)})</div>
      <div>🏢 {hallName} — {hallLocation}</div>
      <div>👥 {rsvpCount} RSVPs</div>
    </div>
  );
}
