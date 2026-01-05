/**
 * 日付処理ユーティリティ
 * BigQueryから返される日付データを安全に処理するためのヘルパー関数
 */

/**
 * 日付文字列を安全にDateオブジェクトに変換
 * @param dateValue 日付文字列、Dateオブジェクト、オブジェクト、またはnull/undefined
 * @returns 有効なDateオブジェクト、またはnull
 */
export function safeParseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // 既にDateオブジェクトの場合
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // オブジェクトの場合（BigQueryから返された可能性）
  if (typeof dateValue === 'object' && dateValue !== null) {
    // valueプロパティがある場合（BigQueryのDATE型がオブジェクトとして返される場合）
    if ('value' in dateValue && typeof dateValue.value === 'string') {
      dateValue = dateValue.value;
    } else if ('toString' in dateValue && typeof dateValue.toString === 'function') {
      // toString()メソッドがある場合は試行
      try {
        const str = dateValue.toString();
        if (str === '[object Object]') {
          console.warn('⚠️ safeParseDate: オブジェクトを文字列に変換できませんでした', dateValue);
          return null;
        }
        dateValue = str;
      } catch (e) {
        console.warn('⚠️ safeParseDate: オブジェクトの変換に失敗', dateValue, e);
        return null;
      }
    } else {
      // オブジェクトを直接Dateオブジェクトに変換を試行
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        // 変換に失敗
      }
      console.warn('⚠️ safeParseDate: 未対応のオブジェクト形式', dateValue);
      return null;
    }
  }
  
  // 文字列の場合
  if (typeof dateValue === 'string') {
    // 空文字列の場合はnullを返す
    if (dateValue.trim() === '') return null;
    
    // YYYY-MM-DD形式の文字列を直接処理（タイムゾーン問題を回避）
    const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1; // 月は0ベース
      const dayNum = parseInt(day, 10);
      
      // 有効な日付かチェック
      if (yearNum >= 1900 && yearNum <= 2100 && monthNum >= 0 && monthNum <= 11 && dayNum >= 1 && dayNum <= 31) {
        const date = new Date(yearNum, monthNum, dayNum);
        // 作成した日付が有効か確認（例: 2025-02-30は無効）
        if (date.getFullYear() === yearNum && date.getMonth() === monthNum && date.getDate() === dayNum) {
          return date;
        }
      }
    }
    
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 数値の場合（タイムスタンプ）
  if (typeof dateValue === 'number') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * 日付を安全にISO文字列に変換
 * @param dateValue 日付値
 * @returns ISO文字列、またはnull
 */
export function safeToISOString(dateValue: any): string | null {
  const date = safeParseDate(dateValue);
  if (!date) return null;
  try {
    return date.toISOString();
  } catch (e) {
    console.warn('⚠️ toISOString() failed:', dateValue, e);
    return null;
  }
}

/**
 * 日付を安全にローカル日付文字列に変換
 * @param dateValue 日付値
 * @param options Intl.DateTimeFormatOptions
 * @returns フォーマットされた日付文字列、またはフォールバック文字列
 */
export function safeToLocaleDateString(
  dateValue: any,
  locale: string = 'ja-JP',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = safeParseDate(dateValue);
  if (!date) return '（日付不明）';
  
  try {
    return date.toLocaleDateString(locale, options);
  } catch (e) {
    console.warn('⚠️ toLocaleDateString() failed:', dateValue, e);
    return '（日付不明）';
  }
}

/**
 * 日付を安全にローカル時刻文字列に変換
 * @param dateValue 日付値
 * @param options Intl.DateTimeFormatOptions
 * @returns フォーマットされた時刻文字列、またはフォールバック文字列
 */
export function safeToLocaleTimeString(
  dateValue: any,
  locale: string = 'ja-JP',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = safeParseDate(dateValue);
  if (!date) return '（時刻不明）';
  
  try {
    return date.toLocaleTimeString(locale, options);
  } catch (e) {
    console.warn('⚠️ toLocaleTimeString() failed:', dateValue, e);
    return '（時刻不明）';
  }
}

/**
 * 日付を安全にフォーマット（YYYY-MM-DD形式）
 * @param dateValue 日付値
 * @returns YYYY-MM-DD形式の文字列、またはnull
 */
export function safeFormatDate(dateValue: any): string | null {
  const date = safeParseDate(dateValue);
  if (!date) return null;
  
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('⚠️ formatDate() failed:', dateValue, e);
    return null;
  }
}

/**
 * 日付を安全にフォーマット（日本語形式）
 * @param dateValue 日付値
 * @returns 日本語形式の日付文字列、またはフォールバック文字列
 */
export function formatDateJapanese(dateValue: any): string {
  const date = safeParseDate(dateValue);
  if (!date) return '（日付不明）';
  
  try {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.warn('⚠️ formatDateJapanese() failed:', dateValue, e);
    return '（日付不明）';
  }
}

