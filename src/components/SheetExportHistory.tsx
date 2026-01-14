import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Loader2,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { XCircle } from 'lucide-react';

interface SheetExport {
  export_id: string;
  project_id: string;
  segment_id?: string;
  exported_by: string;
  exported_by_name: string;
  export_status: 'pending' | 'completed' | 'failed';
  spreadsheet_id?: string;
  sheet_name?: string;
  row_count?: number;
  exported_at: string;
  completed_at?: string;
  error_message?: string;
}

interface SheetExportData {
  export_data_id: string;
  export_id: string;
  project_id: string;
  segment_id?: string;
  poi_id?: string;
  category_id?: string;
  brand_name?: string;
  poi_name?: string;
  latitude?: number;
  longitude?: number;
  prefecture?: string;
  city?: string;
  radius?: string;
  setting_flag?: string;
  created?: string;
  row_index?: number;
}

interface SheetExportHistoryProps {
  currentUserId?: string;
  currentUserName?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function SheetExportHistory({ currentUserId, currentUserName }: SheetExportHistoryProps) {
  const [exports, setExports] = useState<SheetExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExport, setSelectedExport] = useState<SheetExport | null>(null);
  const [exportData, setExportData] = useState<SheetExportData[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showReexportDialog, setShowReexportDialog] = useState(false);
  const [reexporting, setReexporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  // エクスポート履歴を取得
  const fetchExports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterProjectId) {
        params.append('projectId', filterProjectId);
      }
      params.append('limit', '100');

      const response = await fetch(`${API_BASE_URL}/api/sheets/exports?${params.toString()}`);
      if (!response.ok) {
        throw new Error('エクスポート履歴の取得に失敗しました');
      }
      const data = await response.json();
      setExports(data);
    } catch (error) {
      console.error('エクスポート履歴取得エラー:', error);
      toast.error('エクスポート履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // エクスポートデータを取得
  const fetchExportData = async (exportId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sheets/exports/${exportId}/data`);
      if (!response.ok) {
        throw new Error('エクスポートデータの取得に失敗しました');
      }
      const data = await response.json();
      setExportData(data);
    } catch (error) {
      console.error('エクスポートデータ取得エラー:', error);
      toast.error('エクスポートデータの取得に失敗しました');
    }
  };

  // 詳細表示
  const handleShowDetail = async (exportItem: SheetExport) => {
    setSelectedExport(exportItem);
    await fetchExportData(exportItem.export_id);
    setShowDetail(true);
  };

  // 再エクスポート
  const handleReexport = async () => {
    if (!selectedExport) return;

    setReexporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sheets/exports/${selectedExport.export_id}/reexport`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '再エクスポートに失敗しました');
      }

      const result = await response.json();
      toast.success(result.message || '再エクスポートが完了しました');
      setShowReexportDialog(false);
      setShowDetail(false);
      await fetchExports(); // 履歴を更新
    } catch (error) {
      console.error('再エクスポートエラー:', error);
      toast.error(error instanceof Error ? error.message : '再エクスポートに失敗しました');
    } finally {
      setReexporting(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, [filterStatus, filterProjectId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            完了
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            失敗
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            処理中
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
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
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">スプレッドシートエクスポート履歴</h2>
          <p className="text-sm text-gray-600 mt-1">エクスポート履歴の確認と再エクスポートができます</p>
        </div>
        <Button onClick={fetchExports} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* フィルター */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">ステータス</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">すべて</option>
              <option value="pending">処理中</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">案件ID</label>
            <input
              type="text"
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              placeholder="PRJ-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setFilterStatus('all');
                setFilterProjectId('');
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              フィルターをリセット
            </Button>
          </div>
        </div>
      </Card>

      {/* エクスポート履歴一覧 */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        ) : exports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>エクスポート履歴がありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">エクスポートID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">案件ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">実行者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">行数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">エクスポート日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exports.map((exportItem) => (
                  <tr key={exportItem.export_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {exportItem.export_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {exportItem.project_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {exportItem.exported_by_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(exportItem.export_status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {exportItem.row_count || 0}件
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(exportItem.exported_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleShowDetail(exportItem)}
                          variant="ghost"
                          size="sm"
                          className="h-8"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Button>
                        {exportItem.export_status === 'failed' && (
                          <Button
                            onClick={() => {
                              setSelectedExport(exportItem);
                              setShowReexportDialog(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            再エクスポート
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 詳細モーダル */}
      {showDetail && selectedExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">エクスポート詳細</h3>
                <Button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedExport(null);
                    setExportData([]);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">エクスポートID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedExport.export_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ステータス</label>
                  <div className="mt-1">{getStatusBadge(selectedExport.export_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">案件ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedExport.project_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">セグメントID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedExport.segment_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">実行者</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedExport.exported_by_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">行数</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedExport.row_count || 0}件</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">エクスポート日時</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedExport.exported_at)}</p>
                </div>
                {selectedExport.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">完了日時</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedExport.completed_at)}</p>
                  </div>
                )}
                {selectedExport.error_message && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-red-700">エラーメッセージ</label>
                    <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{selectedExport.error_message}</p>
                  </div>
                )}
              </div>

              {/* エクスポートデータ */}
              {exportData.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">エクスポートデータ ({exportData.length}件)</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">行番号</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">地点ID</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">地点名</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">ブランド名</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">都道府県</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">市区町村</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">半径</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {exportData.map((data) => (
                            <tr key={data.export_data_id}>
                              <td className="px-3 py-2 text-gray-900">{data.row_index || '-'}</td>
                              <td className="px-3 py-2 text-gray-900 font-mono text-xs">{data.poi_id || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">{data.poi_name || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">{data.brand_name || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">{data.prefecture || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">{data.city || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">{data.radius || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作ボタン */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedExport.export_status === 'failed' && (
                  <Button
                    onClick={() => {
                      setShowDetail(false);
                      setShowReexportDialog(true);
                    }}
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    再エクスポート
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedExport(null);
                    setExportData([]);
                  }}
                  variant="outline"
                >
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 再エクスポート確認ダイアログ */}
      <AlertDialog open={showReexportDialog} onOpenChange={setShowReexportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>再エクスポートの確認</AlertDialogTitle>
            <AlertDialogDescription>
              このエクスポートを再実行しますか？
              {selectedExport && (
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>エクスポートID:</strong> {selectedExport.export_id}</p>
                  <p><strong>案件ID:</strong> {selectedExport.project_id}</p>
                  <p><strong>行数:</strong> {selectedExport.row_count || 0}件</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reexporting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleReexport} disabled={reexporting}>
              {reexporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  再エクスポート中...
                </>
              ) : (
                '再エクスポート'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
