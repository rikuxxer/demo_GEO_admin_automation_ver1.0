import { X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import {
  REPORT_REQUEST_STATUS_OPTIONS,
  AGGREGATION_LEVEL_OPTIONS,
  getReportTypeLabel,
  type ReportRequest,
} from '../types/schema';

interface ReportRequestDetailProps {
  request: ReportRequest;
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

export function ReportRequestDetail({
  request,
  open,
  onClose,
  projectName,
}: ReportRequestDetailProps) {
  const getStatusBadge = (status: ReportRequest['status']) => {
    const statusOption = REPORT_REQUEST_STATUS_OPTIONS.find(s => s.value === status);
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={colorMap[statusOption?.color || 'yellow']}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const aggregationLabel = request.aggregation_level
    ? AGGREGATION_LEVEL_OPTIONS.find(o => o.value === request.aggregation_level)?.label || request.aggregation_level
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{request.report_title}</DialogTitle>
              {getStatusBadge(request.status)}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            <span className="text-sm">{getReportTypeLabel(request.report_type)}</span>
            {projectName && <span className="text-sm ml-4">{projectName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">レポート種別</Label>
                <p className="text-sm text-gray-600 mt-1">{getReportTypeLabel(request.report_type)}</p>
              </div>
              {aggregationLabel && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700">集計粒度</Label>
                  <p className="text-sm text-gray-600 mt-1">{aggregationLabel}</p>
                </div>
              )}
            </div>

            {request.struct_number && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">ストラクト番号</Label>
                <p className="text-sm text-gray-600 mt-1">{request.struct_number}</p>
              </div>
            )}

            {request.measurement_group_ids && request.measurement_group_ids.length > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">計測グループID</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {request.measurement_group_ids.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                  ))}
                </div>
              </div>
            )}

            {request.segment_ids && request.segment_ids.length > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">セグメントID</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {request.segment_ids.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(request.start_date || request.end_date) && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">集計期間</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(request.start_date)} 〜 {formatDate(request.end_date)}
                </p>
              </div>
            )}

            {request.description && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">備考</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
                </div>
              </div>
            )}

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

          {/* レポートURL */}
          {request.report_url && (
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-sm font-semibold text-gray-700">レポートURL</Label>
              <a
                href={request.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-3 h-3" />
                レポートを表示
              </a>
            </div>
          )}

          {/* エラーメッセージ */}
          {request.error_message && (
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-sm font-semibold text-red-700">エラーメッセージ</Label>
              <div className="mt-2 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{request.error_message}</p>
              </div>
            </div>
          )}

          {/* レビュー情報 */}
          {request.reviewed_at && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
