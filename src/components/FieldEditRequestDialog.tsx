import { useState } from 'react';
import { FileEdit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';

interface FieldEditRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

export function FieldEditRequestDialog({
  open,
  onClose,
  onSubmit,
  fieldLabel,
  oldValue,
  newValue,
}: FieldEditRequestDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.length < 10) return;
    onSubmit(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            修正依頼の理由を入力
          </DialogTitle>
          <DialogDescription>
            管理部が承認するための理由を詳しく記入してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 変更内容の確認 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-gray-900">変更内容</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">フィールド</p>
                <p className="text-sm text-gray-900">{fieldLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">変更前</p>
                  <p className="text-sm text-gray-900 bg-red-50 p-2 rounded border border-red-200">
                    {oldValue || '（未入力）'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">変更後</p>
                  <p className="text-sm text-gray-900 bg-green-50 p-2 rounded border border-green-200">
                    {newValue || '（未入力）'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 修正理由 */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              修正理由 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="修正が必要な理由を10文字以上で入力してください"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {reason.length} / 10文字以上
            </p>
          </div>

          <Alert>
            <AlertDescription>
              ⚠️ 承認されるまで変更は反映されません。管理部が確認後、承認または却下されます。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-gray-200">
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reason.length < 10}
            className="bg-[#5b5fff] hover:bg-[#4949dd]"
          >
            修正依頼を送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
