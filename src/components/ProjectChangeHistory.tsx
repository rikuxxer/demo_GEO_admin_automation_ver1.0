import { Clock, User, Package, MapPin, FileText, ArrowRight, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import type { Project, Segment, ChangeHistory } from '../types/schema';
import { DATA_LINK_STATUS_OPTIONS } from '../types/schema';
import { bigQueryService } from '../utils/bigquery';

interface ProjectChangeHistoryProps {
  project: Project;
  segments: Segment[];
}

export function ProjectChangeHistory({ project, segments }: ProjectChangeHistoryProps) {
  const histories = bigQueryService.getChangeHistories();
  
  // この案件に関連する変更履歴をフィルタリング
  const projectHistories = histories.filter((h: ChangeHistory) => 
    h.project_id === project.project_id
  ).sort((a: ChangeHistory, b: ChangeHistory) => 
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  // ステータス変更履歴をフィルタリング（特にdata_link_statusの変更）
  const statusChangeHistories = projectHistories.filter((h: ChangeHistory) => {
    if (h.action !== 'update' || !h.changes) return false;
    // data_link_statusの変更をチェック
    return 'data_link_status' in h.changes;
  });

  const getEntityName = (history: ChangeHistory): string => {
    if (history.entity_type === 'project') {
      return project.advertiser_name;
    } else if (history.entity_type === 'segment') {
      const segment = segments.find(s => s.segment_id === history.entity_id);
      return segment ? `セグメント: ${segment.segment_id}` : history.entity_id;
    } else if (history.entity_type === 'poi') {
      return `地点: ${history.entity_id}`;
    }
    return history.entity_id;
  };

  const getStatusLabel = (status: string): string => {
    const option = DATA_LINK_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'create':
        return '作成';
      case 'update':
        return '更新';
      case 'delete':
        return '削除';
      default:
        return action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="w-4 h-4" />;
      case 'update':
        return <Clock className="w-4 h-4" />;
      case 'delete':
        return <X className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'project':
        return <FileText className="w-4 h-4" />;
      case 'segment':
        return <Package className="w-4 h-4" />;
      case 'poi':
        return <MapPin className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-2">変更履歴</h2>
        <p className="text-muted-foreground">この案件に関するすべての変更履歴を確認できます</p>
      </div>

      {/* ステータス変更履歴 */}
      <Card className="border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-gray-900 font-medium">ステータス変更履歴</h3>
          <p className="text-sm text-muted-foreground mt-1">データ連携ステータスの変更履歴</p>
        </div>
        <div className="p-4">
          {statusChangeHistories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ステータス変更履歴がありません
            </div>
          ) : (
            <div className="space-y-3">
              {statusChangeHistories.map((history: ChangeHistory) => {
                const statusChange = history.changes?.data_link_status;
                return (
                  <div
                    key={history.history_id}
                    className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {getEntityIcon(history.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {getEntityName(history)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {getActionLabel(history.action)}
                        </Badge>
                      </div>
                      {statusChange && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-gray-500">ステータス:</span>
                          <Badge className="bg-gray-200 text-gray-700">
                            {getStatusLabel(statusChange.before)}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <Badge className="bg-blue-100 text-blue-700">
                            {getStatusLabel(statusChange.after)}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{history.changed_by}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(history.changed_at).toLocaleString('ja-JP')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* すべての変更履歴 */}
      <Card className="border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-gray-900 font-medium">すべての変更履歴</h3>
          <p className="text-sm text-muted-foreground mt-1">案件、セグメント、地点のすべての変更履歴</p>
        </div>
        <div className="p-4">
          {projectHistories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              変更履歴がありません
            </div>
          ) : (
            <div className="space-y-3">
              {projectHistories.map((history: ChangeHistory) => (
                <div
                  key={history.history_id}
                  className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {getEntityIcon(history.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {getEntityName(history)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getActionLabel(history.action)}
                      </Badge>
                    </div>
                    {history.changes && Object.keys(history.changes).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(history.changes).map(([field, change]) => (
                          <div key={field} className="text-xs text-gray-600">
                            <span className="font-medium">{field}:</span>{' '}
                            <span className="text-gray-500">{String(change.before)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400 inline mx-1" />
                            <span className="text-gray-700">{String(change.after)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{history.changed_by}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(history.changed_at).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

