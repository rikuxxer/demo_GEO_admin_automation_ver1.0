import { useMemo } from 'react';
import { FileText, Link2, MapPin, Layers, User, Building2, FileEdit, Loader2, CheckCircle2, Info, Send, AlertTriangle } from 'lucide-react';
import type { Project, Segment, PoiInfo } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { countProjectsByStatus, getAutoProjectStatus, AutoProjectStatus } from '../utils/projectStatus';
import { canViewProject } from '../utils/editRequest';

interface SummaryCardsProps {
  projects: Project[];
  segments: Segment[];
  pois: PoiInfo[];
  selectedStatus?: AutoProjectStatus | 'total' | null;
  onCardClick?: (status: AutoProjectStatus | 'total') => void;
}

export function SummaryCards({ projects, segments, pois, selectedStatus, onCardClick }: SummaryCardsProps) {
  const { user } = useAuth();
  
  // 【閲覧権限のある案件のみをフィルタリング】
  // 営業の場合: 
  //   - 自分が主担当または副担当の案件（すべてのステータス）
  //   - 他の営業の連携完了案件のみ
  // 管理者の場合: すべての案件
  const filteredProjects = useMemo(() => {
    if (!Array.isArray(segments) || !Array.isArray(pois)) {
      return [];
    }
    try {
      return projects.filter(project => {
        const statusInfo = getAutoProjectStatus(project, segments, pois);
        return canViewProject(user, project, statusInfo.status);
      });
    } catch (error) {
      console.error('Error filtering projects:', error);
      return [];
    }
  }, [projects, segments, pois, user]);
  
  // ステータス別の案件数を自動判定
  const statusCounts = useMemo(() => {
    if (!Array.isArray(segments) || !Array.isArray(pois)) {
      return {
        draft: 0,
        waiting_poi: 0,
        waiting_account_id: 0,
        waiting_service_id: 0,
        in_progress: 0,
        link_requested: 0,
        linked: 0,
        expiring_soon: 0,
        total: 0,
      };
    }
    try {
      return countProjectsByStatus(filteredProjects, segments, pois);
    } catch (error) {
      console.error('Error counting projects by status:', error);
      return {
        draft: 0,
        waiting_poi: 0,
        waiting_account_id: 0,
        waiting_service_id: 0,
        in_progress: 0,
        link_requested: 0,
        linked: 0,
        expiring_soon: 0,
        total: 0,
      };
    }
  }, [filteredProjects, segments, pois]);

  // 入力不備の合計件数
  const waitingInputCount = useMemo(() => {
    return statusCounts.waiting_poi + 
           statusCounts.waiting_account_id + 
           statusCounts.waiting_service_id;
  }, [statusCounts]);

  const cards = useMemo(() => [
    {
      status: 'total' as const,
      icon: FileText,
      title: user?.role === 'sales' ? '担当案件数' : '総案件数',
      value: filteredProjects.length.toString(),
      subtitle: user?.role === 'sales' ? `${user?.name || ''}が担当` : '全案件',
      bgColor: 'bg-[#5b5fff]/10',
      iconColor: 'text-[#5b5fff]',
      tooltip: null,
    },
    {
      status: 'draft' as const,
      icon: FileEdit,
      title: '下書き',
      value: statusCounts.draft.toString(),
      subtitle: 'セグメント未登録',
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
      tooltip: '【下書き】\n・配下のセグメントが未登録（0件）',
    },
    {
      status: 'waiting_input' as const,
      icon: AlertTriangle,
      title: '入力不備あり',
      value: waitingInputCount.toString(),
      subtitle: '地点・ID・S-ID未入力',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      tooltip: '【入力不備あり】\n・地点未登録\n・アカウントID未入力\n・サービスID未入力\nのいずれかに該当する案件です',
    },
    {
      status: 'in_progress' as const,
      icon: CheckCircle2,
      title: '連携依頼待ち', // In Progress
      value: statusCounts.in_progress.toString(),
      subtitle: '入力完了・依頼待ち',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      tooltip: '【進行中（連携依頼待ち）】\n・すべての必須項目が入力されています\n・データ連携の依頼が可能です',
    },
    {
      status: 'link_requested' as const,
      icon: Send,
      title: '連携依頼済',
      value: statusCounts.link_requested.toString(),
      subtitle: 'データ連携依頼中',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      tooltip: '【データ連携依頼済】\n・データ連携を依頼済み\n・管理部の対応待ちです',
    },
    {
      status: 'linked' as const,
      icon: CheckCircle2, // Linked
      title: '連携完了',
      value: statusCounts.linked.toString(),
      subtitle: 'データ連携完了',
      bgColor: 'bg-sky-50',
      iconColor: 'text-sky-600',
      tooltip: '【連携完了】\n・すべてのセグメントのデータ連携が完了しています',
    },
    {
      status: 'expiring_soon' as const,
      icon: AlertTriangle,
      title: '期限切れ間近',
      value: statusCounts.expiring_soon.toString(),
      subtitle: '有効期限まで1ヶ月以内',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      tooltip: '【期限切れ間近】\n・データ連携済みですが、有効期限（連携から6ヶ月）が30日以内に迫っています',
    },
  ], [user, filteredProjects.length, statusCounts, waitingInputCount]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((card, index) => {
        const isSelected = selectedStatus === card.status;
        const isAnySelected = selectedStatus && selectedStatus !== 'total';
        const isDimmed = isAnySelected && !isSelected;

        return (
          <div 
            key={index} 
            className={`
              bg-white p-4 rounded-lg border shadow-sm group relative flex flex-col justify-between min-h-[140px]
              ${onCardClick ? 'cursor-pointer transition-all duration-200' : ''}
              ${isSelected ? 'ring-2 ring-[#5b5fff] ring-offset-2 border-[#5b5fff] shadow-md transform -translate-y-1' : 'border-gray-200'}
              ${!isSelected && onCardClick ? 'hover:shadow-md hover:-translate-y-1' : ''}
              ${isDimmed ? 'opacity-60 hover:opacity-100' : ''}
            `}
            onClick={() => onCardClick?.(card.status)}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center transition-colors`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {/* 選択中であることを示すチェックマーク（オプション） */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-[#5b5fff] text-white rounded-full p-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
                {card.tooltip && !isSelected && (
                  <div className="relative group/tooltip">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" onClick={(e) => e.stopPropagation()} />
                    <div className="absolute right-0 top-6 hidden group-hover/tooltip:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-pre-line">
                      {card.tooltip}
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-1">
                <p className={`text-xs whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${isSelected ? 'text-[#5b5fff] font-medium' : 'text-gray-600'}`} title={card.title}>{card.title}</p>
              </div>
              
              <div className="mb-1">
                <p className={`text-3xl transition-colors ${isSelected ? 'text-[#5b5fff] font-bold' : 'text-gray-900'}`}>{card.value}</p>
              </div>
            </div>
            
            <p className={`text-xs truncate transition-colors ${isSelected ? 'text-[#5b5fff]/80' : 'text-gray-500'}`} title={card.subtitle}>{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
