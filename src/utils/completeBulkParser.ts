import { Project, Segment, PoiInfo } from '../types/schema';

export interface BulkValidationError {
  section: 'PROJECT' | 'SEGMENT' | 'LOCATION' | 'GENERAL';
  row: number;
  field?: string;
  message: string;
  value?: string;
}

export interface CompleteBulkParseResult {
  project: Partial<Project> | null;
  segments: Partial<Segment>[];
  locations: Array<{
    poi: Partial<PoiInfo>;
    segmentIndex: number; // どのセグメントに属するか
  }>;
  errors: BulkValidationError[];
}

// CSVテンプレート生成
export function generateCompleteBulkTemplate(type: 'basic' | 'full'): string {
  if (type === 'basic') {
    return [
      '# 【UNIVERSEGEO 一括登録テンプレート】',
      '# このCSVファイルで案件・セグメント・地点を一括登録できます',
      '# セグメントごとに地点をグループ化して記述します',
      '',
      '[PROJECT]',
      '広告主法人名,代理店名,訴求内容,配信開始日,配信終了日,備考',
      '株式会社サンプル,株式会社代理店,新商品プロモーション,2024-04-01,2024-06-30,テスト案件',
      '',
      '[SEGMENT]',
      'セグメント名,配信媒体,指定半径,抽出期間,属性,検知回数,検知時間開始,検知時間終了,滞在時間',
      '東京エリア,UNIVERSE,500m,1month,検知者,3,09:00,18:00,30min',
      '大阪エリア,TVer(SP),300m,1month,検知者,2,,,15min',
      '',
      '[LOCATION:東京エリア]',
      '地点名,住所,緯度,経度',
      '新宿駅東口,東京都新宿区新宿3-38-1,,',
      '渋谷スクランブル交差点,東京都渋谷区道玄坂2-1,,',
      '',
      '[LOCATION:大阪エリア]',
      '地点名,住所,緯度,経度',
      '梅田駅,大阪府大阪市北区角田町8-47,,',
    ].join('\n');
  } else {
    return [
      '# 【UNIVERSEGEO 一括登録テンプレート（完全版）】',
      '# このCSVファイルで案件・セグメント・地点を一括登録できます',
      '# [LOCATION:セグメント名] でセグメントと地点を紐づけます',
      '',
      '[PROJECT]',
      '広告主法人名,代理店名,訴求内容,UNIVERSEサービスID,UNIVERSEサービス名,配信開始日,配信終了日,主担当者,副担当者,備考',
      '株式会社サンプル,株式会社代理店,新商品プロモーション,SVC001,サンプルサービス,2024-04-01,2024-06-30,山田太郎,佐藤花子,詳細な備考',
      '',
      '[SEGMENT]',
      'セグメント名,配信媒体,指定半径,抽出期間,属性,検知回数,検知時間開始,検知時間終了,滞在時間,AdsアカウントID',
      '東京エリア,UNIVERSE,500m,1month,検知者,3,09:00,18:00,30min,17890',
      '大阪エリア,TVer(SP),300m,2month,検知者,2,,,15min,17891',
      '名古屋エリア,TVer(CTV),1000m,3month,居住者,,,,,17892',
      '',
      '[LOCATION:東京エリア]',
      '地点名,住所,緯度,経度',
      '新宿駅東口,東京都新宿区新宿3-38-1,35.690921,139.700258',
      '渋谷スクランブル交差点,東京都渋谷区道玄坂2-1,35.659517,139.700572',
      '池袋駅,東京都豊島区南池袋1-28-1,35.729503,139.711050',
      '',
      '[LOCATION:大阪エリア]',
      '地点名,住所,緯度,経度',
      '梅田駅,大阪府大阪市北区角田町8-47,34.702485,135.495951',
      '難波駅,大阪府大阪市中央区難波5-1-60,34.666034,135.500994',
      '',
      '[LOCATION:名古屋エリア]',
      '地点名,住所,緯度,経度',
      '名古屋駅,愛知県名古屋市中村区名駅1-1-4,35.170915,136.881537',
    ].join('\n');
  }
}

// CSVテンプレートダウンロード
export function downloadCompleteBulkTemplate(type: 'basic' | 'full') {
  const csv = generateCompleteBulkTemplate(type);
  const bom = '\uFEFF'; // UTF-8 BOM
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `UNIVERSEGEO_一括登録テンプレート_${type === 'basic' ? '基本版' : '完全版'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSVパース
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(cell);
        cell = '';
      } else {
        cell += char;
      }
    }
    
    cells.push(cell);
    return cells;
  });
}

// セクション分割（新フォーマット対応）
function splitSections(rows: string[][]): {
  project: string[][];
  segment: string[][];
  locationGroups: Array<{ segmentName: string; rows: string[][] }>;
} {
  const sections = {
    project: [] as string[][],
    segment: [] as string[][],
    locationGroups: [] as Array<{ segmentName: string; rows: string[][] }>,
  };

  let currentSection: 'none' | 'project' | 'segment' | 'location' = 'none';
  let currentSegmentName = '';

  for (const row of rows) {
    // コメント行をスキップ
    if (row.length > 0 && row[0].trim().startsWith('#')) {
      continue;
    }

    // 空行をスキップ
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    // セクションマーカー
    const firstCell = row[0].trim();
    const firstCellUpper = firstCell.toUpperCase();
    
    if (firstCellUpper === '[PROJECT]') {
      currentSection = 'project';
      continue;
    } else if (firstCellUpper === '[SEGMENT]') {
      currentSection = 'segment';
      continue;
    } else if (firstCellUpper.startsWith('[LOCATION:') && firstCellUpper.endsWith(']')) {
      // [LOCATION:セグメント名] 形式
      currentSection = 'location';
      currentSegmentName = firstCell.substring(10, firstCell.length - 1).trim();
      sections.locationGroups.push({ segmentName: currentSegmentName, rows: [] });
      continue;
    } else if (firstCellUpper === '[LOCATION]') {
      // 旧形式互換性のため残す
      currentSection = 'location';
      currentSegmentName = '';
      if (sections.locationGroups.length === 0) {
        sections.locationGroups.push({ segmentName: '', rows: [] });
      }
      continue;
    }

    // 現在のセクションに行を追加
    if (currentSection === 'project') {
      sections.project.push(row);
    } else if (currentSection === 'segment') {
      sections.segment.push(row);
    } else if (currentSection === 'location') {
      const lastGroup = sections.locationGroups[sections.locationGroups.length - 1];
      if (lastGroup) {
        lastGroup.rows.push(row);
      }
    }
  }

  return sections;
}

// 案件情報のパース
function parseProject(rows: string[][]): {
  project: Partial<Project> | null;
  errors: BulkValidationError[];
} {
  const errors: BulkValidationError[] = [];

  if (rows.length < 2) {
    errors.push({
      section: 'PROJECT',
      row: 0,
      message: '[PROJECT]セクションにヘッダーとデータ行が必要です',
    });
    return { project: null, errors };
  }

  const dataRow = rows[1]; // ヘッダーの次の行

  const [
    advertiser_name,
    agency_name,
    appeal_point,
    universe_service_id,
    universe_service_name,
    delivery_start_date,
    delivery_end_date,
    person_in_charge,
    sub_person_in_charge,
    remarks,
  ] = dataRow;

  // 必須チェック
  if (!advertiser_name || advertiser_name.trim() === '') {
    errors.push({
      section: 'PROJECT',
      row: 2,
      field: '広告主法人名',
      message: '広告主法人名は必須です',
    });
  }

  if (!appeal_point || appeal_point.trim() === '') {
    errors.push({
      section: 'PROJECT',
      row: 2,
      field: '訴求内容',
      message: '訴求内容は必須です',
    });
  }

  if (!delivery_start_date || delivery_start_date.trim() === '') {
    errors.push({
      section: 'PROJECT',
      row: 2,
      field: '配信開始日',
      message: '配信開始日は必須です',
    });
  }

  if (!delivery_end_date || delivery_end_date.trim() === '') {
    errors.push({
      section: 'PROJECT',
      row: 2,
      field: '配信終了日',
      message: '配信終了日は必須です',
    });
  }

  if (errors.length > 0) {
    return { project: null, errors };
  }

  const project: Partial<Project> = {
    advertiser_name: advertiser_name.trim(),
    agency_name: agency_name?.trim() || undefined,
    appeal_point: appeal_point.trim(),
    universe_service_id: universe_service_id?.trim() || undefined,
    universe_service_name: universe_service_name?.trim() || undefined,
    delivery_start_date: delivery_start_date.trim(),
    delivery_end_date: delivery_end_date.trim(),
    person_in_charge: person_in_charge?.trim() || 'システム登録',
    sub_person_in_charge: sub_person_in_charge?.trim() || undefined,
    remarks: remarks?.trim() || undefined,
    project_status: '準備中',
  };

  return { project, errors: [] };
}

// セグメント情報のパース
function parseSegments(rows: string[][]): {
  segments: Partial<Segment>[];
  errors: BulkValidationError[];
} {
  const errors: BulkValidationError[] = [];
  const segments: Partial<Segment>[] = [];

  if (rows.length < 2) {
    errors.push({
      section: 'SEGMENT',
      row: 0,
      message: '[SEGMENT]セクションにヘッダーとデータ行が必要です',
    });
    return { segments: [], errors };
  }

  // ヘッダーをスキップしてデータ行を処理
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const [
      segment_name,
      media_id,
      designated_radius,
      extraction_period,
      attribute,
      detection_count,
      detection_time_start,
      detection_time_end,
      stay_time,
      ads_account_id,
    ] = row;

    // 必須チェック
    if (!media_id || media_id.trim() === '') {
      errors.push({
        section: 'SEGMENT',
        row: rowNum,
        field: '配信媒体',
        message: '配信媒体は必須です',
      });
      continue;
    }

    // 媒体IDのマッピング
    const mediaMap: { [key: string]: string } = {
      'UNIVERSE': 'universe',
      'TVer(SP)': 'tver_sp',
      'TVER(SP)': 'tver_sp',
      'TVer(CTV)': 'tver_ctv',
      'TVER(CTV)': 'tver_ctv',
    };

    const mappedMediaId = mediaMap[media_id.trim()];
    if (!mappedMediaId) {
      errors.push({
        section: 'SEGMENT',
        row: rowNum,
        field: '配信媒体',
        message: '配信媒体は「UNIVERSE」「TVer(SP)」「TVer(CTV)」のいずれかで指定してください',
        value: media_id,
      });
      continue;
    }

    // 属性のマッピング
    const attributeMap: { [key: string]: 'detector' | 'resident' | 'worker' } = {
      '検知者': 'detector',
      '居住者': 'resident',
      '勤務者': 'worker',
    };

    const mappedAttribute = attribute?.trim() ? attributeMap[attribute.trim()] || 'detector' : 'detector';

    // 抽出期間のパース
    let extractionPeriodValue = extraction_period?.trim() || '1month';
    let extractionPeriodType: 'preset' | 'custom' = 'preset';
    let extractionStartDate = '';
    let extractionEndDate = '';

    const dateRangePattern = /^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/;
    if (dateRangePattern.test(extractionPeriodValue)) {
      const [start, end] = extractionPeriodValue.split('~');
      extractionStartDate = start;
      extractionEndDate = end;
      extractionPeriodType = 'custom';
      extractionPeriodValue = '';
    }

    const segment: Partial<Segment> = {
      segment_name: segment_name?.trim() || `セグメント${i}`,
      media_id: [mappedMediaId],
      designated_radius: designated_radius?.trim() || '',
      extraction_period: extractionPeriodValue,
      extraction_period_type: extractionPeriodType,
      extraction_start_date: extractionStartDate,
      extraction_end_date: extractionEndDate,
      attribute: mappedAttribute,
      detection_count: detection_count ? parseInt(detection_count) : 1,
      detection_time_start: detection_time_start?.trim() || '',
      detection_time_end: detection_time_end?.trim() || '',
      stay_time: stay_time?.trim() || '',
      location_request_status: 'not_requested',
      data_link_status: 'before_request',
      ads_account_id: ads_account_id?.trim() || undefined,
    };

    segments.push(segment);
  }

  return { segments, errors };
}

// 地点情報のパース（新フォーマット対応）
function parseLocations(
  locationGroups: Array<{ segmentName: string; rows: string[][] }>,
  segments: Partial<Segment>[]
): {
  locations: Array<{ poi: Partial<PoiInfo>; segmentIndex: number }>;
  errors: BulkValidationError[];
} {
  const errors: BulkValidationError[] = [];
  const locations: Array<{ poi: Partial<PoiInfo>; segmentIndex: number }> = [];

  // セグメント名からインデックスを引くためのマップ
  const segmentNameToIndex = new Map<string, number>();
  segments.forEach((seg, idx) => {
    if (seg.segment_name) {
      segmentNameToIndex.set(seg.segment_name, idx);
    }
  });

  // 各地点グループを処理
  for (const group of locationGroups) {
    const { segmentName, rows } = group;

    // セグメント名からインデックスを取得
    let segmentIndex = -1;
    if (segmentName) {
      segmentIndex = segmentNameToIndex.get(segmentName) ?? -1;
      if (segmentIndex === -1) {
        errors.push({
          section: 'LOCATION',
          row: 0,
          message: `[LOCATION:${segmentName}] セグメント「${segmentName}」が見つかりません`,
        });
        continue;
      }
    }

    if (rows.length < 2) {
      errors.push({
        section: 'LOCATION',
        row: 0,
        message: `[LOCATION${segmentName ? ':' + segmentName : ''}] セクションにヘッダーとデータ行が必要です`,
      });
      continue;
    }

    // ヘッダーをスキップしてデータ行を処理
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const [
        poi_name,
        address,
        latitude,
        longitude,
      ] = row;

      // 必須チェック
      if (!poi_name || poi_name.trim() === '') {
        errors.push({
          section: 'LOCATION',
          row: rowNum,
          field: '地点名',
          message: `セグメント「${segmentName}」: 地点名は必須です`,
        });
        continue;
      }

      // 住所または緯度経度のどちらかは必須
      const hasAddress = address && address.trim() !== '';
      const hasLat = latitude && latitude.trim() !== '';
      const hasLng = longitude && longitude.trim() !== '';
      const hasLatLng = hasLat && hasLng;

      if (!hasAddress && !hasLatLng) {
        errors.push({
          section: 'LOCATION',
          row: rowNum,
          field: '住所/緯度経度',
          message: `セグメント「${segmentName}」: 住所または緯度経度のどちらかは必須です`,
        });
        continue;
      }

      const poi: Partial<PoiInfo> = {
        poi_type: 'manual',
        poi_name: poi_name.trim(),
        address: address?.trim() || undefined,
        latitude: latitude && latitude.trim() ? parseFloat(latitude.trim()) : undefined,
        longitude: longitude && longitude.trim() ? parseFloat(longitude.trim()) : undefined,
      };

      locations.push({ poi, segmentIndex });
    }
  }

  return { locations, errors };
}

// 完全一括CSVのパース
export async function parseCompleteBulkCSV(csvText: string): Promise<CompleteBulkParseResult> {
  const rows = parseCSV(csvText);
  const sections = splitSections(rows);

  const projectResult = parseProject(sections.project);
  const segmentResult = parseSegments(sections.segment);
  const locationResult = parseLocations(sections.locationGroups, segmentResult.segments);

  const allErrors = [
    ...projectResult.errors,
    ...segmentResult.errors,
    ...locationResult.errors,
  ];

  return {
    project: projectResult.project,
    segments: segmentResult.segments,
    locations: locationResult.locations,
    errors: allErrors,
  };
}
