import { useState, useEffect } from 'react';
import { Plus, Filter, CheckCircle, XCircle, Clock, Eye, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { FeatureRequestForm } from './FeatureRequestForm';
import { FeatureRequestDetail } from './FeatureRequestDetail';
import { bigQueryService } from '../utils/bigquery';
import { useAuth } from '../contexts/AuthContext';
import { FEATURE_REQUEST_STATUS_OPTIONS, FEATURE_REQUEST_CATEGORY_OPTIONS, type FeatureRequest } from '../types/schema';
import { toast } from 'sonner';

interface FeatureRequestListProps {
  isAdmin?: boolean;
  showFormOnly?: boolean; // 営業の場合、フォームのみ表示
}

export function FeatureRequestList({ isAdmin = false, showFormOnly = false }: FeatureRequestListProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<FeatureRequest[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(showFormOnly); // 営業の場合は最初からフォームを開く
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!showFormOnly) {
      loadRequests();
    }
  }, [showFormOnly]);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, categoryFilter, searchQuery]);

  const loadRequests = async () => {
    try {
      const allRequests = await bigQueryService.getFeatureRequests();
      // 営業の場合は自分のリクエストのみ表示
      if (!isAdmin && user) {
        const myRequests = allRequests.filter(r => r.requested_by === user.email);
        setRequests(myRequests);
      } else {
        setRequests(allRequests);
      }
    } catch (error) {
      console.error('Error loading feature requests:', error);
      toast.error('機能リクエストの読み込みに失敗しました');
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.requested_by_name.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleSubmit = async (requestData: Omit<FeatureRequest, 'request_id' | 'requested_at' | 'status'>) => {
    try {
      await bigQueryService.createFeatureRequest(requestData);
      toast.success('機能リクエストを送信しました');
      await loadRequests();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating feature request:', error);
      toast.error('機能リクエストの送信に失敗しました');
    }
  };

  const handleStatusUpdate = async (requestId: string, status: FeatureRequest['status'], comment?: string) => {
    try {
      await bigQueryService.updateFeatureRequest(requestId, {
        status,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
        ...(status === 'implemented' && { implemented_at: new Date().toISOString() }),
      });
      toast.success('ステータスを更新しました');
      await loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating feature request:', error);
      toast.error('ステータスの更新に失敗しました');
    }
  };

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 営業でフォームのみ表示の場合
  if (showFormOnly && !isAdmin && user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">機能リクエスト</h1>
          <p className="text-sm text-gray-600 mt-1">
            新機能の追加や改善案を管理部に送信できます
          </p>
        </div>
        <FeatureRequestForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          currentUserId={user.email}
          currentUserName={user.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">機能リクエスト</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin ? '営業からの機能リクエストを確認・管理できます' : '新機能の追加や改善案を管理部に送信できます'}
          </p>
        </div>
        {!isAdmin && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規リクエスト
          </Button>
        )}
      </div>

      {/* フィルター */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="タイトル、説明、依頼者名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
            >
              <option value="all">すべてのステータス</option>
              {FEATURE_REQUEST_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
            >
              <option value="all">すべてのカテゴリ</option>
              {FEATURE_REQUEST_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* リクエスト一覧 */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? '条件に一致するリクエストがありません'
                : 'リクエストがありません'}
            </p>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card
              key={request.request_id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    {getStatusBadge(request.status)}
                    <Badge variant="outline" className="border-gray-200 text-gray-700">
                      {getCategoryLabel(request.category)}
                    </Badge>
                    {request.priority === 'high' && (
                      <Badge className="bg-red-100 text-red-700">高優先度</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>依頼者: {request.requested_by_name}</span>
                    <span>依頼日: {formatDate(request.requested_at)}</span>
                    {request.reviewed_at && (
                      <span>レビュー日: {formatDate(request.reviewed_at)}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRequest(request);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 新規リクエストフォーム */}
      {!isAdmin && user && (
        <FeatureRequestForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          currentUserId={user.email}
          currentUserName={user.name}
        />
      )}

      {/* リクエスト詳細 */}
      {selectedRequest && (
        <FeatureRequestDetail
          request={selectedRequest}
          open={selectedRequest !== null}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={isAdmin ? handleStatusUpdate : undefined}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

