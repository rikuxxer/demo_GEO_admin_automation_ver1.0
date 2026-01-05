import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { PROJECT_STATUS_OPTIONS } from '../types/schema';
import type { Project } from '../types/schema';

interface ProjectStatusManagerProps {
  projects: Project[];
  onStatusChange: (projectId: string, newStatus: string) => void;
}

export function ProjectStatusManager({ projects, onStatusChange }: ProjectStatusManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // 一時的なステータス変更を保持（projectId -> newStatus）
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, string>>({});

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.project_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.advertiser_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.person_in_charge.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || project.project_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status?: string) => {
    const option = PROJECT_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : '未設定';
  };

  // プルダウンで選択されたステータスを一時的に保持
  const handleStatusSelect = (projectId: string, newStatus: string) => {
    setPendingStatusChanges(prev => ({
      ...prev,
      [projectId]: newStatus,
    }));
  };

  // 決定ボタンでステータス変更を確定
  const handleConfirmStatusChange = (projectId: string) => {
    const newStatus = pendingStatusChanges[projectId];
    if (newStatus) {
      onStatusChange(projectId, newStatus);
      // 一時的な変更をクリア
      setPendingStatusChanges(prev => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-gray-900 mb-2">案件ステータス管理</h1>
        <p className="text-muted-foreground">案件の進行状況を一括管理できます</p>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="案件ID、広告主名、担当者で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">すべてのステータス</option>
              {PROJECT_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 案件リスト */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700">案件ID</th>
                <th className="px-4 py-3 text-left text-gray-700">広告主名</th>
                <th className="px-4 py-3 text-left text-gray-700">担当者</th>
                <th className="px-4 py-3 text-left text-gray-700">配信期間</th>
                <th className="px-4 py-3 text-left text-gray-700">現在のステータス</th>
                <th className="px-4 py-3 text-left text-gray-700">ステータス変更</th>
                <th className="px-4 py-3 text-left text-gray-700">決定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {searchTerm || filterStatus !== 'all' 
                      ? '該当する案件が見つかりませんでした' 
                      : '案件がまだ登録されていません'}
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const pendingStatus = pendingStatusChanges[project.project_id];
                  const currentDisplayStatus = pendingStatus || project.project_status || 'draft';
                  const hasPendingChange = pendingStatus !== undefined && pendingStatus !== project.project_status;
                  
                  return (
                    <tr key={project.project_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          {project.project_id}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900">{project.advertiser_name}</p>
                          {project.agency_name && (
                            <p className="text-sm text-muted-foreground">{project.agency_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {project.person_in_charge}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="text-sm">
                          <div>{(() => {
                            if (!project.delivery_start_date) return '（日付不明）';
                            const date = new Date(project.delivery_start_date);
                            if (isNaN(date.getTime())) return '（日付不明）';
                            try {
                              return date.toLocaleDateString('ja-JP');
                            } catch (e) {
                              return '（日付不明）';
                            }
                          })()}</div>
                          <div className="text-muted-foreground">
                            ~ {(() => {
                              if (!project.delivery_end_date) return '（日付不明）';
                              const date = new Date(project.delivery_end_date);
                              if (isNaN(date.getTime())) return '（日付不明）';
                              try {
                                return date.toLocaleDateString('ja-JP');
                              } catch (e) {
                                return '（日付不明）';
                              }
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeColor(project.project_status)}>
                          {getStatusLabel(project.project_status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={currentDisplayStatus}
                          onChange={(e) => handleStatusSelect(project.project_id, e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {PROJECT_STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {hasPendingChange && (
                          <p className="text-xs text-orange-600 mt-1">
                            → {getStatusLabel(pendingStatus)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasPendingChange ? (
                          <Button
                            onClick={() => handleConfirmStatusChange(project.project_id)}
                            size="sm"
                            className="text-xs h-7 bg-[#5b5fff] hover:bg-[#5b5fff]/90 text-white"
                          >
                            決定
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* フッター統計 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredProjects.length > 0 
              ? `${filteredProjects.length}件の案件を表示中` 
              : '表示する案件がありません'}
          </span>
          {filterStatus !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterStatus('all')}
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
