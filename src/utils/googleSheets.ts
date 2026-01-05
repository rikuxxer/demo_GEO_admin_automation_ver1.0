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
  
  // category_id: 99000000（00には指定半径の広さ）
  // 例: 半径50m -> 99000050, 半径100m -> 99000100
  const categoryId = `9900${String(radiusValue).padStart(4, '0')}`;

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

  return {
    category_id: categoryId,
    brand_id: '', // 空
    brand_name: project.advertiser_name || '',
    poi_id: poi.location_id || poi.poi_id || poi.segment_id || '',
    poi_name: poi.poi_name,
    latitude: poi.latitude !== undefined ? poi.latitude : '',
    longitude: poi.longitude !== undefined ? poi.longitude : '',
    prefecture,
    city,
    radius: radiusValue > 0 ? String(radiusValue) : '',
    polygon: '', // 空
    setting_flag: poi.setting_flag || '2',
    created: createdDateFormatted, // YYYY/MM/DD形式
  };
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
  segments: Segment[]
): Promise<{
  success: boolean;
  message: string;
  rowsAdded?: number;
  validationErrors?: Array<{ index: number; errors: Array<{ field: string; message: string }> }>;
}> {
  try {
    // ヘッダー行を確保
    await ensureHeaderRow();

    // POIデータを変換
    const rows = pois.map(poi => {
      const segment = segments.find(s => s.segment_id === poi.segment_id);
      return convertPoiToSheetRow(poi, project, segment);
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

    // スプレッドシートに追加
    return await appendRowsToSheet(valid);
  } catch (error) {
    console.error('❌ POI出力エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました',
    };
  }
}

