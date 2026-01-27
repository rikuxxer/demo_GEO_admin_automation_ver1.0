// 型の初期化順序の問題を回避するため、型インポートを削除
// import type { EditRequest, Project, Segment, PoiInfo } from '../types/schema';

/**
 * 案件フィールドで承認が不要なフィールド
 * これらのフィールドは直接編集可能
 */
export const PROJECT_DIRECT_EDIT_FIELDS = [
  'service_id',
  'memo',
  'internal_notes',
  'universe_service_id',
  'universe_service_name',
  'remarks',
] as const;

/**
 * 案件フィールドで承認が必要なフィールド
 * これらのフィールドの変更には管理部承認が必要
 */
export const PROJECT_APPROVAL_REQUIRED_FIELDS = [
  'advertiser_name',
  'agency_name',
  'appeal_point',
  'person_in_charge',
  'sub_person_in_charge',
] as const;

/**
 * 指定されたフィールドが直接編集可能かチェック
 * @param fieldName フィールド名
 * @returns 直接編集可能な場合true
 */
export function isDirectEditField(fieldName: string): boolean {
  return PROJECT_DIRECT_EDIT_FIELDS.includes(fieldName as any);
}

/**
 * 指定されたフィールドが承認必要かチェック
 * @param fieldName フィールド名
 * @returns 承認が必要な場合true
 */
export function isApprovalRequiredField(fieldName: string): boolean {
  return PROJECT_APPROVAL_REQUIRED_FIELDS.includes(fieldName as any);
}

/**
 * 修正依頼が必要な状態かチェック
 * 
 * @param type 修正対象の種別
 * @param data 修正対象のデータ
 * @param allSegments すべてのセグメント（案件の場合のみ必要）
 * @param parentSegment 親セグメント（地点の場合のみ必要）
 * @returns 修正依頼が必要な場合true
 */
export function requiresEditRequest(
  type: 'project' | 'segment' | 'poi',
  data: any,
  allSegments?: any[],
  parentSegment?: any
): boolean {
  switch (type) {
    case 'project': {
      // 案件: 配下のセグメントが1件以上存在する場合
      if (!data || !data.project_id) return false;
      const projectSegments = allSegments?.filter((s: any) => s?.project_id === data.project_id) || [];
      return projectSegments.length >= 1;
    }
    
    case 'segment': {
      // セグメント: 地点格納依頼後（格納対応中または格納完了）
      if (!data) return false;
      return data.location_request_status === 'storing' || 
             data.location_request_status === 'completed';
    }
    
    case 'poi': {
      // 地点: セグメントの地点格納依頼後
      if (!parentSegment) return false;
      return parentSegment.location_request_status === 'storing' || 
             parentSegment.location_request_status === 'completed';
    }
    
    default:
      return false;
  }
}

/**
 * 変更内容をdiff形式に変換
 * 
 * @param before 変更前のデータ
 * @param after 変更後のデータ
 * @returns 変更内容のdiff（変更があった項目のみ）
 */
export function createChangeDiff(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  
  // 変更後のデータの各キーをチェック
  for (const key of Object.keys(after)) {
    // 変更前と変更後で値が異なる場合のみ記録
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }
  
  return changes;
}

/**
 * 修正依頼を適用
 * 
 * @param request 修正依頼
 * @param currentData 現在のデータ
 * @returns 変更を適用した新しいデータ
 */
export function applyEditRequest(
  request: any,
  currentData: Record<string, any>
): Record<string, any> {
  const updatedData = { ...currentData };
  
  // 変更内容を適用
  for (const [key, change] of Object.entries(request.changes)) {
    updatedData[key] = change.after;
  }
  
  return updatedData;
}

/**
 * 修正依頼の競合チェック
 * 
 * 同じ対象に対する承認待ちの修正依頼があるかチェック
 * 
 * @param newRequest 新しい修正依頼
 * @param pendingRequests 承認待ちの修正依頼一覧
 * @returns 競合がある場合true
 */
export function checkEditRequestConflict(
  newRequest: Partial<any>,
  pendingRequests: any[]
): {
  hasConflict: boolean;
  conflictingRequests: any[];
} {
  const conflictingRequests = pendingRequests.filter(req => {
    // 同じ対象に対する依頼かチェック
    if (req.target_id !== newRequest.target_id || req.request_type !== newRequest.request_type) {
      return false;
    }
    
    // 同じ項目を変更しようとしているかチェック
    if (!newRequest.changes) return false;
    
    const newChangedKeys = Object.keys(newRequest.changes);
    const existingChangedKeys = Object.keys(req.changes);
    
    // 共通する変更項目があるか
    const hasCommonKeys = newChangedKeys.some(key => existingChangedKeys.includes(key));
    
    return hasCommonKeys;
  });
  
  return {
    hasConflict: conflictingRequests.length > 0,
    conflictingRequests,
  };
}

/**
 * 修正依頼IDを生成
 * 
 * @returns 修正依頼ID（例: REQ_20241213_00001）
 */
export function generateEditRequestId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime();
  const random = String(timestamp).slice(-5);
  
  return `REQ_${year}${month}${day}_${random}`;
}

/**
 * 変更内容を人間が読みやすい形式に変換
 * 
 * @param changes 変更内容
 * @param type 修正対象の種別
 * @returns 表示用のラベル付き変更内容
 */
export function formatChangesForDisplay(
  changes: Record<string, { before: any; after: any }> | undefined | null,
  type: 'project' | 'segment' | 'poi'
): Array<{ label: string; before: string; after: string }> {
  if (!changes) {
    return [];
  }
  
  const labelMap = getFieldLabelMap(type);
  
  return Object.entries(changes).map(([key, change]) => ({
    label: labelMap[key] || key,
    before: formatValue(change.before),
    after: formatValue(change.after),
  }));
}

/**
 * フィールド名のラベルマップを取得
 */
function getFieldLabelMap(type: 'project' | 'segment' | 'poi'): Record<string, string> {
  const commonLabels: Record<string, string> = {
    // 案件フィールド
    advertiser_name: '広告主法人名',
    agency_name: '代理店名',
    appeal_point: '訴求内容',
    universe_service_id: 'UNIVERSEサービスID',
    universe_service_name: 'UNIVERSEサービス名',
    delivery_start_date: '配信開始日',
    delivery_end_date: '配信終了日',
    person_in_charge: '主担当者',
    sub_person_in_charge: '副担当者',
    remarks: '備考',
    
    // セグメントフィールド
    segment_name: 'セグメント名',
    media_id: '配信媒体',
    ads_account_id: 'AdsアカウントID',
    designated_radius: '指定半径',
    extraction_period: '抽出期間',
    extraction_period_type: '抽出期間タイプ',
    extraction_start_date: '抽出開始日',
    extraction_end_date: '抽出終了日',
    attribute: '属性',
    detection_count: '検知回数',
    detection_time_start: '検知時間（開始）',
    detection_time_end: '検知時間（終了）',
    stay_time: '滞在時間',
    
    // 地点フィールド
    poi_name: '地点名',
    address: '住所',
    latitude: '緯度',
    longitude: '経度',
    prefectures: '都道府県',
    cities: '市区町村',
  };
  
  return commonLabels;
}

/**
 * 値を表示用にフォーマット
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '（未設定）';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'boolean') {
    return value ? 'はい' : 'いいえ';
  }
  
  return String(value);
}

/**
 * 修正依頼のバリデーション
 * 
 * @param request 修正依頼
 * @returns バリデーション結果
 */
export function validateEditRequest(
  request: Partial<any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 必須項目チェック
  if (!request.request_type) {
    errors.push('修正対象の種別が指定されていません');
  }
  
  if (!request.target_id) {
    errors.push('修正対象のIDが指定されていません');
  }
  
  if (!request.request_reason || request.request_reason.trim().length < 10) {
    errors.push('修正理由を10文字以上入力してください');
  }
  
  if (!request.changes || Object.keys(request.changes).length === 0) {
    errors.push('変更内容が指定されていません');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 修正依頼のステータスに応じた色を取得
 */
export function getEditRequestStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colorMap = {
    pending: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    approved: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    withdrawn: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
  };
  
  return colorMap[status];
}

/**
 * 営業が案件を編集する権限があるかチェック
 * 
 * @param user ユーザー情報
 * @param project 案件情報
 * @returns 編集権限がある場合true
 */
export function canEditProject(
  user: { role: string; name: string } | null,
  project: any
): boolean {
  // 管理者は常に編集可能
  if (user?.role === 'admin') {
    return true;
  }
  
  // 営業の場合、主担当または副担当の案件のみ編集可能
  if (user?.role === 'sales') {
    return (
      project.person_in_charge === user.name ||
      project.sub_person_in_charge === user.name
    );
  }
  
  return false;
}

/**
 * 直接編集が可能かチェック（修正依頼が不要か）
 * 
 * @param type 修正対象の種別
 * @param data 修正対象のデータ
 * @param allSegments すべてのセグメント（案件の場合のみ必要）
 * @param parentSegment 親セグメント（地点の場合のみ必要）
 * @returns 直接編集可能な場合true
 */
export function canDirectEdit(
  type: 'project' | 'segment' | 'poi',
  data: any,
  allSegments?: any[],
  parentSegment?: any
): boolean {
  return !requiresEditRequest(type, data, allSegments, parentSegment);
}

/**
 * 営業が案件を閲覧する権限があるかチェック
 * 
 * ビジネスルール:
 * - 管理者: すべての案件を閲覧可能
 * - 営業:
 *   - 自身が担当または副担当の案件: すべて閲覧可能（下書き、進行中、連携完了）
 *   - 他の営業の案件: データ連携が完了している場合のみ閲覧可能（連携完了のみ）
 * 
 * @param user ユーザー情報
 * @param project 案件情報
 * @param projectStatus 案件ステータス (AutoProjectStatus型)
 * @returns 閲覧権限がある場合true
 */
export function canViewProject(
  user: { role: string; name: string } | null,
  project: any,
  projectStatus: string
): boolean {
  // 型の初期化順序の問題を回避するため、実行時チェックを追加
  if (!user || !project || !projectStatus) {
    return false;
  }
  
  // 管理者は常に閲覧可能
  if (user.role === 'admin') {
    return true;
  }
  
  // 営業の場合
  if (user.role === 'sales') {
    // 自身が主担当または副担当の案件の場合、すべてのステータスで閲覧可能
    const isAssigned = 
      project?.person_in_charge === user.name ||
      project?.sub_person_in_charge === user.name;
    
    if (isAssigned) {
      return true;
    }
    
    // 他の営業の案件の場合、連携完了のみ閲覧可能
    return projectStatus === 'linked';
  }
  
  return false;
}
