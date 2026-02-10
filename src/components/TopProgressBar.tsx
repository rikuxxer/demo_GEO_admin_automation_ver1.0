/**
 * 画面中央に表示するプログレッシブバー（読み込み・登録時の進捗表示）
 * 案件管理画面のデータ読み込み中・登録処理中に表示
 */
import { cn } from "./ui/utils";

interface TopProgressBarProps {
  /** 表示するか */
  visible?: boolean;
  className?: string;
}

export function TopProgressBar({ visible = true, className }: TopProgressBarProps) {
  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="読み込み中"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-white/50",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        {/* 円形のプログレッシブバー（スピナー） */}
        <div
          className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"
          aria-hidden
        />
        <p className="text-sm font-medium text-gray-700">読み込み中...</p>
      </div>
    </div>
  );
}
