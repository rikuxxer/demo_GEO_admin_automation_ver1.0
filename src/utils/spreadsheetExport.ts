import type { PoiInfo, Project, Segment } from '../types/schema';

/**
 * 地点登録依頼をスプレッドシート形式で出力する
 */
export interface SpreadsheetRow {
  category_id: string; // 99000000（00には指定半径の広さ）
  brand_name: string; // 案件名
  poi_id: string; // セグメントID
  poi_name: string; // 地点名
  latitude: number | undefined;
  longitude: number | undefined;
  prefecture: string; // 都道府県
  city: string; // 市区町村
  setting_flag: number; // 2で固定
  created: string; // 依頼日当日の日付（YYYY-MM-DD形式）
}

/**
 * 指定半径を数値に変換（m単位）
 */
function parseRadius(radius: string | undefined): number {
  if (!radius) return 0;
  // "50m" -> 50
  const match = radius.match(/^(\d+)m?$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 指定した日付から最も近い月・水・金を取得
 * 当日が月・水・金の場合は当日を返す（次の月・水・金ではない）
 */
function getNextMonWedFri(date: Date, includeToday: boolean = false): Date {
  const result = new Date(date);
  const day = result.getDay();
  
  // 月(1), 水(3), 金(5)
  const targetDays = [1, 3, 5];
  
  // 当日が月・水・金で、当日を含める場合は当日を返す
  if (includeToday && targetDays.includes(day)) {
    return result;
  }
  
  // 次の月・水・金を探す
  let daysToAdd = 1;
  
  while (daysToAdd <= 7) {
    const testDate = new Date(result);
    testDate.setDate(testDate.getDate() + daysToAdd);
    const testDay = testDate.getDay();
    
    if (targetDays.includes(testDay)) {
      return testDate;
    }
    
    daysToAdd++;
  }
  
  // フォールバック（通常ここには到達しない）
  return result;
}

/**
 * エクスポート予定日を計算
 * 
 * ルール:
 * 1. 20:00以降の依頼は翌日扱い
 * 2. 月・水・金に依頼（20:00まで）: 当日の月・水・金
 * 3. その他の曜日または20:00以降: 次の月・水・金
 * 
 * @param requestDateTime 地点登録日時（ISO 8601形式の文字列、またはDateオブジェクト）
 * @returns エクスポート予定日（YYYY-MM-DD形式）
 */
export function calculateExportScheduledDate(requestDateTime: string | Date): string {
  const requestDate = typeof requestDateTime === 'string' 
    ? new Date(requestDateTime) 
    : requestDateTime;
  
  // 無効な日付の場合は現在日時を使用
  if (isNaN(requestDate.getTime())) {
    console.warn('⚠️ Invalid date in calculateExportScheduledDate, using current date');
    const now = new Date();
    requestDate.setTime(now.getTime());
  }
  
  const hour = requestDate.getHours();
  const day = requestDate.getDay();
  
  // 月(1), 水(3), 金(5)
  const targetDays = [1, 3, 5];
  const isMonWedFri = targetDays.includes(day);
  
  let baseDate: Date;
  let includeToday: boolean;
  
  if (hour >= 20) {
    // 20:00以降の依頼は翌日扱い
    baseDate = new Date(requestDate);
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(0, 0, 0, 0);
    includeToday = false; // 翌日が月・水・金でも当日扱いにはしない
  } else {
    // 20:00までの依頼
    baseDate = new Date(requestDate);
    baseDate.setHours(0, 0, 0, 0);
    // 月・水・金の場合は当日を含める
    includeToday = isMonWedFri;
  }
  
  // 次の月・水・金を見つける（当日が月・水・金で20:00までなら当日を返す）
  const exportDate = getNextMonWedFri(baseDate, includeToday);
  
  // 無効な日付の場合は現在日時を使用
  if (isNaN(exportDate.getTime())) {
    console.warn('⚠️ Invalid exportDate in calculateExportScheduledDate, using current date');
    const fallbackDate = new Date();
    const year = fallbackDate.getFullYear();
    const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(fallbackDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  }
  
  // YYYY-MM-DD形式で返す
  try {
    const year = exportDate.getFullYear();
    const month = String(exportDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(exportDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  } catch (e) {
    console.warn('⚠️ Failed to format exportDate:', e);
    const fallbackDate = new Date();
    const year = fallbackDate.getFullYear();
    const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(fallbackDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  }
}

/**
 * 住所から都道府県と市区町村を抽出
 */
function parseAddress(address: string | undefined): { prefecture: string; city: string } {
  if (!address) return { prefecture: '', city: '' };
  
  // 都道府県のリスト
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];
  
  // 都道府県を抽出
  let prefecture = '';
  for (const pref of prefectures) {
    if (address.includes(pref)) {
      prefecture = pref;
      break;
    }
  }
  
  // 市区町村を抽出（都道府県の後の部分）
  let city = '';
  if (prefecture) {
    const afterPrefecture = address.split(prefecture)[1];
    if (afterPrefecture) {
      // 市区町村のパターン（市、区、町、村、郡など）
      const cityMatch = afterPrefecture.match(/^([^市区町村郡]+[市区町村郡])/);
      if (cityMatch) {
        city = cityMatch[1].trim();
      } else {
        // マッチしない場合は最初の部分を取得
        city = afterPrefecture.trim().split(/\s+/)[0];
      }
    }
  }
  
  return { prefecture, city };
}

/**
 * 地点情報をスプレッドシート行に変換
 */
export function convertPoiToSpreadsheetRow(
  poi: PoiInfo,
  project: Project,
  segment: Segment | undefined,
  visitMeasurementGroupId?: string
): SpreadsheetRow {
  const radius = parseRadius(poi.designated_radius);
  const { prefecture, city } = parseAddress(poi.address);
  
  // category_id: 99000000（00には指定半径の広さ）
  // 例: 半径50m -> 99000050, 半径100m -> 99000100
  const categoryId = `9900${String(radius).padStart(4, '0')}`;
  
  // エクスポート予定日を計算（地点登録日時から次の月・水・金を計算）
  // poi.createdが存在する場合はそれを使用、なければ現在日時を使用
  let requestDateTime: string | Date;
  if (poi.created) {
    const createdDate = new Date(poi.created);
    // 無効な日付の場合は現在日時を使用
    if (isNaN(createdDate.getTime())) {
      console.warn('⚠️ Invalid poi.created date, using current date:', poi.created);
      requestDateTime = new Date();
    } else {
      requestDateTime = poi.created;
    }
  } else {
    requestDateTime = new Date();
  }
  const createdDate = calculateExportScheduledDate(requestDateTime);
  
  // poi_id: TG地点の場合はsegment_id、来店計測地点の場合はvisit_measurement_group_id
  // スプレッドシートの同じカラムに出力されるため、どちらか一方は必須
  let poiIdValue: string;
  if (poi.poi_category === 'visit_measurement') {
    // 来店計測地点の場合: visit_measurement_group_idを使用
    poiIdValue = visitMeasurementGroupId || poi.visit_measurement_group_id || '';
  } else {
    // TG地点の場合: segment_idを使用（segmentオブジェクトから取得、なければpoi.segment_id）
    poiIdValue = segment?.segment_id || poi.segment_id || '';
  }
  
  return {
    category_id: categoryId,
    brand_name: project.advertiser_name || project.project_id,
    poi_id: poiIdValue,
    poi_name: poi.poi_name || '',
    latitude: poi.latitude,
    longitude: poi.longitude,
    prefecture: prefecture || poi.prefectures || '',
    city: city || poi.cities || '',
    setting_flag: 2,
    created: createdDate,
  };
}

/**
 * スプレッドシート行をCSV形式に変換
 */
export function convertToCSV(rows: SpreadsheetRow[]): string {
  if (rows.length === 0) return '';
  
  // ヘッダー
  const headers = [
    'category_id',
    'brand_name',
    'poi_id',
    'poi_name',
    'latitude',
    'longitude',
    'prefecture',
    'city',
    'setting_flag',
    'created',
  ];
  
  // データ行
  const dataRows = rows.map(row => [
    row.category_id,
    `"${row.brand_name}"`, // カンマを含む可能性があるため引用符で囲む
    row.poi_id,
    `"${row.poi_name}"`,
    row.latitude?.toString() || '',
    row.longitude?.toString() || '',
    row.prefecture,
    row.city,
    row.setting_flag.toString(),
    row.created,
  ]);
  
  // CSV形式に結合
  const csvLines = [
    headers.join(','),
    ...dataRows.map(row => row.join(',')),
  ];
  
  return csvLines.join('\n');
}

/**
 * CSVファイルをダウンロード
 */
export function downloadCSV(csvContent: string, filename: string = 'poi_export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  // ノードが存在することを確認してから削除
  if (link.parentNode) {
    document.body.removeChild(link);
  }
  
  URL.revokeObjectURL(url);
}

/**
 * スプレッドシート行をlocalStorageに保存（後で一括エクスポート用）
 */
const SPREADSHEET_STORAGE_KEY = 'spreadsheet_export_queue';

export function saveToExportQueue(row: SpreadsheetRow): void {
  try {
    const existing = localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    const queue: SpreadsheetRow[] = existing ? JSON.parse(existing) : [];
    queue.push(row);
    localStorage.setItem(SPREADSHEET_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving to export queue:', error);
  }
}

/**
 * エクスポートキューから全データを取得
 */
export function getExportQueue(): SpreadsheetRow[] {
  try {
    const existing = localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Error reading export queue:', error);
    return [];
  }
}

/**
 * エクスポートキューをクリア
 */
export function clearExportQueue(): void {
  localStorage.removeItem(SPREADSHEET_STORAGE_KEY);
}

/**
 * エクスポートキューをCSVファイルとしてダウンロード
 */
export function exportQueueToCSV(): void {
  const queue = getExportQueue();
  if (queue.length === 0) {
    alert('エクスポートするデータがありません');
    return;
  }
  
  const csv = convertToCSV(queue);
  const today = new Date();
  const filename = `poi_export_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.csv`;
  downloadCSV(csv, filename);
  
  // エクスポート後はキューをクリア（必要に応じてコメントアウト）
  // clearExportQueue();
}

/**
 * Google Apps Script経由でスプレッドシートに自動入力
 * 
 * 設定方法:
 * 1. Googleスプレッドシートを開く
 * 2. 拡張機能 > Apps Script を開く
 * 3. 以下のコードを貼り付けて保存:
 * 
 * ```javascript
 * function doPost(e) {
 *   try {
 *     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *     const data = JSON.parse(e.postData.contents);
 *     
 *     // ヘッダーが存在しない場合は追加
 *     if (sheet.getLastRow() === 0) {
 *       sheet.appendRow([
 *         'category_id', 'brand_name', 'poi_id', 'poi_name',
 *         'latitude', 'longitude', 'prefecture', 'city',
 *         'setting_flag', 'created'
 *       ]);
 *     }
 *     
 *     // データを追加
 *     data.forEach(row => {
 *       sheet.appendRow([
 *         row.category_id,
 *         row.brand_name,
 *         row.poi_id,
 *         row.poi_name,
 *         row.latitude || '',
 *         row.longitude || '',
 *         row.prefecture,
 *         row.city,
 *         row.setting_flag,
 *         row.created
 *       ]);
 *     });
 *     
 *     return ContentService.createTextOutput(JSON.stringify({ success: true, added: data.length }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   } catch (error) {
 *     return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * function doGet(e) {
 *   return ContentService.createTextOutput('Google Sheets API is ready');
 * }
 * ```
 * 
 * 4. デプロイ > 新しいデプロイ > 種類: ウェブアプリ
 * 5. 実行ユーザー: 自分、アクセスできるユーザー: 全員
 * 6. デプロイしてURLをコピー
 * 7. 環境変数 GOOGLE_APPS_SCRIPT_URL に設定
 */
export async function exportToGoogleSheets(
  rows: SpreadsheetRow[],
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  // 環境変数からURLを取得（開発環境ではモック）
  const GOOGLE_APPS_SCRIPT_URL = scriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
  
  // 開発環境またはURLが設定されていない場合はモック動作
  if (!GOOGLE_APPS_SCRIPT_URL || import.meta.env.MODE === 'development') {
    console.log('📊 スプレッドシート自動入力（モック）:', rows);
    console.log('💡 本番環境では環境変数 VITE_GOOGLE_APPS_SCRIPT_URL を設定してください');
    
    // モック環境ではlocalStorageに保存
    rows.forEach(row => saveToExportQueue(row));
    
    return {
      success: true,
      message: `モック環境: ${rows.length}件のデータをキューに保存しました（本番環境では自動的にスプレッドシートに追加されます）`,
    };
  }
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rows),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        message: `${result.added || rows.length}件のデータをスプレッドシートに追加しました`,
      };
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('スプレッドシートへの自動入力に失敗しました:', error);
    
    // エラー時はキューに保存（後で手動エクスポート可能）
    rows.forEach(row => saveToExportQueue(row));
    
    return {
      success: false,
      message: `スプレッドシートへの自動入力に失敗しました。データはキューに保存されました。エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * エクスポートキューをGoogleスプレッドシートに自動入力
 */
export async function exportQueueToGoogleSheets(
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const queue = getExportQueue();
  if (queue.length === 0) {
    return {
      success: false,
      message: 'エクスポートするデータがありません',
    };
  }
  
  const result = await exportToGoogleSheets(queue, scriptUrl);
  
  // 成功した場合はキューをクリア
  if (result.success) {
    clearExportQueue();
  }
  
  return result;
}

