import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { DATA_LINK_STATUS_OPTIONS, MEDIA_OPTIONS } from '../types/schema';
import type { Segment, Project } from '../types/schema';

interface SegmentStatusManagerProps {
  segments: Segment[];
  projects: Project[];
  onStatusChange: (segmentId: string, newStatus: string) => void;
}

export function SegmentStatusManager({ segments, projects, onStatusChange }: SegmentStatusManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMedia, setFilterMedia] = useState<string>('all');

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    return project ? project.advertiser_name : projectId;
  };

  const getMediaLabel = (mediaId: string) => {
    const media = MEDIA_OPTIONS.find(m => m.value === mediaId);
    return media ? media.label : mediaId;
  };

  const getStatusLabel = (status: string) => {
    const option = DATA_LINK_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const filteredSegments = segments.filter(segment => {
    const projectName = getProjectName(segment.project_id);
    const matchesSearch = 
      segment.segment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.project_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatusFilter = filterStatus === 'all' || segment.data_link_status === filterStatus;
    const matchesMediaFilter = filterMedia === 'all' || segment.media_id === filterMedia;
    
    return matchesSearch && matchesStatusFilter && matchesMediaFilter;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'before_poi_registration':
        return 'bg-gray-100 text-gray-700';
      case 'requested':
        return 'bg-yellow-100 text-yellow-700';
      case 'linking':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-gray-900 mb-2">セグメントステータス管理</h1>
        <p className="text-muted-foreground">全セグメントのデータ連携状況を一括管理できます</p>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="セグメントID、案件ID、広告主名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">すべてのステータス</option>
                {DATA_LINK_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterMedia}
                onChange={(e) => setFilterMedia(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">すべての媒体</option>
                {MEDIA_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* セグメントリスト */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700">セグメントID</th>
                <th className="px-4 py-3 text-left text-gray-700">案件名</th>
                <th className="px-4 py-3 text-left text-gray-700">配信媒体</th>
                <th className="px-4 py-3 text-left text-gray-700">登録日時</th>
                <th className="px-4 py-3 text-left text-gray-700">データ連携ステータス</th>
                <th className="px-4 py-3 text-left text-gray-700">ステータス変更</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSegments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {searchTerm || filterStatus !== 'all' || filterMedia !== 'all'
                      ? '該当するセグメントが見つかりませんでした' 
                      : 'セグメントがまだ登録されていません'}
                  </td>
                </tr>
              ) : (
                filteredSegments.map((segment) => (
                  <tr key={segment.segment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 font-mono px-2.5 py-1 whitespace-nowrap">
                        {segment.segment_id}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900">{getProjectName(segment.project_id)}</p>
                        <p className="text-sm text-muted-foreground">{segment.project_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-sm">
                        {getMediaLabel(segment.media_id)}
                      </div>
                      {segment.ads_account_id && (
                        <div className="text-xs text-muted-foreground">
                          Ads: {segment.ads_account_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-sm">
                        {new Date(segment.segment_registered_at).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(segment.segment_registered_at).toLocaleTimeString('ja-JP')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeColor(segment.data_link_status)}>
                        {getStatusLabel(segment.data_link_status)}
                      </Badge>
                      {segment.data_link_request_date && (
                        <div className="text-xs text-muted-foreground mt-1">
                          依頼日: {new Date(segment.data_link_request_date).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={segment.data_link_status}
                        onChange={(e) => onStatusChange(segment.segment_id, e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {DATA_LINK_STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* フッター統計 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredSegments.length > 0 
              ? `${filteredSegments.length}件のセグメントを表示中` 
              : '表示するセグメントがありません'}
          </span>
          {(filterStatus !== 'all' || filterMedia !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus('all');
                setFilterMedia('all');
              }}
              className="text-primary"
            >
              フィルターをクリア
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
