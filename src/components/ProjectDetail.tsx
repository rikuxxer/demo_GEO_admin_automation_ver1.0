import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Building2, Package, Users, FileText, Plus, MapPin, X, Map, List, CheckCircle, ChevronDown, Edit, Save, FileEdit, Database, AlertCircle, ExternalLink, Clock, Target, Settings2, MessageSquare, History, Loader2 } from 'lucide-react';
import { EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SegmentForm } from './SegmentForm';
import { SegmentTable } from './SegmentTable';
import { PoiForm } from './PoiForm';
import { PoiTable } from './PoiTable';
import { PoiMapViewer } from './PoiMapViewer';
import { ProjectEditRequestDialog } from './ProjectEditRequestDialog';
import { PoiEditRequestDialog } from './PoiEditRequestDialog';
import { EditableProjectField } from './EditableProjectField';
import { GeocodeProgressDialog } from './GeocodeProgressDialog';
import { ProjectMessages } from './ProjectMessages';
import { ProjectChangeHistory } from './ProjectChangeHistory';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useAuth } from '../contexts/AuthContext';
import type { Project, Segment, PoiInfo, EditRequest, ProjectMessage, ChangeHistory, VisitMeasurementGroup } from '../types/schema';
import { PROJECT_STATUS_OPTIONS } from '../types/schema';
import { getAutoProjectStatus, getStatusColor, getStatusLabel } from '../utils/projectStatus';
import { canDirectEdit, canEditProject, requiresEditRequest } from '../utils/editRequest';
import { enrichPOIsWithGeocode, GeocodeError } from '../utils/geocoding';
import { calculateDataCoordinationDate } from '../utils/dataCoordinationDate';
import { bigQueryService } from '../utils/bigquery'; // 追加
import { exportPoisToSheet } from '../utils/googleSheets';

interface ProjectDetailProps {
  project: Project;
  segments: Segment[];
  pois: PoiInfo[];
  onBack: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
  onSegmentCreate: (segment: Partial<Segment>) => Promise<Segment | void>;
  onSegmentUpdate: (segmentId: string, updates: Partial<Segment>) => Promise<void>;
  onSegmentDelete: (segmentId: string) => void;
  onPoiCreate: (segmentId: string, poiData: Partial<PoiInfo>) => void;
  onPoiCreateBulk?: (segmentId: string, poisData: Partial<PoiInfo>[]) => Promise<any>;
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
  onPoiCreateBulk,
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
  const [poiViewMode, setPoiViewMode] = useState<'list' | 'map'>('list');
  const [poiViewModeByCategory, setPoiViewModeByCategory] = useState<Record<'tg' | 'visit_measurement', 'list' | 'map'>>({
    tg: 'list',
    visit_measurement: 'list',
  });
  const [showProjectEditDialog, setShowProjectEditDialog] = useState(false);
  const [showPoiEditDialog, setShowPoiEditDialog] = useState(false);
  const [editRequestPoi, setEditRequestPoi] = useState<PoiInfo | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [showSegmentSelectForPoi, setShowSegmentSelectForPoi] = useState(false);
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | undefined>(undefined);
  
  // Accordionの制御状態を維持（undefinedではなく空文字列を使用）
  const accordionValue = expandedSegmentId ?? '';
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<'tg' | 'visit_measurement'>('tg');
  
  // 計測地点グループ関連の状態
  const [visitMeasurementGroups, setVisitMeasurementGroups] = useState<VisitMeasurementGroup[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VisitMeasurementGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({ group_name: '' });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // ジオコーディング関連の��態
  const [showGeocodeProgress, setShowGeocodeProgress] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [geocodeTotal, setGeocodeTotal] = useState(0);
  const [geocodeSuccessCount, setGeocodeSuccessCount] = useState(0);
  const [geocodeErrorCount, setGeocodeErrorCount] = useState(0);
  const [geocodeErrors, setGeocodeErrors] = useState<GeocodeError[]>([]);
  const [geocodeCompleted, setGeocodeCompleted] = useState(false);
  const [geocodingSegment, setGeocodingSegment] = useState<Segment | null>(null);
  const [isGeocodingRunning, setIsGeocodingRunning] = useState(false);
  const [backgroundGeocodingSegment, setBackgroundGeocodingSegment] = useState<string | null>(null);

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showExtractionConditionsPopup, setShowExtractionConditionsPopup] = useState(false);
  const [extractionConditionsSegment, setExtractionConditionsSegment] = useState<Segment | null>(null);
  const [extractionConditionsFormData, setExtractionConditionsFormData] = useState<Partial<PoiInfo>>({});
  const [designatedRadiusDraft, setDesignatedRadiusDraft] = useState('');
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  // 半径30m以下の警告ポップアップ表示状態
  const [showRadius30mWarning, setShowRadius30mWarning] = useState(false);
  const [hasShownRadius30mWarning, setHasShownRadius30mWarning] = useState(false);
  // 6ヶ月以上前の日付選択警告ポップアップ表示状態
  const [showDateRangeWarning, setShowDateRangeWarning] = useState(false);

  // 6ヶ月前の日付を計算（YYYY-MM-DD形式）
  const getSixMonthsAgoDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  };

  // 日付が6ヶ月以上前かどうかをチェック
  const isDateMoreThanSixMonthsAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return selectedDate < sixMonthsAgo;
  };
  const statusInfo = useMemo(() => getAutoProjectStatus(project, segments, pois), [project, segments, pois]);
  const statusColor = getStatusColor(statusInfo.status);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user) return;
      const messages = await bigQueryService.getProjectMessages(project.project_id);
      const userRole = user.role === 'admin' ? 'admin' : 'sales';
      const count = messages.filter(m => m.sender_role !== userRole && !m.is_read).length;
      setUnreadMessageCount(count);
      
      // messagesタブが開かれたときに既読処理を実行
      if (activeTab === 'messages') {
        try {
          await bigQueryService.markMessagesAsRead(project.project_id, userRole);
          // 未読数を更新
          if (onUnreadCountUpdate) {
            onUnreadCountUpdate();
          }
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
        }
      }
    };
    loadUnreadCount();
  }, [project.project_id, user, activeTab, onUnreadCountUpdate]);

  const formatDate = (dateStr?: string | null | Date | any) => {
    // null、undefined、空文字列の場合は「-」を返す
    if (!dateStr || (typeof dateStr === 'string' && dateStr.trim() === '')) {
      return '-';
    }
    
    // Dateオブジェクトの場合は直接処理
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) {
        console.warn('⚠️ formatDate: 無効なDateオブジェクト', dateStr);
        return '-';
      }
      try {
        return dateStr.toLocaleDateString('ja-JP');
      } catch (e) {
        console.warn('⚠️ formatDate() toLocaleDateString failed:', dateStr, e);
        return '-';
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
            return '-';
          }
          dateStr = str;
        } catch (e) {
          console.warn('⚠️ formatDate: オブジェクトの変換に失敗', dateStr, e);
          return '-';
        }
      } else {
        console.warn('⚠️ formatDate: 未対応のオブジェクト形式', dateStr);
        return '-';
      }
    }
    
    // BigQueryのDATE型はYYYY-MM-DD形式で返される
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
            return '-';
          }
        }
      }
    }
    
    // YYYY-MM-DD形式でない場合は、Dateオブジェクトとして試行
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ formatDate: 無効な日付値', dateString);
      return '-';
    }
    try {
      return date.toLocaleDateString('ja-JP');
    } catch (e) {
      console.warn('⚠️ formatDate() failed:', dateString, e);
      return '-';
    }
  };

  const formatDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleString('ja-JP');
    } catch (e) {
      console.warn('⚠️ formatDateTime() failed:', dateTimeStr, e);
      return '-';
    }
  };

  const handleSegmentFormSubmit = async (segmentData: Partial<Segment>, copyFromSegmentId?: string) => {
    if (editingSegment) {
      await onSegmentUpdate(editingSegment.segment_id, segmentData);
    } else {
      // 新規セグメント作成
      const newSegment = await onSegmentCreate(segmentData);
      
      // 既存セグメントから地点をコピーする場合
      if (copyFromSegmentId && newSegment && onPoiCreateBulk) {
        const sourcePois = pois.filter(p => p.segment_id === copyFromSegmentId);
        if (sourcePois.length > 0) {
          // 地点情報をコピー（segment_idを新しいセグメントIDに変更）
          const copiedPois = sourcePois.map(poi => {
            const { poi_id, location_id, ...poiData } = poi;
            return {
              ...poiData,
              segment_id: newSegment.segment_id,
              // 地点IDとlocation_idは自動採番されるため削除
            };
          });
          
          try {
            await onPoiCreateBulk(newSegment.segment_id, copiedPois);
            toast.success(`${sourcePois.length}件の地点をコピーしました`);
          } catch (error) {
            console.error('地点のコピーに失敗しました:', error);
            toast.error('地点のコピーに失敗しました');
          }
        }
      }
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
    // 来店計測地点はセグメントに従属しないため、セグメントの状態に関係なく編集可能
    if (poi.poi_category === 'visit_measurement') {
      setSelectedSegmentForPoi(poi.segment_id);
      setEditingPoi(poi);
      setShowPoiForm(true);
    } else if (requiresEditRequest('poi', poi, undefined, parentSegment)) {
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


  // PoiFormからのCSV一括登録ハンドラ
  const handlePoiFormBulkSubmit = async (pois: Partial<PoiInfo>[]) => {
    if (!selectedSegmentForPoi) return;
    
    console.log(`🔄 一括登録開始: ${pois.length}件の地点`);
    
    try {
      const poisWithCategory = pois.map(poi => ({
        ...poi,
        poi_category: poi.poi_category || selectedPoiCategory,
        visit_measurement_group_id: poi.visit_measurement_group_id || (selectedPoiCategory === 'visit_measurement' && selectedGroupId ? selectedGroupId : undefined),
      }));
      
      // 一括登録専用メソッドを使用
      if (onPoiCreateBulk) {
        await onPoiCreateBulk(selectedSegmentForPoi, poisWithCategory);
      } else {
        // フォールバック: 順次実行
        for (const poi of poisWithCategory) {
          await onPoiCreate(selectedSegmentForPoi, poi);
        }
        toast.success(`${pois.length}件の地点が登録されました`);
      }
      
      console.log(`✅ 一括登録完了: ${pois.length}件`);
      
      setShowPoiForm(false);
      setEditingPoi(null);
      setSelectedSegmentForPoi(null);
    } catch (error) {
      console.error('一括登録エラー:', error);
      toast.error('地点の一括登録に失敗しました');
    }
  };

  const handleConfirmSegment = async (segment: Segment) => {
    await executeGeocoding(segment);
  };

  // 計測地点グループの読み込み
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groups = await bigQueryService.getVisitMeasurementGroups(project.project_id);
        setVisitMeasurementGroups(groups);
      } catch (error) {
        console.error('Error loading visit measurement groups:', error);
      }
    };
    loadGroups();
  }, [project.project_id]);

  // 計測地点グループの作成・更新
  const handleGroupSubmit = async () => {
    if (!groupFormData.group_name.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }
    try {
      if (editingGroup) {
        await bigQueryService.updateVisitMeasurementGroup(editingGroup.group_id, {
          group_name: groupFormData.group_name.trim(),
        });
        toast.success('グループを更新しました');
      } else {
        const newGroup = await bigQueryService.createVisitMeasurementGroup({
          project_id: project.project_id,
          group_name: groupFormData.group_name.trim(),
        });
        console.log('Created group:', newGroup);
        toast.success('グループを作成しました');
      }
      const groups = await bigQueryService.getVisitMeasurementGroups(project.project_id);
      console.log('Loaded groups:', groups);
      setVisitMeasurementGroups(groups);
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupFormData({ group_name: '' });
    } catch (error) {
      console.error('Error saving group:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      toast.error(`グループの保存に失敗しました: ${errorMessage}`);
    }
  };

  // 計測地点グループの削除
  const handleGroupDelete = async (groupId: string) => {
    if (!confirm('このグループを削除しますか？グループに属する地点は削除されません。')) {
      return;
    }
    try {
      await bigQueryService.deleteVisitMeasurementGroup(groupId);
      toast.success('グループを削除しました');
      const groups = await bigQueryService.getVisitMeasurementGroups(project.project_id);
      setVisitMeasurementGroups(groups);
      // 削除されたグループが選択されていた場合は選択を解除
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('グループの削除に失敗しました');
    }
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
  const executeGeocoding = async (segment: Segment, runInBackground: boolean = false) => {
    // 既に実行中の場合はスキップ
    if (isGeocodingRunning) {
      toast.warning('ジオコーディング処理は既に実行中です');
      return;
    }

    setGeocodingSegment(segment);
    setIsGeocodingRunning(true);

    const dataLinkNote = '※ データ連携依頼は完了していません。別途連携依頼を実行してください。';
    
    // 最新の地点データを取得（地点登録直後の反映を確実にするため）
    let latestPois = pois;
    try {
      const freshPois = await bigQueryService.getPoisByProject(project.project_id);
      latestPois = freshPois;
      console.log(`🔄 最新の地点データを取得: ${freshPois.length}件（元の地点数: ${pois.length}件）`);
    } catch (error) {
      console.warn('最新の地点データの取得に失敗しました。既存のデータを使用します:', error);
    }
    
    const segmentPois = latestPois.filter(poi => poi.segment_id === segment.segment_id);
    
    if (segmentPois.length === 0) {
      toast.error('地点が登録されていません');
      setIsGeocodingRunning(false);
      return;
    }

    // 指定半径のバリデーション（都道府県指定とポリゴン地点を除く）
    const nonPrefectureNonPolygonPois = segmentPois.filter(poi => 
      poi.poi_type !== 'prefecture' && 
      poi.poi_type !== 'polygon' &&
      !(poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
    );
    if (nonPrefectureNonPolygonPois.length > 0) {
      // セグメントの指定半径をチェック
      if (!segment.designated_radius || segment.designated_radius.trim() === '') {
        toast.error('指定半径が設定されていません。セグメント共通条件で指定半径を設定してください。');
        setIsGeocodingRunning(false);
        return;
      }
      
      // 地点ごとの指定半径もチェック（地点に設定されていない場合はセグメントの値を使用）
      const poisWithoutRadius = nonPrefectureNonPolygonPois.filter(poi => 
        !poi.designated_radius || poi.designated_radius.trim() === ''
      );
      if (poisWithoutRadius.length > 0 && !segment.designated_radius) {
        toast.error(`${poisWithoutRadius.length}件の地点で指定半径が設定されていません。`);
        setIsGeocodingRunning(false);
        return;
      }
    }

    // 緯度経度が必要なPOIをフィルタリング
    // 住所がある場合、または都道府県・市区町村がある場合（都道府県指定の地点）
    console.log(`📍 セグメントPOI詳細:`, segmentPois.map(poi => ({
      poi_id: poi.poi_id,
      poi_name: poi.poi_name,
      address: poi.address,
      latitude: poi.latitude,
      longitude: poi.longitude,
      poi_type: poi.poi_type,
      hasAddress: !!(poi.address && poi.address.trim() !== ''),
      hasPrefecture: !!(poi.prefectures && poi.prefectures.length > 0),
    })));
    
    // ポリゴン地点があるかチェック
    const hasPolygonPois = segmentPois.some(poi => 
      poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
    );

    const needsGeocoding = segmentPois.filter(poi => {
      // ポリゴン地点はジオコーディング不要
      if (poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)) {
        console.log(`🔵 POI ${poi.poi_id} (${poi.poi_name}): ポリゴン地点（ジオコーディング不要）`);
        return false;
      }

      const hasCoords = poi.latitude !== undefined && poi.latitude !== null && 
                        poi.longitude !== undefined && poi.longitude !== null &&
                        poi.latitude !== 0 && poi.longitude !== 0;
      if (hasCoords) {
        console.log(`✅ POI ${poi.poi_id} (${poi.poi_name}): 既に緯度経度あり (${poi.latitude}, ${poi.longitude})`);
        return false;
      }
      
      // 住所がある場合
      if (poi.address && poi.address.trim() !== '') {
        console.log(`🔍 POI ${poi.poi_id} (${poi.poi_name}): ジオコーディング必要（住所: ${poi.address}）`);
        return true;
      }
      
      // 都道府県・市区町村がある場合（都道府県指定の地点）
      if (poi.prefectures && poi.prefectures.length > 0) {
        console.log(`🔍 POI ${poi.poi_id} (${poi.poi_name}): ジオコーディング必要（都道府県: ${poi.prefectures.join(', ')}）`);
        return true;
      }
      
      console.log(`⚠️ POI ${poi.poi_id} (${poi.poi_name}): ジオコーディング対象外（住所も都道府県もなし）`);
      return false;
    });

    // ジオコーディングが必要な地点がない場合でも、ポリゴン地点がある場合は格納依頼を実行
    if (needsGeocoding.length === 0 && !hasPolygonPois) {
      toast.info('ジオコーディングが必要な地点がありません');
      setIsGeocodingRunning(false);
      return;
    }

    // ポリゴン地点のみの場合は、ジオコーディングをスキップして直接格納依頼を実行
    if (needsGeocoding.length === 0 && hasPolygonPois) {
      console.log('🔵 ポリゴン地点のみのため、ジオコーディングをスキップして格納依頼を実行します');
      
      const requestDateTime = new Date().toISOString();
      const coordinationDate = calculateDataCoordinationDate(requestDateTime);

      onSegmentUpdate(segment.segment_id, {
        location_request_status: 'storing',
        data_coordination_date: coordinationDate,
      });

      // スプレッドシートに自動出力（営業ユーザーの場合、ポリゴン地点はスプレッドシート出力対象外）
      if (user?.role === 'sales') {
        console.log('⚠️ ポリゴン地点はスプレッドシート出力対象外のため、スキップします');
      }

      // お知らせに通知を送信
      if (user) {
        const messageContent = `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n地点数: ${segmentPois.length}件（ポリゴン地点）\n\n${dataLinkNote}`;

        await bigQueryService.sendProjectMessage({
          project_id: project.project_id,
          sender_id: 'system',
          sender_name: 'システム',
          sender_role: 'admin',
          content: messageContent,
          message_type: 'system',
        });

        if (onUnreadCountUpdate) {
          onUnreadCountUpdate();
        }
      }

      toast.success(`地点データの格納依頼が完了しました（${segmentPois.length}件）`, {
        description: dataLinkNote,
      });
      setIsGeocodingRunning(false);
      return;
    }

    if (!runInBackground) {
      setShowGeocodeProgress(true);
    }
    setGeocodeProgress(0);
    setGeocodeTotal(needsGeocoding.length);
    setGeocodeSuccessCount(0);
    setGeocodeErrorCount(0);
    setGeocodeErrors([]);
    setGeocodeCompleted(false);

    // バックグラウンドで実行する場合は、ダイアログを閉じる
    if (runInBackground) {
      setShowGeocodeProgress(false);
      setBackgroundGeocodingSegment(segment.segment_name || segment.segment_id);
      toast.info('ジオコーディングをバックグラウンドで実行中です。完了時に通知します。');
    }

    // バックグラウンドで実行
    (async () => {
      try {
        // ジオコーディングが必要なPOIのみを処理（ポリゴン地点は除外）
        const poisToGeocode = segmentPois.filter(poi => {
          // ポリゴン地点はジオコーディング不要
          if (poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)) {
            return false;
          }

          const hasCoords = poi.latitude !== undefined && poi.latitude !== null && 
                            poi.longitude !== undefined && poi.longitude !== null &&
                            poi.latitude !== 0 && poi.longitude !== 0;
          if (hasCoords) return false;
          
          const hasAddress = poi.address && poi.address.trim() !== '';
          const hasPrefecture = poi.prefectures && poi.prefectures.length > 0;
          
          return hasAddress || hasPrefecture;
        });

        console.log(`🚀 executeGeocoding開始: セグメント=${segment.segment_id}, 総地点数=${segmentPois.length}, ジオコーディング必要=${poisToGeocode.length}`);
        
        // すべてのセグメントのPOIをenrichPOIsWithGeocodeに渡す（既に緯度経度があるPOIも含む）
        // これにより、すべてのPOIがenriched配列に含まれる
        const { enriched, errors } = await enrichPOIsWithGeocode(
          segmentPois, // すべてのPOIを渡す（既に緯度経度があるPOIも含む）
          (current, total) => {
            setGeocodeProgress(current);
            setGeocodeTotal(total);
          }
        );

        console.log(`📊 enrichPOIsWithGeocode結果: enriched=${enriched.length}, errors=${errors.length}, 元の地点数=${segmentPois.length}`);
        
        // enriched配列にすべてのPOIが含まれているか確認
        if (enriched.length !== segmentPois.length) {
          console.warn(`⚠️ enriched配列の数が元の地点数と一致しません: enriched=${enriched.length}, 元=${segmentPois.length}`);
        }
        
        // 成功件数を計算（ジオコーディングで新たに緯度経度が設定されたPOIの数）
        const successCount = enriched.filter(poi => {
          // 元のpoisToGeocodeに含まれていたPOIで、新たに緯度経度が設定されたもの
          const wasInOriginal = poisToGeocode.some(p => p.poi_id === poi.poi_id);
          if (!wasInOriginal) return false;
          
          const hasNewCoords = poi.latitude !== undefined && poi.latitude !== null && 
                               poi.longitude !== undefined && poi.longitude !== null &&
                               poi.latitude !== 0 && poi.longitude !== 0;
          return hasNewCoords;
        }).length;
        const errorCount = errors.length;

        console.log(`✅ 成功件数=${successCount}, エラー件数=${errorCount}`);

        setGeocodeSuccessCount(successCount);
        setGeocodeErrorCount(errorCount);
        setGeocodeErrors(errors);
        setGeocodeCompleted(true);

        // 地点情報を更新（ジオコーディングで更新されたPOIのみ）
        // ただし、すべてのPOIがenriched配列に含まれていることを確認
        let updateCount = 0;
        const updatedPoiIds = new Set<string>();
        
        for (const poi of enriched) {
          // 元のpoisToGeocodeに含まれていたPOIで、新たに緯度経度が設定されたもののみ更新
          const wasInOriginal = poisToGeocode.some(p => p.poi_id === poi.poi_id);
          if (wasInOriginal && poi.poi_id && poi.latitude !== undefined && poi.longitude !== undefined) {
            // 重複更新を防ぐ
            if (!updatedPoiIds.has(poi.poi_id)) {
              try {
                await onPoiUpdate(poi.poi_id, {
                  latitude: poi.latitude,
                  longitude: poi.longitude,
                });
                updatedPoiIds.add(poi.poi_id);
                updateCount++;
                console.log(`🔄 POI更新: ${poi.poi_id} -> (${poi.latitude}, ${poi.longitude})`);
              } catch (error) {
                console.error(`❌ POI更新エラー: ${poi.poi_id}`, error);
              }
            }
          }
        }
        console.log(`📝 地点更新完了: ${updateCount}件`);
        
        // すべての元のPOIがenriched配列に含まれているか確認
        const missingPois = segmentPois.filter(poi => 
          !enriched.some(e => e.poi_id === poi.poi_id)
        );
        if (missingPois.length > 0) {
          console.error(`❌ 以下の地点がenriched配列に含まれていません:`, missingPois.map(p => p.poi_id));
        }

        const requestDateTime = new Date().toISOString();
        const coordinationDate = calculateDataCoordinationDate(requestDateTime);

        onSegmentUpdate(segment.segment_id, {
          location_request_status: 'storing',
          data_coordination_date: coordinationDate,
        });

        // スプレッドシートに自動出力（営業ユーザーの場合）
        // TG地点のみを出力（来店計測地点は出力しない）
        if (user?.role === 'sales') {
          try {
            console.log('📊 スプレッドシートに出力中...');
            
            // TG地点のみをフィルタリング（ポリゴン地点は除外）
            const tgPois = segmentPois.filter(poi => 
              (poi.poi_category === 'tg' || !poi.poi_category) &&
              poi.poi_type !== 'polygon' &&
              !(poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
            );
            
            console.log(`📊 出力対象: TG地点=${tgPois.length}件（全地点=${segmentPois.length}件）`);
            
            if (tgPois.length === 0) {
              console.log('⚠️ TG地点が存在しないため、スプレッドシート出力をスキップします');
            } else {
              const sheetResult = await exportPoisToSheet(
                tgPois,
                project,
                segments,
                {
                  useAccumulation: true,
                  segmentId: segment.segment_id,
                  exportedBy: user?.email || user?.user_id || 'system',
                  exportedByName: user?.name || 'システム',
                }
              );
              
              if (sheetResult.success) {
                console.log('✅ スプレッドシート出力成功:', sheetResult.message);
                if (sheetResult.exportId) {
                  console.log('📊 エクスポートID:', sheetResult.exportId);
                }
              } else {
                console.warn('⚠️ スプレッドシート出力失敗:', sheetResult.message);
                // スプレッドシート出力失敗してもエラーにはしない（格納依頼自体は成功）
              }
            }
          } catch (error) {
            console.error('❌ スプレッドシート出力エラー:', error);
            // エラーでも処理は継続
          }
        }

        // ポリゴン地点の数をカウント
        const polygonPoiCount = segmentPois.filter(poi => 
          poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
        ).length;
        
        // 総地点数（ジオコーディング成功 + ポリゴン地点）
        const totalSuccessCount = successCount + polygonPoiCount;

        // お知らせに通知を送信（1回だけ）
        if (user) {
          let messageContent: string;
          if (polygonPoiCount > 0) {
            // ポリゴン地点がある場合
            messageContent = errorCount === 0
              ? `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n総地点数: ${totalSuccessCount}件（ジオコーディング成功: ${successCount}件、ポリゴン地点: ${polygonPoiCount}件）`
              : `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n成功: ${totalSuccessCount}件（ジオコーディング成功: ${successCount}件、ポリゴン地点: ${polygonPoiCount}件）、エラー: ${errorCount}件\n\nエラーの詳細は案件詳細画面で確認できます。`;
          } else {
            // ポリゴン地点がない場合（従来通り）
            messageContent = errorCount === 0
              ? `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n成功: ${successCount}件`
              : `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n成功: ${successCount}件、エラー: ${errorCount}件\n\nエラーの詳細は案件詳細画面で確認できます。`;
          }
          messageContent += `\n\n${dataLinkNote}`;

          await bigQueryService.sendProjectMessage({
            project_id: project.project_id,
            sender_id: 'system',
            sender_name: 'システム',
            sender_role: 'admin',
            content: messageContent,
            message_type: 'system',
          });

          // 未読数を更新
          if (onUnreadCountUpdate) {
            onUnreadCountUpdate();
          }
        }

        if (errorCount === 0) {
          if (polygonPoiCount > 0) {
            toast.success(`地点データの格納依頼が完了しました（総${totalSuccessCount}件: ジオコーディング${successCount}件、ポリゴン${polygonPoiCount}件）`, {
              description: dataLinkNote,
            });
          } else {
            toast.success(`地点データの格納依頼が完了しました（${successCount}件）`, {
              description: dataLinkNote,
            });
          }
        } else {
          if (polygonPoiCount > 0) {
            toast.warning(`格納依頼完了: 成功${totalSuccessCount}件（ジオコーディング${successCount}件、ポリゴン${polygonPoiCount}件）、エラー${errorCount}件`, {
              description: dataLinkNote,
            });
          } else {
            toast.warning(`格納依頼完了: 成功${successCount}件、エラー${errorCount}件`, {
              description: dataLinkNote,
            });
          }
        }

        // バックグラウンド実行の場合はダイアログを閉じる
        if (runInBackground) {
          setGeocodingSegment(null);
          setBackgroundGeocodingSegment(null);
        }

      } catch (error) {
        console.error('Geocoding error:', error);
        toast.error('ジオコーディング処理に失敗しました');
        
        // エラー時もお知らせに通知（1回だけ）
        if (user) {
          await bigQueryService.sendProjectMessage({
            project_id: project.project_id,
            sender_id: 'system',
            sender_name: 'システム',
            sender_role: 'admin',
            content: `地点データの格納依頼処理中にエラーが発生しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n\n詳細は案件詳細画面で確認してください。`,
            message_type: 'system',
          });

          if (onUnreadCountUpdate) {
            onUnreadCountUpdate();
          }
        }

        if (!runInBackground) {
          setShowGeocodeProgress(false);
        } else {
          setBackgroundGeocodingSegment(null);
        }
      } finally {
        setIsGeocodingRunning(false);
      }
    })();
  };

  const handleCloseGeocodeDialog = () => {
    setShowGeocodeProgress(false);
    if (geocodeCompleted) {
      setGeocodingSegment(null);
    }
  };

  const handleRunInBackground = () => {
    // 既に実行中の場合は何もしない
    if (isGeocodingRunning) {
      return;
    }
    if (geocodingSegment) {
      executeGeocoding(geocodingSegment, true);
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
                 <Button onClick={() => { setShowSegmentForm(true); setActiveTab("segments"); }}>
                   セグメントを作成する
                 </Button>
               </div>
            ) : (
              <Tabs value={selectedPoiCategory} onValueChange={(value) => {
                setSelectedPoiCategory(value as 'tg' | 'visit_measurement');
                // タブ切り替え時に編集モードをリセット
                setEditingPoi(null);
                setSelectedSegmentForPoi(null);
              }} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="justify-start rounded-lg border border-gray-200 bg-white shadow-sm h-auto p-1 gap-1">
                    <TabsTrigger 
                      value="tg" 
                      className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] data-[state=active]:shadow-md font-medium transition-all hover:bg-gray-50"
                    >
                      TG地点 ({pois.filter(p => p.poi_category === 'tg' || !p.poi_category).length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="visit_measurement" 
                      className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] data-[state=active]:shadow-md font-medium transition-all hover:bg-gray-50"
                    >
                      来店計測地点 ({pois.filter(p => p.poi_category === 'visit_measurement').length})
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
                      <Map className="w-4 h-4" />
                      地図
                    </button>
                  </div>
                </div>

                <TabsContent value="tg" className="mt-0">
                  {poiViewModeByCategory.tg === 'map' ? (
                    <PoiMapViewer 
                      // カテゴリ未設定（既存データ）もTGとして扱う
                      pois={pois.filter(p => p.poi_category === 'tg' || !p.poi_category)} 
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
                      <Button onClick={() => { setShowSegmentForm(true); setActiveTab("segments"); }}>
                        セグメントを作成する
                      </Button>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="space-y-4" value={accordionValue} onValueChange={(value) => setExpandedSegmentId(value || undefined)}>
                      {segments.map((segment) => {
                        const segmentPois = pois.filter(poi => poi.segment_id === segment.segment_id && (poi.poi_category === 'tg' || !poi.poi_category));
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
                            {/* コンテンツ内部 */}
                            <div className="space-y-6">

                          {/* 0. ツールバー */}
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
                                      setDesignatedRadiusDraft(currentRadius ? String(currentRadius).replace('m', '') : '');
                                      setExtractionConditionsFormData({
                                        designated_radius: (firstPoi?.designated_radius) || segment.designated_radius || '',
                                        extraction_period: (firstPoi?.extraction_period) || segment.extraction_period || '1month',
                                        extraction_period_type: (firstPoi?.extraction_period_type) || segment.extraction_period_type || 'preset',
                                        extraction_start_date: (firstPoi?.extraction_start_date) || segment.extraction_start_date || '',
                                        extraction_end_date: (firstPoi?.extraction_end_date) || segment.extraction_end_date || '',
                                        extraction_dates: (firstPoi?.extraction_dates || segment.extraction_dates || []).slice(),
                                        attribute: (firstPoi?.attribute) || segment.attribute || 'detector',
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

                          {/* 1. 抽出条件サマリー */}
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
                      pois={pois.filter(p => p.poi_category === 'visit_measurement')} 
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
                      <Button onClick={() => { setShowSegmentForm(true); setActiveTab("segments"); }}>
                        セグメントを作成する
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* グループ選択とツールバー */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Label className="text-sm font-medium text-gray-700">計測地点グループ</Label>
                            <select
                              value={selectedGroupId || ''}
                              onChange={(e) => setSelectedGroupId(e.target.value || null)}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                            >
                              <option value="">すべての地点</option>
                              {visitMeasurementGroups.map(group => (
                                <option key={group.group_id} value={group.group_id}>
                                  {group.group_name}
                                </option>
                              ))}
                            </select>
                            {canEditProject(user, project) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGroup(null);
                                    setGroupFormData({ group_name: '' });
                                    setShowGroupForm(true);
                                  }}
                                  className="border-gray-300 hover:bg-gray-50"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-2" />
                                  グループ作成
                                </Button>
                                {selectedGroupId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const group = visitMeasurementGroups.find(g => g.group_id === selectedGroupId);
                                      if (group) {
                                        setEditingGroup(group);
                                        setGroupFormData({ group_name: group.group_name });
                                        setShowGroupForm(true);
                                      }
                                    }}
                                    className="border-gray-300 hover:bg-gray-50"
                                  >
                                    <Edit className="w-3.5 h-3.5 mr-2" />
                                    編集
                                  </Button>
                                )}
                                {selectedGroupId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGroupDelete(selectedGroupId)}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-3.5 h-3.5 mr-2" />
                                    削除
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {canEditProject(user, project) && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (selectedPoiCategory !== 'visit_measurement') {
                                    setSelectedPoiCategory('visit_measurement');
                                  }
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
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 地点リスト（選択されたグループの地点を表示） */}
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <PoiTable
                          pois={pois.filter(poi => {
                            if (poi.poi_category !== 'visit_measurement') return false;
                            if (!selectedGroupId) return true;
                            return poi.visit_measurement_group_id === selectedGroupId;
                          })}
                          onEdit={handleEditPoi}
                          onUpdate={onPoiUpdate}
                          onDelete={onPoiDelete}
                          readOnly={!canEditProject(user, project)}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
            poi={editingPoi ? { ...editingPoi, poi_category: editingPoi.poi_category || selectedPoiCategory } : null}
            defaultCategory={selectedPoiCategory}
            defaultGroupId={selectedPoiCategory === 'visit_measurement' ? selectedGroupId : undefined}
            visitMeasurementGroups={visitMeasurementGroups}
            onSubmit={(poiData) => {
              if (editingPoi && editingPoi.poi_id) {
                onPoiUpdate(editingPoi.poi_id, poiData);
              } else {
                // 新規登録時は、現在選択されているタブに応じてカテゴリを自動設定
                // 来店計測地点でグループが選択されている場合は、グループIDも自動設定
                const poiDataWithCategory = {
                  ...poiData,
                  poi_category: poiData.poi_category || selectedPoiCategory,
                  visit_measurement_group_id: poiData.visit_measurement_group_id || (selectedPoiCategory === 'visit_measurement' && selectedGroupId ? selectedGroupId : undefined),
                };
                onPoiCreate(selectedSegmentForPoi, poiDataWithCategory);
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
        onRunInBackground={handleRunInBackground}
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        step="1"
                        placeholder="0-10000の範囲で自由入力（m単位）"
                        value={designatedRadiusDraft}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 10000)) {
                            setDesignatedRadiusDraft(value);
                          }
                        }}
                        onBlur={() => {
                          const value = designatedRadiusDraft;
                          if (value === '') {
                            setExtractionConditionsFormData(prev => ({ ...prev, designated_radius: '' }));
                            return;
                          }
                          const radiusNum = parseInt(value, 10);
                          if (!isNaN(radiusNum) && radiusNum >= 0 && radiusNum <= 10000) {
                            setExtractionConditionsFormData(prev => ({ ...prev, designated_radius: `${radiusNum}m` }));
                            if (radiusNum > 0) {
                              // 半径が30m以下の場合、警告ポップアップを表示（一度だけ）
                              if (radiusNum <= 30 && !hasShownRadius30mWarning) {
                                setShowRadius30mWarning(true);
                                setHasShownRadius30mWarning(true);
                              } else if (radiusNum > 30 && radiusNum <= 50) {
                                // 30mを超えて50m以下の場合、30m警告フラグをリセットして50m警告を表示
                                setHasShownRadius30mWarning(false);
                                if (!hasShownRadiusWarning) {
                                  setShowRadiusWarning(true);
                                  setHasShownRadiusWarning(true);
                                }
                              } else if (radiusNum > 50) {
                                // 50mを超えた場合、警告表示フラグをリセット
                                setHasShownRadiusWarning(false);
                                setHasShownRadius30mWarning(false);
                              }
                            }
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
                    </div>
                    {designatedRadiusDraft && (() => {
                      const radiusNum = parseInt(String(designatedRadiusDraft).replace('m', ''), 10);
                      if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
                        return (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            半径は0-10000の範囲で入力してください
                          </p>
                        );
                      }
                      return null;
                    })()}
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
                        checked={extractionConditionsFormData.extraction_period_type === 'preset'}
                        onChange={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period_type: 'preset' }))}
                        disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker'}
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
                        disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">期間指定</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={extractionConditionsFormData.extraction_period_type === 'specific_dates'}
                        onChange={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period_type: 'specific_dates', extraction_dates: prev.extraction_dates?.length ? prev.extraction_dates : [''] }))}
                        disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">特定日付</span>
                    </label>
                  </div>

                  {extractionConditionsFormData.extraction_period_type === 'preset' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_period: option.value }))}
                          disabled={extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            extractionConditionsFormData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : extractionConditionsFormData.extraction_period_type === 'specific_dates' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">抽出対象とする日付を複数選択できます（直近6ヶ月まで）</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {(extractionConditionsFormData.extraction_dates || []).map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={d}
                              min={getSixMonthsAgoDate()}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                const selectedDate = e.target.value;
                                if (isDateMoreThanSixMonthsAgo(selectedDate)) {
                                  setShowDateRangeWarning(true);
                                  return; // 日付を更新しない
                                }
                                const arr = [...(extractionConditionsFormData.extraction_dates || [])];
                                arr[i] = selectedDate;
                                setExtractionConditionsFormData(prev => ({ ...prev, extraction_dates: arr }));
                              }}
                              className="flex-1 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const arr = (extractionConditionsFormData.extraction_dates || []).filter((_, j) => j !== i);
                                setExtractionConditionsFormData(prev => ({ ...prev, extraction_dates: arr }));
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
                        onClick={() => setExtractionConditionsFormData(prev => ({ ...prev, extraction_dates: [...(prev.extraction_dates || []), ''] }))}
                        className="text-sm text-[#5b5fff] hover:text-[#5b5fff]/80 font-medium"
                      >
                        + 日付を追加
                      </button>
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
                  
                  {(extractionConditionsFormData.attribute === 'resident' || extractionConditionsFormData.attribute === 'worker' || extractionConditionsFormData.attribute === 'resident_and_worker') && (
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

                {/* 滞在時間（検知者のみ指定可） */}
                <div>
                  <Label className="block mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#5b5fff]" />
                    滞在時間
                  </Label>
                  <select
                    value={extractionConditionsFormData.attribute === 'detector' ? (extractionConditionsFormData.stay_time || '') : ''}
                    onChange={(e) => setExtractionConditionsFormData(prev => ({ ...prev, stay_time: e.target.value }))}
                    disabled={extractionConditionsFormData.attribute !== 'detector'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">指定なし</option>
                    {STAY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {extractionConditionsFormData.attribute !== 'detector' && (
                    <p className="text-xs text-gray-500 mt-1">滞在時間は検知者の場合のみ指定できます</p>
                  )}
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
                    const radiusFromDraft = designatedRadiusDraft === '' 
                      ? '' 
                      : (!Number.isNaN(Number(designatedRadiusDraft)) ? `${Number(designatedRadiusDraft)}m` : extractionConditionsFormData.designated_radius);
                    await onSegmentUpdate(extractionConditionsSegment.segment_id, {
                      designated_radius: radiusFromDraft,
                      extraction_period: extractionConditionsFormData.extraction_period,
                      extraction_period_type: extractionConditionsFormData.extraction_period_type,
                      extraction_start_date: extractionConditionsFormData.extraction_start_date,
                      extraction_end_date: extractionConditionsFormData.extraction_end_date,
                      extraction_dates: (extractionConditionsFormData.extraction_dates || []).filter(Boolean),
                      attribute: extractionConditionsFormData.attribute,
                      detection_count: extractionConditionsFormData.detection_count,
                      detection_time_start: extractionConditionsFormData.detection_time_start,
                      detection_time_end: extractionConditionsFormData.detection_time_end,
                      stay_time: extractionConditionsFormData.stay_time,
                    });

                    // 既存地点にも適用
                    for (const poi of segmentPois) {
                      if (poi.poi_id) {
                        await onPoiUpdate(poi.poi_id, {
                          ...extractionConditionsFormData,
                          designated_radius: radiusFromDraft,
                        });
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

      {/* 計測地点グループ作成・編集ダイアログ */}
      <Dialog open={showGroupForm} onOpenChange={setShowGroupForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'グループを編集' : 'グループを作成'}</DialogTitle>
            <DialogDescription>
              計測地点グループの名前を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group_name">グループ名</Label>
              <Input
                id="group_name"
                value={groupFormData.group_name}
                onChange={(e) => setGroupFormData({ group_name: e.target.value })}
                placeholder="例：店舗A、エリア1"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroup(null);
                  setGroupFormData({ group_name: '' });
                }}
                className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </Button>
              <Button onClick={handleGroupSubmit}>
                {editingGroup ? '更新' : '作成'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* バックグラウンドジオコーディングステータス */}
      {backgroundGeocodingSegment && (
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
                    セグメント: {backgroundGeocodingSegment}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>進行中...</span>
                      <span>{geocodeProgress} / {geocodeTotal}</span>
                    </div>
                    <Progress 
                      value={geocodeTotal > 0 ? (geocodeProgress / geocodeTotal) * 100 : 0} 
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
      <AlertDialog open={showRadiusWarning} onOpenChange={setShowRadiusWarning}>
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
            <AlertDialogAction onClick={() => setShowRadiusWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 半径30m以下の警告ポップアップ */}
      <AlertDialog open={showRadius30mWarning} onOpenChange={setShowRadius30mWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  指定半径が30m以下の場合は配信ボリュームが不足する場合があります。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRadius30mWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6ヶ月以上前の日付選択警告ポップアップ */}
      <AlertDialog open={showDateRangeWarning} onOpenChange={setShowDateRangeWarning}>
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
            <AlertDialogAction onClick={() => setShowDateRangeWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
