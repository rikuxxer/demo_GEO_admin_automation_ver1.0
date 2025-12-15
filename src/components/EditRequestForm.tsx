import React, { useState } from 'react';
import { AlertCircle, FileEdit, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { EditRequest, Project, Segment, PoiInfo } from '../types/schema';
import {
  createChangeDiff,
  formatChangesForDisplay,
  validateEditRequest,
  generateEditRequestId,
} from '../utils/editRequest';

interface EditRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: EditRequest) => void;
  type: 'project' | 'segment' | 'poi';
  before: Project | Segment | PoiInfo;
  after: Project | Segment | PoiInfo;
  currentUserId: string;
}

export function EditRequestForm({
  open,
  onClose,
  onSubmit,
  type,
  before,
  after,
  currentUserId,
}: EditRequestFormProps) {
  const [requestReason, setRequestReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // 変更内容を計算
  const changes = createChangeDiff(before as any, after as any);
  const displayChanges = formatChangesForDisplay(changes, type);

  const handleSubmit = () => {
    // バリデーション
    const validation = validateEditRequest({
      request_type: type,
      target_id: getTargetId(),
      request_reason: requestReason,
      changes,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // 修正依頼を作成
    const request: EditRequest = {
      request_id: generateEditRequestId(),
      request_type: type,
      target_id: getTargetId(),
      project_id: getProjectId(),
      segment_id: type === 'segment' || type === 'poi' ? (after as any).segment_id : undefined,
      requested_by: currentUserId,
      requested_at: new Date().toISOString(),
      request_reason: requestReason,
      status: 'pending',
      changes,
    };

    onSubmit(request);
    handleClose();
  };

  const handleClose = () => {
    setRequestReason('');
    setErrors([]);
    onClose();
  };

  const getTargetId = (): string => {
    switch (type) {
      case 'project':
        return (after as Project).project_id;
      case 'segment':
        return (after as Segment).segment_id;
      case 'poi':
        return (after as PoiInfo).poi_id || '';
      default:
        return '';
    }
  };

  const getProjectId = (): string => {
    return (after as any).project_id;
  };

  const getTargetLabel = (): string => {
    switch (type) {
      case 'project':
        return `案件: ${(after as Project).advertiser_name} - ${(after as Project).appeal_point}`;
      case 'segment':
        return `セグメント: ${(after as Segment).segment_name || (after as Segment).segment_id}`;
      case 'poi':
        return `地点: ${(after as PoiInfo).poi_name}`;
      default:
        return '';
    }
  };

  const typeIcon = type === 'project' ? '📋' : type === 'segment' ? '📊' : '📍';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle>修正依頼を作成</DialogTitle>
          </div>
          <DialogDescription>
            以下の内容で修正依頼を送信します。管理部の承認後に変更が反映されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* エラーメッセージ */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 修正対象 */}
          <div>
            <Label className="text-sm text-gray-600">修正対象</Label>
            <div className="mt-1 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">{typeIcon}</span>
              <span className="font-medium">{getTargetLabel()}</span>
            </div>
          </div>

          {/* 変更内容 */}
          <div>
            <Label className="text-sm text-gray-600">変更内容</Label>
            <div className="mt-1 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">項目</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">変更前</th>
                    <th className="w-8"></th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">変更後</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayChanges.map((change, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{change.label}</td>
                      <td className="px-4 py-3 text-gray-600">{change.before}</td>
                      <td className="px-2 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{change.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 修正理由 */}
          <div>
            <Label htmlFor="request_reason" className="text-sm text-gray-600">
              修正理由 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="request_reason"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="修正が必要な理由を詳しく記載してください（10文字以上）"
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {requestReason.length} / 10文字以上
            </p>
          </div>

          {/* 注意事項 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">承認されるまで変更は反映されません</div>
              <div className="text-xs">
                管理部が依頼内容を確認し、承認後に変更が適用されます。通常1〜2営業日で承認されます。
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={displayChanges.length === 0}
          >
            修正依頼を送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
