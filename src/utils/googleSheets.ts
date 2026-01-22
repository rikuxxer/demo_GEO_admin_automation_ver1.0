/**
 * Google Sheets API クライアント
 * 地点格納依頼時にスプレッドシートに自動出力する
 */

import type { PoiInfo, Project, Segment } from '../types/schema';
import { calculateDataCoordinationDate } from './dataCoordinationDate';

// 環境変数から取得（.envファイルで設定）
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '';
const SHEET_NAME = 'シート1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_BACKEND_API = !!API_BASE_URL;

export interface SheetRow {
  category_id: string; // 99000000（00には指定半径の広さ）
  brand_id: string; // 空の可能性がある
  brand_name: string;
  poi_id: string;
  poi_name: string;
  latitude: number | string;
  longitude: number | string;
  prefecture: string;
  city: string;
  radius: string; // 半径の数値（m単位）
  polygon: string; // 空の可能性がある
  setting_flag: string;
  created: string; // YYYY/MM/DD形式
}

/**
 * Google Sheets APIが利用可能かチェック
 */
export function isGoogleSheetsAvailable(): boolean {
  return !!SPREADSHEET_ID && !!API_KEY;
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
 * 選択可能な半径のリスト（1000m以上）
 */
const SELECTABLE_RADIUS_VALUES = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

/**
 * 半径が選択可能な値かどうかを判定
 */
function isSelectableRadius(radius: number): boolean {
  return SELECTABLE_RADIUS_VALUES.includes(radius);
}

/**
 * 半径が自由入力範囲内かどうかを判定（0-999m）
 * 注意: 1000mは選択可能な値として扱うため、自由入力範囲には含めない
 */
function isFreeInputRadius(radius: number): boolean {
  return radius > 0 && radius < 1000;
}

/**
 * 日付をYYYY/MM/DD形式に変換
 */
function formatDateToYYYYMMDD(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * POIデータをスプレッドシート行データに変換
 */
export function convertPoiToSheetRow(
  poi: PoiInfo,
  project: Project,
  segment?: Segment
): SheetRow {
  // 都道府県・市区町村の抽出（住所から推定、または登録済みデータから取得）
  let prefecture = '';
  let city = '';
  
  if (poi.prefectures && poi.prefectures.length > 0) {
    prefecture = poi.prefectures[0];
  } else if (poi.address) {
    // 住所から都道府県を推定
    const prefMatch = poi.address.match(/^(北海道|.{2,3}[都道府県])/);
    if (prefMatch) {
      prefecture = prefMatch[1];
      // 市区町村を抽出（都道府県の後の部分）
      const afterPref = poi.address.substring(prefecture.length);
      const cityMatch = afterPref.match(/^(.+?[市区町村])/);
      if (cityMatch) {
        city = cityMatch[1];
      }
    }
  }
  
  if (poi.cities && poi.cities.length > 0) {
    city = poi.cities[0];
  }

  // 半径を数値に変換
  const radiusValue = parseRadius(poi.designated_radius || segment?.designated_radius);
  
  // データ連携予定日のロジックを使用してcreatedを計算
  // poi.createdが存在する場合はそれを使用、なければ現在日時を使用
  let requestDateTime: string;
  if (poi.created) {
    const createdDate = new Date(poi.created);
    if (isNaN(createdDate.getTime())) {
      requestDateTime = new Date().toISOString();
    } else {
      requestDateTime = poi.created;
    }
  } else {
    requestDateTime = new Date().toISOString();
  }

  // データ連携予定日を計算（YYYY-MM-DD形式）
  const coordinationDate = calculateDataCoordinationDate(requestDateTime);
  
  // YYYY-MM-DD形式をYYYY/MM/DD形式に変換
  const createdDateFormatted = formatDateToYYYYMMDD(coordinationDate);

  // 半径の入力方法に応じてcategory_id、radius、setting_flagを決定
  let categoryId: string;
  let radius: string;
  let settingFlag: string;

  if (radiusValue === 0) {
    // 半径が設定されていない場合
    categoryId = '';
    radius = '';
    settingFlag = poi.setting_flag || '2';
  } else if (isFreeInputRadius(radiusValue)) {
    // 自由入力範囲（0-1000m）の場合
    // category_id: 99000XXX（XXXは半径の値、4桁で0埋め）
    // radius: 空
    // setting_flag: 2
    categoryId = `9900${String(radiusValue).padStart(4, '0')}`;
    radius = '';
    settingFlag = '2';
  } else if (isSelectableRadius(radiusValue)) {
    // 選択可能な値（1000m以上）の場合
    // category_id: 空
    // radius: 選択した値
    // setting_flag: 4
    categoryId = '';
    radius = String(radiusValue);
    settingFlag = '4';
  } else {
    // その他の値（1000m超で選択可能な値以外）の場合
    // 選択可能な値に最も近い値に丸める、またはエラーとして扱う
    // ここでは選択可能な値に最も近い値を使用
    const closestSelectable = SELECTABLE_RADIUS_VALUES.reduce((prev, curr) => {
      return Math.abs(curr - radiusValue) < Math.abs(prev - radiusValue) ? curr : prev;
    });
    console.warn(`⚠️ 半径${radiusValue}mは選択可能な値ではありません。最も近い値${closestSelectable}mを使用します。`);
    categoryId = '';
    radius = String(closestSelectable);
    settingFlag = '4';
  }

  // poi_id: TG地点の場合はsegment_id、来店計測地点の場合はvisit_measurement_group_id
  // スプレッドシートの同じカラムに出力されるため、どちらか一方は必須
  let poiIdValue: string;
  if (poi.poi_category === 'visit_measurement') {
    // 来店計測地点の場合: visit_measurement_group_idを使用
    poiIdValue = poi.visit_measurement_group_id || '';
  } else {
    // TG地点の場合: segment_idを使用（segmentオブジェクトから取得、なければpoi.segment_id）
    poiIdValue = segment?.segment_id || poi.segment_id || '';
  }

  return {
    category_id: categoryId,
    brand_id: '', // 空
    brand_name: project.advertiser_name || '',
    poi_id: poiIdValue,
    poi_name: poi.poi_name || '',
    latitude: poi.latitude !== undefined && poi.latitude !== null ? String(poi.latitude) : '',
    longitude: poi.longitude !== undefined && poi.longitude !== null ? String(poi.longitude) : '',
    prefecture: prefecture || '', // 空の場合は空文字列
    city: city || '', // 空の場合は空文字列
    radius: radius, // 選択可能な値の場合のみ設定
    polygon: '', // 空
    setting_flag: settingFlag,
    created: createdDateFormatted, // YYYY/MM/DD形式
  };
}

/**
 * スプレッドシートに行を追加（テーブル蓄積付き）
 */
export async function appendRowsToSheetWithAccumulation(
  rows: SheetRow[],
  projectId: string,
  segmentId?: string,
  exportedBy?: string,
  exportedByName?: string
): Promise<{
  success: boolean;
  message: string;
  exportId?: string;
  rowsAdded?: number;
}> {
  // バックエンドAPIを使用する場合
  if (USE_BACKEND_API) {
    try {
      console.log('📤 バックエンドAPI経由でスプレッドシートに送信（テーブル蓄積付き）:', {
        rowCount: rows.length,
        projectId,
        segmentId,
      });

      const response = await fetch(`${API_BASE_URL}/api/sheets/export-with-accumulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows,
          projectId,
          segmentId,
          exportedBy,
          exportedByName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スプレッドシートへの出力に失敗しました');
      }

      const result = await response.json();
      console.log('✅ スプレッドシートに追加成功（テーブル蓄積済み）:', result);
      return result;
    } catch (error) {
      console.error('❌ バックエンドAPI エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // 直接Google Sheets APIを使用する場合（開発環境）
  // この場合はテーブル蓄積なしで従来通り
  return appendRowsToSheet(rows);
}

/**
 * スプレッドシートに行を追加（バックエンドAPI経由、または直接Google Sheets API v4使用）
 */
export async function appendRowsToSheet(rows: SheetRow[]): Promise<{
  success: boolean;
  message: string;
  rowsAdded?: number;
}> {
  // バックエンドAPIを使用する場合
  if (USE_BACKEND_API) {
    try {
      console.log('📤 バックエンドAPI経由でスプレッドシートに送信:', {
        rowCount: rows.length,
        sampleData: rows[0]
      });

      const response = await fetch(`${API_BASE_URL}/api/sheets/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スプレッドシートへの出力に失敗しました');
      }

      const result = await response.json();
      console.log('✅ スプレッドシートに追加成功:', result);
      return result;
    } catch (error) {
      console.error('❌ バックエンドAPI エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // 直接Google Sheets APIを使用する場合（開発環境またはAPI_BASE_URL未設定時）
  if (!isGoogleSheetsAvailable()) {
    const missingVars = [];
    if (!SPREADSHEET_ID) missingVars.push('VITE_GOOGLE_SPREADSHEET_ID');
    if (!API_KEY) missingVars.push('VITE_GOOGLE_SHEETS_API_KEY');
    
    console.warn('Google Sheets API が設定されていません:', missingVars.join(', '));
    return {
      success: false,
      message: `Google Sheets API が設定されていません。環境変数（${missingVars.join(', ')}）を確認してください。`,
    };
  }

  try {
    // データを2次元配列に変換（新しい形式）
    const values = rows.map(row => [
      row.category_id,
      row.brand_id,
      row.brand_name,
      row.poi_id,
      row.poi_name,
      row.latitude,
      row.longitude,
      row.prefecture,
      row.city,
      row.radius,
      row.polygon,
      row.setting_flag,
      row.created,
    ]);

    console.log('📤 スプレッドシートに送信:', {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      rowCount: rows.length,
      sampleData: rows[0]
    });

    // Google Sheets API v4 - append リクエスト
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error('Google Sheets API エラー:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Google Sheets に追加成功:', result);

    return {
      success: true,
      message: `${rows.length}件の地点情報をスプレッドシートに出力しました`,
      rowsAdded: rows.length,
    };
  } catch (error) {
    console.error('❌ Google Sheets API エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました';
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * ヘッダー行が存在するかチェックし、なければ追加
 */
export async function ensureHeaderRow(): Promise<boolean> {
  if (!isGoogleSheetsAvailable()) {
    return false;
  }

  try {
    // シートの最初の行を取得（新しい形式: 13列）
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:M1?key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // ヘッダーが存在しない、または空の場合
    if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
      // ヘッダー行を追加（新しい形式）
      const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
      
      await fetch(headerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            'category_id',
            'brand_id',
            'brand_name',
            'poi_id',
            'poi_name',
            'latitude',
            'longitude',
            'prefecture',
            'city',
            'radius',
            'polygon',
            'setting_flag',
            'created',
          ]],
        }),
      });

      console.log('✅ ヘッダー行を追加しました');
    }

    return true;
  } catch (error) {
    console.error('❌ ヘッダー行チェックエラー:', error);
    return false;
  }
}

/**
 * 複数POIを一括でスプレッドシートに出力
 */
export async function exportPoisToSheet(
  pois: PoiInfo[],
  project: Project,
  segments: Segment[],
  options?: {
    useAccumulation?: boolean;
    segmentId?: string;
    exportedBy?: string;
    exportedByName?: string;
    visitMeasurementGroups?: Array<{ group_id: string; group_name: string }>;
  }
): Promise<{
  success: boolean;
  message: string;
  rowsAdded?: number;
  exportId?: string;
  validationErrors?: Array<{ index: number; errors: Array<{ field: string; message: string }> }>;
}> {
  try {
    // ヘッダー行を確保（テーブル蓄積を使用しない場合のみ）
    if (!options?.useAccumulation) {
      await ensureHeaderRow();
    }

    // POIデータを変換
    const rows = pois.map(poi => {
      const segment = segments.find(s => s.segment_id === poi.segment_id);
      // 来店計測地点の場合はグループIDを使用
      const visitMeasurementGroupId = poi.poi_category === 'visit_measurement' 
        ? poi.visit_measurement_group_id 
        : undefined;
      return convertPoiToSheetRow(poi, project, segment, visitMeasurementGroupId);
    });

    // バリデーション
    const { validateSheetRows } = await import('./spreadsheetValidation');
    const { valid, errors } = validateSheetRows(rows);

    if (errors.length > 0) {
      const errorMessages = errors.map(({ index, errors: errs }) => {
        const poi = pois[index];
        const errorList = errs.map(e => `  - ${e.field}: ${e.message}`).join('\n');
        return `地点「${poi.poi_name || poi.poi_id}」 (${index + 1}行目):\n${errorList}`;
      }).join('\n\n');

      return {
        success: false,
        message: `バリデーションエラーが発生しました:\n\n${errorMessages}`,
        validationErrors: errors,
      };
    }

    // テーブル蓄積を使用する場合
    if (options?.useAccumulation && USE_BACKEND_API) {
      return await appendRowsToSheetWithAccumulation(
        valid,
        project.project_id,
        options.segmentId,
        options.exportedBy,
        options.exportedByName
      );
    }

    // スプレッドシートに追加（従来の方法）
    return await appendRowsToSheet(valid);
  } catch (error) {
    console.error('❌ POI出力エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました',
    };
  }
}

