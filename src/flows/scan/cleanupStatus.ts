import type { ApiCleanupJob } from '../../api/features';

export const isTerminalCleanupJobStatus = (status?: ApiCleanupJob['job_status']) =>
  status === 'COMPLETED' || status === 'PARTIAL_FAILED' || status === 'FAILED' || status === 'CANCELED';
