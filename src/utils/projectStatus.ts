// 型の初期化順序の問題を回避するため、型インポートを削除
// import type { Project, Segment, PoiInfo } from '../types/schema';

/**
 * 案件ステータスの自動判定
 */

export type AutoProjectStatus = 
  | 'draft'               // 下書き
  | 'waiting_poi'         // 地点登録待ち
  | 'waiting_account_id'  // アカウントID登録待ち
  | 'waiting_service_id'  // サービスID登録待ち
  | 'in_progress'         // 進行中（データ連携依頼待ち）
  | 'link_requested'      // データ連携依頼済
  | 'linked'              // データ連携済み
  | 'expiring_soon'       // 期限切れ間近
  | 'waiting_input';      // 【UI用】入力待ち（地点登録、ID登録、S-ID登録の統合）

export interface ProjectStatusInfo {
  status: AutoProjectStatus;
  label: string;
  reason: string;
  segmentCount: number;
  poiCount: number;
  hasAllAccountIds: boolean;
  linkedSegmentCount: number;
}

/**
 * 案件のステータスを自動判定
 */
export function getAutoProjectStatus(
  project: any,
  allSegments: any[],
  allPois: any[]
): ProjectStatusInfo {
  // 型の初期化順序の問題を回避するため、実行時チェックを追加
  if (!project || !Array.isArray(allSegments) || !Array.isArray(allPois)) {
    return {
      status: 'draft',
      label: '下書き',
      reason: 'データが初期化されていません',
      segmentCount: 0,
      poiCount: 0,
      hasAllAccountIds: false,
      linkedSegmentCount: 0,
    };
  }
  
  // この案件に属するセグメントを取得
  const projectId = project?.project_id;
  if (!projectId) {
    return {
      status: 'draft',
      label: '下書き',
      reason: '案件IDが設定されていません',
      segmentCount: 0,
      poiCount: 0,
      hasAllAccountIds: false,
      linkedSegmentCount: 0,
    };
  }
  
  const projectSegments = allSegments.filter((s: any) => s?.project_id === projectId);
  const segmentCount = projectSegments.length;

  // セグメントIDリストを取得
  const segmentIds = projectSegments.map((s: any) => s?.segment_id).filter(Boolean);

  // この案件に属する地点を取得
  const projectPois = allPois.filter((p: any) => p?.segment_id && segmentIds.includes(p.segment_id));
  const poiCount = projectPois.length;

  // 各ステータス判定用フラグ
  
  // 1. アカウントIDチェック
  const hasAllAccountIds = projectSegments.length > 0 && 
    projectSegments.every((s: any) => s?.ads_account_id && String(s.ads_account_id).trim() !== '');

  // 2. サービスIDチェック
  const hasServiceId = !!(project?.universe_service_id && String(project.universe_service_id).trim() !== '');

  // 3. 地点登録チェック
  // 各セグメントに最低1つの地点があるか
  const allSegmentsHavePois = projectSegments.length > 0 && projectSegments.every((seg: any) => 
    projectPois.some((poi: any) => poi?.segment_id === seg?.segment_id)
  );

  // 4. データ連携ステータスチェック
  const linkedSegmentCount = projectSegments.filter((s: any) => s?.data_link_status === 'linked').length;
  const requestedSegmentCount = projectSegments.filter((s: any) => s?.data_link_status === 'requested').length;
  
  const isAllLinked = segmentCount > 0 && linkedSegmentCount === segmentCount;
  // 「依頼済」判定: 全てがrequested以上（linked含む）で、かつlinked完了していないものがある場合、
  // または一部でもrequestedがあれば「依頼済（対応中）」とみなすか？
  // ここでは「全セグメントが依頼済（または完了）」の状態を指すと定義する
  const isAllRequestedOrLinked = segmentCount > 0 && (linkedSegmentCount + requestedSegmentCount === segmentCount);

  // 5. 期限切れ間近チェック
  // データ連携済み、かつ有効期限が30日以内のものがあるか
  const today = new Date();
  const isExpiringSoon = isAllLinked && projectSegments.some((s: any) => {
    if (!s?.segment_expire_date) return false;
    const expireDate = new Date(s.segment_expire_date);
    const diffTime = expireDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0; // 30日以内かつ期限切れ前
  });


  // ステータス判定ロジック（優先順位順）

  // 1. 下書き
  if (segmentCount === 0) {
    return {
      status: 'draft',
      label: '下書き',
      reason: '配下のセグメントが未登録',
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 2. 期限切れ間近
  if (isExpiringSoon) {
    return {
      status: 'expiring_soon',
      label: '期限切れ間近',
      reason: '有効期限が1ヶ月以内に迫っています',
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 3. データ連携済み
  if (isAllLinked) {
    return {
      status: 'linked',
      label: 'データ連携済み',
      reason: '管理部のデータ連携が完了',
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 4. データ連携依頼済
  if (isAllRequestedOrLinked) {
    return {
      status: 'link_requested',
      label: 'データ連携依頼済',
      reason: 'データ連携を依頼中',
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 5. 地点登録待ち
  if (!allSegmentsHavePois) {
    const count = projectSegments.filter((seg: any) => !projectPois.some((poi: any) => poi?.segment_id === seg?.segment_id)).length;
    return {
      status: 'waiting_poi',
      label: '地点登録待ち',
      reason: `${count}件のセグメントで地点が未登録です`,
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 6. アカウントID登録待ち
  if (!hasAllAccountIds) {
    const count = projectSegments.filter((s: any) => !s?.ads_account_id || String(s.ads_account_id || '').trim() === '').length;
    return {
      status: 'waiting_account_id',
      label: 'アカウントID登録待ち',
      reason: `${count}件のセグメントでアカウントIDが未入力です`,
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 7. サービスID登録待ち
  if (!hasServiceId) {
    return {
      status: 'waiting_service_id',
      label: 'サービスID登録待ち',
      reason: '案件情報のサービスIDが未入力です',
      segmentCount,
      poiCount,
      hasAllAccountIds,
      linkedSegmentCount,
    };
  }

  // 8. 進行中（すべての入力完了、連携依頼待ち）
  return {
    status: 'in_progress',
    label: '進行中', // 「連携依頼待ち」の方が正確だが、ユーザー要望の階層構造を考慮して「進行中」とする
    reason: 'すべての項目が入力されています。データ連携依頼が可能です。',
    segmentCount,
    poiCount,
    hasAllAccountIds,
    linkedSegmentCount,
  };
}

/**
 * 案件リストをステータス別にカウント
 */
export function countProjectsByStatus(
  projects: any[],
  allSegments: any[],
  allPois: any[]
): Record<AutoProjectStatus | 'total', number> {
  const counts: Record<AutoProjectStatus | 'total', number> = {
    draft: 0,
    waiting_poi: 0,
    waiting_account_id: 0,
    waiting_service_id: 0,
    in_progress: 0,
    link_requested: 0,
    linked: 0,
    expiring_soon: 0,
    total: Array.isArray(projects) ? projects.length : 0,
  };

  if (!Array.isArray(projects) || !Array.isArray(allSegments) || !Array.isArray(allPois)) {
    return counts;
  }

  projects.forEach((project: any) => {
    try {
      const statusInfo = getAutoProjectStatus(project, allSegments, allPois);
      if (statusInfo && statusInfo.status) {
        counts[statusInfo.status]++;
      }
    } catch (error) {
      console.error('Error counting project status:', error);
    }
  });

  return counts;
}

/**
 * ステータスに応じた色を取得
 */
export function getStatusColor(status: AutoProjectStatus): {
  bg: string;
  text: string;
  badge: string;
} {
  switch (status) {
    case 'draft':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-600 border-gray-200',
      };
    case 'waiting_poi':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-50 text-orange-600 border-orange-200',
      };
    case 'waiting_account_id':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        badge: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      };
    case 'waiting_service_id':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        badge: 'bg-amber-50 text-amber-600 border-amber-200',
      };
    case 'in_progress':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        badge: 'bg-blue-50 text-blue-600 border-blue-200',
      };
    case 'link_requested':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        badge: 'bg-purple-50 text-purple-600 border-purple-200',
      };
    case 'linked':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        badge: 'bg-sky-50 text-sky-600 border-sky-200',
      };
    case 'expiring_soon':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        badge: 'bg-red-50 text-red-600 border-red-200',
      };
    case 'waiting_input':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-50 text-orange-600 border-orange-200',
      };
  }
}

/**
 * ステータスに応じたアイコンを取得
 */
export function getStatusIcon(status: AutoProjectStatus): string {
  switch (status) {
    case 'draft': return '✏️';
    case 'waiting_poi': return '📍';
    case 'waiting_account_id': return '🆔';
    case 'waiting_service_id': return '🏢';
    case 'in_progress': return '👍';
    case 'link_requested': return '🔄';
    case 'linked': return '✅';
    case 'expiring_soon': return '⚠️';
    case 'waiting_input': return '⚠️';
  }
}

/**
 * ステータスに応じたラベルを取得
 */
export function getStatusLabel(status: AutoProjectStatus): string {
  switch (status) {
    case 'draft': return '下書き';
    case 'waiting_poi': return '地点登録待ち';
    case 'waiting_account_id': return 'アカウントID登録待ち';
    case 'waiting_service_id': return 'S-ID登録待ち';
    case 'in_progress': return '連携依頼待ち';
    case 'link_requested': return '連携依頼済';
    case 'linked': return '連携完了';
    case 'expiring_soon': return '期限切れ間近';
    case 'waiting_input': return '入力不備あり';
  }
}
