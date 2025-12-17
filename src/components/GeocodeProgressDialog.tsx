import { AlertCircle, CheckCircle, Loader2, MapPin } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface GeocodeProgressDialogProps {
  open: boolean;
  current: number;
  total: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ address: string; error: string }>;
  completed: boolean;
  onClose?: () => void;
  onRunInBackground?: () => void;
}

export function GeocodeProgressDialog({
  open,
  current,
  total,
  successCount,
  errorCount,
  errors,
  completed,
  onClose,
  onRunInBackground,
}: GeocodeProgressDialogProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && onClose) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg" hideCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff]/20 to-[#7b7bff]/10 rounded-xl flex items-center justify-center">
              {completed ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Loader2 className="w-6 h-6 text-[#5b5fff] animate-spin" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {completed ? 'ジオコーディング完了' : 'ジオコーディング実行中'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                住所から緯度経度を取得しています
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* プログレスバー */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">処理進捗</span>
              <span className="font-medium text-gray-900">
                {current} / {total} 件
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {progress.toFixed(1)}% 完了
            </p>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">成功</span>
              </div>
              <p className="text-2xl font-medium text-green-900">{successCount}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700">エラー</span>
              </div>
              <p className="text-2xl font-medium text-red-900">{errorCount}</p>
            </div>
          </div>

          {/* エラー詳細 */}
          {errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                エラー詳細
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs">
                      <p className="text-red-900 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {error.address}
                      </p>
                      <p className="text-red-700 ml-4">{error.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 完了メッセージ */}
          {completed && (
            <div className="space-y-3">
              <div className={`rounded-lg p-4 ${
                errorCount === 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  errorCount === 0 ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {errorCount === 0
                    ? '✓ すべての地点のジオコーディングが完了しました。'
                    : `⚠️ ${successCount}件成功、${errorCount}件エラー。エラーの地点は緯度経度が設定されていません。`}
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-[#5b5fff] text-white hover:bg-[#5b5fff]/90"
              >
                閉じる
              </Button>
            </div>
          )}

          {/* 処理中メッセージ */}
          {!completed && (
            <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
                <span>
                  処理が完了するまでお待ちください。この処理には数分かかる場合があります。
                </span>
              </p>
              </div>
              {onRunInBackground && (
                <Button
                  onClick={() => {
                    onRunInBackground();
                    handleClose();
                  }}
                  variant="outline"
                  className="w-full border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  バックグラウンドで実行して閉じる
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}