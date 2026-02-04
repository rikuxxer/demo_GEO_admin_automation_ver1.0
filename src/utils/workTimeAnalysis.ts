import type { ChangeHistory } from '../types/schema';
import { bigQueryService } from './bigquery';

/**
 * 変更履歴から工数分析を行うユーティリティ
 */

export interface WorkTimeStats {
  entityType: 'project' | 'segment' | 'poi';
  action: 'create' | 'update' | 'delete';
  averageTime: number; // 平均時間（分）
  minTime: number; // 最小時間（分）
  maxTime: number; // 最大時間（分）
  medianTime: number; // 中央値（分）
  count: number; // サンプル数
  standardDeviation: number; // 標準偏差（分）
}

export interface OperationTimeStats {
  projectCreation: WorkTimeStats | null;
  segmentCreation: WorkTimeStats | null;
  poiCreation: WorkTimeStats | null;
  projectUpdate: WorkTimeStats | null;
  segmentUpdate: WorkTimeStats | null;
  poiUpdate: WorkTimeStats | null;
}

/**
 * 変更履歴から所要時間を計算
 * 連続した操作の時間差から推定
 */
function calculateOperationTime(histories: ChangeHistory[]): Map<string, number[]> {
  const times = new Map<string, number[]>();
  
  // エンティティ種別と操作タイプでグループ化
  const grouped = new Map<string, ChangeHistory[]>();
  
  histories.forEach(history => {
    const key = `${history.entity_type}_${history.action}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(history);
  });
  
  // 各グループで時間差を計算
  grouped.forEach((groupHistories, key) => {
    // 同じproject_idでソート
    const sorted = groupHistories.sort((a, b) => {
      const dateA = new Date(a.changed_at).getTime();
      const dateB = new Date(b.changed_at).getTime();
      return dateA - dateB;
    });
    
    // 同じエンティティの連続操作を検出
    const entityGroups = new Map<string, ChangeHistory[]>();
    sorted.forEach(h => {
      const entityKey = `${h.entity_type}_${h.entity_id}`;
      if (!entityGroups.has(entityKey)) {
        entityGroups.set(entityKey, []);
      }
      entityGroups.get(entityKey)!.push(h);
    });
    
    // 各エンティティの操作時間を計算
    entityGroups.forEach((entityHistories) => {
      if (entityHistories.length >= 2) {
        // 最初と最後の操作の時間差
        const first = new Date(entityHistories[0].changed_at).getTime();
        const last = new Date(entityHistories[entityHistories.length - 1].changed_at).getTime();
        const timeDiff = (last - first) / (1000 * 60); // 分単位
        
        if (timeDiff > 0 && timeDiff < 1440) { // 0分以上、24時間未満
          if (!times.has(key)) {
            times.set(key, []);
          }
          times.get(key)!.push(timeDiff);
        }
      }
    });
  });
  
  return times;
}

/**
 * 統計情報を計算
 */
function calculateStats(times: number[]): WorkTimeStats | null {
  if (times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / sorted.length;
  
  // 標準偏差
  const variance = sorted.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / sorted.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 中央値
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  return {
    entityType: 'project', // 後で設定
    action: 'create', // 後で設定
    averageTime: Math.round(average * 100) / 100,
    minTime: Math.round(sorted[0] * 100) / 100,
    maxTime: Math.round(sorted[sorted.length - 1] * 100) / 100,
    medianTime: Math.round(median * 100) / 100,
    count: sorted.length,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
  };
}

/**
 * 案件登録時間を計算（project_registration_started_atを使用）
 */
function calculateProjectRegistrationTime(histories: ChangeHistory[], projects: any[]): number[] {
  const times: number[] = [];
  
  // 案件作成履歴を取得
  const projectCreations = histories.filter(h => 
    h.entity_type === 'project' && h.action === 'create'
  );
  
  projectCreations.forEach(history => {
    const project = projects.find(p => p.project_id === history.entity_id);
    if (project && project.project_registration_started_at) {
      const startTime = new Date(project.project_registration_started_at).getTime();
      const endTime = new Date(history.changed_at).getTime();
      const timeDiff = (endTime - startTime) / (1000 * 60); // 分単位
      
      if (timeDiff > 0 && timeDiff < 1440) { // 0分以上、24時間未満
        times.push(timeDiff);
      }
    }
  });
  
  return times;
}

/**
 * セグメント登録時間を計算
 * 案件作成からセグメント作成までの時間差を推定
 */
function calculateSegmentRegistrationTime(histories: ChangeHistory[]): number[] {
  const times: number[] = [];
  
  // プロジェクトごとにグループ化
  const projectGroups = new Map<string, ChangeHistory[]>();
  histories.forEach(h => {
    if (!projectGroups.has(h.project_id)) {
      projectGroups.set(h.project_id, []);
    }
    projectGroups.get(h.project_id)!.push(h);
  });
  
  projectGroups.forEach((projectHistories) => {
    // ソート
    const sorted = projectHistories.sort((a, b) => {
      const dateA = new Date(a.changed_at).getTime();
      const dateB = new Date(b.changed_at).getTime();
      return dateA - dateB;
    });
    
    // 案件作成とセグメント作成のペアを探す
    const projectCreation = sorted.find(h => h.entity_type === 'project' && h.action === 'create');
    const segmentCreations = sorted.filter(h => h.entity_type === 'segment' && h.action === 'create');
    
    if (projectCreation && segmentCreations.length > 0) {
      segmentCreations.forEach(segmentCreation => {
        const projectTime = new Date(projectCreation.changed_at).getTime();
        const segmentTime = new Date(segmentCreation.changed_at).getTime();
        const timeDiff = (segmentTime - projectTime) / (1000 * 60); // 分単位
        
        if (timeDiff > 0 && timeDiff < 1440) { // 0分以上、24時間未満
          times.push(timeDiff);
        }
      });
    }
  });
  
  return times;
}

/**
 * 地点登録時間を計算
 * セグメント作成から地点作成までの時間差を推定
 */
function calculatePoiRegistrationTime(histories: ChangeHistory[]): number[] {
  const times: number[] = [];
  
  // セグメントごとにグループ化
  const segmentGroups = new Map<string, ChangeHistory[]>();
  histories.forEach(h => {
    if (h.segment_id) {
      const key = `${h.project_id}_${h.segment_id}`;
      if (!segmentGroups.has(key)) {
        segmentGroups.set(key, []);
      }
      segmentGroups.get(key)!.push(h);
    }
  });
  
  segmentGroups.forEach((segmentHistories) => {
    // ソート
    const sorted = segmentHistories.sort((a, b) => {
      const dateA = new Date(a.changed_at).getTime();
      const dateB = new Date(b.changed_at).getTime();
      return dateA - dateB;
    });
    
    // セグメント作成と地点作成のペアを探す
    const segmentCreation = sorted.find(h => h.entity_type === 'segment' && h.action === 'create');
    const poiCreations = sorted.filter(h => h.entity_type === 'poi' && h.action === 'create');
    
    if (segmentCreation && poiCreations.length > 0) {
      poiCreations.forEach(poiCreation => {
        const segmentTime = new Date(segmentCreation.changed_at).getTime();
        const poiTime = new Date(poiCreation.changed_at).getTime();
        const timeDiff = (poiTime - segmentTime) / (1000 * 60); // 分単位
        
        if (timeDiff > 0 && timeDiff < 1440) { // 0分以上、24時間未満
          times.push(timeDiff);
        }
      });
    }
  });
  
  return times;
}

/**
 * 変更履歴から工数統計を計算
 */
export async function analyzeWorkTime(projects: any[]): Promise<OperationTimeStats> {
  try {
    const histories = await bigQueryService.getChangeHistories();
    
    // 案件登録時間（project_registration_started_atを使用）
    const projectCreationTimes = calculateProjectRegistrationTime(histories, projects);
    const projectCreationStats = projectCreationTimes.length > 0
      ? (() => {
          const stats = calculateStats(projectCreationTimes);
          return stats ? { ...stats, entityType: 'project' as const, action: 'create' as const } : null;
        })()
      : null;
    
    // セグメント登録時間
    const segmentCreationTimes = calculateSegmentRegistrationTime(histories);
    const segmentCreationStats = segmentCreationTimes.length > 0
      ? (() => {
          const stats = calculateStats(segmentCreationTimes);
          return stats ? { ...stats, entityType: 'segment' as const, action: 'create' as const } : null;
        })()
      : null;
    
    // 地点登録時間
    const poiCreationTimes = calculatePoiRegistrationTime(histories);
    const poiCreationStats = poiCreationTimes.length > 0
      ? (() => {
          const stats = calculateStats(poiCreationTimes);
          return stats ? { ...stats, entityType: 'poi' as const, action: 'create' as const } : null;
        })()
      : null;
    
    // 更新操作の統計
    const operationTimes = calculateOperationTime(histories);
    
    const projectUpdateTimes = operationTimes.get('project_update') || [];
    const projectUpdateStats = projectUpdateTimes.length > 0
      ? (() => {
          const stats = calculateStats(projectUpdateTimes);
          return stats ? { ...stats, entityType: 'project' as const, action: 'update' as const } : null;
        })()
      : null;
    
    const segmentUpdateTimes = operationTimes.get('segment_update') || [];
    const segmentUpdateStats = segmentUpdateTimes.length > 0
      ? (() => {
          const stats = calculateStats(segmentUpdateTimes);
          return stats ? { ...stats, entityType: 'segment' as const, action: 'update' as const } : null;
        })()
      : null;
    
    const poiUpdateTimes = operationTimes.get('poi_update') || [];
    const poiUpdateStats = poiUpdateTimes.length > 0
      ? (() => {
          const stats = calculateStats(poiUpdateTimes);
          return stats ? { ...stats, entityType: 'poi' as const, action: 'update' as const } : null;
        })()
      : null;
    
    return {
      projectCreation: projectCreationStats,
      segmentCreation: segmentCreationStats,
      poiCreation: poiCreationStats,
      projectUpdate: projectUpdateStats,
      segmentUpdate: segmentUpdateStats,
      poiUpdate: poiUpdateStats,
    };
  } catch (error) {
    console.error('Error analyzing work time:', error);
    // エラーが発生した場合は空の統計を返す
    return {
      projectCreation: null,
      segmentCreation: null,
      poiCreation: null,
      projectUpdate: null,
      segmentUpdate: null,
      poiUpdate: null,
    };
  }
}

/**
 * 時間をフォーマット（分 → 時間分）
 */
export function formatWorkTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}秒`;
  } else if (minutes < 60) {
    return `${Math.round(minutes * 10) / 10}分`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}時間${mins}分`;
  }
}

