import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { bigQueryService } from "../utils/bigquery";
import type { Project, Segment, PoiInfo, EditRequest } from "../types/schema";
import { getAutoProjectStatus, AutoProjectStatus } from "../utils/projectStatus";
import { canViewProject } from "../utils/editRequest";
import { useAuth } from "../contexts/AuthContext";
import { convertPoiToSpreadsheetRow, saveToExportQueue, exportToGoogleSheets } from "../utils/spreadsheetExport";

export function useProjectSystem() {
  const { user } = useAuth();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [allSegments, setAllSegments] = useState<Segment[]>([]);
  const [pois, setPois] = useState<PoiInfo[]>([]);
  const [allPois, setAllPois] = useState<PoiInfo[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  
  // UI State that is closely related to data
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Data Loading Functions
  const loadProjects = useCallback(async () => {
    try {
      const data = await bigQueryService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }, []);

  const loadAllSegments = useCallback(async () => {
    try {
      const data = await bigQueryService.getAllSegments();
      setAllSegments(data);
    } catch (error) {
      console.error("Error loading segments:", error);
    }
  }, []);

  const loadAllPois = useCallback(async () => {
    try {
      const data = await bigQueryService.getAllPois();
      setAllPois(data);
    } catch (error) {
      console.error("Error loading POIs:", error);
    }
  }, []);

  const loadEditRequests = useCallback(async () => {
    try {
      const data = await bigQueryService.getEditRequests();
      setEditRequests(data);
    } catch (error) {
      console.error("Error loading edit requests:", error);
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const [allMessages, allProjects] = await Promise.all([
        bigQueryService.getAllMessages(),
        bigQueryService.getProjects()
      ]);
      
      const userRole = user.role === 'admin' ? 'admin' : 'sales';
      
      // 自分の担当案件IDリスト
      const myProjectIds = allProjects
        .filter(p => {
          if (userRole === 'admin') return true;
          return p.person_in_charge === user.name || p.sub_person_in_charge === user.name;
        })
        .map(p => p.project_id);
  
      const count = allMessages
        .filter(m => m.sender_role !== userRole && !m.is_read)
        .filter(m => myProjectIds.includes(m.project_id))
        .length;
        
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }, [user]);

  // Initial Data Load
  useEffect(() => {
    loadProjects();
    loadAllSegments();
    loadAllPois();
    loadEditRequests();
  }, [loadProjects, loadAllSegments, loadAllPois, loadEditRequests]);

  useEffect(() => {
    loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  // Actions

  // 案件登録
  const createProject = async (
    projectData: Omit<Project, "project_id" | "_register_datetime" | "person_in_charge">
  ) => {
    try {
      const newProject = await bigQueryService.createProject(projectData, user?.name);
      setProjects((prev) => [newProject, ...prev]);
      toast.success("新しい案件が登録されました");
      return newProject;
    } catch (error: any) {
      console.error("Error creating project:", error);
      
      // エラーメッセージを詳細に表示
      let errorMessage = "案件の登録に失敗しました";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details?.error) {
        errorMessage = error.details.error;
      }
      
      // エラーの詳細情報をコンソールに出力
      if (error?.details) {
        console.error("Error details:", error.details);
        if (error.details.type) {
          console.error("Error type:", error.details.type);
        }
        if (error.details.errors) {
          console.error("BigQuery errors:", error.details.errors);
        }
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // 案件詳細を表示
  const selectProject = async (project: Project) => {
    // 権限チェック
    const statusInfo = getAutoProjectStatus(project, allSegments, allPois);
    if (!canViewProject(user, project, statusInfo.status)) {
      toast.error("この案件を閲覧する権限がありません");
      return false;
    }
    
    setSelectedProject(project);

    // 関連データ取得
    try {
      const [projectSegments, projectPois] = await Promise.all([
        bigQueryService.getSegmentsByProject(project.project_id),
        bigQueryService.getPoisByProject(project.project_id)
      ]);
      setSegments(projectSegments);
      setPois(projectPois);
      return true;
    } catch (error) {
      console.error("Error loading project details:", error);
      toast.error("案件詳細の読み込みに失敗しました");
      return false;
    }
  };

  // 案件一覧に戻る
  const clearSelectedProject = () => {
    setSelectedProject(null);
    setSegments([]);
    setPois([]);
  };

  // セグメント作成
  const createSegment = async (segmentData: Partial<Segment>): Promise<Segment> => {
    try {
      if (!selectedProject) {
        throw new Error('プロジェクトが選択されていません');
      }

      // データ連携依頼日を自動設定（連携依頼済の場合）
      const dataLinkRequestDate =
        segmentData.data_link_status === "requested"
          ? new Date().toISOString()
          : undefined;

      const newSegment = await bigQueryService.createSegment({
        project_id: selectedProject.project_id,
        segment_name: segmentData.segment_name,
        media_id: segmentData.media_id || "",
        poi_category: segmentData.poi_category || 'tg', // デフォルトは'tg'
        location_request_status: segmentData.location_request_status || "not_requested",
        request_confirmed: segmentData.request_confirmed,
        data_link_status: segmentData.data_link_status || "before_request",
        data_link_scheduled_date: segmentData.data_link_scheduled_date,
        data_link_request_date: dataLinkRequestDate,
        ads_account_id: segmentData.ads_account_id,
        provider_segment_id: segmentData.provider_segment_id,
        segment_expire_date: segmentData.segment_expire_date,
        designated_radius: segmentData.designated_radius,
        extraction_period: segmentData.extraction_period,
        extraction_period_type: segmentData.extraction_period_type,
        extraction_start_date: segmentData.extraction_start_date,
        extraction_end_date: segmentData.extraction_end_date,
        extraction_dates: segmentData.extraction_dates,
        attribute: segmentData.attribute,
        detection_count: segmentData.detection_count,
        detection_time_start: segmentData.detection_time_start,
        detection_time_end: segmentData.detection_time_end,
        stay_time: segmentData.stay_time,
      });

      setSegments((prev) => [newSegment, ...prev]);
      setAllSegments((prev) => [newSegment, ...prev]); // 全体リストも更新
      toast.success("セグメントが登録されました");
      return newSegment;
    } catch (error) {
      console.error("Error creating segment:", error);
      toast.error("セグメントの登録に失敗しました");
      throw error;
    }
  };

  // セグメント更新
  const updateSegment = async (segmentId: string, updates: Partial<Segment>) => {
    try {
      const updatedSegment = await bigQueryService.updateSegment(segmentId, updates, user?.email);
      if (updatedSegment) {
        setSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
        setAllSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
        toast.success("セグメントが更新されました");
        return updatedSegment;
      }
    } catch (error) {
      console.error("Error updating segment:", error);
      toast.error("セグメントの更新に失敗しました");
      throw error;
    }
  };

  // セグメント削除
  const deleteSegment = async (segmentId: string) => {
    try {
      await bigQueryService.deleteSegment(segmentId, user?.email);
      setSegments((prev) => prev.filter((s) => s.segment_id !== segmentId));
      setAllSegments((prev) => prev.filter((s) => s.segment_id !== segmentId));
      toast.success("セグメントが削除されました");
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast.error("セグメントの削除に失敗しました");
      throw error;
    }
  };

  // セグメント編集依頼
  const requestSegmentEdit = async (segment: Segment) => {
    try {
      const updatedSegment = await bigQueryService.requestSegmentEdit(segment.segment_id);
      if (updatedSegment) {
        setSegments((prev) => prev.map((s) => (s.segment_id === segment.segment_id ? updatedSegment : s)));
        setAllSegments((prev) => prev.map((s) => (s.segment_id === segment.segment_id ? updatedSegment : s)));
        toast.success(
          `セグメント編集依頼を送信しました（予定日: ${updatedSegment.data_link_scheduled_date}）`,
          { duration: 5000 }
        );
        return updatedSegment;
      }
    } catch (error) {
      console.error("Error requesting segment edit:", error);
      toast.error("編集依頼の送信に失敗しました");
      throw error;
    }
  };

  // 案件情報更新
  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const updated = await bigQueryService.updateProject(projectId, updates, user?.email);
      if (updated) {
        setProjects((prev) => prev.map((p) => (p.project_id === projectId ? updated : p)));
        if (selectedProject?.project_id === projectId) {
          setSelectedProject(updated);
        }
        toast.success("案件情報を更新しました");
        return updated;
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("案件情報の更新に失敗しました");
      throw error;
    }
  };

  // 案件ステータス変更
  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const updated = await bigQueryService.updateProject(projectId, { project_status: newStatus }, user?.email);
      if (updated) {
        setProjects((prev) => prev.map((p) => (p.project_id === projectId ? updated : p)));
        // 選択中の案件も更新
        if (selectedProject?.project_id === projectId) {
          setSelectedProject(updated);
        }
        toast.success("案件ステータスを更新しました");
        return updated;
      }
    } catch (error) {
      console.error("Error updating project status:", error);
      toast.error("ステータスの更新に失敗しました");
      throw error;
    }
  };

  // セグメントステータス変更
  const updateSegmentStatus = async (segmentId: string, newStatus: string) => {
    try {
      const updated = await bigQueryService.updateSegment(segmentId, { data_link_status: newStatus }, user?.email);
      if (updated) {
        setAllSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updated : s)));
        // プロジェクト内セグメントも更新
        setSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updated : s)));
        toast.success("セグメントステータスを更新しました");
        return updated;
      }
    } catch (error) {
      console.error("Error updating segment status:", error);
      toast.error("ステータスの更新に失敗しました");
      throw error;
    }
  };

  // セグメント連携確定（有効期限を6ヶ月後に設定）
  const confirmSegmentLink = async (segmentId: string) => {
    try {
      const segment = allSegments.find(s => s.segment_id === segmentId);
      if (!segment) {
        toast.error("セグメントが見つかりません");
        return;
      }

      if (segment.data_link_status !== 'linked') {
        toast.error("連携済みステータスのセグメントのみ確定できます");
        return;
      }

      // 有効期限を6ヶ月後に設定
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 6);
      let expireDateString: string;
      if (isNaN(expireDate.getTime())) {
        console.warn('⚠️ Invalid expireDate, using current date + 6 months');
        const fallbackDate = new Date();
        fallbackDate.setMonth(fallbackDate.getMonth() + 6);
        expireDateString = fallbackDate.toISOString().split('T')[0];
      } else {
        try {
          expireDateString = expireDate.toISOString().split('T')[0];
        } catch (e) {
          console.warn('⚠️ toISOString() failed for expireDate:', e);
          const fallbackDate = new Date();
          fallbackDate.setMonth(fallbackDate.getMonth() + 6);
          expireDateString = fallbackDate.toISOString().split('T')[0];
        }
      }

      const updated = await bigQueryService.updateSegment(segmentId, { 
        segment_expire_date: expireDateString 
      });
      
      if (updated) {
        setAllSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updated : s)));
        setSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updated : s)));
        toast.success("セグメントの連携を確定しました（有効期限: 6ヶ月後）");
        return updated;
      }
    } catch (error) {
      console.error("Error confirming segment link:", error);
      toast.error("確定処理に失敗しました");
      throw error;
    }
  };

  // 地点作成
  const createPoi = async (segmentId: string, poiData: Partial<PoiInfo>) => {
    try {
      if (!selectedProject) return;

      // TG地点の場合、segment_idを確実に設定（poiDataに含まれていても、引数のsegmentIdを優先）
      const finalSegmentId = (poiData.poi_category === 'visit_measurement') 
        ? undefined 
        : (poiData.segment_id || segmentId);

      const newPoi = await bigQueryService.createPoi({
        project_id: selectedProject.project_id,
        segment_id: finalSegmentId,
        poi_name: poiData.poi_name || "",
        address: poiData.address,
        poi_type: poiData.poi_type,
        poi_category: poiData.poi_category,
        designated_radius: poiData.designated_radius,
        latitude: poiData.latitude,
        longitude: poiData.longitude,
        extraction_period: poiData.extraction_period,
        extraction_period_type: poiData.extraction_period_type,
        extraction_start_date: poiData.extraction_start_date,
        extraction_end_date: poiData.extraction_end_date,
        attribute: poiData.attribute,
        detection_count: poiData.detection_count,
        detection_time_start: poiData.detection_time_start,
        detection_time_end: poiData.detection_time_end,
        stay_time: poiData.stay_time,
        location_id: poiData.location_id,
        prefectures: poiData.prefectures,
        cities: poiData.cities,
      });

      setPois((prev) => [newPoi, ...prev]);
      setAllPois((prev) => [newPoi, ...prev]);
      
      // セグメントに共通条件が未設定の場合、最初の地点の条件でセグメントを更新
      const segment = segments.find(s => s.segment_id === segmentId);
      if (segment && !segment.designated_radius && poiData.designated_radius) {
        const segmentUpdates: Partial<Segment> = {
          designated_radius: poiData.designated_radius,
          extraction_period: poiData.extraction_period,
          extraction_period_type: poiData.extraction_period_type,
          extraction_start_date: poiData.extraction_start_date,
          extraction_end_date: poiData.extraction_end_date,
          attribute: poiData.attribute,
          detection_count: poiData.detection_count,
          detection_time_start: poiData.detection_time_start,
          detection_time_end: poiData.detection_time_end,
          stay_time: poiData.stay_time,
        };
        
        const updatedSegment = await bigQueryService.updateSegment(segmentId, segmentUpdates);
        if (updatedSegment) {
          setSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
          setAllSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
        }
      }
      
      // 営業ユーザーによる地点登録の場合、スプレッドシートに自動出力
      if (user?.role === 'sales' && selectedProject) {
        try {
          const spreadsheetRow = convertPoiToSpreadsheetRow(newPoi, selectedProject, segment);
          
          // まずスプレッドシートに自動送信を試みる
          const result = await exportToGoogleSheets([spreadsheetRow]);
          
          if (result.success) {
            console.log('✅ スプレッドシートに自動入力成功:', result.message);
            toast.success(result.message);
          } else {
            // 失敗した場合はキューに保存（後で手動エクスポート可能）
            saveToExportQueue(spreadsheetRow);
            console.warn('⚠️ スプレッドシート自動入力失敗、キューに保存:', result.message);
            toast.warning(result.message);
          }
        } catch (error) {
          console.error('スプレッドシート出力の保存に失敗しました:', error);
          // エラーが発生しても地点登録は成功とする
        }
      }
      
      toast.success("地点が登録されました");
      return newPoi;
    } catch (error) {
      console.error("Error creating POI:", error);
      toast.error("地点の登録に失敗しました");
      throw error;
    }
  };

  // 地点一括登録
  const createPoisBulk = async (segmentId: string, poisData: Partial<PoiInfo>[]) => {
    try {
      if (!selectedProject) return;

      const poisToCreate = poisData.map(poiData => ({
        project_id: selectedProject.project_id,
        segment_id: segmentId,
        poi_name: poiData.poi_name || "",
        address: poiData.address,
        poi_type: poiData.poi_type,
        poi_category: poiData.poi_category,
        designated_radius: poiData.designated_radius,
        latitude: poiData.latitude,
        longitude: poiData.longitude,
        extraction_period: poiData.extraction_period,
        extraction_period_type: poiData.extraction_period_type,
        extraction_start_date: poiData.extraction_start_date,
        extraction_end_date: poiData.extraction_end_date,
        attribute: poiData.attribute,
        detection_count: poiData.detection_count,
        detection_time_start: poiData.detection_time_start,
        detection_time_end: poiData.detection_time_end,
        stay_time: poiData.stay_time,
        location_id: poiData.location_id,
        prefectures: poiData.prefectures,
        cities: poiData.cities,
      }));

      const newPois = await bigQueryService.createPoisBulk(poisToCreate);

      setPois((prev) => [...newPois, ...prev]);
      setAllPois((prev) => [...newPois, ...prev]);
      
      // セグメントに共通条件が未設定の場合、最初の地点の条件でセグメントを更新
      const segment = segments.find(s => s.segment_id === segmentId);
      if (segment && !segment.designated_radius && poisData[0]?.designated_radius) {
        const segmentUpdates: Partial<Segment> = {
          designated_radius: poisData[0].designated_radius,
          extraction_period: poisData[0].extraction_period,
          extraction_period_type: poisData[0].extraction_period_type,
          extraction_start_date: poisData[0].extraction_start_date,
          extraction_end_date: poisData[0].extraction_end_date,
          attribute: poisData[0].attribute,
          detection_count: poisData[0].detection_count,
          detection_time_start: poisData[0].detection_time_start,
          detection_time_end: poisData[0].detection_time_end,
          stay_time: poisData[0].stay_time,
        };
        
        const updatedSegment = await bigQueryService.updateSegment(segmentId, segmentUpdates);
        if (updatedSegment) {
          setSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
          setAllSegments((prev) => prev.map((s) => (s.segment_id === segmentId ? updatedSegment : s)));
        }
      }
      
      toast.success(`${newPois.length}件の地点が登録されました`);
      return newPois;
    } catch (error) {
      console.error("Error creating POIs in bulk:", error);
      toast.error("地点の一括登録に失敗しました");
      throw error;
    }
  };

  // 地点更新
  const updatePoi = async (poiId: string, updates: Partial<PoiInfo>) => {
    try {
      const updatedPoi = await bigQueryService.updatePoi(poiId, updates, user?.email);
      if (updatedPoi) {
        setPois((prev) => prev.map((p) => (p.poi_id === poiId ? updatedPoi : p)));
        setAllPois((prev) => prev.map((p) => (p.poi_id === poiId ? updatedPoi : p)));
        toast.success("地点が更新されました");
        return updatedPoi;
      }
    } catch (error) {
      console.error("Error updating POI:", error);
      toast.error("地点の更新に失敗しました");
      throw error;
    }
  };

  // 地点削除
  const deletePoi = async (poiId: string) => {
    try {
      await bigQueryService.deletePoi(poiId, user?.email);
      setPois((prev) => prev.filter((p) => p.poi_id !== poiId));
      setAllPois((prev) => prev.filter((p) => p.poi_id !== poiId));
      toast.success("地点が削除されました");
    } catch (error) {
      console.error("Error deleting POI:", error);
      toast.error("地点の削除に失敗しました");
      throw error;
    }
  };

  // 修正依頼作成
  const createEditRequest = async (request: EditRequest) => {
    try {
      await bigQueryService.createEditRequest(request);
      setEditRequests((prev) => [request, ...prev]);
      toast.success("修正依頼を送信しました", {
        description: "管理部が確認後、承認または却下されます",
      });
      return request;
    } catch (error) {
      console.error("Error creating edit request:", error);
      toast.error("修正依頼の送信に失敗しました");
      throw error;
    }
  };

  // 修正依頼承認
  const approveEditRequest = async (requestId: string, comment: string) => {
    try {
      const request = editRequests.find((r) => r.request_id === requestId);
      if (!request) return;

      // 変更を適用
      if (request.request_type === "project") {
        const project = projects.find((p) => p.project_id === request.target_id);
        if (project) {
          const updates: any = {};
          Object.entries(request.changes).forEach(([key, change]) => {
            updates[key] = change.after;
          });
          await updateProject(request.target_id, updates); // 再利用
        }
      } else if (request.request_type === "segment") {
        const updates: any = {};
        Object.entries(request.changes).forEach(([key, change]) => {
          updates[key] = change.after;
        });
        await updateSegment(request.target_id, updates); // 再利用
      } else if (request.request_type === "poi") {
        const updates: any = {};
        Object.entries(request.changes).forEach(([key, change]) => {
          updates[key] = change.after;
        });
        await updatePoi(request.target_id, updates); // 再利用
      }

      // 修正依頼のステータスを更新
      const updatedRequest = await bigQueryService.updateEditRequest(requestId, {
        status: "approved" as const,
        reviewed_by: user?.email || "",
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
      });

      if (updatedRequest) {
        setEditRequests((prev) =>
          prev.map((r) => (r.request_id === requestId ? updatedRequest : r))
        );
      }

      toast.success("修正依頼を承認しました");
    } catch (error) {
      console.error("Error approving edit request:", error);
      toast.error("修正依頼の承認に失敗しました");
    }
  };

  // 修正依頼却下
  const rejectEditRequest = async (requestId: string, comment: string) => {
    try {
      const updatedRequest = await bigQueryService.updateEditRequest(requestId, {
        status: "rejected" as const,
        reviewed_by: user?.email || "",
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
      });

      if (updatedRequest) {
        setEditRequests((prev) =>
          prev.map((r) => (r.request_id === requestId ? updatedRequest : r))
        );
      }

      toast.success("修正依頼を却下しました");
    } catch (error) {
      console.error("Error rejecting edit request:", error);
      toast.error("修正依頼の却下に失敗しました");
    }
  };

  // 修正依頼取り下げ
  const withdrawEditRequest = async (requestId: string) => {
    try {
      const updatedRequest = await bigQueryService.updateEditRequest(requestId, {
        status: "withdrawn" as const,
      });

      if (updatedRequest) {
        setEditRequests((prev) =>
          prev.map((r) => (r.request_id === requestId ? updatedRequest : r))
        );
      }

      toast.success("修正依頼を取り下げました");
    } catch (error) {
      console.error("Error withdrawing edit request:", error);
      toast.error("修正依頼の取り下げに失敗しました");
    }
  };

  return {
    // State
    projects,
    segments,
    allSegments,
    pois,
    allPois,
    editRequests,
    selectedProject,
    unreadNotificationsCount,

    // Loaders (exposed for refreshing data if needed)
    refreshProjects: loadProjects,
    refreshSegments: loadAllSegments,
    refreshPois: loadAllPois,
    refreshEditRequests: loadEditRequests,
    refreshNotifications: loadUnreadNotifications,

    // Actions
    createProject,
    selectProject,
    clearSelectedProject,
    updateProject,
    updateProjectStatus,
    createSegment,
    updateSegment,
    deleteSegment,
    requestSegmentEdit,
    updateSegmentStatus,
    confirmSegmentLink,
    createPoi,
    createPoisBulk,
    updatePoi,
    deletePoi,
    createEditRequest,
    approveEditRequest,
    rejectEditRequest,
    withdrawEditRequest,
    loadUnreadNotifications,
  };
}