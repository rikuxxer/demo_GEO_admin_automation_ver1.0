import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  UserCheck, 
  Search, 
  CheckCircle, 
  XCircle,
  Clock,
  Mail,
  Briefcase,
  Shield,
  Calendar,
  MessageSquare
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Textarea } from './ui/textarea';

interface UserRequest {
  user_id: string;
  name: string;
  email: string;
  requested_role: 'admin' | 'sales';
  department?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_comment?: string;
}

interface UserApprovalManagementProps {
  requests: UserRequest[];
  onApprove: (userId: string, comment?: string) => Promise<void>;
  onReject: (userId: string, comment: string) => Promise<void>;
}

export function UserApprovalManagement({ 
  requests, 
  onApprove, 
  onReject 
}: UserApprovalManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => 
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.department && req.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [requests, searchTerm]);

  const pendingRequests = useMemo(() => 
    filteredRequests.filter(r => r.status === 'pending'),
    [filteredRequests]
  );

  const reviewedRequests = useMemo(() => 
    filteredRequests.filter(r => r.status !== 'pending'),
    [filteredRequests]
  );

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await onApprove(selectedRequest.user_id, comment || undefined);
      } else {
        if (!comment.trim()) {
          alert('却下理由を入力してください');
          return;
        }
        await onReject(selectedRequest.user_id, comment);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('処理エラー:', error);
      alert('処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setComment('');
  };

  const openApproveDialog = (request: UserRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setComment('');
  };

  const openRejectDialog = (request: UserRequest) => {
    setSelectedRequest(request);
    setActionType('reject');
    setComment('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            承認待ち
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            却下
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <UserCheck className="w-6 h-6 text-[#5b5fff]" />
        <h2 className="text-2xl font-bold text-gray-900">ユーザー登録申請管理</h2>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">承認待ち</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">承認済み</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">却下</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="名前、メール、部署で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 承認待ちリスト */}
      {pendingRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            承認待ちの申請 ({pendingRequests.length}件)
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.user_id} className="p-4 border-yellow-200 bg-yellow-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{request.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {request.email}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {request.requested_role === 'admin' ? (
                          <>
                            <Shield className="w-4 h-4 text-purple-600" />
                            <span>希望ロール: 管理者</span>
                          </>
                        ) : (
                          <>
                            <Briefcase className="w-4 h-4 text-orange-600" />
                            <span>希望ロール: 営業</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-600" />
                        <span>部署: {request.department || '未記入'}</span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="text-sm">
                        <p className="text-muted-foreground flex items-center gap-1 mb-1">
                          <MessageSquare className="w-3 h-3" />
                          申請理由
                        </p>
                        <p className="bg-white p-2 rounded border">{request.reason}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      申請日時: {(() => {
                        if (!request.requested_at) return '-';
                        const date = new Date(request.requested_at);
                        if (isNaN(date.getTime())) return '-';
                        try {
                          return date.toLocaleString('ja-JP');
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openApproveDialog(request)}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      承認
                    </Button>
                    <Button
                      onClick={() => openRejectDialog(request)}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      却下
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* 処理済みリスト */}
      {reviewedRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">処理済み ({reviewedRequests.length}件)</h3>
          <div className="space-y-3">
            {reviewedRequests.map((request) => (
              <Card key={request.user_id} className="p-4 bg-gray-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-gray-900">{request.name}</p>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                    {request.review_comment && (
                      <p className="text-sm mt-2 text-gray-600">
                        コメント: {request.review_comment}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>処理日時:</p>
                    <p>{(() => {
                      if (!request.reviewed_at) return '-';
                      const date = new Date(request.reviewed_at);
                      if (isNaN(date.getTime())) return '-';
                      try {
                        return date.toLocaleString('ja-JP');
                      } catch (e) {
                        return '-';
                      }
                    })()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* 空の状態 */}
      {filteredRequests.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchTerm 
                ? '該当する申請が見つかりませんでした' 
                : 'ユーザー登録申請がまだありません'}
            </p>
          </div>
        </Card>
      )}

      {/* 承認/却下ダイアログ */}
      <Dialog open={!!selectedRequest} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? '申請を承認しますか？' : '申請を却下しますか？'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-1 mt-2 text-sm">
                  <p><strong>名前:</strong> {selectedRequest.name}</p>
                  <p><strong>メール:</strong> {selectedRequest.email}</p>
                  <p><strong>希望ロール:</strong> {selectedRequest.requested_role === 'admin' ? '管理者' : '営業'}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm">
                コメント {actionType === 'reject' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === 'approve' 
                    ? 'コメント（任意）' 
                    : '却下理由を入力してください'
                }
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isProcessing ? (
                <>処理中...</>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      承認する
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      却下する
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

