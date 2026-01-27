import { useState, lazy, Suspense } from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
const SummaryCards = lazy(() => import('./SummaryCards').then(module => ({ default: module.SummaryCards })));
import { DATA_LINK_STATUS_OPTIONS, MEDIA_OPTIONS, LOCATION_REQUEST_STATUS_OPTIONS } from '../types/schema';
import type { Project, Segment, PoiInfo } from '../types/schema';
import { AutoProjectStatus, getAutoProjectStatus } from '../utils/projectStatus';

interface StatusManagerProps {
  projects: Project[];
  segments: Segment[];
  pois?: PoiInfo[];
  onProjectClick?: (projectId: string) => void;
}

export function StatusManager({ 
  projects, 
  segments, 
  pois = [],
  onProjectClick
}: StatusManagerProps) {
  const [segmentSearchTerm, setSegmentSearchTerm] = useState('');
  const [segmentFilterStatus, setSegmentFilterStatus] = useState<string>('all');
  const [segmentFilterMedia, setSegmentFilterMedia] = useState<string>('all');
  const [segmentFilterDate, setSegmentFilterDate] = useState<string>('all');
  const [segmentFilterLocation, setSegmentFilterLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AutoProjectStatus | 'total' | null>(null);

  // セグメントのフィルタリング
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    return project ? project.advertiser_name : projectId;
  };

  const getMediaLabel = (mediaId: string | string[]) => {
    if (Array.isArray(mediaId)) {
      return mediaId.map(id => {
        const media = MEDIA_OPTIONS.find(m => m.value === id);
        return media ? media.label : id;
      }).join(', ');
    }
    const media = MEDIA_OPTIONS.find(m => m.value === mediaId);
    return media ? media.label : mediaId;
  };

  // 日付フィルターの判定関数
  const matchesDateFilter = (projectStartDate: string | undefined): boolean => {
    if (segmentFilterDate === 'all' || !projectStartDate) {
      return segmentFilterDate === 'all';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻をリセット
    
    const startDate = new Date(projectStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (segmentFilterDate) {
      case 'today':
        return daysDiff === 0; // 本日開始
      case '3days':
        return daysDiff >= 0 && daysDiff <= 3; // 3日以内
      case '1week':
        return daysDiff >= 0 && daysDiff <= 7; // 1週間以内
      default:
        return true;
    }
  };

  const filteredSegments = segments.filter(segment => {
    const projectName = getProjectName(segment.project_id);
    const project = projects.find(p => p.project_id === segment.project_id);
    const projectStartDate = project?.delivery_start_date;
    const projectStatusInfo = project ? getAutoProjectStatus(project, segments, pois) : null;
    
    const matchesSearch = 
      segment.segment_id.toLowerCase().includes(segmentSearchTerm.toLowerCase()) ||
      segment.project_id.toLowerCase().includes(segmentSearchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(segmentSearchTerm.toLowerCase());
    
    const matchesStatusFilter = segmentFilterStatus === 'all' || segment.data_link_status === segmentFilterStatus;
    const matchesMediaFilter = segmentFilterMedia === 'all' || segment.media_id === segmentFilterMedia;
    const matchesDate = matchesDateFilter(projectStartDate);
    const matchesLocationFilter = segmentFilterLocation === 'all' || segment.location_request_status === segmentFilterLocation;
    const matchesProjectStatus = (() => {
      if (!statusFilter || statusFilter === 'total') return true;
      if (!projectStatusInfo) return false;
      if (statusFilter === 'waiting_input') {
        return (
          projectStatusInfo.status === 'waiting_poi' ||
          projectStatusInfo.status === 'waiting_account_id' ||
          projectStatusInfo.status === 'waiting_service_id'
        );
      }
      return projectStatusInfo.status === statusFilter;
    })();
    
    return (
      matchesSearch &&
      matchesStatusFilter &&
      matchesMediaFilter &&
      matchesDate &&
      matchesLocationFilter &&
      matchesProjectStatus
    );
  });

  // セグメントステータスの表示用関数
  const getSegmentStatusBadgeColor = (status: string) => {
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

  const getSegmentStatusLabel = (status: string) => {
    const option = DATA_LINK_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getLocationStatusLabel = (status: string) => {
    const option = LOCATION_REQUEST_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getLocationStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not_requested':
        return 'bg-gray-100 text-gray-700';
      case 'storing':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">案件一覧</h1>
        <p className="text-muted-foreground">案件とセグメントの一覧を確認できます</p>
      </div>

      {/* 案件サマリ */}
      <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5"><div className="bg-white p-4 rounded-lg border shadow-sm">読み込み中...</div></div>}>
        <SummaryCards 
          projects={projects}
          segments={segments}
          pois={pois}
          selectedStatus={statusFilter}
          onCardClick={setStatusFilter}
        />
      </Suspense>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          {/* 検索・フィルター */}
          <Card className="border border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="セグメントID、案件ID、広告主名で検索..."
                    value={segmentSearchTerm}
                    onChange={(e) => setSegmentSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                  value={segmentFilterDate}
                  onChange={(e) => setSegmentFilterDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                  <option value="all">すべての日付</option>
                  <option value="today">本日開始</option>
                  <option value="3days">3日以内</option>
                  <option value="1week">1週間以内</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                  value={segmentFilterMedia}
                  onChange={(e) => setSegmentFilterMedia(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                  <option value="all">すべての媒体</option>
                  {MEDIA_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={segmentFilterLocation}
                    onChange={(e) => setSegmentFilterLocation(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">すべての格納状況</option>
                    {LOCATION_REQUEST_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={segmentFilterStatus}
                  onChange={(e) => setSegmentFilterStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">すべてのステータス</option>
                  {DATA_LINK_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              </div>
            </div>
          </Card>

          {/* セグメントリスト */}
          <Card className="border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">セグメントID</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">案件名</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">案件開始日</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">配信媒体</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">登録日時</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">地点格納状況</th>
                    <th className="px-3 py-2 text-left text-gray-700 text-xs font-medium">データ連携ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSegments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-sm">
                        {segmentSearchTerm || segmentFilterStatus !== 'all' || segmentFilterMedia !== 'all' || segmentFilterDate !== 'all' || segmentFilterLocation !== 'all'
                          ? '該当するセグメントが見つかりませんでした' 
                          : 'セグメントがまだ登録されていません'}
                      </td>
                    </tr>
                  ) : (
                    filteredSegments.map((segment) => {
                      const project = projects.find(p => p.project_id === segment.project_id);
                      const projectStartDate = project?.delivery_start_date;
                      
                      return (
                        <tr key={segment.segment_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs font-mono px-2 py-1 whitespace-nowrap">
                              {segment.segment_id}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              {onProjectClick ? (
                                <button
                                  onClick={() => onProjectClick(segment.project_id)}
                                  className="text-left hover:underline text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer transition-colors"
                                >
                                  {getProjectName(segment.project_id)}
                                </button>
                              ) : (
                                <p className="text-gray-900 text-sm">{getProjectName(segment.project_id)}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{segment.project_id}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            <div className="text-xs">
                              {(() => {
                                if (!projectStartDate) return '-';
                                // オブジェクト形式の日付に対応
                                let dateValue: any = projectStartDate;
                                if (typeof dateValue === 'object' && dateValue !== null) {
                                  if ('value' in dateValue) {
                                    dateValue = (dateValue as any).value;
                                  } else if (dateValue instanceof Date) {
                                    // Dateオブジェクトの場合はそのまま使用
                                  } else {
                                    try {
                                      dateValue = String(dateValue);
                                      if (dateValue === '[object Object]') {
                                        return '-';
                                      }
                                    } catch (e) {
                                      return '-';
                                    }
                                  }
                                }
                                const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
                                if (isNaN(date.getTime())) return '-';
                                try {
                                  return date.toLocaleDateString('ja-JP');
                                } catch (e) {
                                  return '-';
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            <div className="text-xs">
                              {getMediaLabel(segment.media_id)}
                            </div>
                            {segment.ads_account_id && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Ads: {segment.ads_account_id}
                              </div>
                            )}
                          </td>
                        <td className="px-3 py-2 text-gray-700">
                          <div className="text-xs">
                            {(() => {
                              if (!segment.segment_registered_at) return '（日付不明）';
                              const date = new Date(segment.segment_registered_at);
                              if (isNaN(date.getTime())) return '（日付不明）';
                              try {
                                return date.toLocaleDateString('ja-JP');
                              } catch (e) {
                                return '（日付不明）';
                              }
                            })()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              if (!segment.segment_registered_at) return '（時刻不明）';
                              const date = new Date(segment.segment_registered_at);
                              if (isNaN(date.getTime())) return '（時刻不明）';
                              try {
                                return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                              } catch (e) {
                                return '（時刻不明）';
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`${getLocationStatusBadgeColor(segment.location_request_status)} text-xs`}>
                            {getLocationStatusLabel(segment.location_request_status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`${getSegmentStatusBadgeColor(segment.data_link_status)} text-xs`}>
                            {getSegmentStatusLabel(segment.data_link_status)}
                          </Badge>
                          {segment.data_link_request_date && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              依頼: {(() => {
                                const date = new Date(segment.data_link_request_date);
                                if (isNaN(date.getTime())) return '（日付不明）';
                                try {
                                  return date.toLocaleDateString('ja-JP');
                                } catch (e) {
                                  return '（日付不明）';
                                }
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* フッター統計 */}
          <Card className="border border-gray-200">
            <div className="p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {filteredSegments.length}件のセグメントを表示中
                </span>
                {(segmentFilterStatus !== 'all' || segmentFilterMedia !== 'all' || segmentFilterDate !== 'all' || segmentFilterLocation !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSegmentFilterStatus('all');
                      setSegmentFilterMedia('all');
                      setSegmentFilterDate('all');
                      setSegmentFilterLocation('all');
                    }}
                    className="text-primary text-xs h-7"
                  >
                    フィルターをクリア
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

