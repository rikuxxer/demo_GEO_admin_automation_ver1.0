/**
 * BigQuery統合ユーティリティ
 * 
 * 重要: フロントエンドから直接BigQueryに接続するのはセキュリティ上推奨されません。
 * 本番環境では、Cloud Functions / Cloud Run などのバックエンドAPI経由でアクセスしてください。
 * 
 * このファイルはモック実装（ローカルストレージ使用）を提供します。
 */

import type { Project, Segment, PoiInfo, EditRequest, ProjectMessage, ChangeHistory } from '../types/schema';

// Mock implementation using localStorage
class BigQueryService {
  private readonly projectStorageKey = 'bq_projects';
  private readonly segmentStorageKey = 'bq_segments';
  private readonly poiStorageKey = 'bq_poi';
  private readonly editRequestStorageKey = 'bq_edit_requests';
  private readonly messageStorageKey = 'bq_messages';
  private readonly changeHistoryStorageKey = 'bq_change_history';

  constructor() {
    // 初期化時にデータマイグレーションを実行
    this.migrateSegmentIds();
    // デモデータの投入（メッセージがない場合）
    this.seedDemoData();
    // 6か月以上古い履歴を削除
    this.cleanupOldHistory();
  }

  // デモデータの投入
  private seedDemoData(): void {
    try {
      // 1. プロジェクトの確認・作成
      let projects: Project[] = [];
      const pData = localStorage.getItem(this.projectStorageKey);
      if (pData) {
        projects = JSON.parse(pData);
      }
      
      if (projects.length === 0) {
        const demoProject: Project = {
          project_id: 'PRJ-DEMO-001',
          _register_datetime: new Date().toISOString(),
          advertiser_name: '株式会社サンプル',
          appeal_point: '春の新商品キャンペーン',
          delivery_start_date: '2025-04-01',
          delivery_end_date: '2025-04-30',
          person_in_charge: '営業A',
          project_status: 'in_progress',
        };
        projects.push(demoProject);
        localStorage.setItem(this.projectStorageKey, JSON.stringify(projects));
        console.log('🌱 Demo project seeded:', demoProject);
      }

      const projectId = projects[0].project_id;

      // 2. メッセージの確認・作成
      let messages: ProjectMessage[] = [];
      const mData = localStorage.getItem(this.messageStorageKey);
      if (mData) {
        messages = JSON.parse(mData);
      }

      // メッセージが全くない場合のみ追加
      if (messages.length === 0) {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

        const demoMessages: ProjectMessage[] = [
          {
            message_id: `MSG-DEMO-${Date.now()}-1`,
            project_id: projectId,
            sender_id: 'admin@example.com',
            sender_name: '管理太郎',
            sender_role: 'admin',
            content: '【確認依頼】キャンペーンの予算について確認させてください。申請額と見積書に差異があります。',
            message_type: 'inquiry',
            is_read: true, // 既読
            created_at: twoHoursAgo.toISOString(),
          },
          {
            message_id: `MSG-DEMO-${Date.now()}-2`,
            project_id: projectId,
            sender_id: 'salesA@example.com',
            sender_name: '営業A',
            sender_role: 'sales',
            content: '確認します。少々お待ちください。',
            message_type: 'reply',
            is_read: true,
            created_at: oneHourAgo.toISOString(),
          },
          {
            message_id: `MSG-DEMO-${Date.now()}-3`,
            project_id: projectId,
            sender_id: 'admin@example.com',
            sender_name: '管理太郎',
            sender_role: 'admin',
            content: '修正版の資料をお送りいただけますでしょうか？期限が近いため至急お願いします。',
            message_type: 'inquiry',
            is_read: false, // 未読
            created_at: now.toISOString(),
          }
        ];
        
        localStorage.setItem(this.messageStorageKey, JSON.stringify(demoMessages));
        console.log('🌱 Demo messages seeded');
      }
    } catch (error) {
      console.error('Error seeding demo data:', error);
    }
  }

  // セグメントIDのマイグレーション: SEG-XXX -> 数字
  private migrateSegmentIds(): void {
    try {
      // セグメントデータの取得
      const segmentsData = localStorage.getItem(this.segmentStorageKey);
      if (!segmentsData) return;
      
      const segments: Segment[] = JSON.parse(segmentsData);
      let hasChanges = false;
      let counter = 1;
      const idMapping = new Map<string, string>(); // 古いID -> 新しいIDのマッピング

      // SEG-形式のIDを数字に変換
      const migratedSegments = segments.map(segment => {
        if (segment.segment_id.startsWith('SEG-')) {
          hasChanges = true;
          const newId = String(counter++);
          idMapping.set(segment.segment_id, newId);
          return { ...segment, segment_id: newId };
        }
        return segment;
      });

      // セグメントIDに変更があった場合
      if (hasChanges) {
        localStorage.setItem(this.segmentStorageKey, JSON.stringify(migratedSegments));
        
        // 地点情報のセグメントIDも更新
        const poisData = localStorage.getItem(this.poiStorageKey);
        if (poisData) {
          const pois: PoiInfo[] = JSON.parse(poisData);
          const migratedPois = pois.map(poi => {
            const newSegmentId = idMapping.get(poi.segment_id);
            if (newSegmentId) {
              return { ...poi, segment_id: newSegmentId };
            }
            return poi;
          });
          localStorage.setItem(this.poiStorageKey, JSON.stringify(migratedPois));
        }
        
        console.log('✅ セグメントIDのマイグレーションが完了しました');
      }
    } catch (error) {
      console.error('セグメントIDのマイグレーション中にエラーが発生しました:', error);
    }
  }

  // ===== 広告主DB (Projects) =====
  
  async getProjects(): Promise<Project[]> {
    try {
      const data = localStorage.getItem(this.projectStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      const projects = await this.getProjects();
      return projects.find(p => p.project_id === projectId) || null;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  }

  async createProject(project: Omit<Project, 'project_id' | '_register_datetime' | 'person_in_charge'>, userName?: string): Promise<Project> {
    try {
      const projects = await this.getProjects();
      const newProject: Project = {
        ...project,
        project_id: `PRJ-${Date.now()}`,
        _register_datetime: new Date().toISOString(),
        person_in_charge: userName || '営業A', // 主担当者を自動採番（実際にはログインユーザー情報から取得）
        project_status: 'draft', // 初期ステータスは「準備中」
        // project_registration_started_atはprojectオブジェクトに含まれている場合はそのまま使用
      };
      
      // デバッグ: 登録開始時点が含まれているか確認
      if (newProject.project_registration_started_at) {
        console.log('✅ 案件登録開始時点が記録されています:', newProject.project_registration_started_at);
      } else {
        console.warn('⚠️ 案件登録開始時点が記録されていません');
      }
      
      projects.unshift(newProject);
      localStorage.setItem(this.projectStorageKey, JSON.stringify(projects));
      
      // 変更履歴を記録
      await this.recordChangeHistory('project', newProject.project_id, 'create', userName || 'system', newProject.project_id);
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const projects = await this.getProjects();
      const index = projects.findIndex(p => p.project_id === projectId);
      if (index === -1) return null;
      
      projects[index] = { ...projects[index], ...updates };
      localStorage.setItem(this.projectStorageKey, JSON.stringify(projects));
      return projects[index];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      const filtered = projects.filter(p => p.project_id !== projectId);
      localStorage.setItem(this.projectStorageKey, JSON.stringify(filtered));
      
      // 関連するセグメントと地点情報も削除
      await this.deleteSegmentsByProject(projectId);
      await this.deletePoiByProject(projectId);
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // ===== セグメントDB (Segments) =====
  
  async getSegments(): Promise<Segment[]> {
    try {
      const data = localStorage.getItem(this.segmentStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching segments:', error);
      return [];
    }
  }

  async getAllSegments(): Promise<Segment[]> {
    return this.getSegments();
  }

  async getSegmentsByProject(projectId: string): Promise<Segment[]> {
    try {
      const segments = await this.getSegments();
      return segments.filter(s => s.project_id === projectId);
    } catch (error) {
      console.error('Error fetching segments:', error);
      return [];
    }
  }

  async createSegment(segment: Omit<Segment, 'segment_id' | 'segment_registered_at'>): Promise<Segment> {
    try {
      const segments = await this.getSegments();
      
      // 最大のセグメントIDを取得して+1
      let maxId = 0;
      segments.forEach(s => {
        const id = parseInt(s.segment_id);
        if (!isNaN(id) && id > maxId) {
          maxId = id;
        }
      });
      
      const newSegment: Segment = {
        ...segment,
        segment_id: String(maxId + 1),
        segment_registered_at: new Date().toISOString(),
      };
      segments.unshift(newSegment);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      return newSegment;
    } catch (error) {
      console.error('Error creating segment:', error);
      throw error;
    }
  }

  async updateSegment(segmentId: string, updates: Partial<Segment>): Promise<Segment | null> {
    try {
      const segments = await this.getSegments();
      const index = segments.findIndex(s => s.segment_id === segmentId);
      if (index === -1) return null;
      
      segments[index] = { ...segments[index], ...updates };
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      return segments[index];
    } catch (error) {
      console.error('Error updating segment:', error);
      throw error;
    }
  }

  async deleteSegment(segmentId: string): Promise<boolean> {
    try {
      const segments = await this.getSegments();
      const filtered = segments.filter(s => s.segment_id !== segmentId);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(filtered));
      
      // 関連する地点情報も削除
      await this.deletePoiBySegment(segmentId);
      
      return true;
    } catch (error) {
      console.error('Error deleting segment:', error);
      return false;
    }
  }

  /**
   * セグメント編集依頼
   * データ連携依頼日を更新し、ステータスを「依頼済」に変更
   */
  async requestSegmentEdit(segmentId: string): Promise<Segment | null> {
    try {
      const segments = await this.getSegments();
      const index = segments.findIndex(s => s.segment_id === segmentId);
      if (index === -1) return null;
      
      const updatedSegment: Segment = {
        ...segments[index],
        data_link_status: 'requested',
        data_link_request_date: new Date().toISOString().split('T')[0],
        data_link_scheduled_date: this.calculateScheduledDate(),
      };
      
      segments[index] = updatedSegment;
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      
      console.log('📊 [BigQuery Mock] Segment edit request submitted:', segmentId);
      return updatedSegment;
    } catch (error) {
      console.error('Error requesting segment edit:', error);
      throw error;
    }
  }

  /**
   * データ連携予定日を計算（例: 3営業日後）
   */
  private calculateScheduledDate(): string {
    const date = new Date();
    let businessDays = 0;
    
    while (businessDays < 3) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      // 土日を除く
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return date.toISOString().split('T')[0];
  }

  async deleteSegmentsByProject(projectId: string): Promise<boolean> {
    try {
      const segments = await this.getSegments();
      const filtered = segments.filter(s => s.project_id !== projectId);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting segments by project:', error);
      return false;
    }
  }

  // ===== 地点情報DB (POI) =====
  
  async getPoiInfos(): Promise<PoiInfo[]> {
    try {
      const data = localStorage.getItem(this.poiStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching POI info:', error);
      return [];
    }
  }

  async getAllPois(): Promise<PoiInfo[]> {
    return this.getPoiInfos();
  }

  async getPoisByProject(projectId: string): Promise<PoiInfo[]> {
    try {
      const pois = await this.getPoiInfos();
      return pois.filter(p => p.project_id === projectId);
    } catch (error) {
      console.error('Error fetching POIs by project:', error);
      return [];
    }
  }

  async getPoisBySegment(segmentId: string): Promise<PoiInfo[]> {
    try {
      const pois = await this.getPoiInfos();
      return pois.filter(p => p.segment_id === segmentId);
    } catch (error) {
      console.error('Error fetching POI by segment:', error);
      return [];
    }
  }

  async getPoiBySegment(segmentId: string): Promise<PoiInfo[]> {
    return this.getPoisBySegment(segmentId);
  }

  async createPoi(poi: Omit<PoiInfo, 'poi_id' | 'created'>): Promise<PoiInfo> {
    try {
      const pois = await this.getPoiInfos();
      const newPoi: PoiInfo = {
        ...poi,
        poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created: new Date().toISOString(),
      };
      pois.unshift(newPoi);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      console.log('📍 POI created:', newPoi);
      return newPoi;
    } catch (error) {
      console.error('Error creating POI:', error);
      throw error;
    }
  }

  async createPoiInfo(poi: Omit<PoiInfo, 'created'>): Promise<PoiInfo> {
    try {
      const pois = await this.getPoiInfos();
      const newPoi: PoiInfo = {
        ...poi,
        created: new Date().toISOString().split('T')[0],
      };
      pois.unshift(newPoi);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      return newPoi;
    } catch (error) {
      console.error('Error creating POI info:', error);
      throw error;
    }
  }

  async updatePoi(poiId: string, updates: Partial<PoiInfo>): Promise<PoiInfo | null> {
    try {
      const pois = await this.getPoiInfos();
      const index = pois.findIndex(p => p.poi_id === poiId);
      if (index === -1) return null;
      
      pois[index] = { ...pois[index], ...updates };
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      console.log('📍 POI updated:', pois[index]);
      return pois[index];
    } catch (error) {
      console.error('Error updating POI:', error);
      return null;
    }
  }

  async deletePoi(poiId: string): Promise<boolean> {
    try {
      const pois = await this.getPoiInfos();
      const filteredPois = pois.filter(p => p.poi_id !== poiId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filteredPois));
      console.log('📍 POI deleted:', poiId);
      return true;
    } catch (error) {
      console.error('Error deleting POI:', error);
      return false;
    }
  }

  async deletePoiBySegment(segmentId: string): Promise<boolean> {
    try {
      const pois = await this.getPoiInfos();
      const filtered = pois.filter(p => p.segment_id !== segmentId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting POI by segment:', error);
      return false;
    }
  }

  async deletePoiByProject(projectId: string): Promise<boolean> {
    try {
      const pois = await this.getPoiInfos();
      const filtered = pois.filter(p => p.project_id !== projectId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting POI by project:', error);
      return false;
    }
  }

  // ===== 修正依頼 (Edit Requests) =====

  async getEditRequests(): Promise<EditRequest[]> {
    try {
      const data = localStorage.getItem(this.editRequestStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching edit requests:', error);
      return [];
    }
  }

  async createEditRequest(request: EditRequest): Promise<EditRequest> {
    try {
      const requests = await this.getEditRequests();
      requests.unshift(request);
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(requests));
      console.log('📝 Edit request created:', request);
      return request;
    } catch (error) {
      console.error('Error creating edit request:', error);
      throw error;
    }
  }

  async updateEditRequest(requestId: string, updates: Partial<EditRequest>): Promise<EditRequest | null> {
    try {
      const requests = await this.getEditRequests();
      const index = requests.findIndex(r => r.request_id === requestId);
      if (index === -1) {
        console.error('Edit request not found:', requestId);
        return null;
      }
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(requests));
      console.log('📝 Edit request updated:', requests[index]);
      return requests[index];
    } catch (error) {
      console.error('Error updating edit request:', error);
      throw error;
    }
  }

  async deleteEditRequest(requestId: string): Promise<boolean> {
    try {
      const requests = await this.getEditRequests();
      const filtered = requests.filter(r => r.request_id !== requestId);
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(filtered));
      console.log('🗑️ Edit request deleted:', requestId);
      return true;
    } catch (error) {
      console.error('Error deleting edit request:', error);
      return false;
    }
  }

  // ===== プロジェクトメッセージ (Project Messages) =====

  async getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      const messages: ProjectMessage[] = data ? JSON.parse(data) : [];
      return messages
        .filter(m => m.project_id === projectId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } catch (error) {
      console.error('Error fetching project messages:', error);
      return [];
    }
  }
  
  async getAllMessages(): Promise<ProjectMessage[]> {
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching all messages:', error);
      return [];
    }
  }

  async sendProjectMessage(messageData: Omit<ProjectMessage, 'message_id' | 'created_at' | 'is_read'>): Promise<ProjectMessage> {
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      const messages: ProjectMessage[] = data ? JSON.parse(data) : [];
      
      const newMessage: ProjectMessage = {
        ...messageData,
        message_id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      
      messages.push(newMessage);
      localStorage.setItem(this.messageStorageKey, JSON.stringify(messages));
      console.log('💬 Message sent:', newMessage);
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessagesAsRead(projectId: string, readerRole: 'admin' | 'sales'): Promise<void> {
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      if (!data) return;
      
      let messages: ProjectMessage[] = JSON.parse(data);
      let hasChanges = false;
      
      // 自分の役割ではない人（相手）が送信したメッセージを既読にする
      messages = messages.map(m => {
        if (m.project_id === projectId && m.sender_role !== readerRole && !m.is_read) {
          hasChanges = true;
          return { ...m, is_read: true };
        }
        return m;
      });
      
      if (hasChanges) {
        localStorage.setItem(this.messageStorageKey, JSON.stringify(messages));
        console.log('👁️ Messages marked as read for project:', projectId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // ===== 変更履歴 (Change History) =====

  private async recordChangeHistory(
    entityType: ChangeHistory['entity_type'],
    entityId: string,
    action: ChangeHistory['action'],
    changedBy: string,
    projectId: string,
    changes?: ChangeHistory['changes']
  ): Promise<void> {
    try {
      const histories = this.getChangeHistories();
      const newHistory: ChangeHistory = {
        history_id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        entity_type: entityType,
        entity_id: entityId,
        project_id: projectId,
        // セグメントの場合のみsegment_idをセット（poiもentity_idをそのまま持つ）
        segment_id: entityType === 'segment' ? entityId : undefined,
        action,
        changed_by: changedBy,
        changed_at: new Date().toISOString(),
        changes,
      };

      histories.unshift(newHistory);
      this.cleanupOldHistory();
      localStorage.setItem(this.changeHistoryStorageKey, JSON.stringify(histories));
    } catch (error) {
      console.error('Error recording change history:', error);
      // 履歴の記録失敗で処理を止めない
    }
  }

  // 変更履歴を取得
  getChangeHistories(): ChangeHistory[] {
    try {
      const data = localStorage.getItem(this.changeHistoryStorageKey);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting change histories:', error);
      return [];
    }
  }

  // 6か月以上古い履歴を削除
  private cleanupOldHistory(): void {
    try {
      const histories = this.getChangeHistories();
      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 約6か月前
      
      const filtered = histories.filter(history => {
        const changedAt = new Date(history.changed_at);
        return changedAt >= sixMonthsAgo;
      });
      
      if (filtered.length !== histories.length) {
        localStorage.setItem(this.changeHistoryStorageKey, JSON.stringify(filtered));
        console.log(`🗑️ 古い変更履歴を削除しました: ${histories.length - filtered.length}件`);
      }
    } catch (error) {
      console.error('Error cleaning up old history:', error);
    }
  }
}

export const bigQueryService = new BigQueryService();
