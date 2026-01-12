/**
 * フォームバリデーションとエラー検知のためのユーティリティ
 */

import { Segment } from '../types/schema';

/**
 * 配信媒体の選択可能状態を検証
 */
export interface MediaValidationResult {
  isValid: boolean;
  availableMedia: string[];
  disabledMedia: string[];
  errors: string[];
  warnings: string[];
}

/**
 * セグメントの配信媒体選択の妥当性をチェック
 */
export function validateMediaSelection(
  selectedMediaIds: string[],
  existingSegments: Segment[],
  currentSegmentId?: string
): MediaValidationResult {
  const result: MediaValidationResult = {
    isValid: true,
    availableMedia: [],
    disabledMedia: [],
    errors: [],
    warnings: [],
  };

  // 全媒体の選択可能性をチェック（同一セグメント内のみ）
  const allMedia = ['universe', 'tver_sp', 'tver_ctv'];

  allMedia.forEach(mediaValue => {
    // 既に選択されている媒体は常に選択可能
    if (selectedMediaIds.includes(mediaValue)) {
      result.availableMedia.push(mediaValue);
      return;
    }

    let isDisabled = false;
    let reason = '';

    // TVer(CTV)は他の媒体と同時選択不可（CTV専用セグメントを作成する必要がある）
    if (mediaValue === 'tver_ctv') {
      const hasUniverse = selectedMediaIds.includes('universe');
      const hasTverSP = selectedMediaIds.includes('tver_sp');
      if (hasUniverse || hasTverSP) {
        isDisabled = true;
        reason = 'TVer(CTV)はCTV専用セグメントを作成してください。UNIVERSEやTVer(SP)と同時に選択できません。';
      }
    }
    
    // UNIVERSEまたはTVer(SP)が選択されている場合、TVer(CTV)は選択不可
    if (mediaValue === 'universe' || mediaValue === 'tver_sp') {
      const hasTverCTV = selectedMediaIds.includes('tver_ctv');
      if (hasTverCTV) {
        isDisabled = true;
        reason = 'TVer(CTV)が選択されているため、他の媒体と同時に選択できません。TVer(CTV)はCTV専用セグメントを作成してください。';
      }
    }

    if (isDisabled) {
      result.disabledMedia.push(mediaValue);
      result.warnings.push(`${mediaValue}: ${reason}`);
    } else {
      result.availableMedia.push(mediaValue);
    }
  });

  // 選択媒体が0の場合はエラー
  if (selectedMediaIds.length === 0) {
    result.isValid = false;
    result.errors.push('少なくとも1つの配信媒体を選択してください');
  }

  // TVer(CTV)と他の媒体（UNIVERSE、TVer(SP)）が同時に選択されている場合はエラー
  const hasUniverse = selectedMediaIds.includes('universe');
  const hasTverSP = selectedMediaIds.includes('tver_sp');
  const hasTverCTV = selectedMediaIds.includes('tver_ctv');
  
  if (hasTverCTV && (hasUniverse || hasTverSP)) {
    result.isValid = false;
    result.errors.push(
      'TVer(CTV)はCTV専用セグメントを作成してください。UNIVERSEやTVer(SP)と同時に選択できません。'
    );
  }
  
  // UNIVERSEとTVer(SP)の同時選択は許可

  return result;
}

/**
 * セグメント全体のバリデーション
 */
export interface SegmentValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export function validateSegment(
  segment: Partial<Segment>,
  existingSegments: Segment[],
  poiCount: number
): SegmentValidationResult {
  const result: SegmentValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // 必須フィールドチェック
  const mediaIds = Array.isArray(segment.media_id) ? segment.media_id : [];
  
  if (mediaIds.length === 0) {
    result.errors.push({
      field: 'media_id',
      message: '配信媒体を選択してください',
    });
    result.isValid = false;
  }

  if (!segment.data_link_status) {
    result.errors.push({
      field: 'data_link_status',
      message: 'データ連携ステータスを選択してください',
    });
    result.isValid = false;
  }

  if (!segment.location_request_status) {
    result.errors.push({
      field: 'location_request_status',
      message: '地点依頼ステータスを選択してください',
    });
    result.isValid = false;
  }

  // 配信媒体の妥当性チェック
  const mediaValidation = validateMediaSelection(
    mediaIds,
    existingSegments,
    segment.segment_id
  );

  if (!mediaValidation.isValid) {
    mediaValidation.errors.forEach(error => {
      result.errors.push({ field: 'media_id', message: error });
    });
    result.isValid = false;
  }

  mediaValidation.warnings.forEach(warning => {
    result.warnings.push({ field: 'media_id', message: warning });
  });

  // 連携依頼確定時のチェック
  if (segment.request_confirmed) {
    if (poiCount === 0) {
      result.errors.push({
        field: 'request_confirmed',
        message: '地点が登録されていないため連携依頼を確定できません',
      });
      result.isValid = false;
    }

    if (!segment.ads_account_id) {
      result.errors.push({
        field: 'ads_account_id',
        message: '連携依頼確定にはAdsアカウントIDが必要です',
      });
      result.isValid = false;
    }

    if (!segment.data_link_scheduled_date) {
      result.errors.push({
        field: 'data_link_scheduled_date',
        message: '連携依頼確定にはデータ連携予定日が必要です',
      });
      result.isValid = false;
    }
  }

  return result;
}

/**
 * 開発モード用のデバッグログ
 */
export function logValidationDebug(
  componentName: string,
  data: any,
  validationResult: any
) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 [${componentName}] Validation Debug`);
    console.log('Data:', data);
    console.log('Validation Result:', validationResult);
    
    // 複数のバリデーション結果を処理する場合
    if (validationResult && typeof validationResult === 'object') {
      // mediaとsegmentのような複数の結果がある場合
      if ('media' in validationResult || 'segment' in validationResult) {
        if (validationResult.media) {
          if (!validationResult.media.isValid && validationResult.media.errors) {
            console.log('❌ Media Validation Errors:', validationResult.media.errors);
          }
          if (validationResult.media.warnings?.length > 0) {
            console.log('⚠️ Media Validation Warnings:', validationResult.media.warnings);
          }
        }
        if (validationResult.segment) {
          if (!validationResult.segment.isValid && validationResult.segment.errors) {
            console.log('❌ Segment Validation Errors:', validationResult.segment.errors);
          }
          if (validationResult.segment.warnings?.length > 0) {
            console.log('⚠️ Segment Validation Warnings:', validationResult.segment.warnings);
          }
        }
      }
      // 単一のバリデーション結果の場合
      else if ('isValid' in validationResult) {
        if (!validationResult.isValid && validationResult.errors) {
          console.log('❌ Validation Errors:', validationResult.errors);
        }
        if (validationResult.warnings?.length > 0) {
          console.log('⚠️ Validation Warnings:', validationResult.warnings);
        }
      }
    }
    
    console.groupEnd();
  }
}

/**
 * エラーを使いやすい形式に変換
 */
export function formatValidationErrors(
  errors: { field: string; message: string }[]
): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('\n');
}
