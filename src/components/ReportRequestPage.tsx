import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, RefreshCw, FileBarChart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table';
import { toast } from 'sonner';
import { bigQueryService } from '@/utils/bigquery';
import { useAuth } from '../contexts/AuthContext';
import { ReportRequestForm } from './ReportRequestForm';
import { ReportRequestDetail } from './ReportRequestDetail';
import {
  REPORT_REQUEST_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
  getReportTypeLabel,
  type ReportRequest,
  type Project,
} from '@/types/schema';

interface ReportRequestPageProps {
  isAdmin?: boolean;
}

export function ReportRequestPage({ isAdmin = false }: ReportRequestPageProps) {
  const { user } = useAuth();

  const [requests, setRequests] = useState<ReportRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqList, projList] = await Promise.all([
        bigQueryService.getReportRequests(),
        bigQueryService.getProjects(),
      ]);
      setProjects(projList);
      setRequests(reqList);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRequests = requests.filter((r) => {
    if (!isAdmin && user?.email && r.requested_by !== user.id) return false;
    if (projectFilter !== 'all' && r.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.report_type !== typeFilter) return false;
    return true;
  });

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj.project_id === projectId);
    return p?.project_name || projectId;
  };

  const getStatusBadge = (status: ReportRequest['status']) => {
    const opt = REPORT_REQUEST_STATUS_OPTIONS.find((s) => s.value === status);
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
    };
    return <Badge className={colorMap[opt?.color || 'yellow']}>{opt?.label || status}</Badge>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('ja-JP', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleSubmit = async (request: Omit<ReportRequest, 'request_id' | 'requested_at' | 'status'>) => {
    try {
      await bigQueryService.createReportRequest(request);
      toast.success('レポート依頼を送信しました');
      loadData();
    } catch {
      toast.error('レポート依頼の送信に失敗しました');
    }
  };

  // Unique report types present in current data (for filter dropdown with legacy support)
  const allReportTypes = new Set(requests.map((r) => r.report_type));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileBarChart className="w-6 h-6 text-[#5b5fff]" />
          <h1 className="text-2xl font-bold text-gray-900">レポート作成依頼</h1>
        </div>
        {!isAdmin && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規レポート依頼
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
        >
          <option value="all">すべてのプロジェクト</option>
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
        >
          <option value="all">すべてのステータス</option>
          {REPORT_REQUEST_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
        >
          <option value="all">すべての種別</option>
          {REPORT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {/* Legacy types in data that aren't in current options */}
          {[...allReportTypes]
            .filter((t) => !REPORT_TYPE_OPTIONS.some((o) => o.value === t))
            .map((t) => (
              <option key={t} value={t}>{getReportTypeLabel(t)}</option>
            ))}
        </select>
        <Button variant="outline" size="sm" onClick={loadData} className="h-9">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          更新
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={loadData}>再試行</Button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">レポート依頼はまだありません</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ステータス</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>プロジェクト</TableHead>
              <TableHead>集計期間</TableHead>
              {isAdmin && <TableHead>依頼者</TableHead>}
              <TableHead>依頼日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((r) => (
              <TableRow
                key={r.request_id}
                className="cursor-pointer"
                onClick={() => setSelectedRequest(r)}
              >
                <TableCell>{getStatusBadge(r.status)}</TableCell>
                <TableCell className="text-sm">{getReportTypeLabel(r.report_type)}</TableCell>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.report_title}</TableCell>
                <TableCell className="text-sm text-gray-600">{getProjectName(r.project_id)}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {r.start_date && r.end_date
                    ? `${formatDate(r.start_date)} 〜 ${formatDate(r.end_date)}`
                    : '-'}
                </TableCell>
                {isAdmin && <TableCell className="text-sm text-gray-600">{r.requested_by_name}</TableCell>}
                <TableCell className="text-sm text-gray-500">{formatDateTime(r.requested_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Form Dialog */}
      <ReportRequestForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        projects={projects}
        currentUserId={user?.id || ''}
        currentUserName={user?.name || ''}
      />

      {/* Detail Dialog */}
      {selectedRequest && (
        <ReportRequestDetail
          request={selectedRequest}
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          projectName={getProjectName(selectedRequest.project_id)}
        />
      )}
    </div>
  );
}
