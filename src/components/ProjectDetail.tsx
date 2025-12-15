import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Building2, Package, Users, FileText, Plus, MapPin, X, Upload, Map, List, CheckCircle, ChevronDown, Edit, Save, FileEdit, Database, AlertCircle, ExternalLink, Clock, Target, Settings2, MessageSquare, History } from 'lucide-react';
import { RADIUS_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SegmentForm } from './SegmentForm';
import { SegmentTable } from './SegmentTable';
import { PoiForm } from './PoiForm';
import { PoiTable } from './PoiTable';
import { PoiBulkUpload } from './PoiBulkUpload';
import { PoiMapViewer } from './PoiMapViewer';
import { ProjectEditRequestDialog } from './ProjectEditRequestDialog';
import { PoiEditRequestDialog } from './PoiEditRequestDialog';
import { EditableProjectField } from './EditableProjectField';
import { GeocodeProgressDialog } from './GeocodeProgressDialog';
import { ProjectMessages } from './ProjectMessages';
import { ProjectChangeHistory } from './ProjectChangeHistory';
import { useAuth } from '../contexts/AuthContext';
import type { Project, Segment, PoiInfo, EditRequest, ProjectMessage, ChangeHistory } from '../types/schema';
import { PROJECT_STATUS_OPTIONS } from '../types/schema';
import { getAutoProjectStatus, getStatusColor, getStatusLabel } from '../utils/projectStatus';
import { canDirectEdit, canEditProject, requiresEditRequest } from '../utils/editRequest';
import { enrichPOIsWithGeocode, GeocodeError } from '../utils/geocoding';
import { calculateDataCoordinationDate } from '../utils/dataCoordinationDate';
import { bigQueryService } from '../utils/bigquery'; // 追加

interface ProjectDetailProps {
  project: Project;
  segments: Segment[];
  pois: PoiInfo[];
  onBack: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
  onSegmentCreate: (segment: Partial<Segment>) => void;
  onSegmentUpdate: (segmentId: string, updates: Partial<Segment>) => void;
  onSegmentDelete: (segmentId: string) => void;
  onPoiCreate: (segmentId: string, poiData: Partial<PoiInfo>) => void;
  onPoiUpdate: (poiId: string, updates: Partial<PoiInfo>) => Promise<void>;
  onPoiDelete: (poiId: string) => void;
  editRequests?: EditRequest[];
  onEditRequestCreate?: (request: EditRequest) => void;
  onEditRequestApprove?: (requestId: string, comment: string) => void;
  onEditRequestReject?: (requestId: string, comment: string) => void;
  onEditRequestWithdraw?: (requestId: string) => void;
  onUnreadCountUpdate?: () => void;
}

export function ProjectDetail({ 
  project, 
  segments,
  pois,
  onBack,
  onProjectUpdate,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete,
  onPoiCreate,
  onPoiUpdate,
  onPoiDelete,
  editRequests = [],
  onEditRequestCreate,
  onEditRequestApprove,
  onEditRequestReject,
  onEditRequestWithdraw,
  onUnreadCountUpdate
}: ProjectDetailProps) {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<PoiInfo | null>(null);
  const [selectedSegmentForPoi, setSelectedSegmentForPoi] = useState<string | null>(null);
  const [managingSegment, setManagingSegment] = useState<Segment | null>(null); // Used for Upload Dialog context
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [poiViewMode, setPoiViewMode] = useState<'list' | 'map'>('list');
  const [showProjectEditDialog, setShowProjectEditDialog] = useState(false);
  const [showPoiEditDialog, setShowPoiEditDialog] = useState(false);
  const [editRequestPoi, setEditRequestPoi] = useState<PoiInfo | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [showSegmentSelectForPoi, setShowSegmentSelectForPoi] = useState(false);
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | undefined>(undefined);
  
  // ジオコーディング関連の��態
  const [showGeocodeProgress, setShowGeocodeProgress] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [geocodeTotal, setGeocodeTotal] = useState(0);
  const [geocodeSuccessCount, setGeocodeSuccessCount] = useState(0);
  const [geocodeErrorCount, setGeocodeErrorCount] = useState(0);
  const [geocodeErrors, setGeocodeErrors] = useState<GeocodeError[]>([]);
  const [geocodeCompleted, setGeocodeCompleted] = useState(false);
  const [geocodingSegment, setGeocodingSegment] = useState<Segment | null>(null);

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showExtractionConditionsPopup, setShowExtractionConditionsPopup] = useState(false);
  const [extractionConditionsSegment, setExtractionConditionsSegment] = useState<Segment | null>(null);
  const [extractionConditionsFormData, setExtractionConditionsFormData] = useState<Partial<PoiInfo>>({});
  const statusInfo = useMemo(() => getAutoProjectStatus(project, segments, pois), [project, segments, pois]);
  const statusColor = getStatusColor(statusInfo.status);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user) return;
      const messages = await bigQueryService.getProjectMessages(project.project_id);
      const userRole = user.role === 'admin' ? 'admin' : 'sales';
      const count = messages.filter(m => m.sender_role !== userRole && !m.is_read).length;
      setUnreadMessageCount(count);
    };
    loadUnreadCount();
  }, [project.project_id, user, activeTab]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '-';
    return new Date(dateTimeStr).toLocaleString('ja-JP');
  };

  const handleSegmentFormSubmit = (segmentData: Partial<Segment>) => {
    if (editingSegment) {
      onSegmentUpdate(editingSegment.segment_id, segmentData);
    } else {
      onSegmentCreate(segmentData);
    }
    setShowSegmentForm(false);
    setEditingSegment(null);
  };

  const handleEditSegment = (segment: Segment) => {
    setEditingSegment(segment);
    setShowSegmentForm(true);
  };

  const handleAddPoi = (segmentId: string) => {
    setSelectedSegmentForPoi(segmentId);
    setEditingPoi(null);
    setShowPoiForm(true);
  };

  const handleEditPoi = (poi: PoiInfo) => {
    const parentSegment = segments.find(s => s.segment_id === poi.segment_id);
    if (requiresEditRequest('poi', poi, undefined, parentSegment)) {
      setEditRequestPoi(poi);
      setShowPoiEditDialog(true);
    } else {
      setSelectedSegmentForPoi(poi.segment_id);
      setEditingPoi(poi);
      setShowPoiForm(true);
    }
  };

  const handleCancelForm = () => {
    setShowSegmentForm(false);
    setEditingSegment(null);
  };

  const handleManagePois = (segment: Segment) => {
    // 地点管理画面（タブ）へ移動
    setActiveTab('pois');
    setExpandedSegmentId(segment.segment_id);
  };

  const handleOpenBulkUpload = (segment: Segment) => {
    setManagingSegment(segment);
    setShowBulkUpload(true);
  };

  const handleBulkUploadComplete = (pois: Partial<PoiInfo>[]) => {
    pois.forEach(poi => {
      if (managingSegment) {
        onPoiCreate(managingSegment.segment_id, poi);
      }
    });
    setShowBulkUpload(false);
    setManagingSegment(null);
  };

  // PoiFormからのCSV一括登録ハンドラ
  const handlePoiFormBulkSubmit = (pois: Partial<PoiInfo>[]) => {
    pois.forEach(poi => {
      if (selectedSegmentForPoi) {
        onPoiCreate(selectedSegmentForPoi, poi);
      }
    });
    setShowPoiForm(false);
    setEditingPoi(null);
    setSelectedSegmentForPoi(null);
  };

  const handleConfirmSegment = async (segment: Segment) => {
    await executeGeocoding(segment);
  };

  const handleDataLinkRequest = (segment: Segment) => {
    // データ連携依頼を実行（ステータス更新）
    onSegmentUpdate(segment.segment_id, {
      data_link_status: 'requested',
      data_link_request_date: new Date().toISOString(),
      request_confirmed: true,
    });
    toast.success('データ連携依頼を送信しました');
  };

  // ジオコーディング実行関数
  const executeGeocoding = async (segment: Segment) => {
    setGeocodingSegment(segment);
    
    const segmentPois = pois.filter(poi => poi.segment_id === segment.segment_id);
    
    if (segmentPois.length === 0) {
      toast.error('地点が登録されていません');
      return;
    }

    const needsGeocoding = segmentPois.filter(
      poi => !poi.latitude || !poi.longitude || poi.latitude === 0 || poi.longitude === 0
    );

    setShowGeocodeProgress(true);
    setGeocodeProgress(0);
    setGeocodeTotal(needsGeocoding.length);
    setGeocodeSuccessCount(0);
    setGeocodeErrorCount(0);
    setGeocodeErrors([]);
    setGeocodeCompleted(false);

    try {
      const { enriched, errors } = await enrichPOIsWithGeocode(
        segmentPois,
        (current, total) => {
          setGeocodeProgress(current);
          setGeocodeTotal(total);
        }
      );

      const successCount = enriched.filter(poi => poi.latitude && poi.longitude).length - (segmentPois.length - needsGeocoding.length);
      const errorCount = errors.length;

      setGeocodeSuccessCount(successCount);
      setGeocodeErrorCount(errorCount);
      setGeocodeErrors(errors);
      setGeocodeCompleted(true);

      enriched.forEach(poi => {
        if (poi.poi_id) {
          onPoiUpdate(poi.poi_id, {
            latitude: poi.latitude,
            longitude: poi.longitude,
          });
        }
      });

      const requestDateTime = new Date().toISOString();
      const coordinationDate = calculateDataCoordinationDate(requestDateTime);

      onSegmentUpdate(segment.segment_id, {
        location_request_status: 'storing',
        data_coordination_date: coordinationDate,
      });

      if (errorCount === 0) {
        toast.success(`地点データの格納依頼が完了しました（${successCount}件）`);
      } else {
        toast.warning(`格納依頼完了: 成功${successCount}件、エラー${errorCount}件`);
      }

    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('ジオコーディング処理に失敗しました');
      setShowGeocodeProgress(false);
    }
  };

  const handleCloseGeocodeDialog = () => {
    if (geocodeCompleted) {
      setShowGeocodeProgress(false);
      setGeocodingSegment(null);
    }
  };

  const handleEditRequestSubmit = (request: EditRequest) => {
    if (onEditRequestCreate) {
      onEditRequestCreate(request);
    }
  };

  const handleStartEditProject = () => {
    setEditedProject({
      universe_service_id: project.universe_service_id || '',
      universe_service_name: project.universe_service_name || '',
      sub_person_in_charge: project.sub_person_in_charge || '',
    });
    setIsEditingProject(true);
  };

  const handleCancelEditProject = () => {
    setIsEditingProject(false);
    setEditedProject({});
  };

  const handleSaveProject = () => {
    onProjectUpdate(project.project_id, editedProject);
    setIsEditingProject(false);
    setEditedProject({});
  };

  const handleFieldSave = (fieldName: string, value: string) => {
    onProjectUpdate(project.project_id, { [fieldName]: value });
  };

  const handleFieldRequestEdit = (fieldName: string, newValue: string, reason: string) => {
    if (!onEditRequestCreate) return;

    const before: Record<string, any> = {};
    const after: Record<string, any> = {};
    before[fieldName] = (project as any)[fieldName];
    after[fieldName] = newValue;

    const changes: EditRequest['changes'] = {};
    changes[fieldName] = {
      before: before[fieldName],
      after: after[fieldName],
    };

    const request: EditRequest = {
      request_id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      request_type: 'project',
      target_id: project.project_id,
      project_id: project.project_id,
      requested_by: user?.email || '',
      requested_at: new Date().toISOString(),
      request_reason: reason,
      status: 'pending',
      changes,
    };

    onEditRequestCreate(request);
  };

  const getMediaLabels = (mediaId: string | string[]) => {
    const mediaMap: { [key: string]: string } = {
      'universe': 'UNIVERSE',
      'tver_sp': 'TVer(SP)',
      'tver_ctv': 'TVer(CTV)',
    };
    if (Array.isArray(mediaId)) {
      return mediaId.map(id => mediaMap[id] || id);
    }
    return [mediaMap[mediaId] || mediaId];
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'not_requested':
        return { label: '未依頼', color: 'bg-gray-100 text-gray-700', icon: '⏳' };
      case 'storing':
        return { label: '格納対応中', color: 'bg-blue-100 text-blue-700', icon: '🔄' };
      case 'completed':
        return { label: '格納完了', color: 'bg-green-100 text-green-700', icon: '✅' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: '❓' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <Button
          variant="outline"
          size="default"
          onClick={onBack}
          className="mb-4 border-[#5b5fff]/60 text-[#5b5fff] hover:bg-[#5b5fff]/90 hover:text-white hover:border-[#5b5fff]/90 font-semibold shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          案件一覧に戻る
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-gray-900">{project.advertiser_name}</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{project.project_id}</Badge>
            <Badge className={`inline-flex items-center gap-1 text-xs border ${statusColor.badge}`}>
              <span>{getStatusLabel(statusInfo.status)}</span>
            </Badge>
          </div>
          <p className="text-muted-foreground">登録日: {formatDateTime(project._register_datetime)}</p>
        </div>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <TabsList className="w-full h-auto p-1.5 bg-[#f5f5ff] border-b border-gray-200 flex gap-1.5 rounded-none">
            <TabsTrigger 
              value="overview" 
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">案件概要</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="segments"
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
              className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all hover:bg-white/60 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">連絡事項</span>
                {unreadMessageCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                    {unreadMessageCount}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger 
                value="history"
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
                    {segments.length > 0 && !hasPermission('canApproveEditRequests') && (
                      <span className="ml-2 text-orange-600">
                        • 編集には管理部承認が必要です
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {canEditProject(user, project) && (
                <Button
                  onClick={() => setShowProjectEditDialog(true)}
                  className="bg-[#5b5fff] text-white hover:bg-[#4949dd] h-10 px-6 gap-2 shadow-sm hover:shadow-md transition-all"
                >
                  <Edit className="w-4 h-4" />
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
                    <Building2 className="w-5 h-5 text-[#5b5fff]" />
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
                    <p className="text-gray-900">{formatDate(project.delivery_start_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-sm">配信終了日</p>
                    <p className="text-gray-900">{formatDate(project.delivery_end_date)}</p>
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

          {/* 変更履歴セクション (omitted for brevity but preserved in logic) */}
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
                  .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())
                  .map((request, index) => {
                    const statusColor = 
                      request.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-200';
                    
                    const isMyRequest = request.requested_by === user?.email;
                    
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
                                <Badge className={statusColor}>
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
                              <span>{formatDateTime(request.requested_at)}</span>
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
        <TabsContent value="segments" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
          {/* ヘッダーセクション */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 mb-1">セグメント一覧</h3>
                  <p className="text-sm text-gray-500">この案件に登録されているセグメントを管理します</p>
                </div>
              </div>
              {canEditProject(user, project) && (
                <Button
                  onClick={() => setShowSegmentForm(true)}
                  className="bg-[#5b5fff] text-white hover:bg-[#4949dd] h-10 px-6 gap-2 shadow-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  新規セグメント追加
                </Button>
              )}
            </div>
          </div>

          {/* コンテンツセクション */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <SegmentTable
              segments={segments}
              pois={pois}
              project={project}
              onEdit={handleEditSegment}
              onDelete={onSegmentDelete}
              onManagePois={handleManagePois}
              onDataLinkRequest={handleDataLinkRequest}
            />
          </div>
        </TabsContent>

        {/* 地点情報タブ */}
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
                 {/* 表示切り替えボタン（地点が0件でも表示。地図は空表示で） */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setPoiViewMode('list')}
                    className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
                      poiViewMode === 'list'
                        ? 'bg-white text-[#5b5fff] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    リスト
                  </button>
                  <button
                    onClick={() => setPoiViewMode('map')}
                    className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
                      poiViewMode === 'map'
                        ? 'bg-white text-[#5b5fff] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    地図
                  </button>
                </div>
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
                 <Button onClick={() => { setShowSegmentForm(true); setActiveTab("segments"); }}>
                   セグメントを作成する
                 </Button>
               </div>
            ) : poiViewMode === 'map' ? (
              <PoiMapViewer 
                pois={pois} 
                segments={segments} 
                onPoiUpdate={async (poiId: string, updates: Partial<PoiInfo>) => {
                  await onPoiUpdate(poiId, updates);
                }}
              />
            ) : (
              <Accordion type="single" collapsible className="space-y-4" value={expandedSegmentId} onValueChange={setExpandedSegmentId}>
                {segments.map((segment) => {
                  const segmentPois = pois.filter(poi => poi.segment_id === segment.segment_id);
                  const poiCount = segmentPois.length;
                  const poisWithCoords = segmentPois.filter(p => p.latitude && p.longitude).length;
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
                            <div className="text-left">
                              <div className="flex items-center gap-3">
                                <h4 className="text-base font-medium text-gray-900">
                                  {segment.segment_name || '名称未設定'}
                                </h4>
                                <Badge variant="outline" className="text-xs text-gray-500 font-normal">
                                  ID: {segment.segment_id}
                                </Badge>
                                <Badge className={`text-xs border-0 ${statusInfo.color}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  媒体: {getMediaLabels(segment.media_id).join('、')}
                                </p>
                                <div className="w-px h-3 bg-gray-300"></div>
                                <p className="text-xs text-muted-foreground">
                                  登録地点: <span className="font-medium text-gray-900">{poiCount}件</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-6 py-6 bg-gray-50/50">
                        {/* コンテンツ内部 */}
                        <div className="space-y-6">

                          {/* 抽出条件設定ボタン（一覧の上に表示） */}
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={segment.location_request_status !== 'not_requested'}
                              onClick={() => {
                                if (segment.location_request_status !== 'not_requested') {
                                  toast.warning('格納依頼済みのため抽出条件は変更できません');
                                  return;
                                }
                                setExtractionConditionsSegment(segment);
                                const firstPoi = segmentPois[0];
                                setExtractionConditionsFormData({
                                  designated_radius: (firstPoi?.designated_radius) || segment.designated_radius || '',
                                  extraction_period: (firstPoi?.extraction_period) || segment.extraction_period || '1month',
                                  extraction_period_type: (firstPoi?.extraction_period_type) || segment.extraction_period_type || 'preset',
                                  extraction_start_date: (firstPoi?.extraction_start_date) || segment.extraction_start_date || '',
                                  extraction_end_date: (firstPoi?.extraction_end_date) || segment.extraction_end_date || '',
                                  attribute: (firstPoi?.attribute) || segment.attribute || 'detector',
                                  detection_count: (firstPoi?.detection_count) || segment.detection_count || 1,
                                  detection_time_start: (firstPoi?.detection_time_start) || segment.detection_time_start || '',
                                  detection_time_end: (firstPoi?.detection_time_end) || segment.detection_time_end || '',
                                  stay_time: (firstPoi?.stay_time) || segment.stay_time || '',
                                });
                                setShowExtractionConditionsPopup(true);
                              }}
                              className="bg-white border border-gray-300 text-[#5b5fff] hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                            >
                              <Settings2 className="w-4 h-4 mr-2" />
                              抽出条件を設定
                            </Button>
                          </div>

                          {/* 0. 抽出条件サマリー */}
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
                                  ) : (
                                    (() => {
                                      const labels: Record<string, string> = {
                                        '1month': '過去1ヶ月',
                                        '3month': '過去3ヶ月',
                                        '6month': '過去6ヶ月',
                                        '12month': '過去12ヶ月',
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
                          
                          {/* 1. ステータス / 格納依頼エリア */}
                          {poiCount > 0 && segment.location_request_status === 'not_requested' && canEditProject(user, project) && (
                            <div className="bg-gradient-to-r from-[#5b5fff]/10 via-[#7b7bff]/10 to-[#5b5fff]/10 rounded-xl p-5 border-2 border-[#5b5fff]/30 shadow-sm">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
                                    <Database className="w-4 h-4 text-[#5b5fff]" />
                                    地点データ格納依頼
                                  </h5>
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    地点の登録が完了したら実行してください。管理部へデータ抽出を依頼します。<br/>
                                    <span className="text-red-600 font-medium">※依頼後は編集できなくなります。</span>
                                  </p>
                                </div>
                                <Button
                                  onClick={() => handleConfirmSegment(segment)}
                                  className="bg-[#5b5fff] hover:bg-[#4949dd] text-white shadow-md whitespace-nowrap"
                                >
                                  格納依頼を実行
                                </Button>
                              </div>
                            </div>
                          )}

                          {segment.location_request_status !== 'not_requested' && (
                            <div className={`rounded-xl p-4 border ${
                              segment.location_request_status === 'completed' 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {segment.location_request_status === 'completed' 
                                      ? 'この���グメントのデータ格納は完了しています' 
                                      : '現在、管理部によるデータ格納対応中です'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. ツールバー (CSVアップロードなど) */}
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700">地点リスト</h5>
                            <div className="flex gap-2">
                              <>
                                {segment.location_request_status === 'not_requested' && canEditProject(user, project) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenBulkUpload(segment)}
                                      className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
                                    >
                                      <Upload className="w-3.5 h-3.5 mr-2" />
                                      CSV一括登録
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddPoi(segment.segment_id)}
                                      className="bg-[#5b5fff] text-white hover:bg-[#4949dd]"
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-2" />
                                      地点を追加
                                    </Button>
                                  </>
                                )}
                              </>
                            </div>
                          </div>

                          {/* 3. テーブル */}
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
          </div>
        </TabsContent>

        {/* 連絡事項タブ */}
        <TabsContent value="messages" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
          <ProjectMessages project={project} onUnreadCountUpdate={onUnreadCountUpdate} />
        </TabsContent>

        {/* 変更履歴タブ（管理部のみ） */}
        {user?.role === 'admin' && (
          <TabsContent value="history" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
            <ProjectChangeHistory project={project} segments={segments} />
          </TabsContent>
        )}

        </div>
      </Tabs>

      {/* セグメント選択ダイアログ（新規地点追加用） */}
      <Dialog open={showSegmentSelectForPoi} onOpenChange={setShowSegmentSelectForPoi}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>地点を追加するセグメントを選択</DialogTitle>
          </DialogHeader>
          
          {segments.length === 0 ? (
             <div className="text-center py-8">
               <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
               <p className="text-gray-600 mb-4">セグメントがありません。先にセグメントを作成してください。</p>
               <Button onClick={() => { setShowSegmentSelectForPoi(false); setShowSegmentForm(true); }}>
                 新規セグメント作成
               </Button>
             </div>
          ) : (
            <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
              {segments.map((segment) => (
                <button
                  key={segment.segment_id}
                  onClick={() => {
                    setShowSegmentSelectForPoi(false);
                    handleAddPoi(segment.segment_id);
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
                  <Plus className="w-5 h-5 text-gray-300 group-hover:text-[#5b5fff]" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 地点フォームモーダル */}
      {showPoiForm && selectedSegmentForPoi && (() => {
        const segment = segments.find(s => s.segment_id === selectedSegmentForPoi);
        return (
          <PoiForm
            projectId={project.project_id}
            segmentId={selectedSegmentForPoi}
            segmentName={segment?.segment_name}
            segment={segment}
            pois={pois}
            poi={editingPoi}
            onSubmit={(poiData) => {
              if (editingPoi && editingPoi.poi_id) {
                onPoiUpdate(editingPoi.poi_id, poiData);
              } else {
                onPoiCreate(selectedSegmentForPoi, poiData);
              }
              setShowPoiForm(false);
              setEditingPoi(null);
              setSelectedSegmentForPoi(null);
            }}
            onBulkSubmit={handlePoiFormBulkSubmit}
            onCancel={() => {
              setShowPoiForm(false);
              setEditingPoi(null);
              setSelectedSegmentForPoi(null);
            }}
          />
        );
      })()}

      {/* 一括アップロードモーダル */}
      {showBulkUpload && managingSegment && (
        <PoiBulkUpload
          projectId={project.project_id}
          segmentId={managingSegment.segment_id}
          onUploadComplete={handleBulkUploadComplete}
          onCancel={() => setShowBulkUpload(false)}
        />
      )}

      {/* セグメントフォームモーダル */}
      {showSegmentForm && (
        <SegmentForm
          projectId={project.project_id}
          segment={editingSegment}
          existingSegments={segments}
          pois={pois}
          onSubmit={handleSegmentFormSubmit}
          onCancel={handleCancelForm}
        />
      )}

      {/* 案件編集依頼ダイアログ */}
      {showProjectEditDialog && onEditRequestCreate && (
        <ProjectEditRequestDialog
          project={project}
          open={showProjectEditDialog}
          onClose={() => setShowProjectEditDialog(false)}
          onSubmit={handleEditRequestSubmit}
          onDirectUpdate={onProjectUpdate}
          editRequests={editRequests}
          onEditRequestApprove={onEditRequestApprove}
          onEditRequestReject={onEditRequestReject}
          onEditRequestWithdraw={onEditRequestWithdraw}
          currentUserId={user?.email || ''}
          isAdmin={hasPermission('canViewAdminDashboard')}
        />
      )}

      {/* 地点編集依頼ダイアログ */}
      {showPoiEditDialog && editRequestPoi && onEditRequestCreate && (
        <PoiEditRequestDialog
          poi={editRequestPoi}
          open={showPoiEditDialog}
          onClose={() => {
            setShowPoiEditDialog(false);
            setEditRequestPoi(null);
          }}
          onSubmit={handleEditRequestSubmit}
          currentUserId={user?.email || ''}
        />
      )}

      {/* ジオコーディング進捗ダイアログ */}
      <GeocodeProgressDialog
        open={showGeocodeProgress}
        current={geocodeProgress}
        total={geocodeTotal}
        successCount={geocodeSuccessCount}
        errorCount={geocodeErrorCount}
        errors={geocodeErrors}
        completed={geocodeCompleted}
        onClose={handleCloseGeocodeDialog}
      />

      {/* 抽出条件設定ポップアップ */}
      {showExtractionConditionsPopup && extractionConditionsSegment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#5b5fff]" />
                <h2 className="text-xl font-semibold text-gray-900">抽出条件設定</h2>
              </div>
              <button
                onClick={() => setShowExtractionConditionsPopup(false)}
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
                      設定した抽出条件は、このセグメント（{extractionConditionsSegment.segment_name || extractionConditionsSegment.segment_id}）に属するすべての地点に適用されます。
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
                  <div className="grid grid-cols-4 gap-2">
                    {RADIUS_OPTIONS.slice(0, 12).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setExtractionConditionsFormData(prev => ({ ...prev, designated_radius: option.value }))}
                        className={`px-3 py-2 text-sm rounded-md border transition-all ${
                          extractionConditionsFormData.designated_radius === option.value
                            ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <select
                      value={RADIUS_OPTIONS.find(r => r.value === extractionConditionsFormData.designated_radius) ? '' : extractionConditionsFormData.designated_radius || ''}
                      onChange={(e) => e.target.value && setExtractionConditionsFormData(prev => ({ ...prev, designated_radius: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">その他の半径を選択...</option>
                      {RADIUS_OPTIONS.slice(12).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 抽出期間 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5b5fff]" />
                    抽出期間
                  </Label>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={extractionConditionsFormData.extraction_period_type === 'preset'}
                        onChange={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period_type: 'preset' }))}
                        disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">プリセット</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={extractionConditionsFormData.extraction_period_type === 'custom'}
                        onChange={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period_type: 'custom' }))}
                        disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">期間指定</span>
                    </label>
                  </div>

                  {extractionConditionsFormData.extraction_period_type === 'preset' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period: option.value }))}
                          disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            extractionConditionsFormData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={extractionConditionsFormData.extraction_start_date || ''}
                        onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, extraction_start_date: e.target.value }))}
                        className="bg-white"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="date"
                        value={extractionConditionsFormData.extraction_end_date || ''}
                        onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, extraction_end_date: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                  )}
                  
                  {(extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
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
                          if (option.value === 'resident' || option.value === 'worker') {
                            updates.extraction_period = '3month';
                            updates.extraction_period_type = 'preset';
                          }
                          setExtractionConditionsFormData(prev => ({ ...prev, ...updates }));
                        }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          extractionConditionsFormData.attribute === option.value
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
                {extractionConditionsFormData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#5b5fff]" />
                      検知回数（〇回以上）
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={extractionConditionsFormData.detection_count || 1}
                        onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, detection_count: parseInt(e.target.value) || 1 }))}
                        className="bg-white"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">回以上</span>
                    </div>
                  </div>
                )}

                {/* 検知時間帯（検知者の場合のみ） */}
                {extractionConditionsFormData.attribute === 'detector' && (
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
                          value={extractionConditionsFormData.detection_time_start || ''}
                          onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, detection_time_start: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">終了時刻</Label>
                        <Input
                          type="time"
                          value={extractionConditionsFormData.detection_time_end || ''}
                          onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, detection_time_end: e.target.value }))}
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
                    value={extractionConditionsFormData.stay_time || ''}
                    onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, stay_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
                  >
                    <option value="">指定なし</option>
                    {STAY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExtractionConditionsPopup(false)}
                className="border-gray-300"
              >
                閉じる
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!extractionConditionsSegment) return;
                  
                  const segmentPois = pois.filter(p => p.segment_id === extractionConditionsSegment.segment_id);
                  
                  try {
                    // セグメントに条件を保存して今後追加する地点の初期値にも反映
                    await onSegmentUpdate(extractionConditionsSegment.segment_id, {
                      designated_radius: extractionConditionsFormData.designated_radius,
                      extraction_period: extractionConditionsFormData.extraction_period,
                      extraction_period_type: extractionConditionsFormData.extraction_period_type,
                      extraction_start_date: extractionConditionsFormData.extraction_start_date,
                      extraction_end_date: extractionConditionsFormData.extraction_end_date,
                      attribute: extractionConditionsFormData.attribute,
                      detection_count: extractionConditionsFormData.detection_count,
                      detection_time_start: extractionConditionsFormData.detection_time_start,
                      detection_time_end: extractionConditionsFormData.detection_time_end,
                      stay_time: extractionConditionsFormData.stay_time,
                    });

                    // 既存地点にも適用
                    for (const poi of segmentPois) {
                      if (poi.poi_id) {
                        await onPoiUpdate(poi.poi_id, extractionConditionsFormData);
                      }
                    }

                    toast.success(
                      segmentPois.length > 0
                        ? `${segmentPois.length}件の地点に抽出条件を適用しました`
                        : 'セグメントに抽出条件を保存しました（今後追加する地点に適用されます）'
                    );
                    setShowExtractionConditionsPopup(false);
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
    </div>
  );
}
