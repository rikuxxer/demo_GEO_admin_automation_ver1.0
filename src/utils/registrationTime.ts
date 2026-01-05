import type { Project } from '../types/schema';

/**
 * 案件登録にかかった時間を計算（ミリ秒）
 * @param project 案件オブジェクト
 * @returns 登録時間（ミリ秒）、開始時点が記録されていない場合はnull
 */
export function calculateRegistrationTime(project: Project): number | null {
  if (!project.project_registration_started_at) {
    return null;
  }

  const startTime = new Date(project.project_registration_started_at).getTime();
  const endTime = new Date(project._register_datetime).getTime();
  
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
    .filter((time): time is number => time !== null);

  if (times.length === 0) return null;

  const sum = times.reduce((acc, time) => acc + time, 0);
  return Math.round((sum / times.length) * 100) / 100; // 小数点第2位まで
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
    
    const registerDate = new Date(project._register_datetime);
    if (isNaN(registerDate.getTime()) || registerDate < startDate) return;

    let dateKey: string;
    try {
      dateKey = registerDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
    } catch (e) {
      console.warn('⚠️ toISOString() failed in registrationTime forEach:', project._register_datetime, e);
      return; // 無効な日付の場合はスキップ
    }
    
    const timeMinutes = getRegistrationTimeInMinutes(project);
    
    if (timeMinutes !== null) {
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

