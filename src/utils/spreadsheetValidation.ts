/**
 * スプレッドシート出力時のバリデーション
 */

import type { SheetRow } from './googleSheets';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * setting_flagに応じた必須フィールドのバリデーション
 */
export function validateSheetRow(row: SheetRow): ValidationError[] {
  const errors: ValidationError[] = [];
  const settingFlag = parseInt(row.setting_flag || '0');

  // 共通の必須フィールド
  if (!row.poi_name || row.poi_name.trim() === '') {
    errors.push({ field: 'poi_name', message: '施設名は必須です' });
  }
  if (!row.setting_flag || !['1', '2', '4', '5', '6', '7', '8'].includes(row.setting_flag)) {
    errors.push({ field: 'setting_flag', message: '設定区分は必須です（1, 2, 4, 5, 6, 7, 8のいずれか）' });
  }
  if (!row.created || row.created.trim() === '') {
    errors.push({ field: 'created', message: '記入日は必須です' });
  }

  // setting_flag=1: 既存のPOIマスタに存在する
  if (settingFlag === 1) {
    if (!row.brand_name || row.brand_name.trim() === '') {
      errors.push({ field: 'brand_name', message: 'ブランド名は必須です（setting_flag=1の場合）' });
    }
    if (!row.prefecture || row.prefecture.trim() === '') {
      errors.push({ field: 'prefecture', message: '都道府県は必須です（setting_flag=1の場合）' });
    }
  }

  // setting_flag=2: 弊社のPOIマスタに存在しない（緯度経度を入力）
  if (settingFlag === 2) {
    if (!row.latitude || row.latitude === '') {
      errors.push({ field: 'latitude', message: '緯度は必須です（setting_flag=2の場合）' });
    }
    if (!row.longitude || row.longitude === '') {
      errors.push({ field: 'longitude', message: '経度は必須です（setting_flag=2の場合）' });
    }
    if (!row.prefecture || row.prefecture.trim() === '') {
      errors.push({ field: 'prefecture', message: '都道府県は必須です（setting_flag=2の場合）' });
    }
  }

  // setting_flag=4: 任意半径で指定（緯度経度、半径を入力）
  if (settingFlag === 4) {
    if (!row.latitude || row.latitude === '') {
      errors.push({ field: 'latitude', message: '緯度は必須です（setting_flag=4の場合）' });
    }
    if (!row.longitude || row.longitude === '') {
      errors.push({ field: 'longitude', message: '経度は必須です（setting_flag=4の場合）' });
    }
    if (!row.radius || row.radius.trim() === '') {
      errors.push({ field: 'radius', message: '半径は必須です（setting_flag=4の場合）' });
    } else {
      const radiusNum = parseInt(row.radius);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 10000) {
        errors.push({ field: 'radius', message: '半径は1-10000の範囲で入力してください（setting_flag=4の場合）' });
      }
    }
  }

  // setting_flag=5: ポリゴン指定
  if (settingFlag === 5) {
    if (!row.latitude || row.latitude === '') {
      errors.push({ field: 'latitude', message: '緯度は必須です（setting_flag=5の場合、半角カンマ区切り）' });
    }
    if (!row.longitude || row.longitude === '') {
      errors.push({ field: 'longitude', message: '経度は必須です（setting_flag=5の場合、半角カンマ区切り）' });
    }
    if (!row.polygon || row.polygon.trim() === '') {
      errors.push({ field: 'polygon', message: 'ポリゴンは必須です（setting_flag=5の場合）' });
    }
  }

  // setting_flag=6: 市区町村リストから指定
  if (settingFlag === 6) {
    if (!row.prefecture || row.prefecture.trim() === '') {
      errors.push({ field: 'prefecture', message: '都道府県は必須です（setting_flag=6の場合）' });
    }
  }

  // setting_flag=7: 指定した緯度経度半径の居住者を抽出
  if (settingFlag === 7) {
    if (!row.latitude || row.latitude === '') {
      errors.push({ field: 'latitude', message: '緯度は必須です（setting_flag=7の場合）' });
    }
    if (!row.longitude || row.longitude === '') {
      errors.push({ field: 'longitude', message: '経度は必須です（setting_flag=7の場合）' });
    }
    if (!row.radius || row.radius.trim() === '') {
      errors.push({ field: 'radius', message: '半径は必須です（setting_flag=7の場合）' });
    } else {
      const radiusNum = parseInt(row.radius);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 10000) {
        errors.push({ field: 'radius', message: '半径は1-10000の範囲で入力してください（setting_flag=7の場合）' });
      }
    }
  }

  // setting_flag=8: 指定した緯度経度半径の勤務者を抽出
  if (settingFlag === 8) {
    if (!row.latitude || row.latitude === '') {
      errors.push({ field: 'latitude', message: '緯度は必須です（setting_flag=8の場合）' });
    }
    if (!row.longitude || row.longitude === '') {
      errors.push({ field: 'longitude', message: '経度は必須です（setting_flag=8の場合）' });
    }
    if (!row.radius || row.radius.trim() === '') {
      errors.push({ field: 'radius', message: '半径は必須です（setting_flag=8の場合）' });
    } else {
      const radiusNum = parseInt(row.radius);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 10000) {
        errors.push({ field: 'radius', message: '半径は1-10000の範囲で入力してください（setting_flag=8の場合）' });
      }
    }
  }

  return errors;
}

/**
 * 複数のSheetRowをバリデーション
 */
export function validateSheetRows(rows: SheetRow[]): { valid: SheetRow[]; errors: Array<{ index: number; errors: ValidationError[] }> } {
  const valid: SheetRow[] = [];
  const errors: Array<{ index: number; errors: ValidationError[] }> = [];

  rows.forEach((row, index) => {
    const validationErrors = validateSheetRow(row);
    if (validationErrors.length === 0) {
      valid.push(row);
    } else {
      errors.push({ index, errors: validationErrors });
    }
  });

  return { valid, errors };
}

