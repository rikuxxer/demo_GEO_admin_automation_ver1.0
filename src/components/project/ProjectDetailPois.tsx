import { Plus, Package, MapPin, Map as MapIcon, List, CheckCircle, Edit, Database, Settings2, Calendar, Users, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PoiTable } from '@/components/PoiTable';
import { PoiMapViewer } from '@/components/PoiMapViewer';
import { canEditProject } from '@/utils/editRequest';
import { EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '@/types/schema';
import type { Project, Segment, PoiInfo, VisitMeasurementGroup } from '@/types/schema';
import type { User } from '@/types/auth';

interface ProjectDetailPoisProps {
  project: Project;
  segments: Segment[];
  pois: PoiInfo[];
  tgPois: PoiInfo[];
  visitMeasurementPois: PoiInfo[];
  tgPoiStatsBySegmentId: Map<string, { pois: PoiInfo[]; poisWithCoords: number }>;
  visitPoiStatsByGroupId: Map<string, { pois: PoiInfo[]; poisWithCoords: number }>;
  visitMeasurementGroups: VisitMeasurementGroup[];
  user: User | null;
  selectedPoiCategory: 'tg' | 'visit_measurement';
  setSelectedPoiCategory: (category: 'tg' | 'visit_measurement') => void;
  poiViewModeByCategory: Record<'tg' | 'visit_measurement', 'list' | 'map'>;
  setPoiViewModeByCategory: (updater: (prev: Record<'tg' | 'visit_measurement', 'list' | 'map'>) => Record<'tg' | 'visit_measurement', 'list' | 'map'>) => void;
  accordionValue: string;
  setExpandedSegmentId: (id: string | undefined) => void;
  groupAccordionValue: string;
  setExpandedGroupId: (id: string | undefined) => void;
  setEditingPoi: (poi: PoiInfo | null) => void;
  setSelectedSegmentForPoi: (id: string | null) => void;
  setEditingSegment: (segment: Segment | null) => void;
  setShowSegmentForm: (show: boolean) => void;
  setEditingGroup: (group: VisitMeasurementGroup | null) => void;
  setShowGroupForm: (show: boolean) => void;
  handleTabChange: (value: string) => void;
  handleAddPoi: (segmentId: string) => void;
  handleEditPoi: (poi: PoiInfo) => void;
  handleConfirmSegment: (segment: Segment) => void;
  handleDataLinkRequest: (segment: Segment) => void;
  onPoiUpdate: (poiId: string, updates: Partial<PoiInfo>) => Promise<void>;
  onPoiDelete: (poiId: string) => void;
  setExtractionConditionsSegment: (segment: Segment | null) => void;
  setExtractionConditionsFormData: (data: Partial<PoiInfo>) => void;
  setShowExtractionConditionsPopup: (show: boolean) => void;
  designatedRadiusInputRef: React.RefObject<HTMLInputElement>;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  getStatusInfo: (status: string) => { label: string; color: string; icon: string };
  getMediaLabels: (mediaId: string | string[]) => string[];
}

export function ProjectDetailPois({
  project,
  segments,
  pois,
  tgPois,
  visitMeasurementPois,
  tgPoiStatsBySegmentId,
  visitPoiStatsByGroupId,
  visitMeasurementGroups,
  user,
  selectedPoiCategory,
  setSelectedPoiCategory,
  poiViewModeByCategory,
  setPoiViewModeByCategory,
  accordionValue,
  setExpandedSegmentId,
  groupAccordionValue,
  setExpandedGroupId,
  setEditingPoi,
  setSelectedSegmentForPoi,
  setEditingSegment,
  setShowSegmentForm,
  setEditingGroup,
  setShowGroupForm,
  handleTabChange,
  handleAddPoi,
  handleEditPoi,
  handleConfirmSegment,
  handleDataLinkRequest,
  onPoiUpdate,
  onPoiDelete,
  setExtractionConditionsSegment,
  setExtractionConditionsFormData,
  setShowExtractionConditionsPopup,
  designatedRadiusInputRef,
  selectedGroupId,
  setSelectedGroupId,
  getStatusInfo,
  getMediaLabels,
}: ProjectDetailPoisProps) {
  return (
    <TabsContent value="pois" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
      {/* ヘッダーセクション */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">地点情報一覧</h3>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">登録されている地点を確認・編集できます</p>
                {pois.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#5b5fff] rounded-full animate-pulse"></div>
                    <span className="text-sm text-[#5b5fff]">{pois.length}件登録済み</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 表示切り替えボタンは各タブ内に移動 */}
          </div>
        </div>
      </div>

      {/* コンテンツセクション */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {segments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">セグメントが作成されていません</p>
            <p className="text-sm text-muted-foreground mb-6">
              地点を登録するには、まずセグメントを作成する必要があります。
            </p>
            <Button onClick={() => { setEditingSegment(null); setShowSegmentForm(true); handleTabChange("segments"); }}>
              セグメントを作成する
            </Button>
          </div>
        ) : (
          <Tabs value={selectedPoiCategory} onValueChange={(value) => {
            setSelectedPoiCategory(value as 'tg' | 'visit_measurement');
            setEditingPoi(null);
            setSelectedSegmentForPoi(null);
          }} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="justify-start rounded-lg border border-gray-200 bg-white shadow-sm h-auto p-1 gap-1">
                <TabsTrigger
                  value="tg"
                  className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] data-[state=active]:shadow-md font-medium transition-all hover:bg-gray-50"
                >
                  TG地点 ({tgPois.length})
                </TabsTrigger>
                <TabsTrigger
                  value="visit_measurement"
                  className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] data-[state=active]:shadow-md font-medium transition-all hover:bg-gray-50"
                >
                  来店計測地点 ({visitMeasurementPois.length})
                </TabsTrigger>
              </TabsList>

              {/* 表示切り替えボタン（各タブ内で独立） */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setPoiViewModeByCategory(prev => ({ ...prev, [selectedPoiCategory]: 'list' }))}
                  className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
                    poiViewModeByCategory[selectedPoiCategory] === 'list'
                      ? 'bg-white text-[#5b5fff] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  リスト
                </button>
                <button
                  onClick={() => setPoiViewModeByCategory(prev => ({ ...prev, [selectedPoiCategory]: 'map' }))}
                  className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
                    poiViewModeByCategory[selectedPoiCategory] === 'map'
                      ? 'bg-white text-[#5b5fff] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  地図
                </button>
              </div>
            </div>

            <TabsContent value="tg" className="mt-0">
              {poiViewModeByCategory.tg === 'map' ? (
                <PoiMapViewer
                  pois={tgPois}
                  segments={segments}
                  onPoiUpdate={async (poiId: string, updates: Partial<PoiInfo>) => {
                    await onPoiUpdate(poiId, updates);
                  }}
                />
              ) : segments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium mb-2">セグメントが作成されていません</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    地点を登録するには、まずセグメントを作成する必要があります。
                  </p>
                  <Button onClick={() => { setEditingSegment(null); setShowSegmentForm(true); handleTabChange("segments"); }}>
                    セグメントを作成する
                  </Button>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-4" value={accordionValue} onValueChange={(value) => setExpandedSegmentId(value || undefined)}>
                  {segments.map((segment) => {
                    const stats = tgPoiStatsBySegmentId.get(segment.segment_id) || { pois: [], poisWithCoords: 0 };
                    const segmentPois = stats.pois;
                    const poiCount = segmentPois.length;
                    const poisWithCoords = stats.poisWithCoords;
                    const statusInfo = getStatusInfo(segment.location_request_status);

                    return (
                      <AccordionItem
                        key={segment.segment_id}
                        value={segment.segment_id}
                        className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-[#5b5fff]/20 transition-all"
                      >
                        <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline border-b border-transparent data-[state=open]:border-gray-100">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                segment.location_request_status === 'completed' ? 'bg-green-100' : 'bg-[#5b5fff]/10'
                              }`}>
                                {segment.location_request_status === 'completed' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Package className="w-5 h-5 text-[#5b5fff]" />
                                )}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="space-y-1">
                                  <h4 className="text-base font-medium text-gray-900 truncate">
                                    {segment.segment_name || '名称未設定'}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] text-gray-500 font-mono font-normal px-1.5 py-0.5 whitespace-nowrap leading-tight">
                                      {segment.segment_id}
                                    </Badge>
                                    <Badge className={`text-[10px] border-0 px-1.5 py-0.5 leading-tight ${statusInfo.color}`}>
                                      {statusInfo.icon} {statusInfo.label}
                                    </Badge>
                                    {segment.registerd_provider_segment && (
                                      <Badge className="text-[10px] border-0 px-1.5 py-0.5 leading-tight bg-blue-100 text-blue-700">
                                        ✓ プロバイダセグメント取り込み済み
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      媒体: {getMediaLabels(segment.media_id).join('、')}
                                    </span>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <span className="text-[10px] text-muted-foreground">
                                      TG地点: <span className="font-medium text-gray-900">{poiCount}件</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-6 py-6 bg-gray-50/50">
                          <div className="space-y-6">
                            {/* ツールバー */}
                            <div className="flex items-center justify-end gap-3 flex-nowrap">
                              <div className="flex gap-2 flex-nowrap">
                                {canEditProject(user, project) && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setExtractionConditionsSegment(segment);
                                        const firstPoi = segmentPois[0];
                                        const currentRadius = (firstPoi?.designated_radius || segment.designated_radius || '');
                                        const initialAttribute = (firstPoi?.attribute) || segment.attribute || 'detector';
                                        const isFixedPeriodAttribute =
                                          initialAttribute === 'resident' ||
                                          initialAttribute === 'worker' ||
                                          initialAttribute === 'resident_and_worker';
                                        const radiusValue = currentRadius ? String(currentRadius).replace('m', '') : '';
                                        if (designatedRadiusInputRef.current) {
                                          designatedRadiusInputRef.current.value = radiusValue;
                                        }
                                        setExtractionConditionsFormData({
                                          designated_radius: (firstPoi?.designated_radius) || segment.designated_radius || '',
                                          extraction_period: isFixedPeriodAttribute
                                            ? '3month'
                                            : ((firstPoi?.extraction_period) || segment.extraction_period || '1month'),
                                          extraction_period_type: isFixedPeriodAttribute
                                            ? 'preset'
                                            : ((firstPoi?.extraction_period_type) || segment.extraction_period_type || 'custom'),
                                          extraction_start_date: isFixedPeriodAttribute ? '' : ((firstPoi?.extraction_start_date) || segment.extraction_start_date || ''),
                                          extraction_end_date: isFixedPeriodAttribute ? '' : ((firstPoi?.extraction_end_date) || segment.extraction_end_date || ''),
                                          extraction_dates: isFixedPeriodAttribute ? [] : ((firstPoi?.extraction_dates || segment.extraction_dates || []).slice()),
                                          attribute: initialAttribute,
                                          detection_count: (firstPoi?.detection_count) || segment.detection_count || 1,
                                          detection_time_start: (firstPoi?.detection_time_start) || segment.detection_time_start || '',
                                          detection_time_end: (firstPoi?.detection_time_end) || segment.detection_time_end || '',
                                          stay_time: (firstPoi?.stay_time) || segment.stay_time || '',
                                        });
                                        setShowExtractionConditionsPopup(true);
                                      }}
                                      disabled={segment.location_request_status !== 'not_requested'}
                                      className={
                                        segment.location_request_status === 'not_requested'
                                          ? "bg-[#5b5fff] text-white hover:bg-[#4949dd] shadow-md whitespace-nowrap"
                                          : "bg-white border border-gray-300 text-gray-500 hover:bg-white shadow-none whitespace-nowrap"
                                      }
                                    >
                                      <Settings2 className="w-3.5 h-3.5 mr-2" />
                                      抽出条件を設定
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddPoi(segment.segment_id)}
                                      disabled={segment.location_request_status !== 'not_requested'}
                                      data-guide="new-poi-button"
                                      className={
                                        segment.location_request_status === 'not_requested'
                                          ? "bg-[#5b5fff] text-white hover:bg-[#4949dd] whitespace-nowrap"
                                          : "bg-white border border-gray-300 text-gray-500 hover:bg-white shadow-none whitespace-nowrap"
                                      }
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-2" />
                                      地点を追加
                                    </Button>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span>
                                            <Button
                                              size="sm"
                                              onClick={() => handleConfirmSegment(segment)}
                                              disabled={segment.location_request_status !== 'not_requested' || poiCount === 0}
                                              className={
                                                segment.location_request_status === 'not_requested' && poiCount > 0
                                                  ? "bg-[#5b5fff] hover:bg-[#4949dd] text-white shadow-md whitespace-nowrap"
                                                  : "bg-white border border-gray-300 text-gray-500 hover:bg-white shadow-none whitespace-nowrap"
                                              }
                                            >
                                              <Database className="w-4 h-4 mr-1" />
                                              格納依頼を実行
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          地点の登録が完了したら実行してください。依頼後は編集できなくなります。
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 抽出条件サマリー */}
                            {segment.location_request_status !== 'not_requested' && (
                              <div className={`rounded-xl p-4 border mb-3 ${
                                segment.location_request_status === 'completed'
                                  ? 'bg-green-50 border-green-200 text-green-800'
                                  : 'bg-blue-50 border-blue-200 text-blue-800'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <CheckCircle className="w-5 h-5" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {segment.location_request_status === 'completed'
                                        ? 'このセグメントのデータ格納は完了しています'
                                        : '現在、管理部によるデータ格納対応中です'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-gray-500" />
                                抽出条件設定
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Target className="w-3 h-3" /> 指定半径
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.designated_radius || '指定なし'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> 抽出期間
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.extraction_period_type === 'custom' ? (
                                      <span className="text-xs">
                                        {segment.extraction_start_date} ~<br/>{segment.extraction_end_date}
                                      </span>
                                    ) : segment.extraction_period_type === 'specific_dates' ? (
                                      <span className="text-xs">
                                        {((segment.extraction_dates || []).filter(Boolean).length) > 0
                                          ? (segment.extraction_dates || []).filter(Boolean).slice(0, 3).join(', ') + ((segment.extraction_dates || []).filter(Boolean).length > 3 ? ' 他' + ((segment.extraction_dates || []).filter(Boolean).length - 3) + '日' : '')
                                          : '未設定'}
                                      </span>
                                    ) : (
                                      (() => {
                                        const labels: Record<string, string> = {
                                          '1month': '直近1ヶ月',
                                          '2month': '直近2ヶ月',
                                          '3month': '直近3ヶ月',
                                          '4month': '直近4ヶ月',
                                          '5month': '直近5ヶ月',
                                          '6month': '直近6ヶ月',
                                        };
                                        return labels[segment.extraction_period || ''] || segment.extraction_period || '指定なし';
                                      })()
                                    )}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> 属性
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.attribute === 'resident' ? '居住者' :
                                     segment.attribute === 'worker' ? '勤務者' : '検知者'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> 滞在時間
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.stay_time ? `${segment.stay_time}分以上` : '指定なし'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> 検知回数
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.detection_count ? `${segment.detection_count}回以上` : '1回以上'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> 検知時間帯
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {segment.detection_time_start && segment.detection_time_end
                                      ? `${segment.detection_time_start} ~ ${segment.detection_time_end}`
                                      : '指定なし'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 地点リスト */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                              <PoiTable
                                pois={segmentPois}
                                onEdit={handleEditPoi}
                                onUpdate={onPoiUpdate}
                                onDelete={onPoiDelete}
                                readOnly={!canEditProject(user, project) || segment.location_request_status !== 'not_requested'}
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="visit_measurement" className="mt-0">
              {poiViewModeByCategory.visit_measurement === 'map' ? (
                <PoiMapViewer
                  pois={visitMeasurementPois}
                  segments={segments}
                  onPoiUpdate={async (poiId: string, updates: Partial<PoiInfo>) => {
                    await onPoiUpdate(poiId, updates);
                  }}
                />
              ) : visitMeasurementGroups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium mb-2">グループが作成されていません</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    地点を登録するには、まず計測地点グループを作成する必要があります。
                  </p>
                  {canEditProject(user, project) && (
                    <Button onClick={() => { setEditingGroup(null); setShowGroupForm(true); }}>
                      グループを作成する
                    </Button>
                  )}
                </div>
              ) : segments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium mb-2">セグメントが作成されていません</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    地点を登録するには、まずセグメントを作成する必要があります。
                  </p>
                  <Button onClick={() => { setEditingSegment(null); setShowSegmentForm(true); handleTabChange("segments"); }}>
                    セグメントを作成する
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* グループ作成ボタン */}
                  {canEditProject(user, project) && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setEditingGroup(null);
                          setShowGroupForm(true);
                        }}
                        className="bg-[#5b5fff] text-white hover:bg-[#4949dd] shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        グループを作成
                      </Button>
                    </div>
                  )}

                  <Accordion type="single" collapsible className="space-y-4" value={groupAccordionValue} onValueChange={(value) => setExpandedGroupId(value || undefined)}>
                    {visitMeasurementGroups.map((group) => {
                      const stats = visitPoiStatsByGroupId.get(group.group_id) || { pois: [], poisWithCoords: 0 };
                      const groupPois = stats.pois;
                      const poiCount = groupPois.length;
                      const poisWithCoords = stats.poisWithCoords;

                      return (
                        <AccordionItem
                          key={group.group_id}
                          value={group.group_id}
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-[#5b5fff]/20 transition-all"
                        >
                          <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline border-b border-transparent data-[state=open]:border-gray-100">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#5b5fff]/10 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-[#5b5fff]" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <div className="space-y-1">
                                    <h4 className="text-base font-medium text-gray-900 truncate">
                                      {group.group_name || '名称未設定'}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] text-gray-500 font-mono font-normal px-1.5 py-0.5 whitespace-nowrap leading-tight">
                                        {group.group_id}
                                      </Badge>
                                      <div className="w-px h-3 bg-gray-300"></div>
                                      <span className="text-[10px] text-muted-foreground">
                                        来店計測地点: <span className="font-medium text-gray-900">{poiCount}件</span>
                                      </span>
                                      {poisWithCoords > 0 && (
                                        <>
                                          <div className="w-px h-3 bg-gray-300"></div>
                                          <span className="text-[10px] text-muted-foreground">
                                            座標あり: <span className="font-medium text-gray-900">{poisWithCoords}件</span>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="px-6 py-6 bg-gray-50/50">
                            <div className="space-y-6">
                              {/* ツールバー */}
                              <div className="flex items-center justify-end gap-3 flex-nowrap">
                                <div className="flex gap-2 flex-nowrap">
                                  {canEditProject(user, project) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingGroup(group);
                                          setShowGroupForm(true);
                                        }}
                                        className="border-gray-300 hover:bg-gray-50"
                                      >
                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                        計測条件の設定
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          if (selectedPoiCategory !== 'visit_measurement') {
                                            setSelectedPoiCategory('visit_measurement');
                                          }
                                          setSelectedGroupId(group.group_id);
                                          const availableSegment = segments.find(s => s.location_request_status === 'not_requested') || segments[0];
                                          if (availableSegment) {
                                            handleAddPoi(availableSegment.segment_id);
                                          } else {
                                            toast.warning('地点を追加するには、先にセグメントを作成してください。');
                                          }
                                        }}
                                        disabled={segments.length === 0}
                                        className="bg-[#5b5fff] text-white hover:bg-[#4949dd] disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="w-3.5 h-3.5 mr-2" />
                                        地点を追加
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* 抽出条件の表示 */}
                              {group.designated_radius && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Settings2 className="w-4 h-4 text-gray-600" />
                                    <h5 className="text-sm font-semibold text-gray-900">グループの抽出条件</h5>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {group.designated_radius && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          <Target className="w-3 h-3 inline mr-1" /> 指定半径
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {group.designated_radius}
                                        </p>
                                      </div>
                                    )}
                                    {group.extraction_period && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          <Calendar className="w-3 h-3 inline mr-1" /> 抽出期間
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {group.extraction_period_type === 'custom' && group.extraction_start_date && group.extraction_end_date
                                            ? `${group.extraction_start_date} ~ ${group.extraction_end_date}`
                                            : group.extraction_period_type === 'specific_dates' && group.extraction_dates && group.extraction_dates.length > 0
                                            ? `${group.extraction_dates.length}日`
                                            : EXTRACTION_PERIOD_PRESET_OPTIONS.find(opt => opt.value === group.extraction_period)?.label || group.extraction_period}
                                        </p>
                                      </div>
                                    )}
                                    {group.attribute && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          <Users className="w-3 h-3 inline mr-1" /> 対象者
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {ATTRIBUTE_OPTIONS.find(opt => opt.value === group.attribute)?.label || group.attribute}
                                        </p>
                                      </div>
                                    )}
                                    {group.detection_count && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          <Target className="w-3 h-3 inline mr-1" /> 検知回数
                                        </p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {group.detection_count}回以上
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {(group.detection_time_start || group.detection_time_end || group.stay_time) && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-gray-200">
                                      {group.detection_time_start && group.detection_time_end && (
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">
                                            <Clock className="w-3 h-3 inline mr-1" /> 検知時間帯
                                          </p>
                                          <p className="text-sm font-medium text-gray-900">
                                            {group.detection_time_start} ~ {group.detection_time_end}
                                          </p>
                                        </div>
                                      )}
                                      {group.stay_time && (
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">
                                            <Clock className="w-3 h-3 inline mr-1" /> 滞在時間
                                          </p>
                                          <p className="text-sm font-medium text-gray-900">
                                            {STAY_TIME_OPTIONS.find(opt => opt.value === group.stay_time)?.label || group.stay_time}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 地点リスト */}
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                <PoiTable
                                  pois={groupPois}
                                  onEdit={handleEditPoi}
                                  onUpdate={onPoiUpdate}
                                  onDelete={onPoiDelete}
                                  readOnly={!canEditProject(user, project)}
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TabsContent>
  );
}
