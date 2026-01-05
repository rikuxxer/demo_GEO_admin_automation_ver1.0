import type { Project } from '../types/schema';
import { safeParseDate } from './dateUtils';

/**
 * 案件登録にかかった時間を計算（ミリ秒）
 * @param project 案件オブジェクト
 * @returns 登録時間（ミリ秒）、開始時点が記録されていない場合はnull
 */
export function calculateRegistrationTime(project: Project): number | null {
  if (!project.project_registration_started_at || !project._register_datetime) {
    return null;
  }

  // オブジェクト形式の日付に対応するため、safeParseDateを使用
  const startDate = safeParseDate(project.project_registration_started_at);
  const endDate = safeParseDate(project._register_datetime);
  
  if (!startDate || !endDate) {
    console.warn('⚠️ calculateRegistrationTime: 無効な日付', {
      project_id: project.project_id,
      project_registration_started_at: project.project_registration_started_at,
      _register_datetime: project._register_datetime,
    });
    return null;
  }

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  
  // 開始時刻が終了時刻より後の場合は無効
  if (startTime > endTime) {
    console.warn('⚠️ calculateRegistrationTime: 開始時刻が終了時刻より後', {
      project_id: project.project_id,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
    return null;
  }
  
  return endTime - startTime;
}

/**
 * 案件登録にかかった時間を分単位で取得
 * @param project 案件オブジェクト
 * @returns 登録時間（分）、開始時点が記録されていない場合はnull
 */
export function getRegistrationTimeInMinutes(project: Project): number | null {
  const timeMs = calculateRegistrationTime(project);
  if (timeMs === null) return null;
  
  return Math.round((timeMs / (1000 * 60)) * 100) / 100; // 小数点第2位まで
}

/**
 * 案件登録にかかった時間を時間単位で取得
 * @param project 案件オブジェクト
 * @returns 登録時間（時間）、開始時点が記録されていない場合はnull
 */
export function getRegistrationTimeInHours(project: Project): number | null {
  const timeMs = calculateRegistrationTime(project);
  if (timeMs === null) return null;
  
  return Math.round((timeMs / (1000 * 60 * 60)) * 100) / 100; // 小数点第2位まで
}

/**
 * 案件登録にかかった時間を人間が読みやすい形式で取得
 * @param project 案件オブジェクト
 * @returns フォーマット済みの時間文字列（例: "1時間30分"）、開始時点が記録されていない場合はnull
 */
export function formatRegistrationTime(project: Project): string | null {
  const timeMs = calculateRegistrationTime(project);
  if (timeMs === null) return null;

  const hours = Math.floor(timeMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 営業全員の平均登録時間を計算（分単位）
 * @param projects 案件配列
 * @returns 平均登録時間（分）、データがない場合はnull
 */
export function calculateAverageRegistrationTime(projects: Project[]): number | null {
  const times = projects
    .map(getRegistrationTimeInMinutes)
    .filter((time): time is number => {
      // nullでない、かつ有効な範囲内（0分以上、24時間未満）の値のみを集計
      return time !== null && time >= 0 && time < 1440; // 1440分 = 24時間
    });

  if (times.length === 0) {
    console.warn('⚠️ calculateAverageRegistrationTime: 有効な登録時間データがありません');
    return null;
  }

  // 異常値（24時間以上）を除外した件数をログ出力
  const allTimes = projects
    .map(getRegistrationTimeInMinutes)
    .filter((time): time is number => time !== null);
  const excludedCount = allTimes.length - times.length;
  if (excludedCount > 0) {
    console.warn(`⚠️ calculateAverageRegistrationTime: ${excludedCount}件の異常値（24時間以上または負の値）を除外しました`);
  }

  const sum = times.reduce((acc, time) => acc + time, 0);
  const average = Math.round((sum / times.length) * 100) / 100; // 小数点第2位まで
  
  console.log(`📊 平均登録時間の計算: ${times.length}件のデータから平均 ${average}分を算出`);
  
  return average;
}

/**
 * 時系列での登録時間の推移データを取得
 * @param projects 案件配列
 * @param days 過去何日分のデータを取得するか（デフォルト: 30日）
 * @returns 日付ごとの平均登録時間の配列
 */
export function getRegistrationTimeTrend(
  projects: Project[],
  days: number = 30
): Array<{ date: string; averageTime: number; count: number }> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // 登録開始時点が記録されている案件のみをフィルタ
  const validProjects = projects.filter(
    (p) => p.project_registration_started_at && p._register_datetime
  );

  // 日付ごとにグループ化
  const dateMap = new Map<string, number[]>();

  validProjects.forEach((project) => {
    if (!project._register_datetime) return;
    
    // オブジェクト形式の日付に対応するため、safeParseDateを使用
    const registerDate = safeParseDate(project._register_datetime);
    if (!registerDate || registerDate < startDate) return;

    let dateKey: string;
    try {
      dateKey = registerDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
    } catch (e) {
      console.warn('⚠️ toISOString() failed in registrationTime forEach:', project._register_datetime, e);
      return; // 無効な日付の場合はスキップ
    }
    
    const timeMinutes = getRegistrationTimeInMinutes(project);
    
    // 有効な範囲内（0分以上、24時間未満）の値のみを集計
    if (timeMinutes !== null && timeMinutes >= 0 && timeMinutes < 1440) {
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(timeMinutes);
    }
  });

  // 日付ごとの平均を計算
  const trend: Array<{ date: string; averageTime: number; count: number }> = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    let dateKey: string;
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date in registrationTime trend calculation');
      continue; // 無効な日付の場合はスキップ
    }
    try {
      dateKey = date.toISOString().split('T')[0];
    } catch (e) {
      console.warn('⚠️ toISOString() failed in registrationTime trend:', e);
      continue; // エラーの場合はスキップ
    }
    
    const times = dateMap.get(dateKey) || [];
    const averageTime = times.length > 0
      ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100
      : 0;
    
    trend.push({
      date: dateKey,
      averageTime,
      count: times.length,
    });
  }

  return trend;
}

