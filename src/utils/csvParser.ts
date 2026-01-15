import { PoiInfo, Segment } from '../types/schema';
import * as XLSX from 'xlsx';

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface CSVParseResult {
  success: PoiInfo[];
  errors: CSVValidationError[];
  total: number;
  segmentConditions?: Partial<Segment>;
}

// 共通ロジック: 行データの処理
function processRows(
  rows: string[][],
  projectId: string,
  segmentId: string,
  autoGeocode: boolean
): CSVParseResult {
  const success: PoiInfo[] = [];
  const errors: CSVValidationError[] = [];
  let dataRowCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // コメント行をスキップ（#で始まる行）
    if (row.length > 0 && row[0].trim().startsWith('#')) {
      continue;
    }
    
    // ヘッダー行をスキップ
    if (i === 0 && isHeaderRow(row)) {
      continue;
    }

    // 空行をスキップ
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    dataRowCount++;
    const { poi, errors: rowErrors } = validateRow(row, i, projectId, segmentId);
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else if (poi) {
      // Geocodingが必要かチェック
      if (autoGeocode && (!poi.latitude || !poi.longitude) && poi.address) {
        (poi as any).needsGeocoding = true;
      }
      
      success.push(poi as PoiInfo);
    }
  }

  return {
    success,
    errors,
    total: dataRowCount,
  };
}

// Excelテンプレートダウンロード
export function downloadExcelTemplate(type: 'basic' | 'full') {
  const data = type === 'basic' 
    ? [
        ['地点名', '住所', '緯度', '経度', '地点ID'],
        ['新宿駅東口', '東京都新宿区新宿3-38-1', '', '', 'LOC-001'],
        ['渋谷スクランブル交差点', '東京都渋谷区道玄坂2-1', '', '', 'LOC-002'],
        ['東京駅', '東京都千代田区丸の内1-9-1', '', '', 'LOC-003'],
      ]
    : [
        ['地点名', '住所', '緯度', '経度', '地点ID'],
        ['新宿駅東口', '東京都新宿区新宿3-38-1', '35.690921', '139.700258', 'LOC-001'],
        ['渋谷スクランブル交差点', '東京都渋谷区道玄坂2-1', '35.659517', '139.700572', 'LOC-002'],
        ['東京駅,東京都千代田区丸の内1-9-1', '35.681236', '139.767125', 'LOC-003'],
      ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  // セグメント設定シートを追加
  const segmentSettingsData = [
    ['項目', '設定値', '説明'],
    ['抽出期間', '直近1ヶ月', 'プリセット（直近1ヶ月〜6ヶ月）または「期間指定」'],
    ['抽出開始日', '', '抽出期間が「期間指定」の場合に入力 (YYYY-MM-DD)'],
    ['抽出終了日', '', '抽出期間が「期間指定」の場合に入力 (YYYY-MM-DD)'],
    ['指定半径', '500m', '地点からの半径（50m〜10000m）'],
    ['属性', '検知者', '検知者 / 居住者 / 勤務者'],
  ];
  const wsSegment = XLSX.utils.aoa_to_sheet(segmentSettingsData);
  XLSX.utils.book_append_sheet(wb, wsSegment, "セグメント設定");

  XLSX.writeFile(wb, `地点登録テンプレート_${type === 'basic' ? '基本版' : '完全版'}.xlsx`);
}

// Excelパース・バリデーション
export async function parseAndValidateExcel(
  file: File,
  projectId: string,
  segmentId: string,
  autoGeocode: boolean = false
): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 配列の配列として取得
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        // 文字列配列に変換 (全ての値をString化)
        const stringRows = rows.map(row => row.map(cell => cell === null || cell === undefined ? "" : String(cell).trim()));

        // 共通ロジックで検証
        const result = processRows(stringRows, projectId, segmentId, autoGeocode);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// ヘッダー行かどうかを判定
function isHeaderRow(row: string[]): boolean {
  if (row.length === 0) return false;
  
  // 最初のセルが「地点名」で始まる場合はヘッダー
  const firstCell = row[0]?.trim().toLowerCase();
  return firstCell === '地点名' || firstCell === 'poi_name';
}

// バリデーション
function validateRow(
  row: string[],
  rowIndex: number,
  projectId: string,
  segmentId: string
): { poi: Partial<PoiInfo> | null; errors: CSVValidationError[] } {
  const errors: CSVValidationError[] = [];
  
  // 空行をスキップ
  if (row.every(cell => !cell || cell.trim() === '')) {
    return { poi: null, errors: [] };
  }

  const [
    poi_name,
    address,
    latitude,
    longitude,
    location_id, // 5列目に地点ID
  ] = row;

  // 必須チェック: 地点名
  if (!poi_name || poi_name.trim() === '') {
    errors.push({
      row: rowIndex + 1,
      field: '地点名',
      message: '地点名は必須です',
    });
  }

  // 住所または緯度経度のどちらかは必須
  const hasAddress = address && address.trim() !== '';
  const hasLat = latitude && latitude.trim() !== '';
  const hasLng = longitude && longitude.trim() !== '';
  const hasLatLng = hasLat && hasLng;
  
  if (!hasAddress && !hasLatLng) {
    errors.push({
      row: rowIndex + 1,
      field: '住所/緯度経度',
      message: '住所または緯度経度のどちらかは必須です',
    });
  }
  
  // 緯度と経度の片方だけが入力されている場合はエラー
  if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
    errors.push({
      row: rowIndex + 1,
      field: '緯度経度',
      message: '緯度と経度は両方入力してください',
    });
  }

  // 地点名の長さチェック
  if (poi_name && poi_name.length > 100) {
    errors.push({
      row: rowIndex + 1,
      field: '地点名',
      message: '地点名は100文字以内で入力してください',
      value: poi_name,
    });
  }

  // 緯度のバリデーション
  if (latitude && latitude.trim() !== '') {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({
        row: rowIndex + 1,
        field: '緯度',
        message: '緯度は-90〜90の範囲で入力してください',
        value: latitude,
      });
    }
  }

  // 経度のバリデーション
  if (longitude && longitude.trim() !== '') {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({
        row: rowIndex + 1,
        field: '経度',
        message: '経度は-180〜180の範囲で入力してください',
        value: longitude,
      });
    }
  }

  // エラーがある場合はnullを返す
  if (errors.length > 0) {
    return { poi: null, errors };
  }

  // POIデータ構築
  const poi: Partial<PoiInfo> = {
    project_id: projectId,
    segment_id: segmentId,
    poi_type: 'manual',
    poi_name: poi_name.trim(),
    address: address?.trim() || undefined,
    latitude: latitude && latitude.trim() ? parseFloat(latitude.trim()) : undefined,
    longitude: longitude && longitude.trim() ? parseFloat(longitude.trim()) : undefined,
    location_id: location_id ? location_id.trim() : undefined, // 地点IDを追加
  };

  return { poi, errors: [] };
}

// エラーレポートCSV生成
export function generateErrorReportCSV(errors: CSVValidationError[]): string {
  const header = '行番号,項目,エラー内容,入力値';
  const rows = errors.map(error => {
    return [
      error.row,
      error.field,
      error.message,
      error.value || '',
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

// エラーレポートCSVダウンロード
export function downloadErrorReportCSV(errors: CSVValidationError[]) {
  const csv = generateErrorReportCSV(errors);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `地点登録エラーレポート_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  // ノードが存在することを確認してから削除
  if (link.parentNode) {
    document.body.removeChild(link);
  }
}