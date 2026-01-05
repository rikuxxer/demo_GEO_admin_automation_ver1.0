import { X, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { FEATURE_REQUEST_STATUS_OPTIONS, FEATURE_REQUEST_CATEGORY_OPTIONS, FEATURE_REQUEST_PRIORITY_OPTIONS, type FeatureRequest } from '../types/schema';
import { useState } from 'react';

interface FeatureRequestDetailProps {
  request: FeatureRequest;
  open: boolean;
  onClose: () => void;
  onStatusUpdate?: (requestId: string, status: FeatureRequest['status'], comment?: string) => void;
  isAdmin?: boolean;
}

export function FeatureRequestDetail({
  request,
  open,
  onClose,
  onStatusUpdate,
  isAdmin = false,
}: FeatureRequestDetailProps) {
  const [reviewComment, setReviewComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FeatureRequest['status']>(request.status);

  const getStatusBadge = (status: FeatureRequest['status']) => {
    const statusOption = FEATURE_REQUEST_STATUS_OPTIONS.find(s => s.value === status);
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
    };
    return (
      <Badge className={colorMap[statusOption?.color || 'gray']}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const getCategoryLabel = (category: FeatureRequest['category']) => {
    const categoryOption = FEATURE_REQUEST_CATEGORY_OPTIONS.find(c => c.value === category);
    return categoryOption?.label || category;
  };

  const getPriorityLabel = (priority: FeatureRequest['priority']) => {
    const priorityOption = FEATURE_REQUEST_PRIORITY_OPTIONS.find(p => p.value === priority);
    return priorityOption?.label || priority;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('⚠️ formatDateTime() failed:', dateStr, e);
      return '-';
    }
  };

  const handleStatusUpdate = () => {
    if (onStatusUpdate) {
      onStatusUpdate(request.request_id, selectedStatus, reviewComment.trim() || undefined);
      setReviewComment('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{request.title}</DialogTitle>
              {getStatusBadge(request.status)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span>カテゴリ: {getCategoryLabel(request.category)}</span>
              <span>優先度: {getPriorityLabel(request.priority)}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">詳細説明</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">依頼者</Label>
                <p className="text-sm text-gray-600 mt-1">{request.requested_by_name}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">依頼日時</Label>
                <p className="text-sm text-gray-600 mt-1">{formatDateTime(request.requested_at)}</p>
              </div>
            </div>
          </div>

          {/* レビュー情報（レビュー済みの場合） */}
          {request.reviewed_at && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">レビュー情報</Label>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">レビュー者</Label>
                      <p className="text-sm text-gray-900">{request.reviewed_by}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">レビュー日時</Label>
                      <p className="text-sm text-gray-900">{formatDateTime(request.reviewed_at)}</p>
                    </div>
                  </div>
                  {request.review_comment && (
                    <div>
                      <Label className="text-xs text-gray-500">レビューコメント</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.review_comment}</p>
                      </div>
                    </div>
                  )}
                  {request.implemented_at && (
                    <div>
                      <Label className="text-xs text-gray-500">実装日時</Label>
                      <p className="text-sm text-gray-900">{formatDateTime(request.implemented_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ステータス更新（管理者のみ） */}
          {isAdmin && onStatusUpdate && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">ステータス更新</Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as FeatureRequest['status'])}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                >
                  {FEATURE_REQUEST_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">レビューコメント（任意）</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="レビューコメントを入力してください..."
                  rows={4}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
                >
                  ステータスを更新
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

