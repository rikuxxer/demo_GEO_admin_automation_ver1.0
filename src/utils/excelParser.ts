import * as XLSX from 'xlsx';

// マッピング定義
const mediaMapping: Record<string, string> = {
  'UNIVERSE': 'universe',
  'TVer(SP)': 'tver_sp',
  'TVer(CTV)': 'tver_ctv',
  'UNIVERSEまたはTVer(SP)': 'universe,tver_sp',
  'TVer(スマホ)': 'tver_sp',
  'TVer(テレビ)': 'tver_ctv'
};

const attributeMapping: Record<string, string> = {
  '検知者': 'detector',
  '居住者': 'resident',
  '勤務者': 'worker',
  '検知された人': 'detector'
};

const periodMapping: Record<string, string> = {
  '直近1ヶ月': '1month',
  '直近2ヶ月': '2month',
  '直近3ヶ月': '3month',
  '直近4ヶ月': '4month',
  '直近5ヶ月': '5month',
  '直近6ヶ月': '6month',
  '1ヶ月': '1month',
  '2ヶ月': '2month',
  '3ヶ月': '3month',
  '期間指定': 'custom'
};

const detectionCountMapping: Record<string, number> = {
  '1回以上': 1,
  '2回以上': 2,
  '3回以上': 3,
  '4回以上': 4,
  '5回以上': 5
};

const stayTimeMapping: Record<string, string> = {
  '3分以上': '3min',
  '5分以上': '5min',
  '10分以上': '10min',
  '15分以上': '15min',
  '30分以上': '30min',
  '3分': '3min',
  '5分': '5min',
  '10分': '10min',
  '15分': '15min',
  '30分': '30min'
};

export interface ExcelProjectData {
  advertiser_name: string;
  agency_name: string;
  appeal_point: string;
  universe_service_id?: string;
  universe_service_name?: string;
  delivery_start_date: string;
  delivery_end_date: string;
  sub_person_in_charge?: string;
  remarks?: string;
}

export interface ExcelSegmentData {
  segment_name: string;
  media_id: string | string[];
  designated_radius: string;
  extraction_period: string;
  extraction_start_date?: string;
  extraction_end_date?: string;
  attribute: string;
  detection_count: number;
  detection_time_start?: string;
  detection_time_end?: string;
  stay_time?: string;
  ads_account_id?: string;
  provider_segment_id?: string;
  _rowNum?: number;
}

export interface ExcelLocationData {
  segment_name_ref: string;
  poi_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  location_id?: string;
  _rowNum?: number;
}

export interface ExcelParseError {
  section: string;
  row?: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ExcelParseResult {
  project: ExcelProjectData | null;
  segments: ExcelSegmentData[];
  locations: ExcelLocationData[];
  errors: ExcelParseError[];
}

// Excelファイルパース
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    project: null,
    segments: [],
    locations: [],
    errors: []
  };

  try {
    console.log('Excelファイルパース開始:', file.name);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    console.log('利用可能なシート:', wb.SheetNames);

    // 新形式と旧形式の判定
    const isNewFormat = wb.SheetNames.includes('2.案件・セグメント設定');
    
    if (isNewFormat) {
      // 新形式 (v2.0)
      console.log('新形式(v2.0)としてパースします');
      const mergedSheet = wb.Sheets['2.案件・セグメント設定'];
      const locationSheet = wb.Sheets['3.地点リスト'] || wb.Sheets['4.地点リスト']; // 念のため4も探す

      if (!mergedSheet) {
        result.errors.push({ section: 'FILE', message: '必須シート「2.案件・セグメント設定」が見つかりません' });
        return result;
      }

      // 統合シートから案件とセグメントを抽出
      const mergedData = parseMergedSheet(mergedSheet, result.errors);
      result.project = mergedData.project;
      result.segments = mergedData.segments;

      if (locationSheet) {
        result.locations = parseLocationSheet(locationSheet, result.segments, result.errors);
      } else {
        result.errors.push({ section: 'FILE', message: '必須シート「3.地点リスト」が見つかりません' });
      }

    } else {
      // 旧形式 (v1.x)
      console.log('旧形式(v1.x)としてパースします');
      const projectSheet = wb.Sheets['2.案件情報'];
      const segmentSheet = wb.Sheets['3.セグメント設定'];
      const locationSheet = wb.Sheets['4.地点リスト'];

      if (!projectSheet || !segmentSheet || !locationSheet) {
        result.errors.push({ section: 'FILE', message: '必須シートが見つかりません（2.案件情報, 3.セグメント設定, 4.地点リスト）' });
        return result;
      }

      result.project = parseProjectSheet(projectSheet, result.errors);
      result.segments = parseSegmentSheet(segmentSheet, result.errors);
      result.locations = parseLocationSheet(locationSheet, result.segments, result.errors);
    }

    validateBusinessRules(result);

  } catch (error) {
    console.error('Excelファイルパースエラー:', error);
    result.errors.push({
      section: 'FILE',
      message: `ファイル読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }

  return result;
}

function isSampleRow(row: any[]): boolean {
  if (!row || row.length === 0) return false;
  const firstCell = String(row[0] || '').trim().toLowerCase();
  if (!firstCell) return true; // 空行はサンプル扱いにしてスキップ（または空行扱い）
  if (firstCell.includes('サンプル') || firstCell.includes('sample') || firstCell.includes('(例)') || firstCell === 'xxx' || firstCell === '---') {
    return true;
  }
  return false;
}

// 新形式: 統合シートパース
function parseMergedSheet(ws: XLSX.WorkSheet, errors: ExcelParseError[]): { project: ExcelProjectData | null, segments: ExcelSegmentData[] } {
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
  let project: ExcelProjectData | null = null;
  const segments: ExcelSegmentData[] = [];

  // 1. 案件情報 (行2, Index 1)
  if (data.length > 1) {
    const projectRow = data[1]; // 2行目
    // 空チェック
    if (!projectRow || projectRow.length === 0 || !projectRow[0]) {
       // 2行目が空ならエラー、またはサンプル行かもしれないが、新形式では2行目を入力行と決めている
       // もしユーザーが2行目を飛ばして3行目に書いたら？ -> サポートしない（ガイドに従ってもらう）
       // 一応、値が入っているかチェック
    }
    
    // 必須項目のチェック (A:広告主, B:代理店, C:訴求, D:開始, E:終了)
    const hasProjectData = projectRow && (projectRow[0] || projectRow[1]);
    
    if (hasProjectData) {
      project = parseProjectRow(projectRow, 2, errors, '2.案件・セグメント設定');
    } else {
      errors.push({ section: '2.案件・セグメント設定', row: 2, message: '案件情報��入力されていません' });
    }
  }

  // 2. セグメント情報 (行8以降, Index 7〜)
  // ヘッダーは行5にあると想定。データは行6,7がサンプルで、行8から入力と想定（テンプレートの実装に合わせる）
  // テンプレートでは:
  // Row 5: Header
  // Row 6: Sample 1
  // Row 7: Sample 2
  // Row 8: Input Start
  
  const segmentStartIndex = 7; // Row 8

  for (let i = segmentStartIndex; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;
    
    if (!row || row.length === 0) continue;
    if (isSampleRow(row)) continue; // 万が一サンプル行が増えてもスキップ
    
    const segmentName = row[0];
    if (!segmentName) continue; // セグメント名がない行は無視

    const segment = parseSegmentRow(row, rowNum, errors, '2.案件・セグメント設定');
    if (segment) {
      segments.push(segment);
    }
  }

  // セグメント名重複チェック
  const names = segments.map(s => s.segment_name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    errors.push({ section: '2.案件・セグメント設定', message: `セグメント名が重複しています: ${[...new Set(duplicates)].join(', ')}` });
  }

  return { project, segments };
}

// 旧形式: 案件情報パース
function parseProjectSheet(ws: XLSX.WorkSheet, errors: ExcelParseError[]): ExcelProjectData | null {
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
  
  // ヘッダー行の次から、有効な行を探す
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!isSampleRow(row)) {
      return parseProjectRow(row, i + 1, errors, '2.案件情報');
    }
  }
  
  errors.push({ section: '2.案件情報', message: '有効な案件情報が入力されていません' });
  return null;
}

// 共通: 案件行パース
function parseProjectRow(row: any[], rowNum: number, errors: ExcelParseError[], sectionName: string): ExcelProjectData | null {
  const project: any = {};
  
  // A: 広告主名
  if (!row[0]) errors.push({ section: sectionName, row: rowNum, field: '広告主名', message: '広告主名は必須です' });
  else project.advertiser_name = String(row[0]).trim();

  // B: 代理店名
  if (!row[1]) errors.push({ section: sectionName, row: rowNum, field: '代理店名', message: '代理店名は必須です' });
  else project.agency_name = String(row[1]).trim();

  // C: 訴求内容
  if (!row[2]) errors.push({ section: sectionName, row: rowNum, field: '訴求内容', message: '訴求内容は必須です' });
  else project.appeal_point = String(row[2]).trim();

  // D: 開始日
  if (!row[3]) errors.push({ section: sectionName, row: rowNum, field: '配信開始日', message: '配信開始日は必須です' });
  else project.delivery_start_date = formatExcelDate(row[3]);

  // E: 終了日
  if (!row[4]) errors.push({ section: sectionName, row: rowNum, field: '配信終了日', message: '配信終了日は必須です' });
  else project.delivery_end_date = formatExcelDate(row[4]);

  // 日付整合性
  if (project.delivery_start_date && project.delivery_end_date) {
    if (new Date(project.delivery_start_date) > new Date(project.delivery_end_date)) {
      errors.push({ section: sectionName, row: rowNum, field: '配信終了日', message: '配信終了日は開始日以降にしてください' });
    }
  }

  // F: 備考
  if (row[5]) project.remarks = String(row[5]).trim();

  return project as ExcelProjectData;
}

// 旧形式: セグメントシートパース
function parseSegmentSheet(ws: XLSX.WorkSheet, errors: ExcelParseError[]): ExcelSegmentData[] {
  const segments: ExcelSegmentData[] = [];
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (isSampleRow(row)) continue;
    if (!row[0]) continue;

    const segment = parseSegmentRow(row, i + 1, errors, '3.セグメント設定');
    if (segment) segments.push(segment);
  }

  // 重複チェック
  const names = segments.map(s => s.segment_name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    errors.push({ section: '3.セグメント設定', message: `セグメント名が重複しています: ${[...new Set(duplicates)].join(', ')}` });
  }

  return segments;
}

// 共通: セグメント行パース
function parseSegmentRow(row: any[], rowNum: number, errors: ExcelParseError[], sectionName: string): ExcelSegmentData | null {
  const segment: any = {
    segment_name: String(row[0]).trim(),
    _rowNum: rowNum
  };

  // B: 配信先
  const media = row[1];
  if (!media) {
    errors.push({ section: sectionName, row: rowNum, field: '配信先', message: '配信先は必須です' });
  } else {
    const mediaList = String(media).split(/[,、]/).map(m => m.trim()).filter(m => m);
    const mappedIds: string[] = [];
    
    for (const m of mediaList) {
      if (mediaMapping[m]) {
         if (mediaMapping[m].includes(',')) mappedIds.push(...mediaMapping[m].split(','));
         else mappedIds.push(mediaMapping[m]);
      } else {
        errors.push({ section: sectionName, row: rowNum, field: '配信先', message: `無効な配信先: ${m}` });
      }
    }
    if (mappedIds.includes('tver_ctv') && mappedIds.length > 1) {
      errors.push({ section: sectionName, row: rowNum, field: '配信先', message: 'TVer(CTV)は他と併用できません' });
    }
    if (mappedIds.length > 0) segment.media_id = mappedIds.length === 1 ? mappedIds[0] : mappedIds;
  }

  // C: 配信範囲
  const radius = row[2];
  if (!radius) {
    errors.push({ section: sectionName, row: rowNum, field: '配信範囲', message: '配信範囲は必須です' });
  } else {
    const rStr = String(radius).trim();
    if (/^\d+m$/.test(rStr)) segment.designated_radius = rStr;
    else errors.push({ section: sectionName, row: rowNum, field: '配信範囲', message: '「50m」のような形式で入力してください' });
  }

  // D: 抽出期間
  const period = row[3];
  if (!period) {
    errors.push({ section: sectionName, row: rowNum, field: '抽出期間', message: '抽出期間は必須です' });
  } else if (periodMapping[period]) {
    segment.extraction_period = periodMapping[period];
  } else {
    errors.push({ section: sectionName, row: rowNum, field: '抽出期間', message: '無効な期間です' });
  }

  // E, F: 開始・終了日
  if (row[4]) segment.extraction_start_date = formatExcelDate(row[4]);
  if (row[5]) segment.extraction_end_date = formatExcelDate(row[5]);

  if (segment.extraction_period === 'custom') {
    if (!segment.extraction_start_date || !segment.extraction_end_date) {
      errors.push({ section: sectionName, row: rowNum, field: '抽出期間', message: '期間指定の場合は開始日と終了日を入力してください' });
    }
  }

  // G: 対象者
  const attr = row[6];
  if (!attr) {
    errors.push({ section: sectionName, row: rowNum, field: '対象者', message: '対象者は必須です' });
  } else if (attributeMapping[attr]) {
    segment.attribute = attributeMapping[attr];
  } else {
    errors.push({ section: sectionName, row: rowNum, field: '対象者', message: '無効な対象者です' });
  }

  // H: 検知回数
  const count = row[7];
  if (!count) {
    errors.push({ section: sectionName, row: rowNum, field: '検知回数', message: '検知回数は必須です' });
  } else if (detectionCountMapping[count]) {
    segment.detection_count = detectionCountMapping[count];
  } else {
    errors.push({ section: sectionName, row: rowNum, field: '検知回数', message: '無効な検知回数です' });
  }

  // I, J: 検知時間
  if (row[8]) segment.detection_time_start = String(row[8]).trim();
  if (row[9]) segment.detection_time_end = String(row[9]).trim();

  if ((segment.detection_time_start && !segment.detection_time_end) || (!segment.detection_time_start && segment.detection_time_end)) {
    errors.push({ section: sectionName, row: rowNum, field: '検知時間', message: '検知時間は開始と終了をセットで指定してください' });
  }

  // K: 滞在時間
  if (row[10]) {
    if (stayTimeMapping[row[10]]) segment.stay_time = stayTimeMapping[row[10]];
    else errors.push({ section: sectionName, row: rowNum, field: '滞在時間', message: '無効な滞在時間です' });
  }

  return segment;
}

// 地点リストパース
function parseLocationSheet(ws: XLSX.WorkSheet, segments: ExcelSegmentData[], errors: ExcelParseError[]): ExcelLocationData[] {
  const locations: ExcelLocationData[] = [];
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
  // ヘッダー行は Row 1 (Index 0)
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (isSampleRow(row)) continue;
    
    const segmentRef = row[0];
    if (!segmentRef) continue;

    const loc: any = {
      segment_name_ref: String(segmentRef).trim(),
      _rowNum: i + 1
    };

    if (!segments.some(s => s.segment_name === loc.segment_name_ref)) {
      errors.push({ section: '地点リスト', row: i + 1, field: 'セグメント参照', message: `セグメント「${loc.segment_name_ref}」が見つ���りません` });
    }

    // B: 地点名
    if (!row[1]) errors.push({ section: '地点リスト', row: i + 1, field: '地点名', message: '地点名は必須です' });
    else loc.poi_name = String(row[1]).trim();

    // C: 住所
    if (!row[2]) errors.push({ section: '地点リスト', row: i + 1, field: '住所', message: '住所は必須です' });
    else loc.address = String(row[2]).trim();

    // D, E: 緯度経度
    if (row[3]) {
      const lat = Number(row[3]);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) loc.latitude = lat;
      else errors.push({ section: '地点リスト', row: i + 1, field: '緯度', message: '-90〜90で指定してください' });
    }
    if (row[4]) {
      const lng = Number(row[4]);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) loc.longitude = lng;
      else errors.push({ section: '地点リスト', row: i + 1, field: '経度', message: '-180〜180で指定してください' });
    }

    // F: ID
    if (row[5]) loc.location_id = String(row[5]).trim();

    locations.push(loc as ExcelLocationData);
  }

  return locations;
}

function validateBusinessRules(result: ExcelParseResult) {
  const ctvSegments = result.segments.filter(s => s.media_id === 'tver_ctv');
  const otherSegments = result.segments.filter(s => s.media_id !== 'tver_ctv');

  if (ctvSegments.length > 0 && otherSegments.length > 0) {
    result.errors.push({ section: 'ビジネスルール', message: 'TVer(CTV)と他の配信先は混在できません' });
  }

  result.segments.forEach(s => {
    if ((s.attribute === 'resident' || s.attribute === 'worker') && s.extraction_period !== '3month') {
      result.errors.push({ section: 'ビジネスルール', row: s._rowNum, message: '居住者・勤務者の場合、期間は「直近3ヶ月」固定です' });
    }
  });
}

function formatExcelDate(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  return String(value);
}
