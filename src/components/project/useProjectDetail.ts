import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { toast } from 'sonner';
import type { Project, Segment, PoiInfo, EditRequest, VisitMeasurementGroup } from '@/types/schema';
import { getAutoProjectStatus, getStatusColor } from '@/utils/projectStatus';
import { requiresEditRequest } from '@/utils/editRequest';
import { enrichPOIsWithGeocode } from '@/utils/geocoding';
import type { GeocodeError } from '@/utils/geocoding';
import { calculateDataCoordinationDate } from '@/utils/dataCoordinationDate';
import { bigQueryService } from '@/utils/bigquery';
import { exportPoisToSheet } from '@/utils/googleSheets';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectDetailProps {
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

export function useProjectDetail({
  project,
  segments,
  pois,
  onProjectUpdate,
  onSegmentCreate,
  onSegmentUpdate,
  onPoiCreate,
  onPoiCreateBulk,
  onPoiUpdate,
  onPoiDelete,
  onEditRequestCreate,
  onUnreadCountUpdate,
}: ProjectDetailProps) {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    requestAnimationFrame(() => {
      const trigger = document.querySelector(`[data-tab-value="${value}"]`) as HTMLElement | null;
      trigger?.focus();
    });
  };

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
  const [expandedGroupId, setExpandedGroupId] = useState<string | undefined>(undefined);

  const accordionValue = expandedSegmentId ?? '';
  const groupAccordionValue = expandedGroupId ?? '';
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<'tg' | 'visit_measurement'>('tg');

  const [visitMeasurementGroups, setVisitMeasurementGroups] = useState<VisitMeasurementGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VisitMeasurementGroup | null>(null);

  const [fixedPoiIds, setFixedPoiIds] = useState<Set<string>>(new Set());
  const isFixingInconsistenciesRef = useRef(false);

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
  const designatedRadiusInputRef = useRef<HTMLInputElement>(null);
  const fixedRadiusOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  const [showRadius30mWarning, setShowRadius30mWarning] = useState(false);
  const [hasShownRadius30mWarning, setHasShownRadius30mWarning] = useState(false);
  const [showDateRangeWarning, setShowDateRangeWarning] = useState(false);

  const setExtractionConditionsDeferred = (updater: (prev: Partial<PoiInfo>) => Partial<PoiInfo>) => {
    startTransition(() => setExtractionConditionsFormData(updater));
  };

  const extractionDatesEqual = (a: string[] | undefined, b: string[] | undefined): boolean => {
    const arrA = a ?? [];
    const arrB = b ?? [];
    if (arrA.length !== arrB.length) return false;
    return arrA.every((v, i) => v === arrB[i]);
  };

  const getSixMonthsAgoDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  };

  const isDateMoreThanSixMonthsAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return selectedDate < sixMonthsAgo;
  };

  const getFiveDaysAgoDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date.toISOString().split('T')[0];
  };

  const isDateNewerThanFiveDaysAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return selectedDate > fiveDaysAgo;
  };

  const tgPois = useMemo(
    () => pois.filter(p => p.poi_category === 'tg' || !p.poi_category),
    [pois]
  );
  const visitMeasurementPois = useMemo(
    () => pois.filter(p => p.poi_category === 'visit_measurement'),
    [pois]
  );
  const allPoisBySegmentId = useMemo(() => {
    const map = new Map<string, PoiInfo[]>();
    for (const poi of pois) {
      if (!poi.segment_id) continue;
      const list = map.get(poi.segment_id);
      if (list) list.push(poi);
      else map.set(poi.segment_id, [poi]);
    }
    return map;
  }, [pois]);
  const tgPoiStatsBySegmentId = useMemo(() => {
    const map = new Map<string, { pois: PoiInfo[]; poisWithCoords: number }>();
    for (const poi of tgPois) {
      if (!poi.segment_id) continue;
      const current = map.get(poi.segment_id);
      if (current) {
        current.pois.push(poi);
        if (poi.latitude && poi.longitude) current.poisWithCoords += 1;
      } else {
        map.set(poi.segment_id, {
          pois: [poi],
          poisWithCoords: poi.latitude && poi.longitude ? 1 : 0,
        });
      }
    }
    return map;
  }, [tgPois]);
  const visitPoiStatsByGroupId = useMemo(() => {
    const map = new Map<string, { pois: PoiInfo[]; poisWithCoords: number }>();
    for (const poi of visitMeasurementPois) {
      if (!poi.visit_measurement_group_id) continue;
      const current = map.get(poi.visit_measurement_group_id);
      if (current) {
        current.pois.push(poi);
        if (poi.latitude && poi.longitude) current.poisWithCoords += 1;
      } else {
        map.set(poi.visit_measurement_group_id, {
          pois: [poi],
          poisWithCoords: poi.latitude && poi.longitude ? 1 : 0,
        });
      }
    }
    return map;
  }, [visitMeasurementPois]);
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
  }, [project.project_id, user]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        if (!project?.project_id) {
          console.warn('Project ID is missing, skipping visit measurement groups load');
          return;
        }
        const groups = await bigQueryService.getVisitMeasurementGroups(project.project_id);
        setVisitMeasurementGroups(groups || []);
      } catch (error) {
        console.error('Error loading visit measurement groups:', error);
        setVisitMeasurementGroups([]);
      }
    };
    loadGroups();
  }, [project?.project_id]);

  useEffect(() => {
    if (pois.length === 0) return;
    if (isFixingInconsistenciesRef.current) return;
    isFixingInconsistenciesRef.current = true;

    const fixInconsistencies = async () => {
      const inconsistencies: Array<{ poi: PoiInfo; fixes: Partial<PoiInfo> }> = [];

      for (const poi of pois) {
        if (!poi.poi_id) continue;
        if (fixedPoiIds.has(poi.poi_id)) continue;

        const fixes: Partial<PoiInfo> = {};
        let needsFix = false;

        if (poi.poi_category === 'visit_measurement' && poi.segment_id && poi.segment_id.trim() !== '') {
          fixes.segment_id = undefined;
          needsFix = true;
          console.warn(`⚠️ 来店計測地点「${poi.poi_name}」にセグメントIDが設定されています。削除します。`);
        }

        if (poi.poi_category !== 'visit_measurement' && poi.visit_measurement_group_id) {
          fixes.visit_measurement_group_id = undefined;
          needsFix = true;
          console.warn(`⚠️ TG地点「${poi.poi_name}」に来店計測グループIDが設定されています。削除します。`);
        }

        if (needsFix) {
          inconsistencies.push({ poi, fixes });
        }
      }

      if (inconsistencies.length > 0) {
        const fixedIds: string[] = [];
        for (const { poi, fixes } of inconsistencies) {
          try {
            await onPoiUpdate(poi.poi_id!, fixes);
            fixedIds.push(poi.poi_id!);
          } catch (error) {
            console.error(`❌ 地点「${poi.poi_name}」の矛盾修正に失敗しました:`, error);
          }
        }

        if (fixedIds.length > 0) {
          setFixedPoiIds(prev => new Set([...prev, ...fixedIds]));
          toast.success(`${fixedIds.length}件の来店計測地点の矛盾を修正しました`);
        }
      }
    };

    fixInconsistencies().finally(() => {
      isFixingInconsistenciesRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois]);

  const formatDate = (dateStr?: string | null | Date | any) => {
    if (!dateStr || (typeof dateStr === 'string' && dateStr.trim() === '')) {
      return '-';
    }

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

    if (typeof dateStr === 'object' && dateStr !== null) {
      if ('value' in dateStr && typeof dateStr.value === 'string') {
        dateStr = dateStr.value;
      } else if ('toString' in dateStr && typeof dateStr.toString === 'function') {
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

    const dateString = String(dateStr).trim();

    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1;
      const dayNum = parseInt(day, 10);

      if (yearNum >= 1900 && yearNum <= 2100 && monthNum >= 0 && monthNum <= 11 && dayNum >= 1 && dayNum <= 31) {
        const date = new Date(yearNum, monthNum, dayNum);
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
    const segmentDataWithCategory = {
      ...segmentData,
      poi_category: editingSegment
        ? (segmentData.poi_category || editingSegment.poi_category || 'tg')
        : (segmentData.poi_category || selectedPoiCategory || 'tg'),
    };

    if (editingSegment) {
      await onSegmentUpdate(editingSegment.segment_id, segmentDataWithCategory);
    } else {
      const newSegment = await onSegmentCreate(segmentDataWithCategory);

      if (copyFromSegmentId && newSegment && onPoiCreateBulk) {
        const sourcePois = allPoisBySegmentId.get(copyFromSegmentId) || [];
        if (sourcePois.length > 0) {
          const copiedPois = sourcePois.map(poi => {
            const { poi_id, location_id, ...poiData } = poi;
            return {
              ...poiData,
              segment_id: newSegment.segment_id,
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
    handleTabChange('pois');
    setExpandedSegmentId(segment.segment_id);
  };

  const handlePoiFormBulkSubmit = async (poisData: Partial<PoiInfo>[]) => {
    if (!selectedSegmentForPoi) return;

    try {
      const poisWithCategory = poisData.map(poi => ({
        ...poi,
        poi_category: poi.poi_category || selectedPoiCategory,
        segment_id: selectedPoiCategory === 'tg' ? (poi.segment_id || selectedSegmentForPoi) : poi.segment_id,
        visit_measurement_group_id: poi.visit_measurement_group_id || (selectedPoiCategory === 'visit_measurement' && selectedGroupId ? selectedGroupId : undefined),
      }));

      if (onPoiCreateBulk) {
        await onPoiCreateBulk(selectedSegmentForPoi, poisWithCategory);
      } else {
        for (const poi of poisWithCategory) {
          await onPoiCreate(selectedSegmentForPoi, poi);
        }
        toast.success(`${poisData.length}件の地点が登録されました`);
      }

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

  const handleDataLinkRequest = (segment: Segment) => {
    onSegmentUpdate(segment.segment_id, {
      data_link_status: 'requested',
      data_link_request_date: new Date().toISOString(),
      request_confirmed: true,
    });
    toast.success('データ連携依頼を送信しました');
  };

  const executeGeocoding = async (segment: Segment, runInBackground: boolean = false) => {
    if (isGeocodingRunning) {
      toast.warning('ジオコーディング処理は既に実行中です');
      return;
    }

    setGeocodingSegment(segment);
    setIsGeocodingRunning(true);

    const dataLinkNote = '※ データ連携依頼は完了していません。別途連携依頼を実行してください。';

    let latestPois = pois;
    try {
      const freshPois = await bigQueryService.getPoisByProject(project.project_id);
      latestPois = freshPois;
    } catch (error) {
      console.warn('最新の地点データの取得に失敗しました。既存のデータを使用します:', error);
    }

    const segmentPois = latestPois.filter(poi => poi.segment_id === segment.segment_id);

    if (segmentPois.length === 0) {
      toast.error('地点が登録されていません');
      setIsGeocodingRunning(false);
      return;
    }

    const nonPrefectureNonPolygonPois = segmentPois.filter(poi =>
      poi.poi_type !== 'prefecture' &&
      poi.poi_type !== 'polygon' &&
      !(poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
    );
    if (nonPrefectureNonPolygonPois.length > 0) {
      if (!segment.designated_radius || segment.designated_radius.trim() === '') {
        toast.error('指定半径が設定されていません。セグメント共通条件で指定半径を設定してください。');
        setIsGeocodingRunning(false);
        return;
      }

      const poisWithoutRadius = nonPrefectureNonPolygonPois.filter(poi =>
        !poi.designated_radius || poi.designated_radius.trim() === ''
      );
      if (poisWithoutRadius.length > 0 && !segment.designated_radius) {
        toast.error(`${poisWithoutRadius.length}件の地点で指定半径が設定されていません。`);
        setIsGeocodingRunning(false);
        return;
      }
    }

    const hasPolygonPois = segmentPois.some(poi =>
      poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
    );

    const needsGeocoding = segmentPois.filter(poi => {
      if (poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)) {
        return false;
      }

      const hasCoords = poi.latitude !== undefined && poi.latitude !== null &&
                        poi.longitude !== undefined && poi.longitude !== null &&
                        poi.latitude !== 0 && poi.longitude !== 0;
      if (hasCoords) {
        return false;
      }

      if (poi.address && poi.address.trim() !== '') {
        return true;
      }

      if (poi.prefectures && poi.prefectures.length > 0) {
        return true;
      }

      return false;
    });

    if (needsGeocoding.length === 0 && !hasPolygonPois) {
      toast.info('ジオコーディングが必要な地点がありません');
      setIsGeocodingRunning(false);
      return;
    }

    if (needsGeocoding.length === 0 && hasPolygonPois) {
      const requestDateTime = new Date().toISOString();
      const coordinationDate = calculateDataCoordinationDate(requestDateTime);

      onSegmentUpdate(segment.segment_id, {
        location_request_status: 'storing',
        data_coordination_date: coordinationDate,
      });

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

    if (runInBackground) {
      setShowGeocodeProgress(false);
      setBackgroundGeocodingSegment(segment.segment_name || segment.segment_id);
      toast.info('ジオコーディングをバックグラウンドで実行中です。完了時に通知します。');
    }

    (async () => {
      try {
        const poisToGeocode = segmentPois.filter(poi => {
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

        const { enriched, errors } = await enrichPOIsWithGeocode(
          segmentPois,
          (current, total) => {
            setGeocodeProgress(current);
            setGeocodeTotal(total);
          }
        );

        if (enriched.length !== segmentPois.length) {
          console.warn(`⚠️ enriched配列の数が元の地点数と一致しません: enriched=${enriched.length}, 元=${segmentPois.length}`);
        }

        const successCount = enriched.filter(poi => {
          const wasInOriginal = poisToGeocode.some(p => p.poi_id === poi.poi_id);
          if (!wasInOriginal) return false;

          const hasNewCoords = poi.latitude !== undefined && poi.latitude !== null &&
                               poi.longitude !== undefined && poi.longitude !== null &&
                               poi.latitude !== 0 && poi.longitude !== 0;
          return hasNewCoords;
        }).length;
        const errorCount = errors.length;

        setGeocodeSuccessCount(successCount);
        setGeocodeErrorCount(errorCount);
        setGeocodeErrors(errors);
        setGeocodeCompleted(true);

        let updateCount = 0;
        const updatedPoiIds = new Set<string>();

        for (const poi of enriched) {
          const wasInOriginal = poisToGeocode.some(p => p.poi_id === poi.poi_id);
          if (wasInOriginal && poi.poi_id && poi.latitude !== undefined && poi.longitude !== undefined) {
            if (!updatedPoiIds.has(poi.poi_id)) {
              try {
                await onPoiUpdate(poi.poi_id, {
                  latitude: poi.latitude,
                  longitude: poi.longitude,
                });
                updatedPoiIds.add(poi.poi_id);
                updateCount++;
              } catch (error) {
                console.error(`❌ POI更新エラー: ${poi.poi_id}`, error);
              }
            }
          }
        }
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

        if (user?.role === 'sales') {
          try {
            const allPois = segmentPois;

            if (allPois.length > 0) {
              const sheetResult = await exportPoisToSheet(
                allPois,
                project,
                segments,
                {
                  useAccumulation: true,
                  deferExport: true,
                  segmentId: segment.segment_id,
                  exportedBy: user?.email || user?.user_id || 'system',
                  exportedByName: user?.name || 'システム',
                }
              );

              if (sheetResult.success) {
                toast.success('エクスポートキューに登録しました（月・水・金 21:30 に送信）');
              } else {
                console.warn('⚠️ スプレッドシートキュー登録失敗:', sheetResult.message);
              }
            }
          } catch (error) {
            console.error('❌ スプレッドシート出力エラー:', error);
          }
        }

        const polygonPoiCount = segmentPois.filter(poi =>
          poi.poi_type === 'polygon' || (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
        ).length;

        const totalSuccessCount = successCount + polygonPoiCount;

        if (user) {
          let messageContent: string;
          if (polygonPoiCount > 0) {
            messageContent = errorCount === 0
              ? `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n総地点数: ${totalSuccessCount}件（ジオコーディング成功: ${successCount}件、ポリゴン地点: ${polygonPoiCount}件）`
              : `地点データの格納依頼が完了しました。\n\nセグメント: ${segment.segment_name || segment.segment_id}\n成功: ${totalSuccessCount}件（ジオコーディング成功: ${successCount}件、ポリゴン地点: ${polygonPoiCount}件）、エラー: ${errorCount}件\n\nエラーの詳細は案件詳細画面で確認できます。`;
          } else {
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

        if (runInBackground) {
          setGeocodingSegment(null);
          setBackgroundGeocodingSegment(null);
        }

      } catch (error) {
        console.error('Geocoding error:', error);
        toast.error('ジオコーディング処理に失敗しました');

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

  return {
    // auth
    user,
    hasPermission,
    // tab
    activeTab,
    handleTabChange,
    // segment form
    showSegmentForm,
    setShowSegmentForm,
    editingSegment,
    setEditingSegment,
    handleSegmentFormSubmit,
    handleEditSegment,
    handleCancelForm,
    handleManagePois,
    // poi form
    showPoiForm,
    setShowPoiForm,
    editingPoi,
    setEditingPoi,
    selectedSegmentForPoi,
    setSelectedSegmentForPoi,
    handleAddPoi,
    handleEditPoi,
    handlePoiFormBulkSubmit,
    // poi view
    poiViewMode,
    setPoiViewMode,
    poiViewModeByCategory,
    setPoiViewModeByCategory,
    // accordion
    accordionValue,
    groupAccordionValue,
    expandedSegmentId,
    setExpandedSegmentId,
    expandedGroupId,
    setExpandedGroupId,
    // poi category tab
    selectedPoiCategory,
    setSelectedPoiCategory,
    // visit measurement groups
    visitMeasurementGroups,
    setVisitMeasurementGroups,
    selectedGroupId,
    setSelectedGroupId,
    showGroupForm,
    setShowGroupForm,
    editingGroup,
    setEditingGroup,
    // segment select dialog
    showSegmentSelectForPoi,
    setShowSegmentSelectForPoi,
    // project edit
    showProjectEditDialog,
    setShowProjectEditDialog,
    isEditingProject,
    editedProject,
    setEditedProject,
    handleStartEditProject,
    handleCancelEditProject,
    handleSaveProject,
    handleFieldSave,
    handleFieldRequestEdit,
    handleEditRequestSubmit,
    // poi edit request dialog
    showPoiEditDialog,
    setShowPoiEditDialog,
    editRequestPoi,
    setEditRequestPoi,
    // geocoding
    showGeocodeProgress,
    geocodeProgress,
    geocodeTotal,
    geocodeSuccessCount,
    geocodeErrorCount,
    geocodeErrors,
    geocodeCompleted,
    geocodingSegment,
    isGeocodingRunning,
    backgroundGeocodingSegment,
    handleConfirmSegment,
    handleDataLinkRequest,
    handleCloseGeocodeDialog,
    handleRunInBackground,
    designatedRadiusInputRef,
    fixedRadiusOptions,
    // extraction conditions popup
    showExtractionConditionsPopup,
    setShowExtractionConditionsPopup,
    extractionConditionsSegment,
    setExtractionConditionsSegment,
    extractionConditionsFormData,
    setExtractionConditionsFormData,
    setExtractionConditionsDeferred,
    extractionDatesEqual,
    getSixMonthsAgoDate,
    isDateMoreThanSixMonthsAgo,
    getFiveDaysAgoDate,
    isDateNewerThanFiveDaysAgo,
    // radius warnings
    showRadiusWarning,
    setShowRadiusWarning,
    hasShownRadiusWarning,
    setHasShownRadiusWarning,
    showRadius30mWarning,
    setShowRadius30mWarning,
    hasShownRadius30mWarning,
    setHasShownRadius30mWarning,
    showDateRangeWarning,
    setShowDateRangeWarning,
    // messages
    unreadMessageCount,
    setUnreadMessageCount,
    // memoized derived data
    tgPois,
    visitMeasurementPois,
    allPoisBySegmentId,
    tgPoiStatsBySegmentId,
    visitPoiStatsByGroupId,
    statusInfo,
    statusColor,
    // formatters
    formatDate,
    formatDateTime,
    // labels
    getMediaLabels,
    getStatusInfo,
  };
}
