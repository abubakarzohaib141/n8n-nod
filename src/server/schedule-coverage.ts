import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { connectionSources } from './app-reads.ts';
import { waitingTurnSql } from './turn-chain.ts';

type ScheduleRow = {
  id: string;
  revision: number;
  title: string;
  kind: 'once' | 'recurring';
  enabled: boolean;
  nextRun: Date | null;
  watch: string[];
  activeRun: boolean;
};

export type ScheduleCoverage = {
  connectionIds: string[];
  schedules: Array<{
    id: string;
    revision: number;
    title: string;
    kind: 'once' | 'recurring';
    enabled: boolean;
    nextRun: string | null;
    watch: string[];
    activeRun: boolean;
  }>;
  truncated: boolean;
};

export async function loadScheduleCoverage(
  database: Pool | PoolClient,
  ownerId: string,
  sourceIds: string[],
): Promise<ScheduleCoverage> {
  const prefix = `${connectionSources}:`;
  const connectionIds = [...new Set(sourceIds.flatMap((sourceId) => {
    const id = sourceId.startsWith(prefix) ? sourceId.slice(prefix.length).toLowerCase() : '';
    return z.uuid().safeParse(id).success ? [id] : [];
  }))].sort();

  const rows = connectionIds.length
    ? (await database.query<ScheduleRow>(
        `SELECT s.id,s.revision,s.title,s.kind,s.enabled,s.next_run_at AS "nextRun",s.watch,
            EXISTS(
              SELECT 1 FROM schedule_runs r JOIN turns u ON u.owner_id=r.owner_id AND u.session_id=r.turn_id
              WHERE r.owner_id=s.owner_id AND r.schedule_id=s.id
                AND (u.status IN ('queued','running') OR (${waitingTurnSql('u')}))
            ) AS "activeRun"
         FROM schedules s
         WHERE s.owner_id=$1 AND s.watch IS NOT NULL AND s.watch ?| $2::text[]
           AND (s.enabled OR s.kind='recurring' OR EXISTS(
             SELECT 1 FROM schedule_runs r JOIN turns u ON u.owner_id=r.owner_id AND u.session_id=r.turn_id
             WHERE r.owner_id=s.owner_id AND r.schedule_id=s.id
               AND (u.status IN ('queued','running') OR (${waitingTurnSql('u')}))
           ))
         ORDER BY s.id LIMIT 21`,
        [ownerId, connectionIds],
      )).rows
    : [];

  return {
    connectionIds,
    schedules: rows.slice(0, 20).map((row) => ({
      id: row.id.toLowerCase(),
      revision: row.revision,
      title: row.title,
      kind: row.kind,
      enabled: row.enabled,
      nextRun: row.nextRun?.toISOString() ?? null,
      watch: row.watch,
      activeRun: row.activeRun,
    })),
    truncated: rows.length > 20,
  };
}
