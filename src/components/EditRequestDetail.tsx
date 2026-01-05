import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { EditRequest, EDIT_REQUEST_TYPE_OPTIONS } from '../types/schema';
import { formatChangesForDisplay, getEditRequestStatusColor } from '../utils/editRequest';

interface EditRequestDetailProps {
  request: EditRequest;
  open: boolean;
  onClose: () => void;
  onApprove: (requestId: string, comment: string) => void;
  onReject: (requestId: string, comment: string) => void;
  onWithdraw?: (requestId: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function EditRequestDetail({
  request,
  open,
  onClose,
  onApprove,
  onReject,
  onWithdraw,
  currentUserId,
  isAdmin,
}: EditRequestDetailProps) {
  const [reviewComment, setReviewComment] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const displayChanges = formatChangesForDisplay(request.changes, request.request_type);
  const statusColor = getEditRequestStatusColor(request.status);
  const typeLabel = EDIT_REQUEST_TYPE_OPTIONS.find(
    opt => opt.value === request.request_type
  )?.label || request.request_type;

  const canApproveOrReject = isAdmin && request.status === 'pending';
  const canWithdraw =
    request.status === 'pending' &&
    (isAdmin || request.requested_by === currentUserId);

  const handleApprove = () => {
    onApprove(request.request_id, reviewComment);
    handleClose();
  };

  const handleReject = () => {
    if (!reviewComment.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    onReject(request.request_id, reviewComment);
    setShowRejectDialog(false);
    handleClose();
  };

  const handleWithdraw = () => {
    if (onWithdraw) {
      onWithdraw(request.request_id);
      handleClose();
    }
  };

  const handleClose = () => {
    setReviewComment('');
    setShowRejectDialog(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('⚠️ formatDate() failed:', dateString, e);
      return '-';
    }
  };

  const getTypeIcon = (type: EditRequest['request_type']) => {
    switch (type) {
      case 'project':
        return '📋';
      case 'segment':
        return '📊';
      case 'poi':
        return '📍';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(request.request_type)}
              修正依頼の詳細
            </DialogTitle>
            <Badge className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border-gray-200`}>
              {request.status === 'pending' && '承認待ち'}
              {request.status === 'approved' && '承認済み'}
              {request.status === 'rejected' && '却下'}
              {request.status === 'withdrawn' && '取り下げ'}
            </Badge>
          </div>
          <DialogDescription>
            修正依頼の詳細情報と変更内容を確認できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 mb-1">依頼ID</div>
              <div className="font-mono text-sm">{request.request_id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">修正種別</div>
              <div className="text-sm font-medium">{typeLabel}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">対象ID</div>
              <div className="font-mono text-sm">{request.target_id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">依頼日時</div>
              <div className="text-sm">{formatDate(request.requested_at)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">依頼者</div>
              <div className="text-sm font-medium">{request.requested_by}</div>
            </div>
            {request.reviewed_by && (
              <>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {request.status === 'approved' ? '承認者' : '却下者'}
                  </div>
                  <div className="text-sm font-medium">{request.reviewed_by}</div>
                </div>
                {request.reviewed_at && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">
                      {request.status === 'approved' ? '承認日時' : '却下日時'}
                    </div>
                    <div className="text-sm">{formatDate(request.reviewed_at)}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 変更内容 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">変更内容</Label>
            {displayChanges.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[35%]" />
                    <col className="w-[5%]" />
                    <col className="w-[40%]" />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 border-b border-gray-200">項目</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 border-b border-gray-200">変更前</th>
                      <th className="border-b border-gray-200"></th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 border-b border-gray-200">変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayChanges.map((change, index) => (
                      <tr key={index} className="hover:bg-gray-50 border-b border-gray-200 last:border-b-0">
                        <td className="px-4 py-3 font-medium break-words">{change.label}</td>
                        <td className="px-4 py-3 text-gray-600 break-words">{change.before}</td>
                        <td className="px-2 py-3 text-center">
                          <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
                        </td>
                        <td className="px-4 py-3 break-words">
                          <span className="text-blue-600 font-medium">{change.after}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                変更内容がありません
              </div>
            )}
          </div>

          {/* 修正理由 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">修正理由</Label>
            <div className="p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
              {request.request_reason}
            </div>
          </div>

          {/* 承認/却下コメント */}
          {request.status === 'pending' && canApproveOrReject && (
            <div>
              <Label htmlFor="review_comment" className="text-sm font-medium mb-2 block">
                管理者コメント（任意）
              </Label>
              <Textarea
                id="review_comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="承認または却下時のコメントを入力できます"
                rows={3}
              />
            </div>
          )}

          {/* 却下理由（却下済みの場合） */}
          {request.status === 'rejected' && request.review_comment && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">却下理由</div>
                <div className="text-sm whitespace-pre-wrap">{request.review_comment}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* 承認コメント（承認済みの場合） */}
          {request.status === 'approved' && request.review_comment && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">承認コメント</div>
                <div className="text-sm whitespace-pre-wrap">{request.review_comment}</div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-end">
          {canApproveOrReject && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                却下する
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                承認して変更を適用
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      {/* 却下確認ダイアログ */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              修正依頼を却下
            </DialogTitle>
            <DialogDescription>
              この修正依頼を却下します。却下理由を入力してください。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="reject_reason" className="text-sm font-medium mb-2 block">
              却下理由 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject_reason"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="営業が理解できるよう、明確な理由を記載してください"
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="border-gray-200">
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              却下する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
