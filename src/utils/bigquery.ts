/**
 * BigQuery統合ユーティリティ
 * 
 * 重要: フロントエンドから直接BigQueryに接続するのはセキュリティ上推奨されません。
 * 本番環境では、Cloud Functions / Cloud Run などのバックエンドAPI経由でアクセスしてください。
 * 
 * このファイルはモック実装（ローカルストレージ使用）を提供します。
 */

import type { Project, Segment, PoiInfo, EditRequest, ProjectMessage, ChangeHistory, VisitMeasurementGroup, FeatureRequest } from '../types/schema';

// API Base URL（環境変数から取得、未設定の場合はlocalStorageモックを使用）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_API = !!API_BASE_URL;

// デバッグ: API接続設定をログ出力
if (USE_API) {
  console.log('🔗 バックエンドAPI接続:', API_BASE_URL);
} else {
  console.log('📦 ローカルストレージモード（API未設定）');
}

// Mock implementation using localStorage
class BigQueryService {
  private readonly projectStorageKey = 'bq_projects';
  private readonly segmentStorageKey = 'bq_segments';
  private readonly poiStorageKey = 'bq_poi';
  private readonly editRequestStorageKey = 'bq_edit_requests';
  private readonly messageStorageKey = 'bq_messages';
  private readonly changeHistoryStorageKey = 'bq_change_history';
  private readonly visitMeasurementGroupStorageKey = 'bq_visit_measurement_groups';
  private readonly featureRequestStorageKey = 'bq_feature_requests';
  private readonly userStorageKey = 'bq_users';
  private readonly userRequestStorageKey = 'bq_user_requests';

  constructor() {
    // 初期化時にデータマイグレーションを実行
    this.migrateSegmentIds();
    // デモデータの投入（環境変数で制御）
    // 開発環境でデモデータを使いたい場合は .env に VITE_USE_DEMO_DATA=true を追加
    if (import.meta.env.VITE_USE_DEMO_DATA === 'true') {
      this.seedDemoData();
    }
    // 6か月以上古い履歴を削除
    this.cleanupOldHistory();
  }

  // デモデータの投入（外部から呼び出し可能にする）
  public seedDemoData(): void {
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
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        console.log('🔗 API呼び出し:', `${API_BASE_URL}/api/projects`);
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 レスポンスステータス:', response.status, response.statusText);

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMessage = 'プロジェクトの取得に失敗しました';
          let errorDetails: any = null;
          
          try {
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || error.message || errorMessage;
              errorDetails = error;
              console.error('❌ APIエラーレスポンス:', error);
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
              console.error('❌ APIエラーテキスト:', errorText);
            }
          } catch (parseError) {
            console.error('❌ エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          // より詳細なエラーメッセージを構築
          const fullErrorMessage = errorDetails 
            ? `${errorMessage} (Type: ${errorDetails.type || 'Unknown'})`
            : errorMessage;
          
          throw new Error(fullErrorMessage);
        }

        const data = await response.json();
        console.log('✅ プロジェクト取得成功:', data.length, '件');
        return data;
      } catch (error) {
        console.error('❌ プロジェクト取得APIエラー:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
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
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        // project_idを生成（モック実装と同じ形式）
        const projectId = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // バックエンドに送信するデータを構築（project_idを含める）
        const projectData = {
          ...project,
          project_id: projectId,
          person_in_charge: userName || '営業A', // 主担当者を設定
        };
        
        console.log('📤 プロジェクト作成リクエスト:', {
          project_id: projectData.project_id,
          advertiser_name: projectData.advertiser_name,
          delivery_start_date: projectData.delivery_start_date,
          delivery_end_date: projectData.delivery_end_date,
        });
        
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(projectData),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMessage = 'プロジェクトの作成に失敗しました';
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        // レスポンスからプロジェクト情報を取得（バックエンドが返す場合）
        const result = await response.json();
        // バックエンドがメッセージのみを返す場合、プロジェクト一覧から最新を取得
        if (result.message && !result.project_id) {
          const projects = await this.getProjects();
          return projects[0]; // 最新のプロジェクトを返す
        }
        return result;
      } catch (error) {
        console.error('プロジェクト作成APIエラー:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
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
      
      // 配信媒体に応じたプレフィックスを決定
      let prefix = 'seg-uni'; // デフォルトはuniverse
      
      if (segment.media_id) {
        if (Array.isArray(segment.media_id)) {
          // 複数の媒体がある場合、優先順位で決定（CTV > universe）
          if (segment.media_id.includes('tver_ctv')) {
            prefix = 'seg-ctv';
          } else if (segment.media_id.includes('universe')) {
            prefix = 'seg-uni';
          }
        } else {
          // 単一の媒体の場合
          if (segment.media_id === 'tver_ctv') {
            prefix = 'seg-ctv';
          } else if (segment.media_id === 'universe') {
            prefix = 'seg-uni';
          }
        }
      }
      
      // 該当プレフィックスの最大番号を取得（案件横断）
      let maxNumber = 0;
      segments.forEach(s => {
        // 例: seg-ctv-001 から 001 を抽出
        const match = s.segment_id.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // 次の番号を3桁ゼロ埋めで生成
      const nextNumber = maxNumber + 1;
      const segmentId = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
      
      const newSegment: Segment = {
        ...segment,
        segment_id: segmentId,
        segment_registered_at: new Date().toISOString(),
      };
      segments.unshift(newSegment);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      
      console.log(`✅ セグメント作成: ${segmentId} (media: ${segment.media_id})`);
      
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
      
      // セグメント単位で連番を生成
      const segmentPois = pois.filter(p => p.segment_id === poi.segment_id);
      const maxNumber = segmentPois.reduce((max, p) => {
        // 既存のlocation_idから番号を抽出（形式: S1-001, S1-002など）
        if (p.location_id) {
          const match = p.location_id.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            return Math.max(max, num);
          }
        }
        return max;
      }, 0);
      
      const nextNumber = maxNumber + 1;
      const locationId = `${poi.segment_id}-${String(nextNumber).padStart(3, '0')}`;
      
      const newPoi: PoiInfo = {
        ...poi,
        poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        location_id: locationId,
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

  async createPoisBulk(poisData: Omit<PoiInfo, 'poi_id' | 'created'>[]): Promise<PoiInfo[]> {
    try {
      const existingPois = await this.getPoiInfos();
      
      // セグメントごとにグループ化
      const poisBySegment = new Map<string, Omit<PoiInfo, 'poi_id' | 'created'>[]>();
      poisData.forEach(poi => {
        if (!poisBySegment.has(poi.segment_id)) {
          poisBySegment.set(poi.segment_id, []);
        }
        poisBySegment.get(poi.segment_id)!.push(poi);
      });
      
      const newPois: PoiInfo[] = [];
      
      // セグメントごとに連番を割り当て
      for (const [segmentId, segmentPoisData] of poisBySegment.entries()) {
        // 既存の地点から最大番号を取得
        const segmentExistingPois = existingPois.filter(p => p.segment_id === segmentId);
        let maxNumber = segmentExistingPois.reduce((max, p) => {
          if (p.location_id) {
            const match = p.location_id.match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              return Math.max(max, num);
            }
          }
          return max;
        }, 0);
        
        // 各地点に連番を割り当て
        for (const poi of segmentPoisData) {
          maxNumber++;
          const locationId = `${segmentId}-${String(maxNumber).padStart(3, '0')}`;
          
          newPois.push({
            ...poi,
            poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            location_id: locationId,
            created: new Date().toISOString(),
          });
        }
      }
      
      // 新しいPOIを既存のPOIの先頭に追加
      const updatedPois = [...newPois, ...existingPois];
      localStorage.setItem(this.poiStorageKey, JSON.stringify(updatedPois));
      console.log(`📍 ${newPois.length}件のPOIを一括登録しました`);
      return newPois;
    } catch (error) {
      console.error('Error creating POIs in bulk:', error);
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

  // 計測地点グループ管理
  async getVisitMeasurementGroups(projectId: string): Promise<VisitMeasurementGroup[]> {
    try {
      const data = localStorage.getItem(this.visitMeasurementGroupStorageKey);
      const groups: VisitMeasurementGroup[] = data ? JSON.parse(data) : [];
      return groups.filter(g => g.project_id === projectId);
    } catch (error) {
      console.error('Error fetching visit measurement groups:', error);
      return [];
    }
  }

  async createVisitMeasurementGroup(group: Omit<VisitMeasurementGroup, 'group_id' | 'created'>): Promise<VisitMeasurementGroup> {
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      const newGroup: VisitMeasurementGroup = {
        ...group,
        group_id: `VMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created: new Date().toISOString(),
      };
      groups.unshift(newGroup);
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(groups));
      console.log('📍 Visit Measurement Group created:', newGroup);
      return newGroup;
    } catch (error) {
      console.error('Error creating visit measurement group:', error);
      throw error;
    }
  }

  async updateVisitMeasurementGroup(groupId: string, updates: Partial<VisitMeasurementGroup>): Promise<VisitMeasurementGroup> {
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      const index = groups.findIndex(g => g.group_id === groupId);
      if (index === -1) {
        throw new Error(`Visit measurement group not found: ${groupId}`);
      }
      groups[index] = { ...groups[index], ...updates };
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(groups));
      console.log('📍 Visit Measurement Group updated:', groups[index]);
      return groups[index];
    } catch (error) {
      console.error('Error updating visit measurement group:', error);
      throw error;
    }
  }

  async deleteVisitMeasurementGroup(groupId: string): Promise<void> {
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      const filtered = groups.filter(g => g.group_id !== groupId);
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(filtered));
      console.log('📍 Visit Measurement Group deleted:', groupId);
    } catch (error) {
      console.error('Error deleting visit measurement group:', error);
      throw error;
    }
  }

  private async getAllVisitMeasurementGroups(): Promise<VisitMeasurementGroup[]> {
    try {
      const data = localStorage.getItem(this.visitMeasurementGroupStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching all visit measurement groups:', error);
      return [];
    }
  }

  // 機能リクエスト管理
  async getFeatureRequests(): Promise<FeatureRequest[]> {
    try {
      const data = localStorage.getItem(this.featureRequestStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching feature requests:', error);
      return [];
    }
  }

  async createFeatureRequest(request: Omit<FeatureRequest, 'request_id' | 'requested_at' | 'status'>): Promise<FeatureRequest> {
    try {
      const requests = await this.getFeatureRequests();
      const newRequest: FeatureRequest = {
        ...request,
        request_id: `FRQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        requested_at: new Date().toISOString(),
        status: 'pending',
      };
      requests.unshift(newRequest);
      localStorage.setItem(this.featureRequestStorageKey, JSON.stringify(requests));
      console.log('💡 Feature request created:', newRequest);
      return newRequest;
    } catch (error) {
      console.error('Error creating feature request:', error);
      throw error;
    }
  }

  async updateFeatureRequest(requestId: string, updates: Partial<FeatureRequest>): Promise<FeatureRequest> {
    try {
      const requests = await this.getFeatureRequests();
      const index = requests.findIndex(r => r.request_id === requestId);
      if (index === -1) {
        throw new Error(`Feature request not found: ${requestId}`);
      }
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(this.featureRequestStorageKey, JSON.stringify(requests));
      console.log('💡 Feature request updated:', requests[index]);
      return requests[index];
    } catch (error) {
      console.error('Error updating feature request:', error);
      throw error;
    }
  }
  // ユーザー管理
  async getUsers(): Promise<any[]> {
    const data = localStorage.getItem(this.userStorageKey);
    return data ? JSON.parse(data) : [];
  }

  async getUserByEmail(email: string): Promise<any | null> {
    const users = await this.getUsers();
    return users.find(u => u.email === email) || null;
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'sales';
    department?: string;
  }): Promise<any> {
    const users = await this.getUsers();
    
    // メールアドレスの重複チェック
    const existing = users.find(u => u.email === userData.email);
    if (existing) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const newUser = {
      user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: userData.name,
      email: userData.email,
      // 注意: 実際の本番環境では、パスワードをハッシュ化して保存する必要があります
      password_hash: btoa(userData.password), // 簡易的なエンコード（本番では使用しないでください）
      role: userData.role,
      department: userData.department,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null
    };

    users.push(newUser);
    localStorage.setItem(this.userStorageKey, JSON.stringify(users));
    console.log('✅ ユーザー作成:', newUser.user_id);
    
    // パスワードハッシュは返さない
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.user_id === userId);
    
    if (index === -1) {
      throw new Error('ユーザーが見つかりません');
    }

    users[index] = {
      ...users[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(this.userStorageKey, JSON.stringify(users));
    console.log('✅ ユーザー更新:', userId);
    
    const { password_hash, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
  }

  async deleteUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.user_id !== userId);
    
    if (filtered.length === users.length) {
      throw new Error('ユーザーが見つかりません');
    }

    localStorage.setItem(this.userStorageKey, JSON.stringify(filtered));
    console.log('✅ ユーザー削除:', userId);
  }

  // ユーザー登録申請管理
  async getUserRequests(): Promise<any[]> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-requests`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // エラーレスポンスを安全にパース
          let errorMessage = 'ユーザー登録申請の取得に失敗しました';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // 成功レスポンスを安全にパース
        try {
          return await response.json();
        } catch (parseError) {
          console.error('レスポンスのパースに失敗:', parseError);
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
        console.error('ユーザー登録申請取得APIエラー:', error);
        // ネットワークエラーの場合、より分かりやすいメッセージを提供
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
    const data = localStorage.getItem(this.userRequestStorageKey);
    return data ? JSON.parse(data) : [];
  }

  async createUserRequest(requestData: {
    name: string;
    email: string;
    password: string;
    requested_role: 'admin' | 'sales';
    department?: string;
    reason?: string;
  }): Promise<any> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          // エラーレスポンスを安全にパース
          let errorMessage = 'ユーザー登録申請に失敗しました';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // 成功レスポンスを安全にパース
        try {
          return await response.json();
        } catch (parseError) {
          console.error('レスポンスのパースに失敗:', parseError);
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
        console.error('ユーザー登録申請APIエラー:', error);
        // ネットワークエラーの場合、より分かりやすいメッセージを提供
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
    const requests = await this.getUserRequests();
    
    // メールアドレスの重複チェック（既存ユーザー）
    const existingUser = await this.getUserByEmail(requestData.email);
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 既に申請済みかチェック
    const existingRequest = requests.find(r => 
      r.email === requestData.email && r.status === 'pending'
    );
    if (existingRequest) {
      throw new Error('このメールアドレスで既に申請が行われています');
    }

    const newRequest = {
      user_id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: requestData.name,
      email: requestData.email,
      password_hash: btoa(requestData.password), // 簡易エンコード
      requested_role: requestData.requested_role,
      department: requestData.department,
      reason: requestData.reason,
      status: 'pending',
      requested_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null
    };

    requests.push(newRequest);
    localStorage.setItem(this.userRequestStorageKey, JSON.stringify(requests));
    console.log('✅ ユーザー登録申請作成:', newRequest.user_id);
    
    const { password_hash, ...requestWithoutPassword } = newRequest;
    return requestWithoutPassword;
  }

  async approveUserRequest(requestId: string, reviewedBy: string, comment?: string): Promise<void> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-requests/${requestId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reviewed_by: reviewedBy, comment }),
        });

        if (!response.ok) {
          // エラーレスポンスを安全にパース
          let errorMessage = 'ユーザー登録申請の承認に失敗しました';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // 成功レスポンスを確認
        try {
          await response.json();
        } catch (parseError) {
          // レスポンスボディが空の場合も成功とみなす
          if (response.status === 200 || response.status === 201) {
            return;
          }
          console.error('レスポンスのパースに失敗:', parseError);
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
        console.error('ユーザー登録申請承認APIエラー:', error);
        // ネットワークエラーの場合、より分かりやすいメッセージを提供
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
      return;
    }

    // モック実装（localStorage）
    const requests = await this.getUserRequests();
    const index = requests.findIndex(r => r.user_id === requestId);
    
    if (index === -1) {
      throw new Error('申請が見つかりません');
    }

    const request = requests[index];
    if (request.status !== 'pending') {
      throw new Error('この申請は既に処理されています');
    }

    // ユーザーを作成
    const newUser = {
      user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      email: request.email,
      password_hash: request.password_hash,
      role: request.requested_role,
      department: request.department,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null
    };

    const users = await this.getUsers();
    users.push(newUser);
    localStorage.setItem(this.userStorageKey, JSON.stringify(users));

    // 申請を承認済みに更新
    requests[index] = {
      ...request,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      review_comment: comment || null
    };

    localStorage.setItem(this.userRequestStorageKey, JSON.stringify(requests));
    console.log('✅ ユーザー登録申請承認:', requestId, '-> ユーザー作成:', newUser.user_id);
  }

  async rejectUserRequest(requestId: string, reviewedBy: string, comment: string): Promise<void> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-requests/${requestId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reviewed_by: reviewedBy, comment }),
        });

        if (!response.ok) {
          // エラーレスポンスを安全にパース
          let errorMessage = 'ユーザー登録申請の却下に失敗しました';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // 成功レスポンスを確認
        try {
          await response.json();
        } catch (parseError) {
          // レスポンスボディが空の場合も成功とみなす
          if (response.status === 200 || response.status === 201) {
            return;
          }
          console.error('レスポンスのパースに失敗:', parseError);
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
        console.error('ユーザー登録申請却下APIエラー:', error);
        // ネットワークエラーの場合、より分かりやすいメッセージを提供
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
      return;
    }

    // モック実装（localStorage）
    const requests = await this.getUserRequests();
    const index = requests.findIndex(r => r.user_id === requestId);
    
    if (index === -1) {
      throw new Error('申請が見つかりません');
    }

    const request = requests[index];
    if (request.status !== 'pending') {
      throw new Error('この申請は既に処理されています');
    }

    requests[index] = {
      ...request,
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      review_comment: comment
    };

    localStorage.setItem(this.userRequestStorageKey, JSON.stringify(requests));
    console.log('✅ ユーザー登録申請却下:', requestId);
  }
}

export const bigQueryService = new BigQueryService();
