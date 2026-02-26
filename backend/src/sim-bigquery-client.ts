import { BigQuery } from '@google-cloud/bigquery';

// These types mirror src/types/schema.ts SimConditions / SimEstimateResult
// (Backend cannot import from frontend rootDir)
export interface SimConditions {
  date_start: string;
  date_end: string;
  uid_type?: string;
  poi_ids?: string[];
  brand_ids?: string[];
  prefectures?: string[];
  cities?: string[];
  radius_max?: number;
  detection_count?: number;
}

export interface SimEstimateResult {
  estimated_uu: number;
  conditions: SimConditions;
  executed_at: string;
  query_duration_ms?: number;
}

const BQ_LOCATION: string = (process.env.BQ_LOCATION && process.env.BQ_LOCATION.trim()) || 'asia-northeast1';

let bqClient: BigQuery | null = null;

function getClient(): BigQuery {
  if (!bqClient) {
    const projectId = process.env.GCP_PROJECT_ID?.trim();
    const config: Record<string, string> = {};
    if (projectId) config.projectId = projectId;
    bqClient = new BigQuery(config);
  }
  return bqClient;
}

function getSourceTable(): string {
  const table = process.env.SIM_SOURCE_TABLE?.trim();
  if (!table) throw new Error('SIM_SOURCE_TABLE environment variable is not set');
  return table;
}

export function isSimConfigured(): boolean {
  return !!(process.env.SIM_SOURCE_TABLE?.trim());
}

export async function estimateUU(conditions: SimConditions): Promise<SimEstimateResult> {
  const sourceTable = getSourceTable();
  const startTime = Date.now();

  const params: Record<string, unknown> = {
    date_start: conditions.date_start,
    date_end: conditions.date_end,
    uid_type: conditions.uid_type ?? null,
    poi_ids: conditions.poi_ids ?? [],
    brand_ids: conditions.brand_ids ?? [],
    prefectures: conditions.prefectures ?? [],
    cities: conditions.cities ?? [],
    radius_max: conditions.radius_max ?? null,
    detection_count: conditions.detection_count ?? null,
  };

  // Explicitly provide types so BigQuery can handle empty arrays
  const types: Record<string, string | string[]> = {
    date_start: 'DATE',
    date_end: 'DATE',
    uid_type: 'STRING',
    poi_ids: ['STRING'],
    brand_ids: ['STRING'],
    prefectures: ['STRING'],
    cities: ['STRING'],
    radius_max: 'INT64',
    detection_count: 'INT64',
  };

  const query = `
    SELECT APPROX_COUNT_DISTINCT(uid) AS estimated_uu
    FROM \`${sourceTable}\`
    WHERE TRUE
      AND created BETWEEN @date_start AND @date_end
      AND (@uid_type IS NULL OR uid_type = @uid_type)
      AND (ARRAY_LENGTH(@poi_ids) = 0    OR poi_id     IN UNNEST(@poi_ids))
      AND (ARRAY_LENGTH(@brand_ids) = 0  OR brand_id   IN UNNEST(@brand_ids))
      AND (ARRAY_LENGTH(@prefectures) = 0 OR prefecture IN UNNEST(@prefectures))
      AND (ARRAY_LENGTH(@cities) = 0     OR city        IN UNNEST(@cities))
      AND (@radius_max IS NULL           OR radius     <= @radius_max)
      AND (@detection_count IS NULL      OR detection_count >= @detection_count)
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryResult = await getClient().query({
    query,
    params,
    types: types as any,
    location: BQ_LOCATION,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = Array.isArray(queryResult[0]) ? queryResult[0] : queryResult as any;

  const estimated_uu: number = rows[0]?.estimated_uu ?? 0;

  return {
    estimated_uu,
    conditions,
    executed_at: new Date().toISOString(),
    query_duration_ms: Date.now() - startTime,
  };
}
