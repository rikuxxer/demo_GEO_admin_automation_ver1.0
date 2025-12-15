/**
 * データ連携目途を計算するユーティリティ
 * 
 * ルール:
 * 1. 依頼日時が20:00以降の場合、翌日扱いとする
 * 2. 依頼日から最も近い月・水・金を見つける
 * 3. その日に+1営業日を加える
 * 4. 営業日は月～金（土日を除外）
 */

/**
 * 指定した日付が営業日（月～金）かどうかを判定
 */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 月曜日(1)から金曜日(5)
}

/**
 * 次の営業日を取得
 */
function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (!isBusinessDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * 指定した営業日数後の日付を取得
 */
function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result = getNextBusinessDay(result);
    addedDays++;
  }
  
  return result;
}

/**
 * 指定した日付から最も近い月・水・金を取得
 */
function getNextMonWedFri(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  
  // 月(1), 水(3), 金(5)
  const targetDays = [1, 3, 5];
  
  // 当日が月・水・金の場合、次の月・水・金を探す
  let daysToAdd = 1;
  
  while (daysToAdd <= 7) {
    const testDate = new Date(result);
    testDate.setDate(testDate.getDate() + daysToAdd);
    const testDay = testDate.getDay();
    
    if (targetDays.includes(testDay)) {
      return testDate;
    }
    
    daysToAdd++;
  }
  
  // フォールバック（通常ここには到達しない）
  return result;
}

/**
 * データ連携目途を計算
 * 
 * ルール:
 * 1. 20:00以降の依頼は翌日扱い
 * 2. 依頼日から次の月・水・金を探す
 * 3. 月・水・金に依頼した場合: 次の月・水・金をそのまま返す
 * 4. その他の曜日（火・木・土・日）に依頼した場合: 次の月・水・金 + 1営業日
 * 
 * @param requestDateTime 格納依頼日時（ISO 8601形式の文字列）
 * @returns データ連携目途（YYYY-MM-DD形式）
 * 
 * @example
 * // ケース1: 2024年11月18日（月）15:00 に依頼
 * calculateDataCoordinationDate('2024-11-18T15:00:00+09:00')
 * // => '2024-11-20' (水曜日)
 * 
 * // ケース2: 2024年11月19日（火）10:00 に依頼
 * calculateDataCoordinationDate('2024-11-19T10:00:00+09:00')
 * // => '2024-11-21' (木曜日 = 水曜日 + 1営業日)
 * 
 * // ケース3: 2024年11月18日（月）21:00 に依頼（20時以降なので翌日扱い）
 * calculateDataCoordinationDate('2024-11-18T21:00:00+09:00')
 * // => '2024-11-21' (木曜日 = 火曜日扱い → 水曜日 + 1営業日)
 * 
 * // ケース4: 2024年11月22日（金）19:00 に依頼
 * calculateDataCoordinationDate('2024-11-22T19:00:00+09:00')
 * // => '2024-11-25' (月曜日)
 */
export function calculateDataCoordinationDate(requestDateTime: string): string {
  const requestDate = new Date(requestDateTime);
  
  // 1. 20:00以降の場合、翌日扱いにする
  const hour = requestDate.getHours();
  let baseDate = new Date(requestDate);
  
  if (hour >= 20) {
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(0, 0, 0, 0); // 時刻をリセット
  } else {
    baseDate.setHours(0, 0, 0, 0); // 時刻をリセット
  }
  
  // baseDateの曜日を取得（0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土）
  const baseDayOfWeek = baseDate.getDay();
  const isMonWedFri = baseDayOfWeek === 1 || baseDayOfWeek === 3 || baseDayOfWeek === 5;
  
  // 2. 依頼日から次の月・水・金を見つける
  const nextMonWedFri = getNextMonWedFri(baseDate);
  
  // 3. 月・水・金に依頼した場合はそのまま、その他の曜日の場合は+1営業日
  let coordinationDate: Date;
  if (isMonWedFri) {
    // 月・水・金の依頼 → 次の月・水・金をそのまま返す
    coordinationDate = nextMonWedFri;
  } else {
    // その他の曜日（火・木・土・日）の依頼 → 次の月・水・金 + 1営業日
    coordinationDate = addBusinessDays(nextMonWedFri, 1);
  }
  
  // 4. YYYY-MM-DD形式で返す
  return formatDateToYYYYMMDD(coordinationDate);
}

/**
 * DateオブジェクトをYYYY-MM-DD形式にフォーマット
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD形式の日付をMM/DD形式にフォーマット（表示用）
 */
export function formatDateToMMDD(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${month}/${day}`;
}
