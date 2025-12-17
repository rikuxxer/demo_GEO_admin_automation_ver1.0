/**
 * ダミーデータクリアユーティリティ
 * 
 * 開発環境でlocalStorageに保存されたすべてのダミーデータを削除します。
 * 本番環境では使用しないでください。
 */

export interface ClearDataResult {
  success: boolean;
  clearedKeys: string[];
  errors: string[];
}

/**
 * すべてのUNIVERSEGEO関連データをクリア
 */
export function clearAllData(): ClearDataResult {
  const result: ClearDataResult = {
    success: false,
    clearedKeys: [],
    errors: [],
  };

  try {
    // クリア対象のキー
    const keys = [
      'bq_projects',
      'bq_segments',
      'bq_poi',
      'bq_edit_requests',
      'bq_messages',
      'bq_change_history',
      'bq_visit_measurement_groups',
      'bq_feature_requests',
      'bq_users',
      'bq_user_requests',
      'currentUser',
      'firstLogin_',
    ];

    // 各キーをクリア
    keys.forEach(key => {
      try {
        if (key.endsWith('_')) {
          // プレフィックスマッチングでクリア（例: firstLogin_user-*）
          Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith(key)) {
              localStorage.removeItem(storageKey);
              result.clearedKeys.push(storageKey);
            }
          });
        } else {
          // 完全一致でクリア
          if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            result.clearedKeys.push(key);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to clear ${key}: ${error}`);
      }
    });

    result.success = result.errors.length === 0;
    console.log('🧹 データクリア完了:', result);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to clear data: ${error}`);
    console.error('❌ データクリアエラー:', error);
  }

  return result;
}

/**
 * 特定のデータタイプのみをクリア
 */
export function clearDataType(dataType: 'projects' | 'segments' | 'pois' | 'messages' | 'users' | 'all'): ClearDataResult {
  const result: ClearDataResult = {
    success: false,
    clearedKeys: [],
    errors: [],
  };

  const keyMap: Record<string, string[]> = {
    projects: ['bq_projects'],
    segments: ['bq_segments'],
    pois: ['bq_poi'],
    messages: ['bq_messages'],
    users: ['bq_users', 'bq_user_requests', 'currentUser'],
    all: [
      'bq_projects',
      'bq_segments',
      'bq_poi',
      'bq_edit_requests',
      'bq_messages',
      'bq_change_history',
      'bq_visit_measurement_groups',
      'bq_feature_requests',
      'bq_users',
      'bq_user_requests',
      'currentUser',
    ],
  };

  const keysToRemove = keyMap[dataType] || [];

  try {
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        result.clearedKeys.push(key);
      } catch (error) {
        result.errors.push(`Failed to clear ${key}: ${error}`);
      }
    });

    result.success = result.errors.length === 0;
    console.log(`🧹 ${dataType}データをクリアしました:`, result);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to clear ${dataType} data: ${error}`);
    console.error('❌ データクリアエラー:', error);
  }

  return result;
}

/**
 * ダミーデータをエクスポート（バックアップ用）
 */
export function exportData(): string {
  const data: Record<string, any> = {};

  const keys = [
    'bq_projects',
    'bq_segments',
    'bq_poi',
    'bq_edit_requests',
    'bq_messages',
    'bq_change_history',
    'bq_visit_measurement_groups',
    'bq_feature_requests',
    'bq_users',
    'bq_user_requests',
  ];

  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });

  return JSON.stringify(data, null, 2);
}

/**
 * データをインポート（バックアップから復元）
 */
export function importData(jsonString: string): ClearDataResult {
  const result: ClearDataResult = {
    success: false,
    clearedKeys: [],
    errors: [],
  };

  try {
    const data = JSON.parse(jsonString);

    Object.entries(data).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        result.clearedKeys.push(key);
      } catch (error) {
        result.errors.push(`Failed to import ${key}: ${error}`);
      }
    });

    result.success = result.errors.length === 0;
    console.log('📥 データインポート完了:', result);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to import data: ${error}`);
    console.error('❌ データインポートエラー:', error);
  }

  return result;
}

/**
 * データのサイズを取得
 */
export function getDataSize(): { totalSize: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let totalSize = 0;

  Object.keys(localStorage).forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      const size = new Blob([value]).size;
      breakdown[key] = size;
      totalSize += size;
    }
  });

  return { totalSize, breakdown };
}

