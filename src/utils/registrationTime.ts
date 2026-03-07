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
 * @param from 開始日
 * @param to 終了日
 * @returns 集約単位ごとの平均登録時間の配列（90日以下:日次、91-365日:週次、366日以上:月次）
 */
export function getRegistrationTimeTrend(
  projects: Project[],
  from: Date,
  to: Date,
): Array<{ date: string; averageTime: number; count: number }> {
  const startDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const endDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 登録開始時点が記録されている案件のみをフィルタ
  const validProjects = projects.filter(
    (p) => p.project_registration_started_at && p._register_datetime
  );

  // 日付ごとにグループ化
  const dateMap = new Map<string, number[]>();

  validProjects.forEach((project) => {
    if (!project._register_datetime) return;

    const registerDate = safeParseDate(project._register_datetime);
    if (!registerDate || registerDate < startDate || registerDate > new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1)) return;

    let dateKey: string;
    try {
      dateKey = registerDate.toISOString().split('T')[0];
    } catch {
      return;
    }

    const timeMinutes = getRegistrationTimeInMinutes(project);

    if (timeMinutes !== null && timeMinutes >= 0 && timeMinutes < 1440) {
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(timeMinutes);
    }
  });

  // 集約単位を決定
  if (diffDays <= 90) {
    // 日次
    return buildDailyTrend(startDate, diffDays, dateMap);
  } else if (diffDays <= 365) {
    // 週次
    return buildWeeklyTrend(startDate, endDate, dateMap);
  } else {
    // 月次
    return buildMonthlyTrend(startDate, endDate, dateMap);
  }
}

function buildDailyTrend(
  startDate: Date,
  days: number,
  dateMap: Map<string, number[]>,
): Array<{ date: string; averageTime: number; count: number }> {
  const trend: Array<{ date: string; averageTime: number; count: number }> = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (isNaN(date.getTime())) continue;
    let dateKey: string;
    try { dateKey = date.toISOString().split('T')[0]; } catch { continue; }
    const times = dateMap.get(dateKey) || [];
    trend.push({
      date: dateKey,
      averageTime: times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100
        : 0,
      count: times.length,
    });
  }
  return trend;
}

function buildWeeklyTrend(
  startDate: Date,
  endDate: Date,
  dateMap: Map<string, number[]>,
): Array<{ date: string; averageTime: number; count: number }> {
  const trend: Array<{ date: string; averageTime: number; count: number }> = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

    const times: number[] = [];
    const d = new Date(current);
    while (d <= weekEnd) {
      try {
        const key = d.toISOString().split('T')[0];
        const dayTimes = dateMap.get(key);
        if (dayTimes) times.push(...dayTimes);
      } catch { /* skip */ }
      d.setDate(d.getDate() + 1);
    }

    let dateKey: string;
    try { dateKey = current.toISOString().split('T')[0]; } catch { break; }
    trend.push({
      date: dateKey,
      averageTime: times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100
        : 0,
      count: times.length,
    });

    current.setDate(current.getDate() + 7);
  }
  return trend;
}

function buildMonthlyTrend(
  startDate: Date,
  endDate: Date,
  dateMap: Map<string, number[]>,
): Array<{ date: string; averageTime: number; count: number }> {
  const trend: Array<{ date: string; averageTime: number; count: number }> = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (current <= endDate) {
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const loopStart = current < startDate ? new Date(startDate) : new Date(current);
    const loopEnd = monthEnd > endDate ? new Date(endDate) : new Date(monthEnd);

    const times: number[] = [];
    const d = new Date(loopStart);
    while (d <= loopEnd) {
      try {
        const key = d.toISOString().split('T')[0];
        const dayTimes = dateMap.get(key);
        if (dayTimes) times.push(...dayTimes);
      } catch { /* skip */ }
      d.setDate(d.getDate() + 1);
    }

    let dateKey: string;
    try { dateKey = loopStart.toISOString().split('T')[0]; } catch { break; }
    trend.push({
      date: dateKey,
      averageTime: times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100
        : 0,
      count: times.length,
    });

    current.setMonth(current.getMonth() + 1);
  }
  return trend;
}

