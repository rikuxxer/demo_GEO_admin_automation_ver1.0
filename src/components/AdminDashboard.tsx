import { useState } from 'react';
import { BarChart3, ClipboardCheck, AlertCircle, CheckCircle, Clock, TrendingDown, Target, DollarSign, Loader2, FileText, Package, MapPin, Activity } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { Project, Segment, EditRequest } from '../types/schema';
import { 
  calculateAverageRegistrationTime, 
  getRegistrationTimeTrend,
  getRegistrationTimeInMinutes
} from '../utils/registrationTime';
import { addSampleRegistrationData } from '../utils/addSampleRegistrationData';
import { addSampleChangeHistory } from '../utils/addSampleChangeHistory';
import { analyzeWorkTime, formatWorkTime } from '../utils/workTimeAnalysis';
import { exportQueueToCSV, getExportQueue, exportQueueToGoogleSheets } from '../utils/spreadsheetExport';
import { SheetExportHistory } from './SheetExportHistory';

interface AdminDashboardProps {
  projects: Project[];
  segments: Segment[];
  editRequests?: EditRequest[];
  onEditRequestApprove?: (requestId: string, comment: string) => void;
  onEditRequestReject?: (requestId: string, comment: string) => void;
  onEditRequestWithdraw?: (requestId: string) => void;
  currentUserId?: string;
  onRefresh?: () => void;
}

export function AdminDashboard({ 
  projects = [], 
  segments = [],
  editRequests = [],
  onEditRequestApprove: _onEditRequestApprove,
  onEditRequestReject: _onEditRequestReject,
  onEditRequestWithdraw: _onEditRequestWithdraw,
  currentUserId: _currentUserId = '',
  onRefresh: _onRefresh
}: AdminDashboardProps) {
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exports'>('dashboard');

  const handleAddSampleData = async () => {
    setIsAddingSample(true);
    try {
      console.log('🔄 サンプルデータ追加処理を開始します...');
      addSampleRegistrationData();
      await addSampleChangeHistory(); // 変更履歴のサンプルデータも追加
      console.log('✅ サンプルデータを追加しました');
      
      // localStorageの更新を確実にするため、少し待ってからリロード
      setTimeout(() => {
        console.log('🔄 ページをリロードします...');
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ サンプルデータの追加に失敗しました:', error);
      setIsAddingSample(false);
    }
  };
  // 案件ステータス別カウント
  const projectsByStatus = {
    draft: projects.filter(p => p.project_status === 'draft').length,
    in_progress: projects.filter(p => p.project_status === 'in_progress').length,
    pending: projects.filter(p => p.project_status === 'pending').length,
    completed: projects.filter(p => p.project_status === 'completed').length,
    cancelled: projects.filter(p => p.project_status === 'cancelled').length,
  };

  // セグメントステータス別カウント
  const segmentsByStatus = {
    before_poi_registration: segments.filter(s => s.data_link_status === 'before_poi_registration').length,
    requested: segments.filter(s => s.data_link_status === 'requested').length,
    linking: segments.filter(s => s.data_link_status === 'linking').length,
    completed: segments.filter(s => s.data_link_status === 'completed').length,
    error: segments.filter(s => s.data_link_status === 'error').length,
  };

  // 営業全員の平均登録時間
  const averageRegistrationTime = calculateAverageRegistrationTime(projects);
  
  // 時系列での推移データ（過去30日）
  const registrationTimeTrend = getRegistrationTimeTrend(projects, 30);

  // デバッグ: 参照しているデータを確認
  const projectsWithStartTime = projects.filter(p => p.project_registration_started_at);
  const registrationTimes = projectsWithStartTime
    .map(p => getRegistrationTimeInMinutes(p))
    .filter((t): t is number => t !== null);
  
  console.log('🔍 削減時間の計算に使用しているデータ:');
  console.log(`  全案件数: ${projects.length}件`);
  console.log(`  登録開始時点が記録されている案件数: ${projectsWithStartTime.length}件`);
  console.log(`  有効な登録時間データ数: ${registrationTimes.length}件`);
  if (registrationTimes.length > 0) {
    const calculatedAvg = registrationTimes.reduce((a, b) => a + b, 0) / registrationTimes.length;
    console.log(`  計算された平均登録時間: ${Math.round(calculatedAvg * 100) / 100}分`);
    console.log(`  最小: ${Math.min(...registrationTimes)}分, 最大: ${Math.max(...registrationTimes)}分`);
    console.log(`  calculateAverageRegistrationTimeの結果: ${averageRegistrationTime}分`);
    
    // 登録時間の分布を確認（5分未満、5-10分、10分超）
    const under5 = registrationTimes.filter(t => t < 5).length;
    const between5and10 = registrationTimes.filter(t => t >= 5 && t <= 10).length;
    const over10 = registrationTimes.filter(t => t > 10).length;
    console.log(`  登録時間の分布: 5分未満=${under5}件, 5-10分=${between5and10}件, 10分超=${over10}件`);
    console.log(`  登録時間の範囲: ${Math.min(...registrationTimes)}分 ～ ${Math.max(...registrationTimes)}分`);
    console.log(`  登録時間の詳細（最初の10件）:`, registrationTimes.slice(0, 10));
  }

  // 削減時間、想定アポ創出数、想定売上金額を計算
  const calculateMetrics = () => {
    if (averageRegistrationTime === null || averageRegistrationTime === undefined) {
      console.log('⚠️ 平均登録時間がnullまたはundefinedです');
      return {
        reducedTime: null,
        estimatedAppointments: null,
        estimatedSales: null,
      };
    }

    // 1件あたりの削減時間 = 20分 - 平均登録時間
    const reducedTimePerProject = Math.max(0, 20 - averageRegistrationTime);
    
    // 削減時間 = (20分 - 平均登録時間) × 総案件数（分単位）
    const reducedTimeMinutes = reducedTimePerProject * projects.length;
    
    // 削減時間を時間に変換
    const reducedTimeHours = reducedTimeMinutes / 60;
    
    console.log(`📐 削減時間の計算: (20分 - ${averageRegistrationTime}分) × ${projects.length}件 = ${reducedTimeMinutes}分 (${reducedTimeHours.toFixed(2)}時間)`);
    console.log(`   1件あたりの削減時間: ${reducedTimePerProject}分`);

    // 想定アポ創出数 = 削減時間（時間） ÷ 0.5
    const estimatedAppointments = reducedTimeHours / 0.5;
    
    // 想定売上 = 想定アポ創出数 × 30% × 200000円
    const estimatedSales = estimatedAppointments * 0.3 * 200000;

    const result = {
      reducedTime: Math.round(reducedTimeMinutes * 100) / 100,
      estimatedAppointments: Math.round(estimatedAppointments * 100) / 100,
      estimatedSales: Math.round(estimatedSales),
    };

    console.log('📊 効果計測指標の計算結果:', {
      averageRegistrationTime,
      totalProjects: projects.length,
      reducedTimePerProject,
      reducedTimeMinutes: result.reducedTime,
      reducedTimeHours: reducedTimeHours.toFixed(2),
      estimatedAppointments: result.estimatedAppointments,
      estimatedSales: result.estimatedSales,
    });

    return result;
  };

  const metrics = calculateMetrics();

  // 変更履歴から工数分析
  let workTimeStats;
  try {
    workTimeStats = analyzeWorkTime(projects);
  } catch (error) {
    console.error('Error analyzing work time:', error);
    // エラー時は空の統計を返す
    workTimeStats = {
      projectCreation: null,
      segmentCreation: null,
      poiCreation: null,
      projectUpdate: null,
      segmentUpdate: null,
      poiUpdate: null,
    };
  }

  // デバッグ: データの確認
  if (import.meta.env.MODE === 'development') {
    const projectsWithStartTime = projects.filter(p => p.project_registration_started_at);
    console.log('📊 登録時間データの確認:');
    console.log(`  全案件数: ${projects.length}`);
    console.log(`  開始時点が記録されている案件数: ${projectsWithStartTime.length}`);
    if (projectsWithStartTime.length > 0) {
      console.log('  サンプル案件:', projectsWithStartTime[0]);
      const sampleTime = getRegistrationTimeInMinutes(projectsWithStartTime[0]);
      console.log(`  サンプル案件の登録時間: ${sampleTime}分`);
    }
    console.log(`  平均登録時間: ${averageRegistrationTime}分`);
    console.log(`  推移データ件数: ${registrationTimeTrend.filter(d => d.count > 0).length}`);
    console.log('📈 効果計測指標:');
    console.log(`  削減時間: ${metrics.reducedTime}分`);
    console.log(`  想定アポ創出数: ${metrics.estimatedAppointments}件`);
    console.log(`  想定売上金額: ¥${metrics.estimatedSales?.toLocaleString() || 'なし'}`);
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">管理ダッシュボード</h1>
          <p className="text-muted-foreground">案件とセグメントの全体状況を確認できます</p>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ダッシュボード
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'exports'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          エクスポート履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'exports' ? (
        <SheetExportHistory currentUserId={_currentUserId} />
      ) : (
        <>
          {/* ダッシュボードコンテンツ */}
          <div className="flex items-center justify-end">
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const queue = getExportQueue();
                  if (queue.length === 0) {
                    alert('エクスポートする地点登録データがありません');
                    return;
                  }
                  
                  // まずGoogle Sheetsへの自動入力を試みる
                  const result = await exportQueueToGoogleSheets();
                  
                  if (result.success) {
                    alert(result.message);
                  } else {
                    // 失敗した場合はCSVダウンロードにフォールバック
                    if (confirm(`${result.message}\n\nCSVファイルとしてダウンロードしますか？`)) {
                      exportQueueToCSV();
                    }
                  }
                }}
                variant="outline"
                className="border-gray-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                地点登録データをエクスポート ({getExportQueue().length}件)
              </Button>
              <Button
                onClick={handleAddSampleData}
                disabled={isAddingSample}
                variant="outline"
                className="border-gray-200"
              >
                {isAddingSample ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    追加中...
                  </>
                ) : (
                  'サンプルデータを追加'
                )}
              </Button>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-muted-foreground">総案件数</p>
              <p className="text-gray-900">{projects.length}件</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">進行中</span>
              <span className="text-blue-600">{projectsByStatus.in_progress}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">完了</span>
              <span className="text-green-600">{projectsByStatus.completed}件</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-muted-foreground">総セグメント数</p>
              <p className="text-gray-900">{segments.length}件</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">連携対応中</span>
              <span className="text-blue-600">{segmentsByStatus.linking}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">完了</span>
              <span className="text-green-600">{segmentsByStatus.completed}件</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-muted-foreground">要対応セグメント</p>
              <p className="text-gray-900">{segmentsByStatus.requested + segmentsByStatus.linking}件</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">依頼済</span>
              <span className="text-yellow-600">{segmentsByStatus.requested}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">エラー</span>
              <span className="text-red-600">{segmentsByStatus.error}件</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-muted-foreground">完了率</p>
              <p className="text-gray-900">
                {segments.length > 0 
                  ? Math.round((segmentsByStatus.completed / segments.length) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">完了</span>
              <span className="text-green-600">{segmentsByStatus.completed}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">未完了</span>
              <span className="text-gray-600">{segments.length - segmentsByStatus.completed}件</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-muted-foreground">修正依頼</p>
              <p className="text-gray-900">{editRequests.filter(r => r.status === 'pending').length}件</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">承認待ち</span>
              <span className="text-orange-600">{editRequests.filter(r => r.status === 'pending').length}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">承認済み</span>
              <span className="text-green-600">{editRequests.filter(r => r.status === 'approved').length}件</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ツールによる効果計測 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">ツールによる効果計測</h2>
            <p className="text-sm text-muted-foreground">案件登録時間の改善効果を可視化します</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 平均登録時間 */}
          <Card className="p-6 border border-gray-200 bg-gradient-to-br from-indigo-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-muted-foreground">平均登録時間</p>
                <p className="text-gray-900">
                  {averageRegistrationTime !== null 
                    ? `${averageRegistrationTime}分`
                    : 'データなし'}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">計測対象</span>
                <span className="text-indigo-600">
                  {projects.filter(p => p.project_registration_started_at).length}件
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">全案件</span>
                <span className="text-gray-600">{projects.length}件</span>
              </div>
            </div>
          </Card>

          {/* 削減時間 */}
          <Card className="p-6 border border-gray-200 bg-gradient-to-br from-teal-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-muted-foreground">削減時間</p>
                <p className="text-gray-900">
                  {metrics.reducedTime !== null 
                    ? `${metrics.reducedTime}分`
                    : 'データなし'}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">基準値</span>
                <span className="text-teal-600">20分</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">削減効果</span>
                <span className="text-teal-600">
                  {metrics.reducedTime !== null && averageRegistrationTime !== null
                    ? `${Math.round((metrics.reducedTime / 20) * 100)}%`
                    : '-'}
                </span>
              </div>
            </div>
          </Card>

          {/* 想定アポ創出数 */}
          <Card className="p-6 border border-gray-200 bg-gradient-to-br from-pink-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Target className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-muted-foreground">想定アポ創出数</p>
                <p className="text-gray-900">
                  {metrics.estimatedAppointments !== null 
                    ? `${metrics.estimatedAppointments}件`
                    : 'データなし'}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">計算式</span>
                <span className="text-pink-600">削減時間÷0.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">削減時間</span>
                <span className="text-gray-600">
                  {metrics.reducedTime !== null ? `${metrics.reducedTime}分` : '-'}
                </span>
              </div>
            </div>
          </Card>

          {/* 想定売上金額 */}
          <Card className="p-6 border border-gray-200 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-muted-foreground">想定売上金額</p>
                <p className="text-gray-900">
                  {metrics.estimatedSales !== null 
                    ? `¥${metrics.estimatedSales.toLocaleString()}`
                    : 'データなし'}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">計算式</span>
                <span className="text-emerald-600">アポ数×30%×20万円</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">想定アポ数</span>
                <span className="text-gray-600">
                  {metrics.estimatedAppointments !== null 
                    ? `${metrics.estimatedAppointments}件`
                    : '-'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 案件登録時間の推移 */}
      <Card className="border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">案件登録時間の推移</h3>
          <p className="text-muted-foreground mt-0.5">過去30日間の平均登録時間の推移</p>
        </div>
        <div className="p-6">
          {registrationTimeTrend.filter(d => d.count > 0).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              データがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={registrationTimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#6b7280"
                  label={{ value: '時間（分）', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax']}
                />
                <Tooltip 
                  formatter={(value: number, name: string, _props: any) => {
                    if (name === 'averageTime') {
                      return [`${value}分`, '平均登録時間'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    if (!label) return '-';
                    const date = new Date(label);
                    if (isNaN(date.getTime())) return '-';
                    try {
                      return date.toLocaleDateString('ja-JP', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      });
                    } catch (e) {
                      console.warn('⚠️ labelFormatter() failed:', label, e);
                      return '-';
                    }
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageTime" 
                  stroke="#5b5fff" 
                  strokeWidth={2}
                  name="平均登録時間"
                  dot={{ fill: '#5b5fff', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 変更履歴をもとにした数値計測の結果詳細 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">変更履歴をもとにした数値計測の結果詳細</h2>
            <p className="text-sm text-muted-foreground">各作業の所要時間を分析し、工数見積もりに活用できる指標を可視化します</p>
          </div>
        </div>

        {/* 登録所要時間の統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 案件登録所要時間 */}
          <Card className="p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">案件登録所要時間</p>
                <p className="text-xs text-muted-foreground">Project Creation</p>
              </div>
            </div>
            {workTimeStats.projectCreation ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {formatWorkTime(workTimeStats.projectCreation.averageTime)}
                  </span>
                  <span className="text-sm text-muted-foreground">平均</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">最小</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.projectCreation.minTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">最大</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.projectCreation.maxTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">中央値</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.projectCreation.medianTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">サンプル数</span>
                    <p className="text-gray-900 font-medium">{workTimeStats.projectCreation.count}件</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">標準偏差</span>
                    <span className="text-gray-900">{formatWorkTime(workTimeStats.projectCreation.standardDeviation)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                データが不足しています
              </div>
            )}
          </Card>

          {/* セグメント登録所要時間 */}
          <Card className="p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">セグメント登録所要時間</p>
                <p className="text-xs text-muted-foreground">Segment Creation</p>
              </div>
            </div>
            {workTimeStats.segmentCreation ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-600">
                    {formatWorkTime(workTimeStats.segmentCreation.averageTime)}
                  </span>
                  <span className="text-sm text-muted-foreground">平均</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">最小</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.segmentCreation.minTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">最大</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.segmentCreation.maxTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">中央値</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.segmentCreation.medianTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">サンプル数</span>
                    <p className="text-gray-900 font-medium">{workTimeStats.segmentCreation.count}件</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">標準偏差</span>
                    <span className="text-gray-900">{formatWorkTime(workTimeStats.segmentCreation.standardDeviation)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                データが不足しています
              </div>
            )}
          </Card>

          {/* 地点登録所要時間 */}
          <Card className="p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">地点登録所要時間</p>
                <p className="text-xs text-muted-foreground">POI Creation</p>
              </div>
            </div>
            {workTimeStats.poiCreation ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    {formatWorkTime(workTimeStats.poiCreation.averageTime)}
                  </span>
                  <span className="text-sm text-muted-foreground">平均</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">最小</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.poiCreation.minTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">最大</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.poiCreation.maxTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">中央値</span>
                    <p className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.poiCreation.medianTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">サンプル数</span>
                    <p className="text-gray-900 font-medium">{workTimeStats.poiCreation.count}件</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">標準偏差</span>
                    <span className="text-gray-900">{formatWorkTime(workTimeStats.poiCreation.standardDeviation)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                データが不足しています
              </div>
            )}
          </Card>
        </div>

        {/* 更新操作の統計 */}
        {(workTimeStats.projectUpdate || workTimeStats.segmentUpdate || workTimeStats.poiUpdate) && (
          <Card className="p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">更新操作の所要時間</p>
                <p className="text-xs text-muted-foreground">Update Operations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workTimeStats.projectUpdate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">案件更新</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均</span>
                      <span className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.projectUpdate.averageTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">サンプル数</span>
                      <span className="text-gray-900">{workTimeStats.projectUpdate.count}件</span>
                    </div>
                  </div>
                </div>
              )}
              {workTimeStats.segmentUpdate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">セグメント更新</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均</span>
                      <span className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.segmentUpdate.averageTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">サンプル数</span>
                      <span className="text-gray-900">{workTimeStats.segmentUpdate.count}件</span>
                    </div>
                  </div>
                </div>
              )}
              {workTimeStats.poiUpdate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">地点更新</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均</span>
                      <span className="text-gray-900 font-medium">{formatWorkTime(workTimeStats.poiUpdate.averageTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">サンプル数</span>
                      <span className="text-gray-900">{workTimeStats.poiUpdate.count}件</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 比較グラフ */}
        {(workTimeStats.projectCreation || workTimeStats.segmentCreation || workTimeStats.poiCreation) && (
          <Card className="border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-gray-900">登録所要時間の比較</h3>
              <p className="text-muted-foreground mt-0.5">各操作タイプの平均所要時間を比較</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  {
                    name: '案件',
                    value: workTimeStats.projectCreation?.averageTime || 0,
                    count: workTimeStats.projectCreation?.count || 0,
                  },
                  {
                    name: 'セグメント',
                    value: workTimeStats.segmentCreation?.averageTime || 0,
                    count: workTimeStats.segmentCreation?.count || 0,
                  },
                  {
                    name: '地点',
                    value: workTimeStats.poiCreation?.averageTime || 0,
                    count: workTimeStats.poiCreation?.count || 0,
                  },
                ].filter(d => d.value > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis 
                    stroke="#6b7280"
                    label={{ value: '時間（分）', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number, _name: string, _props: any) => {
                      return [`${formatWorkTime(value)}`, '平均所要時間'];
                    }}
                  />
                  <Bar dataKey="value" fill="#5b5fff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
      </>
      )}
    </div>
  );
}
