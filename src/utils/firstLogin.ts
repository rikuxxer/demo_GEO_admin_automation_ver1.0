/**
 * 初回ログイン判定とマニュアル表示状態を管理
 */

/**
 * ユーザーが初回ログインかどうかを判定
 * @param userId ユーザーID
 * @returns 初回ログインの場合true
 */
export function isFirstLogin(userId: string): boolean {
  const key = `hasSeenManual_${userId}`;
  const hasSeen = localStorage.getItem(key);
  return !hasSeen;
}

/**
 * マニュアルを表示済みとして記録
 * @param userId ユーザーID
 */
export function markManualAsSeen(userId: string): void {
  const key = `hasSeenManual_${userId}`;
  localStorage.setItem(key, 'true');
}

/**
 * マニュアルの表示状態をリセット（デバッグ用）
 * @param userId ユーザーID
 */
export function resetManualStatus(userId: string): void {
  const key = `hasSeenManual_${userId}`;
  localStorage.removeItem(key);
}

