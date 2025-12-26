interface Props { status: string; }

const classMap: Record<string, string> = {
  CONFIRMED: 'badge-confirmed',
  PENDING: 'badge-pending',
  CANCELLED: 'badge-cancelled',
  CONFLICT_REQUESTED: 'badge-conflict',
  APPROVED: 'badge-confirmed',
  REJECTED: 'badge-cancelled',
  PUBLIC: 'badge-public',
  INVITE_ONLY: 'badge-invite',
};

export default function StatusBadge({ status }: Props) {
  return <span className={'badge ' + (classMap[status] || 'badge-pending')}>{status.replace('_', ' ')}</span>;
}
