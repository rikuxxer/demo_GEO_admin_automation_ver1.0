import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, MinusCircle, FileEdit, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { EditRequest, EDIT_REQUEST_STATUS_OPTIONS, EDIT_REQUEST_TYPE_OPTIONS } from '../types/schema';
import { getEditRequestStatusColor } from '../utils/editRequest';
import { EditRequestDetail } from './EditRequestDetail';

interface EditRequestListProps {
  requests: EditRequest[];
  onApprove: (requestId: string, comment: string) => void;
  onReject: (requestId: string, comment: string) => void;
  onWithdraw?: (requestId: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function EditRequestList({
  requests,
  onApprove,
  onReject,
  onWithdraw,
  currentUserId,
  isAdmin,
}: EditRequestListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);

  // フィルタリング
  const filteredRequests = requests.filter(request => {
    // ステータスフィルタ
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }

    // タイプフィルタ
    if (typeFilter !== 'all' && request.request_type !== typeFilter) {
      return false;
    }

    // 検索クエリ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.request_id.toLowerCase().includes(query) ||
        request.request_reason.toLowerCase().includes(query) ||
        request.target_id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // ステータス別カウント
  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const getStatusIcon = (status: EditRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'withdrawn':
        return <MinusCircle className="w-4 h-4" />;
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

  const getTypeLabel = (type: EditRequest['request_type']) => {
    return EDIT_REQUEST_TYPE_OPTIONS.find(opt => opt.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5" />
                修正依頼管理
              </CardTitle>
              <CardDescription>
                営業からの修正依頼を確認し、承認または却下を行います
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                className="cursor-pointer border-gray-200"
                onClick={() => setStatusFilter('pending')}
              >
                承認待ち ({statusCounts.pending})
              </Badge>
              <Badge
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                className="cursor-pointer border-gray-200"
                onClick={() => setStatusFilter('approved')}
              >
                承認済み ({statusCounts.approved})
              </Badge>
              <Badge
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                className="cursor-pointer border-gray-200"
                onClick={() => setStatusFilter('rejected')}
              >
                却下 ({statusCounts.rejected})
              </Badge>
              <Badge
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer border-gray-200"
                onClick={() => setStatusFilter('all')}
              >
                全て ({statusCounts.all})
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* フィルタ・検索 */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="依頼IDや修正理由で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="種別で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {EDIT_REQUEST_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 依頼一覧 */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>修正依頼がありません</p>
              </div>
            ) : (
              filteredRequests.map(request => {
                const statusColor = getEditRequestStatusColor(request.status);
                const statusOption = EDIT_REQUEST_STATUS_OPTIONS.find(
                  opt => opt.value === request.status
                );

                return (
                  <Card
                    key={request.request_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-gray-500">
                              {request.request_id}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTypeIcon(request.request_type)}</span>
                              <span className="text-sm font-medium">
                                {getTypeLabel(request.request_type)}
                              </span>
                            </div>
                            <Badge
                              className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border-gray-200`}
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(request.status)}
                                <span>{statusOption?.label}</span>
                              </div>
                            </Badge>
                          </div>

                          <div className="text-sm mb-2">
                            <span className="font-medium">対象ID:</span>{' '}
                            <span className="text-gray-600">{request.target_id}</span>
                          </div>

                          <div className="text-sm mb-2">
                            <span className="font-medium">依頼者:</span>{' '}
                            <span className="text-gray-600">{request.requested_by}</span>
                            {' '}
                            <span className="text-gray-400">・</span>
                            {' '}
                            <span className="text-gray-500">{formatDate(request.requested_at)}</span>
                          </div>

                          <div className="text-sm text-gray-600 line-clamp-2">
                            <span className="font-medium">理由:</span> {request.request_reason}
                          </div>

                          {request.reviewed_by && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                              <span className="font-medium">
                                {request.status === 'approved' ? '承認者' : '却下者'}:
                              </span>{' '}
                              {request.reviewed_by}
                              {' '}
                              <span className="text-gray-400">・</span>
                              {' '}
                              {request.reviewed_at && formatDate(request.reviewed_at)}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                          }}
                        >
                          詳細を見る
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 詳細ダイアログ */}
      {selectedRequest && (
        <EditRequestDetail
          request={selectedRequest}
          open={selectedRequest !== null}
          onClose={() => setSelectedRequest(null)}
          onApprove={onApprove}
          onReject={onReject}
          onWithdraw={onWithdraw}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
