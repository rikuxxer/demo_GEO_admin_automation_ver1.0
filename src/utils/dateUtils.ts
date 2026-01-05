/**
 * 日付処理ユーティリティ
 * BigQueryから返される日付データを安全に処理するためのヘルパー関数
 */

/**
 * 日付文字列を安全にDateオブジェクトに変換
 * @param dateValue 日付文字列、Dateオブジェクト、またはnull/undefined
 * @returns 有効なDateオブジェクト、またはnull
 */
export function safeParseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // 既にDateオブジェクトの場合
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // 文字列の場合
  if (typeof dateValue === 'string') {
    // 空文字列の場合はnullを返す
    if (dateValue.trim() === '') return null;
    
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

