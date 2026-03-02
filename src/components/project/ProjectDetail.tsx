import { startTransition } from 'react';
import { FileText, Package, MapPin, MessageSquare, History, AlertCircle, Settings2, Target, Calendar, Users, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { SegmentForm } from '@/components/SegmentForm';
import { PoiForm } from '@/components/PoiForm';
import { VisitMeasurementGroupForm } from '@/components/VisitMeasurementGroupForm';
import { ProjectEditRequestDialog } from '@/components/ProjectEditRequestDialog';
import { PoiEditRequestDialog } from '@/components/PoiEditRequestDialog';
import { GeocodeProgressDialog } from '@/components/GeocodeProgressDialog';
import { ProjectMessages } from '@/components/ProjectMessages';
import { ProjectChangeHistory } from '@/components/ProjectChangeHistory';
import { ATTRIBUTE_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, STAY_TIME_OPTIONS } from '@/types/schema';
import { bigQueryService } from '@/utils/bigquery';
import { getStatusLabel } from '@/utils/projectStatus';
import { canEditProject } from '@/utils/editRequest';
import { useProjectDetail } from './useProjectDetail';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDetailSegments } from './ProjectDetailSegments';
import { ProjectDetailPois } from './ProjectDetailPois';
import type { ProjectDetailProps } from './useProjectDetail';
import type { Project, Segment, PoiInfo, EditRequest } from '@/types/schema';
import { FileEdit } from 'lucide-react';

export function ProjectDetail(props: ProjectDetailProps) {
  const { project, segments, pois, onBack, onPoiCreate, onPoiCreateBulk, onPoiUpdate, onPoiDelete, onSegmentDelete, editRequests = [], onEditRequestCreate, onEditRequestApprove, onEditRequestReject, onEditRequestWithdraw, onUnreadCountUpdate } = props;

  if (!project || !project.project_id) {
    console.error('Project or project_id is missing');
    return (
      <div className="p-6">
        <p className="text-red-600">プロジェクト情報が正しく読み込まれていません。</p>
        <Button onClick={onBack} className="mt-4">
          戻る
        </Button>
      </div>
    );
  }

  const detail = useProjectDetail(props);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <ProjectDetailHeader
        project={project}
        onBack={onBack}
        statusColor={detail.statusColor}
        statusLabel={getStatusLabel(detail.statusInfo.status)}
        formatDateTime={detail.formatDateTime}
      />

      {/* タブ */}
      <Tabs value={detail.activeTab} onValueChange={detail.handleTabChange} className="w-full">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <TabsList className="w-full h-auto p-1.5 bg-[#f5f5ff] border-b border-gray-200 flex gap-1.5 rounded-none">
            <TabsTrigger
              value="overview"
              data-tab-value="overview"
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">案件概要</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="segments"
              data-guide="segment-tab"
              data-tab-value="segments"
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="text-sm">セグメント管理</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{segments.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="pois"
              data-guide="poi-tab"
              data-tab-value="pois"
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">地点情報</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{pois.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              data-tab-value="messages"
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">連絡事項</span>
                {detail.unreadMessageCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                    {detail.unreadMessageCount}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            {detail.user?.role === 'admin' && (
              <TabsTrigger
                value="history"
                data-tab-value="history"
                className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span className="text-sm">変更履歴</span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>

          {/* 案件概要タブ */}
          <TabsContent value="overview" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
            {/* ヘッダーセクション */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 mb-1">案件概要</h3>
                    <p className="text-sm text-gray-500">
                      基本情報と配信設定を確認できます
                      {segments.length > 0 && !detail.hasPermission('canApproveEditRequests') && (
                        <span className="ml-2 text-orange-600">
                          • 編集には管理部承認が必要です
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {canEditProject(detail.user, project) && (
                  <Button
                    onClick={() => detail.setShowProjectEditDialog(true)}
                    className="bg-[#5b5fff] text-white hover:bg-[#4949dd] h-10 px-6 gap-2 shadow-sm hover:shadow-md transition-all"
                  >
                    <FileEdit className="w-4 h-4" />
                    案件情報を編集
                  </Button>
                )}
              </div>
            </div>

            {/* コンテンツセクション */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="space-y-5">
                {/* 基本情報セクション */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <h4 className="text-gray-900">基本情報</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">広告主法人名</p>
                      <p className="text-gray-900">{project.advertiser_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">代理店名</p>
                      <p className="text-gray-900">{project.agency_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">主担当者</p>
                      <p className="text-gray-900">{project.person_in_charge || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">副担当者</p>
                      <p className="text-gray-900">{project.sub_person_in_charge || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 訴求内容セクション */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <h4 className="text-gray-900">訴求内容</h4>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-sm">訴求ポイント</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{project.appeal_point || '-'}</p>
                  </div>
                </div>

                {/* UNIVERSEサービス情報セクション */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <h4 className="text-gray-900">UNIVERSEサービス情報</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">サービスID</p>
                      <p className="text-gray-900">{project.universe_service_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">サービス名</p>
                      <p className="text-gray-900">{project.universe_service_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 配信情報セクション */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <h4 className="text-gray-900">配信情報</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">配信開始日</p>
                      <p className="text-gray-900">{detail.formatDate(project.delivery_start_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">配信終了日</p>
                      <p className="text-gray-900">{detail.formatDate(project.delivery_end_date)}</p>
                    </div>
                  </div>
                </div>

                {/* 備考セクション */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <h4 className="text-gray-900">備考</h4>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-sm">備考・メモ</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{project.remarks || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 変更履歴セクション */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-[#5b5fff]" />
                  </div>
                  <div>
                    <h3 className="text-gray-900">変更履歴</h3>
                    <p className="text-sm text-muted-foreground">
                      この案件に関連する修正依頼と承認状況
                      {editRequests.filter(r => r.project_id === project.project_id).length > 0 && (
                        <span className="ml-2">
                          • {editRequests.filter(r => r.project_id === project.project_id).length}件
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {editRequests.filter(r => r.project_id === project.project_id).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg">
                  <FileEdit className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">まだ変更履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editRequests
                    .filter(r => r.project_id === project.project_id)
                    .sort((a, b) => {
                      const timeA = a.requested_at ? (() => {
                        const date = new Date(a.requested_at);
                        return isNaN(date.getTime()) ? 0 : date.getTime();
                      })() : 0;
                      const timeB = b.requested_at ? (() => {
                        const date = new Date(b.requested_at);
                        return isNaN(date.getTime()) ? 0 : date.getTime();
                      })() : 0;
                      return timeB - timeA;
                    })
                    .map((request, index) => {
                      const reqStatusColor =
                        request.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-700 border-gray-200';

                      const isMyRequest = request.requested_by === detail.user?.email;

                      return (
                        <div
                          key={request.request_id}
                          className={`p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                            isMyRequest ? 'bg-blue-50/30' : 'bg-white'
                          }`}
                        >
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                request.status === 'pending' ? 'bg-orange-100' :
                                request.status === 'approved' ? 'bg-green-100' :
                                request.status === 'rejected' ? 'bg-red-100' :
                                'bg-gray-100'
                              }`}>
                                {request.request_type === 'project' && '📋'}
                                {request.request_type === 'segment' && '📊'}
                                {request.request_type === 'poi' && '📍'}
                              </div>
                              {index < editRequests.filter(r => r.project_id === project.project_id).length - 1 && (
                                <div className="w-0.5 flex-1 bg-gray-200 my-2 min-h-[20px]" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={reqStatusColor}>
                                    {request.status === 'pending' && '⏳ 承認待ち'}
                                    {request.status === 'approved' && '✓ 承認済み'}
                                    {request.status === 'rejected' && '✗ 却下'}
                                    {request.status === 'withdrawn' && '↩ 取り下げ'}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {request.request_type === 'project' && '案件情報'}
                                    {request.request_type === 'segment' && 'セグメント'}
                                    {request.request_type === 'poi' && '地点情報'}
                                    の変更
                                  </span>
                                  {isMyRequest && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                      自分の依頼
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">
                                  {request.request_id}
                                </span>
                              </div>

                              <div className="mb-2">
                                <p className="text-sm text-gray-900">{request.request_reason}</p>
                              </div>

                              {request.changes && Object.keys(request.changes).length > 0 && (
                                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-2">変更内容:</p>
                                  <div className="space-y-2">
                                    {Object.entries(request.changes).map(([field, change]) => (
                                      <div key={field} className="text-xs">
                                        <span className="text-muted-foreground">{field}: </span>
                                        <span className="text-red-600 line-through">{String(change.before)}</span>
                                        <span className="mx-2">→</span>
                                        <span className="text-green-600 font-medium">{String(change.after)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span>📝 依頼: {request.requested_by}</span>
                                <span>•</span>
                                <span>{detail.formatDateTime(request.requested_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* セグメントタブ */}
          <ProjectDetailSegments
            project={project}
            segments={segments}
            pois={pois}
            user={detail.user}
            onEditSegment={detail.handleEditSegment}
            onSegmentDelete={onSegmentDelete}
            onManagePois={detail.handleManagePois}
            onDataLinkRequest={detail.handleDataLinkRequest}
            onNewSegment={() => { detail.setEditingSegment(null); detail.setShowSegmentForm(true); }}
          />

          {/* 地点情報タブ */}
          <ProjectDetailPois
            project={project}
            segments={segments}
            pois={pois}
            tgPois={detail.tgPois}
            visitMeasurementPois={detail.visitMeasurementPois}
            tgPoiStatsBySegmentId={detail.tgPoiStatsBySegmentId}
            visitPoiStatsByGroupId={detail.visitPoiStatsByGroupId}
            visitMeasurementGroups={detail.visitMeasurementGroups}
            user={detail.user}
            selectedPoiCategory={detail.selectedPoiCategory}
            setSelectedPoiCategory={detail.setSelectedPoiCategory}
            poiViewModeByCategory={detail.poiViewModeByCategory}
            setPoiViewModeByCategory={detail.setPoiViewModeByCategory}
            accordionValue={detail.accordionValue}
            setExpandedSegmentId={detail.setExpandedSegmentId}
            groupAccordionValue={detail.groupAccordionValue}
            setExpandedGroupId={detail.setExpandedGroupId}
            setEditingPoi={detail.setEditingPoi}
            setSelectedSegmentForPoi={detail.setSelectedSegmentForPoi}
            setEditingSegment={detail.setEditingSegment}
            setShowSegmentForm={detail.setShowSegmentForm}
            setEditingGroup={detail.setEditingGroup}
            setShowGroupForm={detail.setShowGroupForm}
            handleTabChange={detail.handleTabChange}
            handleAddPoi={detail.handleAddPoi}
            handleEditPoi={detail.handleEditPoi}
            handleConfirmSegment={detail.handleConfirmSegment}
            handleDataLinkRequest={detail.handleDataLinkRequest}
            onPoiUpdate={onPoiUpdate}
            onPoiDelete={onPoiDelete}
            setExtractionConditionsSegment={detail.setExtractionConditionsSegment}
            setExtractionConditionsFormData={detail.setExtractionConditionsFormData}
            setShowExtractionConditionsPopup={detail.setShowExtractionConditionsPopup}
            designatedRadiusInputRef={detail.designatedRadiusInputRef}
            selectedGroupId={detail.selectedGroupId}
            setSelectedGroupId={detail.setSelectedGroupId}
            getStatusInfo={detail.getStatusInfo}
            getMediaLabels={detail.getMediaLabels}
          />

          {/* 連絡事項タブ */}
          <TabsContent value="messages" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
            <ProjectMessages
              project={project}
              onUnreadCountUpdate={onUnreadCountUpdate}
              onMessagesRead={() => detail.setUnreadMessageCount(0)}
            />
          </TabsContent>

          {/* 変更履歴タブ（管理部のみ） */}
          {detail.user?.role === 'admin' && (
            <TabsContent value="history" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
              <ProjectChangeHistory project={project} segments={segments} />
            </TabsContent>
          )}

        </div>
      </Tabs>

      {/* セグメント選択ダイアログ（新規地点追加用） */}
      <Dialog open={detail.showSegmentSelectForPoi} onOpenChange={detail.setShowSegmentSelectForPoi}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>地点を追加するセグメントを選択</DialogTitle>
          </DialogHeader>

          {segments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">セグメントがありません。先にセグメントを作成してください。</p>
              <Button onClick={() => { detail.setShowSegmentSelectForPoi(false); detail.setEditingSegment(null); detail.setShowSegmentForm(true); }}>
                新規セグメント作成
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
              {segments.map((segment) => (
                <button
                  key={segment.segment_id}
                  onClick={() => {
                    detail.setShowSegmentSelectForPoi(false);
                    detail.handleAddPoi(segment.segment_id);
                  }}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#5b5fff] hover:bg-[#5b5fff]/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={segment.location_request_status !== 'not_requested'}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#5b5fff]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#5b5fff]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{segment.segment_name || '名称未設定'}</p>
                      <p className="text-xs text-muted-foreground">ID: {segment.segment_id}</p>
                    </div>
                  </div>
                  <Package className="w-5 h-5 text-gray-300 group-hover:text-[#5b5fff]" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 地点フォームモーダル */}
      {detail.showPoiForm && detail.selectedSegmentForPoi && (() => {
        const segment = segments.find(s => s.segment_id === detail.selectedSegmentForPoi);
        return (
          <PoiForm
            projectId={project.project_id}
            segmentId={detail.selectedSegmentForPoi}
            segmentName={segment?.segment_name}
            segment={segment}
            pois={pois}
            poi={detail.editingPoi ? { ...detail.editingPoi, poi_category: detail.editingPoi.poi_category || detail.selectedPoiCategory } : null}
            defaultCategory={detail.selectedPoiCategory}
            defaultGroupId={detail.selectedPoiCategory === 'visit_measurement' ? detail.selectedGroupId : undefined}
            visitMeasurementGroups={detail.visitMeasurementGroups}
            onSubmit={(poiData) => {
              if (detail.editingPoi && detail.editingPoi.poi_id) {
                onPoiUpdate(detail.editingPoi.poi_id, poiData);
              } else {
                const poiDataWithCategory = {
                  ...poiData,
                  poi_category: poiData.poi_category || detail.selectedPoiCategory,
                  segment_id: detail.selectedPoiCategory === 'tg' ? (poiData.segment_id || detail.selectedSegmentForPoi!) : poiData.segment_id,
                  visit_measurement_group_id: poiData.visit_measurement_group_id || (detail.selectedPoiCategory === 'visit_measurement' && detail.selectedGroupId ? detail.selectedGroupId : undefined),
                };
                onPoiCreate(detail.selectedSegmentForPoi!, poiDataWithCategory);
              }
              detail.setShowPoiForm(false);
              detail.setEditingPoi(null);
              detail.setSelectedSegmentForPoi(null);
            }}
            onBulkSubmit={detail.handlePoiFormBulkSubmit}
            onCancel={() => {
              detail.setShowPoiForm(false);
              detail.setEditingPoi(null);
              detail.setSelectedSegmentForPoi(null);
            }}
          />
        );
      })()}

      {/* セグメントフォームモーダル */}
      {detail.showSegmentForm && (
        <SegmentForm
          projectId={project.project_id}
          segment={detail.editingSegment}
          existingSegments={segments}
          pois={pois}
          onSubmit={detail.handleSegmentFormSubmit}
          onCancel={detail.handleCancelForm}
        />
      )}

      {/* 計測地点グループ作成・編集フォーム */}
      {detail.showGroupForm && (
        <VisitMeasurementGroupForm
          projectId={project.project_id}
          group={detail.editingGroup}
          existingGroups={detail.visitMeasurementGroups}
          pois={detail.visitMeasurementPois}
          onSubmit={async (groupData) => {
            try {
              if (detail.editingGroup) {
                await bigQueryService.updateVisitMeasurementGroup(detail.editingGroup.group_id, {
                  group_name: groupData.group_name!.trim(),
                  designated_radius: groupData.designated_radius,
                  extraction_period: groupData.extraction_period,
                  extraction_period_type: groupData.extraction_period_type,
                  extraction_start_date: groupData.extraction_start_date,
                  extraction_end_date: groupData.extraction_end_date,
                  extraction_dates: groupData.extraction_dates,
                  attribute: groupData.attribute,
                  detection_count: groupData.detection_count,
                  detection_time_start: groupData.detection_time_start,
                  detection_time_end: groupData.detection_time_end,
                  stay_time: groupData.stay_time,
                });
                toast.success('グループを更新しました');
              } else {
                await bigQueryService.createVisitMeasurementGroup({
                  project_id: project.project_id,
                  group_name: groupData.group_name!.trim(),
                  designated_radius: groupData.designated_radius,
                  extraction_period: groupData.extraction_period,
                  extraction_period_type: groupData.extraction_period_type,
                  extraction_start_date: groupData.extraction_start_date,
                  extraction_end_date: groupData.extraction_end_date,
                  extraction_dates: groupData.extraction_dates,
                  attribute: groupData.attribute,
                  detection_count: groupData.detection_count,
                  detection_time_start: groupData.detection_time_start,
                  detection_time_end: groupData.detection_time_end,
                  stay_time: groupData.stay_time,
                });
                toast.success('グループを作成しました');
              }
              const groups = await bigQueryService.getVisitMeasurementGroups(project.project_id);
              detail.setVisitMeasurementGroups(groups || []);
              detail.setShowGroupForm(false);
              detail.setEditingGroup(null);
            } catch (error) {
              console.error('Error saving group:', error);
              const errorMessage = error instanceof Error ? error.message : '不明なエラー';
              toast.error(`グループの保存に失敗しました: ${errorMessage}`);
            }
          }}
          onCancel={() => {
            detail.setShowGroupForm(false);
            detail.setEditingGroup(null);
          }}
        />
      )}

      {/* 案件編集依頼ダイアログ */}
      {detail.showProjectEditDialog && onEditRequestCreate && (
        <ProjectEditRequestDialog
          project={project}
          open={detail.showProjectEditDialog}
          onClose={() => detail.setShowProjectEditDialog(false)}
          onSubmit={detail.handleEditRequestSubmit}
          onDirectUpdate={props.onProjectUpdate}
          editRequests={editRequests}
          onEditRequestApprove={onEditRequestApprove}
          onEditRequestReject={onEditRequestReject}
          onEditRequestWithdraw={onEditRequestWithdraw}
          currentUserId={detail.user?.email || ''}
          isAdmin={detail.hasPermission('canViewAdminDashboard')}
        />
      )}

      {/* 地点編集依頼ダイアログ */}
      {detail.showPoiEditDialog && detail.editRequestPoi && onEditRequestCreate && (
        <PoiEditRequestDialog
          poi={detail.editRequestPoi}
          open={detail.showPoiEditDialog}
          onClose={() => {
            detail.setShowPoiEditDialog(false);
            detail.setEditRequestPoi(null);
          }}
          onSubmit={detail.handleEditRequestSubmit}
          currentUserId={detail.user?.email || ''}
        />
      )}

      {/* ジオコーディング進捗ダイアログ */}
      <GeocodeProgressDialog
        open={detail.showGeocodeProgress}
        current={detail.geocodeProgress}
        total={detail.geocodeTotal}
        successCount={detail.geocodeSuccessCount}
        errorCount={detail.geocodeErrorCount}
        errors={detail.geocodeErrors}
        completed={detail.geocodeCompleted}
        onClose={detail.handleCloseGeocodeDialog}
        onRunInBackground={detail.handleRunInBackground}
      />

      {/* 抽出条件設定ポップアップ */}
      {detail.showExtractionConditionsPopup && detail.extractionConditionsSegment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#5b5fff]" />
                <h2 className="text-xl font-semibold text-gray-900">抽出条件設定</h2>
              </div>
              <button
                onClick={() => detail.setShowExtractionConditionsPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex gap-2 text-blue-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">セグメント内の全地点に適用されます</p>
                    <p>
                      設定した抽出条件は、このセグメント（{detail.extractionConditionsSegment.segment_name || detail.extractionConditionsSegment.segment_id}）に属するすべての地点に適用されます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* 指定半径 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#5b5fff]" />
                    指定半径
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">自由入力か選択のどちらかで指定してください</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-xs text-gray-500">自由入力（1〜1000m）</span>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={detail.designatedRadiusInputRef}
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            placeholder="1-1000"
                            defaultValue=""
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-xs text-gray-500">選択（1000m以上）</span>
                        <select
                          value={(() => {
                            const currentValue = detail.designatedRadiusInputRef.current?.value || '';
                            const draftNum = Number(currentValue);
                            if (currentValue !== '' && !Number.isNaN(draftNum) && draftNum >= 1000) {
                              return detail.fixedRadiusOptions.includes(draftNum) ? String(draftNum) : '';
                            }
                            return '';
                          })()}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!value) {
                              if (detail.designatedRadiusInputRef.current) {
                                detail.designatedRadiusInputRef.current.value = '';
                              }
                              detail.setExtractionConditionsDeferred(prev => ({ ...prev, designated_radius: '' }));
                              return;
                            }
                            if (detail.designatedRadiusInputRef.current) {
                              detail.designatedRadiusInputRef.current.value = value;
                            }
                            detail.setExtractionConditionsDeferred(prev => ({ ...prev, designated_radius: `${value}m` }));
                          }}
                          className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
                        >
                          <option value="">自由入力に戻す</option>
                          {detail.fixedRadiusOptions.map((value) => (
                            <option key={value} value={value}>{value}m</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 抽出期間 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5b5fff]" />
                    抽出期間
                  </Label>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={detail.extractionConditionsFormData.extraction_period_type === 'preset'}
                        onChange={() => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_period_type: 'preset' }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">プリセット</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={detail.extractionConditionsFormData.extraction_period_type === 'custom'}
                        onChange={() => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_period_type: 'custom' }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">期間指定</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={detail.extractionConditionsFormData.extraction_period_type === 'specific_dates'}
                        onChange={() => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_period_type: 'specific_dates', extraction_dates: prev.extraction_dates?.length ? prev.extraction_dates : [''] }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">特定日付</span>
                    </label>
                  </div>

                  {detail.extractionConditionsFormData.extraction_period_type === 'preset' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-700">プリセット期間を選択してください</p>
                      <select
                        value={detail.extractionConditionsFormData.extraction_period || '1month'}
                        onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_period: e.target.value }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : detail.extractionConditionsFormData.extraction_period_type === 'specific_dates' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">抽出対象とする日付を複数選択できます（直近6ヶ月まで）</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {(detail.extractionConditionsFormData.extraction_dates || []).map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={d}
                              min={detail.getSixMonthsAgoDate()}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                const selectedDate = e.target.value;
                                if (detail.isDateMoreThanSixMonthsAgo(selectedDate)) {
                                  startTransition(() => detail.setShowDateRangeWarning(true));
                                  return;
                                }
                                const arr = [...(detail.extractionConditionsFormData.extraction_dates || [])];
                                arr[i] = selectedDate;
                                if (!detail.extractionDatesEqual(arr, detail.extractionConditionsFormData.extraction_dates)) {
                                  detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_dates: arr }));
                                }
                              }}
                              className="flex-1 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const arr = (detail.extractionConditionsFormData.extraction_dates || []).filter((_, j) => j !== i);
                                if (!detail.extractionDatesEqual(arr, detail.extractionConditionsFormData.extraction_dates)) {
                                  detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_dates: arr }));
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-2"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_dates: [...(prev.extraction_dates || []), ''] }))}
                        className="text-sm text-[#5b5fff] hover:text-[#5b5fff]/80 font-medium"
                      >
                        + 日付を追加
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={detail.extractionConditionsFormData.extraction_start_date || ''}
                        onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_start_date: e.target.value }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="bg-white"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="date"
                        value={detail.extractionConditionsFormData.extraction_end_date || ''}
                        onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, extraction_end_date: e.target.value }))}
                        disabled={detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="bg-white"
                      />
                    </div>
                  )}

                  {(detail.extractionConditionsFormData.attribute === 'resident' || detail.extractionConditionsFormData.attribute === 'worker' || detail.extractionConditionsFormData.attribute === 'resident_and_worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者・居住者&勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
                    </p>
                  )}
                </div>

                {/* 属性 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5b5fff]" />
                    属性
                  </Label>
                  <div className="flex p-1 bg-gray-100 rounded-lg">
                    {ATTRIBUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const updates: Partial<PoiInfo> = { attribute: option.value };
                          if (option.value === 'resident' || option.value === 'worker' || option.value === 'resident_and_worker') {
                            updates.extraction_period = '3month';
                            updates.extraction_period_type = 'preset';
                            updates.extraction_dates = [];
                          }
                          detail.setExtractionConditionsDeferred(prev => ({ ...prev, ...updates }));
                        }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          detail.extractionConditionsFormData.attribute === option.value
                            ? 'bg-white text-[#5b5fff] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 検知回数（検知者の場合のみ） */}
                {detail.extractionConditionsFormData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#5b5fff]" />
                      検知回数（〇回以上）
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="15"
                        value={detail.extractionConditionsFormData.detection_count || 1}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const clamped = Number.isNaN(raw) ? 1 : Math.min(15, Math.max(1, raw));
                          detail.setExtractionConditionsDeferred(prev => ({ ...prev, detection_count: clamped }));
                        }}
                        className="bg-white"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">回以上</span>
                    </div>
                  </div>
                )}

                {/* 検知時間帯（検知者の場合のみ） */}
                {detail.extractionConditionsFormData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5b5fff]" />
                      検知時間帯
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">開始時刻</Label>
                        <Input
                          type="time"
                          value={detail.extractionConditionsFormData.detection_time_start || ''}
                          onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, detection_time_start: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">終了時刻</Label>
                        <Input
                          type="time"
                          value={detail.extractionConditionsFormData.detection_time_end || ''}
                          onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, detection_time_end: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 滞在時間 */}
                <div>
                  <Label className="block mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#5b5fff]" />
                    滞在時間
                  </Label>
                  <select
                    value={detail.extractionConditionsFormData.attribute === 'detector' ? (detail.extractionConditionsFormData.stay_time || '') : ''}
                    onChange={(e) => detail.setExtractionConditionsDeferred(prev => ({ ...prev, stay_time: e.target.value }))}
                    disabled={detail.extractionConditionsFormData.attribute !== 'detector'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">指定なし</option>
                    {STAY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {detail.extractionConditionsFormData.attribute !== 'detector' && (
                    <p className="text-xs text-gray-500 mt-1">滞在時間は検知者の場合のみ指定できます</p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => detail.setShowExtractionConditionsPopup(false)}
                className="border-gray-300"
              >
                閉じる
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!detail.extractionConditionsSegment) return;

                  const segmentPois = detail.allPoisBySegmentId.get(detail.extractionConditionsSegment.segment_id) || [];

                  try {
                    const radiusInputValue = detail.designatedRadiusInputRef.current?.value || '';
                    const draftNum = Number(radiusInputValue);

                    if (radiusInputValue !== '' && (Number.isNaN(draftNum) || draftNum < 1 || (draftNum > 1000 && !detail.fixedRadiusOptions.includes(draftNum)))) {
                      toast.error('半径は1-1000m、または選択肢から指定してください');
                      return;
                    }

                    const radiusFromDraft = radiusInputValue === ''
                      ? ''
                      : `${draftNum}m`;
                    const isFixedPeriodAttribute =
                      detail.extractionConditionsFormData.attribute === 'resident' ||
                      detail.extractionConditionsFormData.attribute === 'worker' ||
                      detail.extractionConditionsFormData.attribute === 'resident_and_worker';
                    const effectiveConditions: Partial<PoiInfo> = isFixedPeriodAttribute
                      ? {
                          ...detail.extractionConditionsFormData,
                          extraction_period: '3month',
                          extraction_period_type: 'preset',
                          extraction_start_date: '',
                          extraction_end_date: '',
                          extraction_dates: [],
                        }
                      : detail.extractionConditionsFormData;
                    await props.onSegmentUpdate(detail.extractionConditionsSegment.segment_id, {
                      designated_radius: radiusFromDraft,
                      extraction_period: effectiveConditions.extraction_period,
                      extraction_period_type: effectiveConditions.extraction_period_type,
                      extraction_start_date: effectiveConditions.extraction_start_date,
                      extraction_end_date: effectiveConditions.extraction_end_date,
                      extraction_dates: (effectiveConditions.extraction_dates || []).filter(Boolean),
                      attribute: effectiveConditions.attribute,
                      detection_count: effectiveConditions.detection_count,
                      detection_time_start: effectiveConditions.detection_time_start,
                      detection_time_end: effectiveConditions.detection_time_end,
                      stay_time: effectiveConditions.stay_time,
                    });

                    toast.success('セグメントに抽出条件を保存しました');
                    detail.setShowExtractionConditionsPopup(false);
                  } catch (error) {
                    console.error('Error updating extraction conditions:', error);
                    toast.error('抽出条件の適用に失敗しました');
                  }
                }}
                className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
              >
                設定を保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* バックグラウンドジオコーディングステータス */}
      {detail.backgroundGeocodingSegment && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4">
          <Card className="bg-white border-2 border-[#5b5fff] shadow-lg max-w-sm">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#5b5fff]/10 rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[#5b5fff] animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    ジオコーディング実行中
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    セグメント: {detail.backgroundGeocodingSegment}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>進行中...</span>
                      <span>{detail.geocodeProgress} / {detail.geocodeTotal}</span>
                    </div>
                    <Progress
                      value={detail.geocodeTotal > 0 ? (detail.geocodeProgress / detail.geocodeTotal) * 100 : 0}
                      className="h-1.5"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    完了時に通知でお知らせします
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 半径50m以下の警告ポップアップ */}
      <AlertDialog open={detail.showRadiusWarning} onOpenChange={detail.setShowRadiusWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  配信ボリュームが担保できない可能性があります。
                </p>
                <p className="text-sm text-gray-700">
                  半径緩和用のセグメントを追加することを推奨します。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => detail.setShowRadiusWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 半径30m以下の警告ポップアップ */}
      <AlertDialog open={detail.showRadius30mWarning} onOpenChange={detail.setShowRadius30mWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  指定半径が30m以下の場合、来店数が0になる可能性があります。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => detail.setShowRadius30mWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6ヶ月以上前の日付選択警告ポップアップ */}
      <AlertDialog open={detail.showDateRangeWarning} onOpenChange={detail.setShowDateRangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              日付範囲の制限
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  抽出対象日付は直近6ヶ月まで選択可能です。
                </p>
                <p className="text-sm text-gray-700">
                  6ヶ月以上前の日付を指定する場合は、アースラでBW依頼をしてください。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => detail.setShowDateRangeWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
