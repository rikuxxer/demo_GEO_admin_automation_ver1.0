/**
 * BigQuery統合ユーティリティ
 * 
 * 重要: フロントエンドから直接BigQueryに接続するのはセキュリティ上推奨されません。
 * 本番環境では、Cloud Functions / Cloud Run などのバックエンドAPI経由でアクセスしてください。
 * 
 * このファイルはモック実装（ローカルストレージ使用）を提供します。
 */

import type { Project, Segment, PoiInfo, EditRequest, ProjectMessage, ChangeHistory, VisitMeasurementGroup, FeatureRequest, ReportRequest } from '../types/schema';

// API Base URL（環境変数から取得、未設定の場合はlocalStorageモックを使用）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_API = !!API_BASE_URL;

// デバッグ: API接続設定をログ出力
if (USE_API) {
} else {
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
  private readonly reportRequestStorageKey = 'bq_report_requests';
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
      }
    } catch (error) {
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
        
      }
    } catch (error) {
    }
  }

  // ===== 広告主DB (Projects) =====
  
  async getProjects(): Promise<Project[]> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });


        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMessage = 'プロジェクトの取得に失敗しました';
          let errorDetails: any = null;
          
          try {
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || error.message || errorMessage;
              errorDetails = error;
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          // より詳細なエラーメッセージを構築
          const fullErrorMessage = errorDetails 
            ? `${errorMessage} (Type: ${errorDetails.type || 'Unknown'})`
            : errorMessage;
          
          throw new Error(fullErrorMessage);
        }

        const data = await response.json();
        
        // 日付フィールドを正規化（オブジェクトやDateオブジェクトをYYYY-MM-DD形式の文字列に変換）
        const normalizedData = data.map((project: any) => {
          const normalized = { ...project };
          
          // delivery_start_dateを正規化
          if (normalized.delivery_start_date) {
            if (normalized.delivery_start_date instanceof Date) {
              normalized.delivery_start_date = normalized.delivery_start_date.toISOString().split('T')[0];
            } else if (typeof normalized.delivery_start_date === 'object') {
              // オブジェクトの場合（BigQueryから返された可能性）
              if ('value' in normalized.delivery_start_date) {
                normalized.delivery_start_date = String(normalized.delivery_start_date.value);
              } else {
                // オブジェクトを文字列に変換を試行
                try {
                  const date = new Date(normalized.delivery_start_date);
                  if (!isNaN(date.getTime())) {
                    normalized.delivery_start_date = date.toISOString().split('T')[0];
                  } else {
                    normalized.delivery_start_date = null;
                  }
                } catch (e) {
                  normalized.delivery_start_date = null;
                }
              }
            } else if (typeof normalized.delivery_start_date === 'string') {
              // 既に文字列の場合はそのまま（YYYY-MM-DD形式であることを期待）
              if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.delivery_start_date)) {
                // YYYY-MM-DD形式でない場合は変換を試行
                const date = new Date(normalized.delivery_start_date);
                if (!isNaN(date.getTime())) {
                  normalized.delivery_start_date = date.toISOString().split('T')[0];
                }
              }
            }
          }
          
          // delivery_end_dateを正規化
          if (normalized.delivery_end_date) {
            if (normalized.delivery_end_date instanceof Date) {
              normalized.delivery_end_date = normalized.delivery_end_date.toISOString().split('T')[0];
            } else if (typeof normalized.delivery_end_date === 'object') {
              // オブジェクトの場合（BigQueryから返された可能性）
              if ('value' in normalized.delivery_end_date) {
                normalized.delivery_end_date = String(normalized.delivery_end_date.value);
              } else {
                // オブジェクトを文字列に変換を試行
                try {
                  const date = new Date(normalized.delivery_end_date);
                  if (!isNaN(date.getTime())) {
                    normalized.delivery_end_date = date.toISOString().split('T')[0];
                  } else {
                    normalized.delivery_end_date = null;
                  }
                } catch (e) {
                  normalized.delivery_end_date = null;
                }
              }
            } else if (typeof normalized.delivery_end_date === 'string') {
              // 既に文字列の場合はそのまま（YYYY-MM-DD形式であることを期待）
              if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.delivery_end_date)) {
                // YYYY-MM-DD形式でない場合は変換を試行
                const date = new Date(normalized.delivery_end_date);
                if (!isNaN(date.getTime())) {
                  normalized.delivery_end_date = date.toISOString().split('T')[0];
                }
              }
            }
          }
          
          return normalized;
        });
        
        return normalizedData;
      } catch (error) {
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
      return [];
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      const projects = await this.getProjects();
      return projects.find(p => p.project_id === projectId) || null;
    } catch (error) {
      return null;
    }
  }

  async createProject(project: Omit<Project, 'project_id' | '_register_datetime' | 'person_in_charge'>, userName?: string): Promise<Project> {
    // デバッグ: 受信したプロジェクトデータをログ出力
    
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        // project_idはバックエンドで自動生成されるため、ここでは送信しない
        // バックエンドに送信するデータを構築（project_idは含めない）
        const projectData = {
          ...project,
          // project_idはバックエンドで連番形式で自動生成される
          person_in_charge: userName || '営業A', // 主担当者を設定
        };
        
        // バックエンドにリトライが未デプロイでも、「already exists」の500時は再送で通ることがあるためリトライする
        const MAX_CREATE_RETRIES = 3;
        let lastError: Error | null = null;
        let response: Response | null = null;

        for (let attempt = 1; attempt <= MAX_CREATE_RETRIES; attempt++) {
          response = await fetch(`${API_BASE_URL}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
          });

          if (response.ok) break;

          const contentType = response.headers.get('content-type');
          let errorMessage = 'プロジェクトの作成に失敗しました';
          let errorDetails: any = null;

          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorDetails = error;
            errorMessage = error.error || error.message || errorMessage;


            const isDuplicate =
              response.status === 500 &&
              typeof errorMessage === 'string' &&
              (errorMessage.includes('already exists') || (errorMessage.includes('project_id') && errorMessage.includes('exists')));

            if (isDuplicate && attempt < MAX_CREATE_RETRIES) {
              lastError = new Error(errorMessage);
              (lastError as any).details = errorDetails;
              (lastError as any).status = response.status;
              await new Promise((r) => setTimeout(r, 300 * attempt));
              continue;
            }

            lastError = new Error(errorMessage);
            (lastError as any).details = errorDetails;
            (lastError as any).status = response.status;
            throw lastError;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
            lastError = new Error(errorMessage);
            (lastError as any).status = response.status;
            throw lastError;
          }
        }

        if (!response || !response.ok) {
          throw lastError || new Error('プロジェクトの作成に失敗しました');
        }

        // レスポンスからプロジェクト情報を取得（バックエンドが返す場合）
        const result = await response.json();
        
        // バックエンドから返されたプロジェクトを返す
        if (result.project) {
          return result.project;
        }

        throw new Error('バックエンドからプロジェクト情報が返されませんでした');
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
    try {
      const projects = await this.getProjects();
      
      // 既存の案件IDから最大の番号を取得
      let maxNumber = 0;
      projects.forEach(p => {
        const match = p.project_id?.match(/^PRJ-(\d+)$/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      const nextNumber = maxNumber + 1;
      const projectId = `PRJ-${nextNumber}`;
      
      const newProject: Project = {
        ...project,
        project_id: projectId,
        _register_datetime: new Date().toISOString(),
        person_in_charge: userName || '営業A', // 主担当者を自動採番（実際にはログインユーザー情報から取得）
        project_status: 'draft', // 初期ステータスは「準備中」
        // project_registration_started_atはprojectオブジェクトに含まれている場合はそのまま使用
      };
      
      // デバッグ: 登録開始時点が含まれているか確認
      if (newProject.project_registration_started_at) {
      } else {
      }
      
      projects.unshift(newProject);
      localStorage.setItem(this.projectStorageKey, JSON.stringify(projects));
      
      // 変更履歴を記録
      await this.recordChangeHistory('project', newProject.project_id, 'create', userName || 'system', newProject.project_id);
      
      return newProject;
    } catch (error) {
      throw error;
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'プロジェクトの更新に失敗しました');
        }
        const updated = await this.getProject(projectId);
        return updated;
      } catch (error) {
        throw error;
      }
    }
    try {
      const projects = await this.getProjects();
      const index = projects.findIndex(p => p.project_id === projectId);
      if (index === -1) return null;
      
      projects[index] = { ...projects[index], ...updates };
      localStorage.setItem(this.projectStorageKey, JSON.stringify(projects));
      return projects[index];
    } catch (error) {
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'プロジェクトの削除に失敗しました');
        }
        return true;
      } catch (error) {
        throw error;
      }
    }
    try {
      const projects = await this.getProjects();
      const filtered = projects.filter(p => p.project_id !== projectId);
      localStorage.setItem(this.projectStorageKey, JSON.stringify(filtered));
      
      // 関連するセグメントと地点情報も削除
      await this.deleteSegmentsByProject(projectId);
      await this.deletePoiByProject(projectId);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== セグメントDB (Segments) =====
  
  async getSegments(): Promise<Segment[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/segments`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('セグメントの取得に失敗しました');
        const data = await response.json();
        const segments: Segment[] = Array.isArray(data) ? data : [];
        return segments.map((s: Segment) => ({
          ...s,
          poi_category: s.poi_category || 'tg',
          registerd_provider_segment: s.registerd_provider_segment ?? false,
        }));
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.segmentStorageKey);
      const segments: Segment[] = data ? JSON.parse(data) : [];
      return segments.map(segment => ({
        ...segment,
        poi_category: segment.poi_category || 'tg',
        registerd_provider_segment: segment.registerd_provider_segment ?? false,
      }));
    } catch (error) {
      return [];
    }
  }

  async getAllSegments(): Promise<Segment[]> {
    return this.getSegments();
  }

  async getSegmentsByProject(projectId: string): Promise<Segment[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/segments/project/${encodeURIComponent(projectId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('セグメントの取得に失敗しました');
        const data = await response.json();
        const segments: Segment[] = Array.isArray(data) ? data : [];
        return segments.map((s: Segment) => ({
          ...s,
          poi_category: s.poi_category || 'tg',
          registerd_provider_segment: s.registerd_provider_segment ?? false,
        }));
      } catch (error) {
        return [];
      }
    }
    try {
      const segments = await this.getSegments();
      return segments.filter(s => s.project_id === projectId);
    } catch (error) {
      return [];
    }
  }

  async createSegment(segment: Omit<Segment, 'segment_id' | 'segment_registered_at'>, existingSegments?: Segment[]): Promise<Segment> {
    const segments = existingSegments ?? await this.getSegments();
    let prefix = 'seg-uni';
    if (segment.media_id) {
      if (Array.isArray(segment.media_id)) {
        if (segment.media_id.includes('tver_ctv')) prefix = 'seg-ctv';
        else if (segment.media_id.includes('universe')) prefix = 'seg-uni';
      } else {
        if (segment.media_id === 'tver_ctv') prefix = 'seg-ctv';
        else if (segment.media_id === 'universe') prefix = 'seg-uni';
      }
    }
    let maxNumber = 0;
    segments.forEach(s => {
      const match = s.segment_id?.match?.(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    const nextNumber = maxNumber + 1;
    const segmentId = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    const newSegment: Segment = {
      ...segment,
      segment_id: segmentId,
      segment_registered_at: new Date().toISOString(),
      poi_category: segment.poi_category || 'tg',
      registerd_provider_segment: segment.registerd_provider_segment ?? false,
    };

    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/segments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSegment),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'セグメントの作成に失敗しました');
        }
        return newSegment;
      } catch (error) {
        throw error;
      }
    }
    try {
      segments.unshift(newSegment);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      return newSegment;
    } catch (error) {
      throw error;
    }
  }

  async updateSegment(segmentId: string, updates: Partial<Segment>): Promise<Segment | null> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/segments/${encodeURIComponent(segmentId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'セグメントの更新に失敗しました');
        }
        const all = await this.getSegments();
        return all.find(s => s.segment_id === segmentId) || null;
      } catch (error) {
        throw error;
      }
    }
    try {
      const segments = await this.getSegments();
      const index = segments.findIndex(s => s.segment_id === segmentId);
      if (index === -1) return null;
      segments[index] = { ...segments[index], ...updates };
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      return segments[index];
    } catch (error) {
      throw error;
    }
  }

  async deleteSegment(segmentId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/segments/${encodeURIComponent(segmentId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'セグメントの削除に失敗しました');
        }
        return true;
      } catch (error) {
        throw error;
      }
    }
    try {
      const segments = await this.getSegments();
      const filtered = segments.filter(s => s.segment_id !== segmentId);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(filtered));
      await this.deletePoiBySegment(segmentId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * セグメント編集依頼
   * データ連携依頼日を更新し、ステータスを「依頼済」に変更
   */
  async requestSegmentEdit(segmentId: string): Promise<Segment | null> {
    const updates = {
      data_link_status: 'requested',
      data_link_request_date: new Date().toISOString().split('T')[0],
      data_link_scheduled_date: this.calculateScheduledDate(),
    };
    if (USE_API) {
      return this.updateSegment(segmentId, updates);
    }
    try {
      const segments = await this.getSegments();
      const index = segments.findIndex(s => s.segment_id === segmentId);
      if (index === -1) return null;
      const updatedSegment: Segment = { ...segments[index], ...updates };
      segments[index] = updatedSegment;
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(segments));
      return updatedSegment;
    } catch (error) {
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
    
    // 安全にISO文字列に変換
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    try {
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  async deleteSegmentsByProject(projectId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const segments = await this.getSegmentsByProject(projectId);
        for (const s of segments) {
          if (s.segment_id) {
            await fetch(`${API_BASE_URL}/api/segments/${encodeURIComponent(s.segment_id)}`, { method: 'DELETE' });
          }
        }
        return true;
      } catch (error) {
        return false;
      }
    }
    try {
      const segments = await this.getSegments();
      const filtered = segments.filter(s => s.project_id !== projectId);
      localStorage.setItem(this.segmentStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== 地点情報DB (POI) =====

  /** API/local 共通: POI の polygon パースと poi_type 自動設定 */
  private normalizePoiForDisplay(poi: PoiInfo): PoiInfo {
    let updatedPoi = { ...poi };
    if (poi.polygon) {
      if (typeof poi.polygon === 'string') {
        try {
          const parsed = JSON.parse(poi.polygon);
          if (Array.isArray(parsed) && parsed.length > 0) {
            updatedPoi.polygon = parsed;
            if (!updatedPoi.poi_type || updatedPoi.poi_type !== 'polygon') updatedPoi.poi_type = 'polygon';
          }
        } catch (e) {
        }
      } else if (Array.isArray(poi.polygon) && poi.polygon.length > 0) {
        if (!updatedPoi.poi_type || updatedPoi.poi_type !== 'polygon') updatedPoi.poi_type = 'polygon';
      }
    }
    return updatedPoi;
  }
  
  async getPoiInfos(): Promise<PoiInfo[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('地点の取得に失敗しました');
        const data = await response.json();
        const pois: PoiInfo[] = Array.isArray(data) ? data : [];
        return pois.map(p => this.normalizePoiForDisplay(p));
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.poiStorageKey);
      const pois: PoiInfo[] = data ? JSON.parse(data) : [];
      return pois.map((poi: PoiInfo) => this.normalizePoiForDisplay(poi));
    } catch (error) {
      return [];
    }
  }

  async getAllPois(): Promise<PoiInfo[]> {
    return this.getPoiInfos();
  }

  async getPoisByProject(projectId: string): Promise<PoiInfo[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois/project/${encodeURIComponent(projectId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('地点の取得に失敗しました');
        const data = await response.json();
        const pois: PoiInfo[] = Array.isArray(data) ? data : [];
        return pois.map(p => this.normalizePoiForDisplay(p));
      } catch (error) {
        return [];
      }
    }
    try {
      const pois = await this.getPoiInfos();
      return pois.filter(p => p.project_id === projectId);
    } catch (error) {
      return [];
    }
  }

  async getPoisBySegment(segmentId: string): Promise<PoiInfo[]> {
    try {
      const pois = await this.getPoiInfos();
      return pois.filter(p => p.segment_id === segmentId);
    } catch (error) {
      return [];
    }
  }

  async getPoiBySegment(segmentId: string): Promise<PoiInfo[]> {
    return this.getPoisBySegment(segmentId);
  }

  async createPoi(poi: Omit<PoiInfo, 'poi_id' | 'created'>): Promise<PoiInfo> {
    const pois = await this.getPoiInfos();
    let locationId: string;
    if (poi.poi_category === 'visit_measurement') {
      const projectVisitMeasurementPois = pois.filter(p =>
        p.project_id === poi.project_id && p.poi_category === 'visit_measurement'
      );
      const maxNumber = projectVisitMeasurementPois.reduce((max, p) => {
        if (p.location_id && p.location_id.startsWith('VM-')) {
          const match = p.location_id.match(/^VM-(\d+)$/);
          if (match) return Math.max(max, parseInt(match[1], 10));
        }
        return max;
      }, 0);
      locationId = `VM-${String(maxNumber + 1).padStart(3, '0')}`;
    } else {
      if (!poi.segment_id || poi.segment_id.trim() === '') {
        throw new Error('TG地点の場合、segment_idは必須です');
      }
      const segmentPois = pois.filter(p =>
        p.segment_id === poi.segment_id && (p.poi_category === 'tg' || !p.poi_category)
      );
      const maxNumber = segmentPois.reduce((max, p) => {
        if (p.location_id && p.location_id.startsWith('TG-')) {
          const match = p.location_id.match(/^TG-[^-]+-(\d+)$/);
          if (match) return Math.max(max, parseInt(match[1], 10));
        }
        return max;
      }, 0);
      locationId = `TG-${poi.segment_id}-${String(maxNumber + 1).padStart(3, '0')}`;
    }
    let poiWithType = { ...poi };
    if (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0) {
      if (!poiWithType.poi_type || poiWithType.poi_type !== 'polygon') poiWithType.poi_type = 'polygon';
    }
    const newPoi: PoiInfo = {
      ...poiWithType,
      poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      location_id: locationId,
      created: new Date().toISOString(),
    };

    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPoi),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '地点の作成に失敗しました');
        }
        return newPoi;
      } catch (error) {
        throw error;
      }
    }
    try {
      pois.unshift(newPoi);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      return newPoi;
    } catch (error) {
      throw error;
    }
  }

  async createPoisBulk(poisData: Omit<PoiInfo, 'poi_id' | 'created'>[]): Promise<PoiInfo[]> {
    try {
      const existingPois = await this.getPoiInfos();
      
      // カテゴリごとにグループ化（来店計測地点はプロジェクト単位、TG地点はセグメント単位）
      const visitMeasurementPois: Omit<PoiInfo, 'poi_id' | 'created'>[] = [];
      const tgPoisBySegment = new Map<string, Omit<PoiInfo, 'poi_id' | 'created'>[]>();
      
      poisData.forEach(poi => {
        const category = poi.poi_category || 'tg';
        if (category === 'visit_measurement') {
          visitMeasurementPois.push(poi);
        } else {
          const segmentId = poi.segment_id || '';
          if (!tgPoisBySegment.has(segmentId)) {
            tgPoisBySegment.set(segmentId, []);
          }
          tgPoisBySegment.get(segmentId)!.push(poi);
        }
      });
      
      const newPois: PoiInfo[] = [];
      
      // 来店計測地点: プロジェクト単位で連番を割り当て
      if (visitMeasurementPois.length > 0) {
        const projectId = visitMeasurementPois[0].project_id;
        const projectVisitMeasurementPois = existingPois.filter(p => 
          p.project_id === projectId && 
          p.poi_category === 'visit_measurement'
        );
        let maxNumber = projectVisitMeasurementPois.reduce((max, p) => {
          if (p.location_id && p.location_id.startsWith('VM-')) {
            const match = p.location_id.match(/^VM-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              return Math.max(max, num);
            }
          }
          return max;
        }, 0);
        
        for (const poi of visitMeasurementPois) {
          maxNumber++;
          const locationId = `VM-${String(maxNumber).padStart(3, '0')}`;
          
          // polygonフィールドが存在する場合、poi_typeを自動設定
          let poiWithType = { ...poi };
          if (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0) {
            if (!poiWithType.poi_type || poiWithType.poi_type !== 'polygon') {
              poiWithType.poi_type = 'polygon';
            }
          }
          
          newPois.push({
            ...poiWithType,
            poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            location_id: locationId,
            created: new Date().toISOString(),
          });
        }
      }
      
      // TG地点: セグメント単位で連番を割り当て
      for (const [segmentId, segmentPoisData] of tgPoisBySegment.entries()) {
        // TG地点の場合、segment_idは必須
        if (!segmentId || segmentId.trim() === '') {
          throw new Error('TG地点の場合、segment_idは必須です');
        }
        
        // 既存の地点から最大番号を取得（同じセグメント）
        const segmentExistingPois = existingPois.filter(p => 
          p.segment_id === segmentId && 
          (p.poi_category === 'tg' || !p.poi_category)
        );
        let maxNumber = segmentExistingPois.reduce((max, p) => {
          if (p.location_id && p.location_id.startsWith('TG-')) {
            const match = p.location_id.match(/^TG-[^-]+-(\d+)$/);
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
          const locationId = `TG-${segmentId}-${String(maxNumber).padStart(3, '0')}`;
          
          // polygonフィールドが存在する場合、poi_typeを自動設定
          let poiWithType = { ...poi };
          if (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0) {
            if (!poiWithType.poi_type || poiWithType.poi_type !== 'polygon') {
              poiWithType.poi_type = 'polygon';
            }
          }
          
          newPois.push({
            ...poiWithType,
            poi_id: `POI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            location_id: locationId,
            created: new Date().toISOString(),
          });
        }
      }
      
      if (USE_API) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pois/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pois: newPois }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || response.statusText || '地点の一括登録に失敗しました');
          }
          return newPois;
        } catch (error) {
          throw error;
        }
      }
      const updatedPois = [...newPois, ...existingPois];
      localStorage.setItem(this.poiStorageKey, JSON.stringify(updatedPois));
      return newPois;
    } catch (error) {
      throw error;
    }
  }

  async createPoiInfo(poi: Omit<PoiInfo, 'created'>): Promise<PoiInfo> {
    const newPoi: PoiInfo = {
      ...poi,
      created: new Date().toISOString(),
    };
    if (USE_API && newPoi.poi_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPoi),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '地点の作成に失敗しました');
        }
        return newPoi;
      } catch (error) {
        throw error;
      }
    }
    try {
      const pois = await this.getPoiInfos();
      pois.unshift(newPoi);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      return newPoi;
    } catch (error) {
      throw error;
    }
  }

  async updatePoi(poiId: string, updates: Partial<PoiInfo>): Promise<PoiInfo | null> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(poiId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '地点の更新に失敗しました');
        }
        const pois = await this.getPoiInfos();
        return pois.find(p => p.poi_id === poiId) || null;
      } catch (error) {
        throw error;
      }
    }
    try {
      const pois = await this.getPoiInfos();
      const index = pois.findIndex(p => p.poi_id === poiId);
      if (index === -1) return null;
      pois[index] = { ...pois[index], ...updates };
      localStorage.setItem(this.poiStorageKey, JSON.stringify(pois));
      return pois[index];
    } catch (error) {
      return null;
    }
  }

  async deletePoi(poiId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(poiId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '地点の削除に失敗しました');
        }
        return true;
      } catch (error) {
        throw error;
      }
    }
    try {
      const pois = await this.getPoiInfos();
      const filteredPois = pois.filter(p => p.poi_id !== poiId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filteredPois));
      return true;
    } catch (error) {
      return false;
    }
  }

  async deletePoiBySegment(segmentId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const pois = await this.getPoisBySegment(segmentId);
        for (const p of pois) {
          if (p.poi_id) {
            await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(p.poi_id)}`, { method: 'DELETE' });
          }
        }
        return true;
      } catch (error) {
        return false;
      }
    }
    try {
      const pois = await this.getPoiInfos();
      const filtered = pois.filter(p => p.segment_id !== segmentId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      return false;
    }
  }

  async deletePoiByProject(projectId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const pois = await this.getPoisByProject(projectId);
        for (const p of pois) {
          if (p.poi_id) {
            await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(p.poi_id)}`, { method: 'DELETE' });
          }
        }
        return true;
      } catch (error) {
        return false;
      }
    }
    try {
      const pois = await this.getPoiInfos();
      const filtered = pois.filter(p => p.project_id !== projectId);
      localStorage.setItem(this.poiStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== 修正依頼 (Edit Requests) =====

  async getEditRequests(): Promise<EditRequest[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/edit-requests`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('編集依頼の取得に失敗しました');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.editRequestStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  async createEditRequest(request: EditRequest): Promise<EditRequest> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/edit-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '編集依頼の作成に失敗しました');
        }
        return request;
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getEditRequests();
      requests.unshift(request);
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(requests));
      return request;
    } catch (error) {
      throw error;
    }
  }

  async updateEditRequest(requestId: string, updates: Partial<EditRequest>): Promise<EditRequest | null> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/edit-requests/${encodeURIComponent(requestId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '編集依頼の更新に失敗しました');
        }
        const list = await this.getEditRequests();
        return list.find(r => r.request_id === requestId) || null;
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getEditRequests();
      const index = requests.findIndex(r => r.request_id === requestId);
      if (index === -1) return null;
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(requests));
      return requests[index];
    } catch (error) {
      throw error;
    }
  }

  async deleteEditRequest(requestId: string): Promise<boolean> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/edit-requests/${encodeURIComponent(requestId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '編集依頼の削除に失敗しました');
        }
        return true;
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getEditRequests();
      const filtered = requests.filter(r => r.request_id !== requestId);
      localStorage.setItem(this.editRequestStorageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===== プロジェクトメッセージ (Project Messages) =====

  private normalizeMessage(m: any): ProjectMessage {
    let rawTs = m.created_at || m.timestamp;
    // BigQuery v7 returns TIMESTAMP as {value: "..."} object
    if (rawTs && typeof rawTs === 'object' && 'value' in rawTs) {
      rawTs = rawTs.value;
    }
    const created = typeof rawTs === 'string'
      ? rawTs
      : (rawTs ? new Date(rawTs).toISOString() : new Date().toISOString());
    return {
      ...m,
      created_at: created,
    };
  }

  async getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/${encodeURIComponent(projectId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('メッセージの取得に失敗しました');
        const data = await response.json();
        const messages: ProjectMessage[] = (Array.isArray(data) ? data : []).map((m: any) => this.normalizeMessage(m));
        return messages.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      const messages: ProjectMessage[] = data ? JSON.parse(data) : [];
      return messages
        .filter(m => m.project_id === projectId)
        .sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });
    } catch (error) {
      return [];
    }
  }
  
  async getAllMessages(): Promise<ProjectMessage[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('メッセージの取得に失敗しました');
        const data = await response.json();
        return (Array.isArray(data) ? data : []).map((m: any) => this.normalizeMessage(m));
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  async sendProjectMessage(messageData: Omit<ProjectMessage, 'message_id' | 'created_at' | 'is_read'>): Promise<ProjectMessage> {
    const newMessage: ProjectMessage = {
      ...messageData,
      message_id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    if (USE_API) {
      try {
        const body = {
          ...newMessage,
          timestamp: newMessage.created_at,
        };
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'メッセージの送信に失敗しました');
        }
        return newMessage;
      } catch (error) {
        throw error;
      }
    }
    try {
      const data = localStorage.getItem(this.messageStorageKey);
      const messages: ProjectMessage[] = data ? JSON.parse(data) : [];
      messages.push(newMessage);
      localStorage.setItem(this.messageStorageKey, JSON.stringify(messages));
      return newMessage;
    } catch (error) {
      throw error;
    }
  }

  async markMessagesAsRead(projectId: string, readerRole: 'admin' | 'sales', messageIds?: string[]): Promise<void> {
    if (USE_API) {
      try {
        const toMark = (messageIds && messageIds.length > 0)
          ? messageIds
          : (await this.getProjectMessages(projectId))
              .filter(m => m.sender_role !== readerRole && !m.is_read)
              .map(m => m.message_id)
              .filter(Boolean);
        if (toMark.length === 0) return;
        const response = await fetch(`${API_BASE_URL}/api/messages/mark-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_ids: toMark }),
        });
        if (!response.ok) throw new Error('既読の更新に失敗しました');
      } catch (error) {
      }
      return;
    }
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
      }
    } catch (error) {
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
    const newHistory: ChangeHistory = {
      history_id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      segment_id: entityType === 'segment' ? entityId : undefined,
      action,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
      changes,
    };
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/change-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newHistory),
        });
        if (!response.ok) {
        }
      } catch (error) {
      }
      return;
    }
    try {
      const histories = await this.getChangeHistories();
      histories.unshift(newHistory);
      this.cleanupOldHistory();
      localStorage.setItem(this.changeHistoryStorageKey, JSON.stringify(histories));
    } catch (error) {
    }
  }

  // 変更履歴を取得（非同期）
  async getChangeHistories(projectId?: string): Promise<ChangeHistory[]> {
    if (USE_API) {
      try {
        const url = projectId
          ? `${API_BASE_URL}/api/change-history?project_id=${encodeURIComponent(projectId)}`
          : `${API_BASE_URL}/api/change-history`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('変更履歴の取得に失敗しました');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.changeHistoryStorageKey);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  // 6か月以上古い履歴を削除（localStorage のみ）
  private async cleanupOldHistory(): Promise<void> {
    if (USE_API) return;
    try {
      const histories = await this.getChangeHistories();
      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
      const filtered = histories.filter(history => new Date(history.changed_at) >= sixMonthsAgo);
      if (filtered.length !== histories.length) {
        localStorage.setItem(this.changeHistoryStorageKey, JSON.stringify(filtered));
      }
    } catch (error) {
    }
  }

  // 計測地点グループ管理
  async getVisitMeasurementGroups(projectId: string): Promise<VisitMeasurementGroup[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/visit-measurement-groups/project/${encodeURIComponent(projectId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('来店計測グループの取得に失敗しました');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.visitMeasurementGroupStorageKey);
      const groups: VisitMeasurementGroup[] = data ? JSON.parse(data) : [];
      return groups.filter(g => g.project_id === projectId);
    } catch (error) {
      return [];
    }
  }

  async createVisitMeasurementGroup(group: Omit<VisitMeasurementGroup, 'group_id' | 'created'>): Promise<VisitMeasurementGroup> {
    const newGroup: VisitMeasurementGroup = {
      ...group,
      group_id: `VMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created: new Date().toISOString(),
    };
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/visit-measurement-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newGroup),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '来店計測グループの作成に失敗しました');
        }
        return newGroup;
      } catch (error) {
        throw error;
      }
    }
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      groups.unshift(newGroup);
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(groups));
      return newGroup;
    } catch (error) {
      throw error;
    }
  }

  async updateVisitMeasurementGroup(groupId: string, updates: Partial<VisitMeasurementGroup>): Promise<VisitMeasurementGroup> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/visit-measurement-groups/${encodeURIComponent(groupId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '来店計測グループの更新に失敗しました');
        }
        const groups = await this.getVisitMeasurementGroups((updates as any).project_id || '');
        return groups.find(g => g.group_id === groupId) || { ...updates, group_id: groupId } as VisitMeasurementGroup;
      } catch (error) {
        throw error;
      }
    }
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      const index = groups.findIndex(g => g.group_id === groupId);
      if (index === -1) throw new Error(`Visit measurement group not found: ${groupId}`);
      groups[index] = { ...groups[index], ...updates };
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(groups));
      return groups[index];
    } catch (error) {
      throw error;
    }
  }

  async deleteVisitMeasurementGroup(groupId: string): Promise<void> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/visit-measurement-groups/${encodeURIComponent(groupId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '来店計測グループの削除に失敗しました');
        }
        return;
      } catch (error) {
        throw error;
      }
    }
    try {
      const groups = await this.getAllVisitMeasurementGroups();
      const filtered = groups.filter(g => g.group_id !== groupId);
      localStorage.setItem(this.visitMeasurementGroupStorageKey, JSON.stringify(filtered));
    } catch (error) {
      throw error;
    }
  }

  private async getAllVisitMeasurementGroups(): Promise<VisitMeasurementGroup[]> {
    if (USE_API) {
      try {
        const projects = await this.getProjects();
        const all: VisitMeasurementGroup[] = [];
        for (const p of projects) {
          if (p.project_id) {
            const groups = await this.getVisitMeasurementGroups(p.project_id);
            all.push(...groups);
          }
        }
        return all;
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.visitMeasurementGroupStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  // 機能リクエスト管理
  async getFeatureRequests(): Promise<FeatureRequest[]> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/feature-requests`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('機能リクエストの取得に失敗しました');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.featureRequestStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  async createFeatureRequest(request: Omit<FeatureRequest, 'request_id' | 'requested_at' | 'status'>): Promise<FeatureRequest> {
    const newRequest: FeatureRequest = {
      ...request,
      request_id: `FRQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requested_at: new Date().toISOString(),
      status: 'pending',
    };
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/feature-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRequest),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '機能リクエストの作成に失敗しました');
        }
        return newRequest;
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getFeatureRequests();
      requests.unshift(newRequest);
      localStorage.setItem(this.featureRequestStorageKey, JSON.stringify(requests));
      return newRequest;
    } catch (error) {
      throw error;
    }
  }

  async updateFeatureRequest(requestId: string, updates: Partial<FeatureRequest>): Promise<FeatureRequest> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/feature-requests/${encodeURIComponent(requestId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || '機能リクエストの更新に失敗しました');
        }
        const list = await this.getFeatureRequests();
        const updated = list.find(r => r.request_id === requestId);
        if (updated) return updated;
        throw new Error(`Feature request not found: ${requestId}`);
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getFeatureRequests();
      const index = requests.findIndex(r => r.request_id === requestId);
      if (index === -1) throw new Error(`Feature request not found: ${requestId}`);
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(this.featureRequestStorageKey, JSON.stringify(requests));
      return requests[index];
    } catch (error) {
      throw error;
    }
  }

  // レポート作成依頼
  async getReportRequests(projectId?: string, status?: string): Promise<ReportRequest[]> {
    if (USE_API) {
      try {
        const params = new URLSearchParams();
        if (projectId) params.append('project_id', projectId);
        if (status) params.append('status', status);
        const response = await fetch(`${API_BASE_URL}/api/report-requests?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('レポート作成依頼の取得に失敗しました');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }
    try {
      const data = localStorage.getItem(this.reportRequestStorageKey);
      const requests = data ? JSON.parse(data) : [];
      let filtered = requests;
      if (projectId) filtered = filtered.filter((r: ReportRequest) => r.project_id === projectId);
      if (status) filtered = filtered.filter((r: ReportRequest) => r.status === status);
      return filtered;
    } catch (error) {
      return [];
    }
  }

  async createReportRequest(request: Omit<ReportRequest, 'request_id' | 'requested_at' | 'status'>): Promise<ReportRequest> {
    const newRequest: ReportRequest = {
      ...request,
      request_id: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requested_at: new Date().toISOString(),
      status: 'pending',
    };
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/report-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRequest),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'レポート作成依頼の作成に失敗しました');
        }
        return newRequest;
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getReportRequests();
      requests.unshift(newRequest);
      localStorage.setItem(this.reportRequestStorageKey, JSON.stringify(requests));
      return newRequest;
    } catch (error) {
      throw error;
    }
  }

  async updateReportRequest(requestId: string, updates: Partial<ReportRequest>): Promise<ReportRequest> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/report-requests/${encodeURIComponent(requestId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'レポート作成依頼の更新に失敗しました');
        }
        const list = await this.getReportRequests();
        const updated = list.find(r => r.request_id === requestId);
        if (updated) return updated;
        throw new Error(`Report request not found: ${requestId}`);
      } catch (error) {
        throw error;
      }
    }
    try {
      const requests = await this.getReportRequests();
      const index = requests.findIndex(r => r.request_id === requestId);
      if (index === -1) throw new Error(`Report request not found: ${requestId}`);
      requests[index] = { ...requests[index], ...updates };
      localStorage.setItem(this.reportRequestStorageKey, JSON.stringify(requests));
      return requests[index];
    } catch (error) {
      throw error;
    }
  }

  async approveReportRequest(requestId: string, reviewedBy: string, reviewComment?: string): Promise<void> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/report-requests/${encodeURIComponent(requestId)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewed_by: reviewedBy, review_comment: reviewComment }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'レポート作成依頼の承認に失敗しました');
        }
      } catch (error) {
        throw error;
      }
    } else {
      await this.updateReportRequest(requestId, {
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment,
      });
    }
  }

  async rejectReportRequest(requestId: string, reviewedBy: string, reviewComment?: string): Promise<void> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/report-requests/${encodeURIComponent(requestId)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewed_by: reviewedBy, review_comment: reviewComment }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'レポート作成依頼の却下に失敗しました');
        }
      } catch (error) {
        throw error;
      }
    } else {
      await this.updateReportRequest(requestId, {
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment,
      });
    }
  }

  // ユーザー管理
  async getUsers(): Promise<any[]> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`ユーザー取得に失敗しました: ${response.status} ${response.statusText}`);
        }

        const users = await response.json();
        return users || [];
      } catch (error) {
        throw error;
      }
    }

    // モック実装（localStorage）
    const data = localStorage.getItem(this.userStorageKey);
    return data ? JSON.parse(data) : [];
  }

  async getUserByEmail(email: string): Promise<any | null> {
    const users = await this.getUsers();
    // メールアドレスを小文字に正規化して検索
    const normalizedEmail = email.trim().toLowerCase();
    return users.find(u => 
      u.email && u.email.trim().toLowerCase() === normalizedEmail
    ) || null;
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'sales';
    department?: string;
  }): Promise<any> {
    const users = await this.getUsers();
    const existing = users.find(u => u.email === userData.email);
    if (existing) {
      throw new Error('このメールアドレスは既に登録されています');
    }
    const newUser = {
      user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: userData.name,
      email: userData.email,
      password_hash: btoa(userData.password),
      role: userData.role,
      department: userData.department,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null
    };

    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'ユーザーの作成に失敗しました');
        }
        const { password_hash: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
      } catch (error) {
        throw error;
      }
    }
    users.push(newUser);
    localStorage.setItem(this.userStorageKey, JSON.stringify(users));
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'ユーザーの更新に失敗しました');
        }
        const users = await this.getUsers();
        const u = users.find((x: any) => x.user_id === userId);
        if (u) {
          const { password_hash: _, ...out } = u;
          return out;
        }
        return updates;
      } catch (error) {
        throw error;
      }
    }
    const users = await this.getUsers();
    const index = users.findIndex(u => u.user_id === userId);
    if (index === -1) throw new Error('ユーザーが見つかりません');
    users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(this.userStorageKey, JSON.stringify(users));
    const { password_hash: _, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
  }

  async deleteUser(userId: string): Promise<void> {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText || 'ユーザーの削除に失敗しました');
        }
        return;
      } catch (error) {
        throw error;
      }
    }
    const users = await this.getUsers();
    const filtered = users.filter(u => u.user_id !== userId);
    if (filtered.length === users.length) throw new Error('ユーザーが見つかりません');
    localStorage.setItem(this.userStorageKey, JSON.stringify(filtered));
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
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // 成功レスポンスを安全にパース
        try {
          return await response.json();
        } catch (parseError) {
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
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
          let errorDetails: any = null;
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
              errorDetails = error;
              
              // missingColumnsがある場合は詳細をログ出力
              if (error.missingColumns && Array.isArray(error.missingColumns)) {
              }
            } else {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          // エラーメッセージにmissingColumns情報を追加
          if (errorDetails?.missingColumns && errorDetails.missingColumns.length > 0) {
            errorMessage = `${errorMessage}\n\nBigQueryスキーマに以下の列が欠けています: ${errorDetails.missingColumns.join(', ')}\n\n解決方法: UPDATE_BIGQUERY_SCHEMA.mdのaddfieldコマンドで追加してください。`;
          }
          
          throw new Error(errorMessage);
        }

        // 成功レスポンスを安全にパース
        try {
          return await response.json();
        } catch (parseError) {
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
        // ネットワークエラーの場合、より分かりやすいメッセージを提供
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('バックエンドサーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
        throw error;
      }
    }

    // モック実装（localStorage）
    const requests = await this.getUserRequests();
    
    // メールアドレスを正規化（前後の空白を除去、小文字化）
    const normalizedEmail = requestData.email.trim().toLowerCase();

    // メールアドレスの重複チェック（既存ユーザー）
    const existingUser = await this.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 既に申請済みかチェック（メールアドレス）- pending または approved の申請をチェック
    const existingRequestByEmail = requests.find(r => 
      r.email && r.email.trim().toLowerCase() === normalizedEmail && (r.status === 'pending' || r.status === 'approved')
    );
    if (existingRequestByEmail) {
      throw new Error('このメールアドレスで既に申請が行われています。別のメールアドレスを使用するか、既存の申請の承認をお待ちください。');
    }

    const newRequest = {
      user_id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: requestData.name.trim(),
      email: normalizedEmail,
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
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
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
          throw new Error('サーバーからの応答を解析できませんでした');
        }
      } catch (error) {
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
  }

  // パスワードリセット機能
  async requestPasswordReset(email: string): Promise<void> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/password-reset/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          let errorMessage = 'パスワードリセット申請に失敗しました';
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
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        await response.json();
      } catch (error) {
        throw error;
      }
      return;
    }

    // モック実装（localStorage）
    const users = await this.getUsers();
    const inputEmail = email.trim().toLowerCase();
    
    // 登録されているユーザーを検索
    const user = users.find(u => 
      u.email && u.email.trim().toLowerCase() === inputEmail
    );

    if (!user) {
      // セキュリティ上の理由で、ユーザーが存在しない場合でも成功メッセージを返す
      return;
    }

    // 登録されているメールアドレスを取得（データベースに保存されている正確なメールアドレス）
    const registeredEmail = user.email ? user.email.trim().toLowerCase() : inputEmail;

    // トークンを生成（簡易実装）
    const resetToken = `RESET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24時間後

    // パスワードリセットトークンを保存（実際の実装では、別のテーブルやストレージに保存）
    const resetTokens = JSON.parse(localStorage.getItem('password_reset_tokens') || '[]');
    resetTokens.push({
      email: registeredEmail, // 登録されているメールアドレスを使用
      token: resetToken,
      expires_at: resetExpiry,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('password_reset_tokens', JSON.stringify(resetTokens));

  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // バックエンドAPIを使用する場合
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/password-reset/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, new_password: newPassword }),
        });

        if (!response.ok) {
          let errorMessage = 'パスワードリセットに失敗しました';
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
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        await response.json();
      } catch (error) {
        throw error;
      }
      return;
    }

    // モック実装（localStorage）
    const resetTokens = JSON.parse(localStorage.getItem('password_reset_tokens') || '[]');
    const resetRequest = resetTokens.find((r: any) => r.token === token);

    if (!resetRequest) {
      throw new Error('無効なリセットトークンです');
    }

    if (new Date(resetRequest.expires_at) < new Date()) {
      throw new Error('リセットトークンの有効期限が切れています');
    }

    // 登録されているメールアドレスでユーザーを検索
    const users = await this.getUsers();
    const registeredEmail = resetRequest.email.trim().toLowerCase();
    const userIndex = users.findIndex(u => 
      u.email && u.email.trim().toLowerCase() === registeredEmail
    );

    if (userIndex === -1) {
      throw new Error('ユーザーが見つかりません');
    }

    // ユーザーのパスワードを更新
    users[userIndex].password_hash = btoa(newPassword);
    users[userIndex].updated_at = new Date().toISOString();
    localStorage.setItem(this.userStorageKey, JSON.stringify(users));

    // 使用済みトークンを削除
    const updatedTokens = resetTokens.filter((r: any) => r.token !== token);
    localStorage.setItem('password_reset_tokens', JSON.stringify(updatedTokens));

  }
}

export const bigQueryService = new BigQueryService();
