/**
 * 画面上部に表示するプログレッシブバー（再読み込み時の進捗表示）
 * 案件管理画面のデータ読み込み中に表示する想定
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
        "fixed left-0 right-0 top-0 z-[100] h-1 overflow-hidden bg-primary/10",
        className
      )}
    >
      <div className="h-full w-1/3 shrink-0 animate-top-progress bg-primary" />
    </div>
  );
}
