import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, User, FileEdit, Loader2, CheckCircle2, MapPin, Building2, Send, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import type { Project, Segment, PoiInfo } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { getAutoProjectStatus, getStatusColor, getStatusIcon, getStatusLabel, AutoProjectStatus, countProjectsByStatus } from '../utils/projectStatus';
import { canViewProject } from '../utils/editRequest';

interface ProjectTableProps {
  projects?: Project[];
  segments?: Segment[];
  pois?: PoiInfo[];
  statusFilter?: AutoProjectStatus | 'total' | null;
  onProjectClick?: (project: Project) => void;
  onClearStatusFilter?: () => void;
}

export function ProjectTable({ 
  projects: externalProjects = [], 
  segments = [],
  pois = [],
  statusFilter = null,
  onProjectClick,
  onClearStatusFilter
}: ProjectTableProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMyProjectsOnly, setShowMyProjectsOnly] = useState(true); // デフォルトでオン
  const [statusFilterLocal, setStatusFilterLocal] = useState<AutoProjectStatus | 'total' | null>(statusFilter ?? null);
  const itemsPerPage = 10;
  
  // 外部からのフィルタ変更を同期
  useEffect(() => {
    setStatusFilterLocal(statusFilter ?? null);
  }, [statusFilter]);
  
  // ユーザー情報が読み込まれたらフィルター状態を設定
  useEffect(() => {
    if (user?.role === 'sales') {
      setShowMyProjectsOnly(true);
    } else if (user?.role === 'admin') {
      setShowMyProjectsOnly(false);
    }
  }, [user]);

  // デバッグ用：フィルター状態の変更を監視
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProjectFilter] フィルター状態変更:', {
        showMyProjectsOnly,
        userRole: user?.role,
        userName: user?.name,
        totalProjects: externalProjects.length + 6 // mockProjects は常に6件
      });
    }
  }, [showMyProjectsOnly, user, externalProjects.length]);

  // Mock data（デモ用）
  const mockProjects: Project[] = Array.from({ length: 6 }, (_, i) => ({
    project_id: `PRJ-${String(i + 1).padStart(4, '0')}`,
    _register_datetime: new Date(2024, 9, 8 - i).toISOString(),
    advertiser_name: `広告主${i + 1}株式会社`,
    agency_name: i % 2 === 0 ? `代理店${i + 1}` : undefined,
    appeal_point: `サンプル訴求内容 ${i + 1}`,
    universe_service_id: `SVC-${i + 1}`,
    universe_service_name: `サービス${i + 1}`,
    delivery_start_date: new Date(2024, 10, 1).toISOString().split('T')[0],
    delivery_end_date: new Date(2024, 11, 31).toISOString().split('T')[0],
    person_in_charge: i % 2 === 0 ? '営業A' : '営業B',
    sub_person_in_charge: i % 4 === 0 ? (i % 2 === 0 ? '営業B' : '営業A') : undefined,
    remarks: i % 2 === 0 ? `備考 ${i + 1}` : undefined,
    project_status: i % 3 === 0 ? 'in_progress' : i % 3 === 1 ? 'completed' : 'draft',
  }));
  
  const allProjects = [...externalProjects, ...mockProjects];
  
  // デバッグ用：モックデータの担当者を表示
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('[ProjectFilter] モックデータの担当者:', mockProjects.map(p => ({
        id: p.project_id,
        person_in_charge: p.person_in_charge,
        sub_person_in_charge: p.sub_person_in_charge,
      })));
    }
  }, [user]);

  // ステータス別件数
  const statusCounts = useMemo(() => countProjectsByStatus(allProjects, segments, pois), [allProjects, segments, pois]);

  const filteredProjects = allProjects
    .filter(project => {
      // 【閲覧権限チェック】
      // 営業は自分の担当案件（主担当/副担当）または他の営業の連携完了案件のみ閲覧可能
      // 管理者はすべての案件を閲覧可能
      const statusInfo = getAutoProjectStatus(project, segments, pois);
      const hasViewPermission = canViewProject(user, project, statusInfo.status);
      
      if (!hasViewPermission) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProjectFilter] ${project.project_id}: 閲覧権限なし`);
        }
        return false;
      }

      // ステータスフィルタ
      if (statusFilterLocal && statusFilterLocal !== 'total') {
        if (statusFilterLocal === 'waiting_input') {
          // 入力不備系ステータスをまとめてフィルタリング
          if (statusInfo.status !== 'waiting_poi' && 
              statusInfo.status !== 'waiting_account_id' && 
              statusInfo.status !== 'waiting_service_id') {
            return false;
          }
        } else if (statusInfo.status !== statusFilterLocal) {
          return false;
        }
      }
      
      // 【自分の案件のみフィルタ】（営業のみ、任意でON/OFF可能）
      // ONの場合: 自分が担当している案件のみ表示
      // OFFの場合: 閲覧権限のあるすべての案件を表示（自分の案件 + 他人の連携完了案件）
      if (showMyProjectsOnly && user?.role === 'sales') {
        const isMyProject = project.person_in_charge === user.name || project.sub_person_in_charge === user.name;
        
        // デバッグ用ログ（開発モードのみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProjectFilter] ${project.project_id}:`, {
            showMyProjectsOnly,
            userName: user.name,
            personInCharge: project.person_in_charge,
            subPersonInCharge: project.sub_person_in_charge,
            isMyProject,
            result: isMyProject ? '✓表示' : '✗非表示'
          });
        }
        
        return isMyProject;
      }
      
      // フィルターOFFまたは管理者の場合
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProjectFilter] ${project.project_id}: フィルターOFFまたは管理者 → 表示`);
      }
      return true;
    })
    .filter(project =>
      project.project_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.advertiser_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.appeal_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.person_in_charge && project.person_in_charge.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // デバッグ用：フィルター後の件数とサマリーをログ出力
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('[ProjectFilter] ========== フィルター結果サマリー ==========');
      console.log(`ユーザー: ${user.name} (${user.role})`);
      console.log(`フィルターON: ${showMyProjectsOnly}`);
      console.log(`全案件数: ${allProjects.length}`);
      console.log(`フィルター後: ${filteredProjects.length}件`);
      console.log('表示される案件:', filteredProjects.map(p => ({
        id: p.project_id,
        person_in_charge: p.person_in_charge,
        sub_person_in_charge: p.sub_person_in_charge,
      })));
      console.log('[ProjectFilter] ==========================================');
    }
  }, [filteredProjects.length, showMyProjectsOnly, user]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateStr: string | undefined | null | Date | any) => {
    // null、undefined、空文字列の場合は「（日付不明）」を返す
    if (!dateStr || (typeof dateStr === 'string' && dateStr.trim() === '')) {
      return '（日付不明）';
    }
    
    // Dateオブジェクトの場合は直接処理
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) {
        return '（日付不明）';
      }
      try {
        return dateStr.toLocaleDateString('ja-JP');
      } catch (e) {
        console.warn('⚠️ formatDate() toLocaleDateString failed:', dateStr, e);
        return '（日付不明）';
      }
    }
    
    // オブジェクトの場合（BigQueryから返された可能性）
    if (typeof dateStr === 'object' && dateStr !== null) {
      // valueプロパティがある場合（BigQueryのDATE型がオブジェクトとして返される場合）
      if ('value' in dateStr && typeof dateStr.value === 'string') {
        dateStr = dateStr.value;
      } else if ('toString' in dateStr && typeof dateStr.toString === 'function') {
        // toString()メソッドがある場合は試行
        try {
          const str = dateStr.toString();
          if (str === '[object Object]') {
            console.warn('⚠️ formatDate: オブジェクトを文字列に変換できませんでした', dateStr);
            return '（日付不明）';
          }
          dateStr = str;
        } catch (e) {
          console.warn('⚠️ formatDate: オブジェクトの変換に失敗', dateStr, e);
          return '（日付不明）';
        }
      } else {
        console.warn('⚠️ formatDate: 未対応のオブジェクト形式', dateStr);
        return '（日付不明）';
      }
    }
    
    // 文字列として処理
    const dateString = String(dateStr).trim();
    
    // YYYY-MM-DD形式の文字列を直接処理（タイムゾーン問題を回避）
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1; // 月は0ベース
      const dayNum = parseInt(day, 10);
      
      // 有効な日付かチェック
      if (yearNum >= 1900 && yearNum <= 2100 && monthNum >= 0 && monthNum <= 11 && dayNum >= 1 && dayNum <= 31) {
        const date = new Date(yearNum, monthNum, dayNum);
        // 作成した日付が有効か確認（例: 2025-02-30は無効）
        if (date.getFullYear() === yearNum && date.getMonth() === monthNum && date.getDate() === dayNum) {
          try {
            return date.toLocaleDateString('ja-JP');
          } catch (e) {
            console.warn('⚠️ formatDate() toLocaleDateString failed:', dateString, e);
            return '（日付不明）';
          }
        }
      }
    }
    
    // YYYY-MM-DD形式でない場合は、Dateオブジェクトとして試行
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ formatDate: 無効な日付値', dateString);
      return '（日付不明）';
    }
    try {
      return date.toLocaleDateString('ja-JP');
    } catch (e) {
      console.warn('⚠️ formatDate() failed:', dateString, e);
      return '（日付不明）';
    }
  };

  const handleRowClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="text-sm text-gray-700">案件一覧</h3>
          </div>
          <span className="text-xs text-gray-500">
            （{filteredProjects.length}件{allProjects.length !== filteredProjects.length && ` / 全${allProjects.length}件`}）
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="案件ID、広告主名で検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 w-56 h-8 bg-white border-gray-200 text-sm rounded-md"
            />
          </div>
          
          {/* 自分の案件のみフィルタ（営業のみ表示） */}
          {user?.role === 'sales' && (
            <Button 
              variant={showMyProjectsOnly ? "default" : "outline"} 
              size="sm" 
              className={`h-8 text-xs px-3 ${showMyProjectsOnly ? 'bg-[#5b5fff] hover:bg-[#5b5fff]/90' : 'border-gray-200'}`}
              onClick={() => {
                const newValue = !showMyProjectsOnly;
                if (process.env.NODE_ENV === 'development') {
                  console.log('[ProjectFilter] ボタンクリック:', {
                    before: showMyProjectsOnly,
                    after: newValue,
                    userName: user?.name
                  });
                }
                setShowMyProjectsOnly(newValue);
              }}
            >
              <User className="w-3 h-3 mr-1" />
              自分の案件のみ
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {statusFilter && statusFilter !== 'total' && (
        <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-900">現在のフィルタ:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border bg-white shadow-sm ${getStatusColor(statusFilter).badge}`}>
              {getStatusIcon(statusFilter)}
              <span>{getStatusLabel(statusFilter)}</span>
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2" 
            onClick={onClearStatusFilter}
          >
            解除
            <X className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left">
              <th className="px-4 py-2 w-12">
                <Checkbox className="w-4 h-4" />
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  案件ID
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  登録日
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  広告主の法人名
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  訴求内容
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  担当者
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-xs text-gray-600">
                <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                  Status
                  <ChevronDown className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileEdit className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {showMyProjectsOnly && user?.role === 'sales' 
                          ? '自分の案件がありません' 
                          : '表示する案件がありません'}
                      </p>
                      {showMyProjectsOnly && user?.role === 'sales' && (
                        <p className="text-xs text-gray-500 mt-1">
                          新規案件を登録すると、ここに表示されます
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              currentProjects.map((project) => (
                <tr 
                  key={project.project_id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(project)}
                >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox className="w-4 h-4" />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{project.project_id.split('-')[1] || '1'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(project._register_datetime)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{project.advertiser_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{project.appeal_point.substring(0, 20)}...</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#5b5fff]/10 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-[#5b5fff]" />
                    </div>
                    <span className="text-sm text-gray-700">{project.person_in_charge}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const statusInfo = getAutoProjectStatus(project, segments, pois);
                    const color = getStatusColor(statusInfo.status);
                    
                    // ステータスに応じたアイコンコンポーネントを取得
                    let IconComponent;
                    switch (statusInfo.status) {
                      case 'draft': IconComponent = FileEdit; break;
                      case 'waiting_poi': IconComponent = MapPin; break;
                      case 'waiting_account_id': IconComponent = User; break;
                      case 'waiting_service_id': IconComponent = Building2; break;
                      case 'in_progress': IconComponent = CheckCircle2; break; // 準備完了
                      case 'link_requested': IconComponent = Send; break;
                      case 'linked': IconComponent = CheckCircle2; break;
                      case 'expiring_soon': IconComponent = AlertTriangle; break;
                      default: IconComponent = Loader2;
                    }
                    
                    return (
                      <span 
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${color.badge}`}
                        title={statusInfo.reason}
                      >
                        <IconComponent className="w-3 h-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                    );
                  })()}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 bg-white">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
            <span className="text-xs text-gray-600">Items per page</span>
          </div>
          
          <div className="text-xs text-gray-600">
            {filteredProjects.length > 0 ? (
              <>
                1-10 of {filteredProjects.length} items
              </>
            ) : (
              '表示する案件がありません'
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 mr-2">1 of 44 pages</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 p-0 border-gray-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 p-0 border-gray-200"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
