import { Users, TrendingUp, Award, Target } from 'lucide-react';
import { Project, Segment, PoiInfo } from '../types/schema';
import { Badge } from './ui/badge';

interface SalesPerformanceProps {
  projects: Project[];
  segments: Segment[];
  pois: PoiInfo[];
}

interface SalesStats {
  name: string;
  projectCount: number;
  segmentCount: number;
  poiCount: number;
  activeProjects: number;
  completedProjects: number;
}

export function SalesPerformance({ projects, segments, pois }: SalesPerformanceProps) {
  // 営業担当者ごとの集計を作成
  const salesMap = new Map<string, SalesStats>();
  
  projects.forEach(project => {
    const salesName = project.person_in_charge;
    if (!salesName) return;
    
    if (!salesMap.has(salesName)) {
      salesMap.set(salesName, {
        name: salesName,
        projectCount: 0,
        segmentCount: 0,
        poiCount: 0,
        activeProjects: 0,
        completedProjects: 0,
      });
    }
    
    const stats = salesMap.get(salesName)!;
    stats.projectCount++;
    
    // ステータス別集計
    if (project.project_status === '進行中') {
      stats.activeProjects++;
    } else if (project.project_status === '完了') {
      stats.completedProjects++;
    }
    
    // セグメント数を集計
    const projectSegments = segments.filter(s => s.project_id === project.project_id);
    stats.segmentCount += projectSegments.length;
    
    // 地点数を集計
    projectSegments.forEach(segment => {
      const segmentPois = pois.filter(p => p.segment_id === segment.segment_id);
      stats.poiCount += segmentPois.length;
    });
  });
  
  // 集計結果を配列に変換し、案件数でソート
  const salesStats = Array.from(salesMap.values()).sort((a, b) => b.projectCount - a.projectCount);
  
  if (salesStats.length === 0) {
    return null;
  }
  
  // トップパフォーマー（案件数が最も多い営業）
  const topPerformer = salesStats[0];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-gray-900 font-medium">営業担当者別パフォーマンス</h3>
            <p className="text-sm text-gray-600">担当案件数と進捗状況</p>
          </div>
        </div>
        
        {/* トップパフォーマーバッジ */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg px-4 py-2">
          <Award className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs text-amber-600 font-medium">トップパフォーマー</p>
            <p className="text-sm text-amber-900">{topPerformer.name}</p>
          </div>
        </div>
      </div>
      
      {/* 営業担当者リスト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salesStats.map((stats, index) => {
          const isTop = index === 0;
          
          return (
            <div 
              key={stats.name}
              className={`p-4 rounded-lg border-2 transition-all ${
                isTop 
                  ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-[#5b5fff]/30 hover:bg-[#5b5fff]/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isTop ? 'bg-amber-100' : 'bg-[#5b5fff]/10'
                  }`}>
                    <Users className={`w-4 h-4 ${isTop ? 'text-amber-600' : 'text-[#5b5fff]'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{stats.name}</p>
                    {isTop && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100 mt-0.5">
                        #1
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#5b5fff]">{stats.projectCount}</p>
                  <p className="text-xs text-gray-600">案件</p>
                </div>
              </div>
              
              <div className="space-y-2 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    セグメント
                  </span>
                  <span className="font-medium text-gray-900">{stats.segmentCount}件</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    地点数
                  </span>
                  <span className="font-medium text-gray-900">{stats.poiCount}件</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">進行中</span>
                  <span className="font-medium text-emerald-600">{stats.activeProjects}件</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">完了</span>
                  <span className="font-medium text-blue-600">{stats.completedProjects}件</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
