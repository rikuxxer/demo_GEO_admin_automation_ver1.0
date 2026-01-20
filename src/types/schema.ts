// 広告主DB
export interface Project {
  project_id: string; // 案件ID（自動採番）
  _register_datetime: string; // 登録日（自動採番）
  project_registration_started_at?: string; // 案件登録開始時点（フォームを開いた時点）
  advertiser_name: string; // 広告主法人名
  agency_name?: string; // 代理店名
  appeal_point: string; // 訴求内容
  universe_service_id?: string; // UNIVERSEサービスID
  universe_service_name?: string; // UNIVERSEサービス名
  delivery_start_date: string; // 配信開始日（DATE）
  delivery_end_date: string; // 配信終了日（DATE）
  person_in_charge: string; // 主担当者（自動採番）
  sub_person_in_charge?: string; // 副担当者
  remarks?: string; // 備考
  project_status?: string; // 案件ステータス（準備中、進行中、完了など）
}

// セグメントDB
export interface Segment {
  project_id: string; // 案件ID（自動採番）
  segment_id: string; // セグメントID（自動採番）
  segment_name?: string; // セグメント名（任意入力）
  segment_registered_at: string; // セグメント登録日時（自動採番）
  media_id: string | string[]; // 配信媒体ID（複数選択可。ただしTVer(CTV)は他と併用不可）
  location_request_status: string; // 地点依頼ステータス（未依頼、格納対応中、格納完了）営業の依頼確定によって変更
  request_confirmed?: boolean; // 連携依頼フラグ（営業が入力を確定した際にtrue）
  data_link_status: string; // データ連携依頼ステータス（連携依頼前、連携依頼済、連携済）連携依頼後は管理部の手動切り替え
  data_link_scheduled_date?: string; // 連携予定日
  data_link_request_date?: string; // データ連携依頼日（営業がデータ連携の依頼を行った日時）
  data_coordination_date?: string; // データ連携目途（格納依頼日から自動計算）
  ads_account_id?: string; // AdsアカウントID（例：17890）
  provider_segment_id?: string; // パイロット/プロバイダセグメントID（管理部の入力）営業は入力しない
  poi_id?: string; // 地点グループID（自動採番）
  segment_expire_date?: string; // セグメントの有効期限日（データ連携の完了から6ヶ月後）
  
  // セグメント共通条件（このセグメントに属する全地点に適用される）
  designated_radius?: string; // 指定半径
  extraction_period?: string; // 抽出期間
  extraction_period_type?: 'preset' | 'custom' | 'specific_dates'; // プリセット or 期間指定 or 特定日付
  extraction_start_date?: string; // 抽出開始日（期間指定の場合）
  extraction_end_date?: string; // 抽出終了日（期間指定の場合）
  extraction_dates?: string[]; // 抽出対象日付（特定日付の場合）['YYYY-MM-DD', ...]
  attribute?: 'detector' | 'resident' | 'worker'; // 検知者 | 居住者 | 勤務者
  detection_count?: number; // 検知回数（〇回以上）
  detection_time_start?: string; // 検知時間開始
  detection_time_end?: string; // 検知時間終了
  stay_time?: string; // 滞在時間
}

// 地点情報DB
export interface PoiInfo {
  project_id: string; // 案件ID（自動採番）
  segment_id: string; // セグメントID（自動採番）
  poi_id?: string; // 地点グループID（自動採番）
  
  // 地点情報登録タイプ
  poi_type?: 'manual' | 'prefecture' | 'polygon'; // 任意地点 | 都道府県・市区町村 | ポリゴン選択
  
  // 地点カテゴリ
  poi_category?: 'tg' | 'visit_measurement'; // TG地点 | 来店計測地点
  
  // 来店計測地点グループID（来店計測地点の場合のみ）
  visit_measurement_group_id?: string; // 計測地点グループID
  
  // 任意地点指定
  poi_name: string; // 地点名
  address?: string; // 住所
  
  // 都道府県・市区町村指定（複数選択可能）
  prefectures?: string[]; // 都道府県リスト
  cities?: string[]; // 市区町村リスト
  
  // 座標情報
  latitude?: number; // 緯度
  longitude?: number; // 経度
  
  // ポリゴン選択（地図上で描画したポリゴン）
  polygon?: number[][]; // ポリゴンの座標配列 [[lat, lng], [lat, lng], ...]
  
  // 注意：以下の抽出条件フィールドは後方互換性のために残していますが、
  // 新規登録時はSegmentの共通条件が適用されます。
  // 1つのセグメントに属する全地点は同じ条件を共有します。
  designated_radius?: string; // 指定半径（セグメント共通条件から継承）
  extraction_period?: string; // 抽出期間���セグメント共通条件から継承）
  extraction_period_type?: 'preset' | 'custom' | 'specific_dates'; // プリセット or 期間指定 or 特定日付（セグメント共通条件から継承）
  extraction_start_date?: string; // 抽出開始日（セグメント共通条件から継承）
  extraction_end_date?: string; // 抽出終了日（セグメント共通条件から継承）
  extraction_dates?: string[]; // 抽出対象日付（特定日付の場合、セグメント共通条件から継承）
  attribute?: 'detector' | 'resident' | 'worker' | 'resident_and_worker'; // 検知者 | 居住者 | 勤務者 | 居住者&勤務者（セグメント共通条件から継承）
  detection_time_start?: string; // 検知時間開始（セグメント共通条件から継承）
  detection_time_end?: string; // 検知時間終了（セグメント共通条件から継承）
  detection_count?: number; // 検知回数（〇回以上）（セグメント共通条件から継承）
  stay_time?: string; // 滞在時間（セグメント共通条件から継承）
  
  // その他
  category_id?: string; // 半径を変換したID
  setting_flag?: string; // 設定フラグ
  created?: string; // 地点登録日
  detail_specification_flag?: string; // 詳細指定フラグ
  location_id?: string; // 地点ID
}

// 計測地点グループDB
export interface VisitMeasurementGroup {
  project_id: string; // 案件ID
  group_id: string; // グループID（自動採番）
  group_name: string; // グループ名
  // 抽出条件（グループ内の全地点で統一）
  designated_radius?: string; // 指定半径
  extraction_period?: string; // 抽出期間
  extraction_period_type?: 'preset' | 'custom' | 'specific_dates'; // プリセット or 期間指定 or 特定日付
  extraction_start_date?: string; // 抽出開始日
  extraction_end_date?: string; // 抽出終了日
  extraction_dates?: string[]; // 抽出対象日付（特定日付の場合）
  attribute?: 'detector' | 'resident' | 'worker' | 'resident_and_worker'; // 属性
  detection_count?: number; // 検知回数（〇回以上）
  detection_time_start?: string; // 検知時間開始
  detection_time_end?: string; // 検知時間終了
  stay_time?: string; // 滞在時間
  created?: string; // 作成日時
}

// 地点依頼ステータスの選択肢
export const LOCATION_REQUEST_STATUS_OPTIONS = [
  { value: 'not_requested', label: '未依頼' },
  { value: 'storing', label: '格納対応中' },
  { value: 'completed', label: '格納完了' },
] as const;

// デ��タ連携ステータスの選択肢
export const DATA_LINK_STATUS_OPTIONS = [
  { value: 'before_request', label: '連携依頼前（アカウントIDの記載済み）' },
  { value: 'requested', label: '連携依頼済（連携対応中）' },
  { value: 'linked', label: '連携済' },
] as const;

// 配信媒体の選択肢
export const MEDIA_OPTIONS = [
  { value: 'universe', label: 'UNIVERSE' },
  { value: 'tver_sp', label: 'TVer(SP)' },
  { value: 'tver_ctv', label: 'TVer(CTV)' },
] as const;

// 案件ステータスの選択肢
export const PROJECT_STATUS_OPTIONS = [
  { value: 'draft', label: '準備中' },
  { value: 'in_progress', label: '進行中' },
  { value: 'pending', label: '保留' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

// 地点タイプの選択肢
export const POI_TYPE_OPTIONS = [
  { value: 'manual', label: '任意地点指定' },
  { value: 'prefecture', label: '都道府県・市区町村指定' },
  { value: 'polygon', label: 'ポリゴン選択（地図上で描画）' },
] as const;

// 属性の選択肢
export const ATTRIBUTE_OPTIONS = [
  { value: 'detector', label: '検知者' },
  { value: 'resident', label: '居住者' },
  { value: 'worker', label: '勤務者' },
  { value: 'resident_and_worker', label: '居住者&勤務者' },
] as const;

// 指定半径の選択肢
export const RADIUS_OPTIONS = [
  { value: '50m', label: '50m' },
  { value: '100m', label: '100m' },
  { value: '150m', label: '150m' },
  { value: '200m', label: '200m' },
  { value: '250m', label: '250m' },
  { value: '300m', label: '300m' },
  { value: '350m', label: '350m' },
  { value: '400m', label: '400m' },
  { value: '450m', label: '450m' },
  { value: '500m', label: '500m' },
  { value: '550m', label: '550m' },
  { value: '600m', label: '600m' },
  { value: '650m', label: '650m' },
  { value: '700m', label: '700m' },
  { value: '750m', label: '750m' },
  { value: '800m', label: '800m' },
  { value: '850m', label: '850m' },
  { value: '900m', label: '900m' },
  { value: '950m', label: '950m' },
  { value: '1000m', label: '1000m' },
  { value: '1500m', label: '1500m' },
  { value: '2000m', label: '2000m' },
  { value: '2500m', label: '2500m' },
  { value: '3000m', label: '3000m' },
  { value: '3500m', label: '3500m' },
  { value: '4000m', label: '4000m' },
  { value: '4500m', label: '4500m' },
  { value: '5000m', label: '5000m' },
  { value: '6000m', label: '6000m' },
  { value: '7000m', label: '7000m' },
  { value: '8000m', label: '8000m' },
  { value: '9000m', label: '9000m' },
  { value: '10000m', label: '10000m' },
] as const;

// 抽出期間プリセットの選択肢
export const EXTRACTION_PERIOD_PRESET_OPTIONS = [
  { value: '1month', label: '直近1ヶ月' },
  { value: '2month', label: '直近2ヶ月' },
  { value: '3month', label: '直近3ヶ月' },
  { value: '4month', label: '直近4ヶ月' },
  { value: '5month', label: '直近5ヶ月' },
  { value: '6month', label: '直近6ヶ月' },
] as const;

// 滞在時間の選択肢
export const STAY_TIME_OPTIONS = [
  { value: '3min', label: '3分以上' },
  { value: '5min', label: '5分以上' },
  { value: '10min', label: '10分以上' },
  { value: '15min', label: '15分以上' },
  { value: '30min', label: '30分以上' },
] as const;

// 修正依頼（Edit Request）
export interface EditRequest {
  request_id: string; // 修正依頼ID（自動採番）REQ_YYYYMMDD_XXXXX
  request_type: 'project' | 'segment' | 'poi'; // 依頼種別
  target_id: string; // 修正対象のID（project_id / segment_id / poi_id）
  project_id: string; // 案件ID（検索用）
  segment_id?: string; // セグメントID（segmentまたはpoiの場合のみ）
  requested_by: string; // 依頼者（営業のuser_id）
  requested_at: string; // 依頼日時（ISO 8601形式）
  request_reason: string; // 修正理由
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'; // ステータス
  changes: Record<string, { before: any; after: any }>; // 変更内容（変更前後の値）
  reviewed_by?: string; // 承認/却下した管理者のuser_id
  reviewed_at?: string; // 承認/却下日時（ISO 8601形式）
  review_comment?: string; // 承認/却下時のコメント（却下理由など）
}

// 修正依頼ステータスの選択肢
export const EDIT_REQUEST_STATUS_OPTIONS = [
  { value: 'pending', label: '承認待ち', color: 'yellow' },
  { value: 'approved', label: '承認済み', color: 'green' },
  { value: 'rejected', label: '却下', color: 'red' },
  { value: 'withdrawn', label: '取り下げ', color: 'gray' },
] as const;

// 変更履歴（Change History）
export interface ChangeHistory {
  history_id: string; // 履歴ID（自動採番）HIS_YYYYMMDD_XXXXX
  entity_type: 'project' | 'segment' | 'poi'; // エンティティ種別
  entity_id: string; // エンティティID（project_id / segment_id / poi_id）
  project_id: string; // 案件ID（検索用）
  segment_id?: string; // セグメントID（segmentまたはpoiの場合のみ）
  action: 'create' | 'update' | 'delete'; // 操作種別
  changed_by: string; // 変更者（user_id）
  changed_at: string; // 変更日時（ISO 8601形式）
  changes?: Record<string, { before: any; after: any }>; // 変更内容（updateの場合のみ）
  deleted_data?: any; // 削除されたデータ（deleteの場合のみ）
}

// 修正依頼種別の選択肢
export const EDIT_REQUEST_TYPE_OPTIONS = [
  { value: 'project', label: '案件' },
  { value: 'segment', label: 'セグメント' },
  { value: 'poi', label: '地点' },
] as const;

// 機能リクエスト（Feature Request）
export interface FeatureRequest {
  request_id: string; // リクエストID（自動採番）FRQ-YYYYMMDD-XXXXX
  requested_by: string; // 依頼者（営業のuser_id）
  requested_by_name: string; // 依頼者名
  requested_at: string; // 依頼日時（ISO 8601形式）
  title: string; // リクエストタイトル
  description: string; // リクエスト詳細説明
  category: 'new_feature' | 'improvement' | 'bug_fix' | 'other'; // カテゴリ
  priority: 'low' | 'medium' | 'high'; // 優先度
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'implemented'; // ステータス
  reviewed_by?: string; // レビューした管理者のuser_id
  reviewed_at?: string; // レビュー日時（ISO 8601形式）
  review_comment?: string; // レビューコメント
  implemented_at?: string; // 実装日時（ISO 8601形式）
}

// 機能リクエストカテゴリの選択肢
export const FEATURE_REQUEST_CATEGORY_OPTIONS = [
  { value: 'new_feature', label: '新機能' },
  { value: 'improvement', label: '改善' },
  { value: 'bug_fix', label: 'バグ修正' },
  { value: 'other', label: 'その他' },
] as const;

// 機能リクエスト優先度の選択肢
export const FEATURE_REQUEST_PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
] as const;

// 機能リクエストステータスの選択肢
export const FEATURE_REQUEST_STATUS_OPTIONS = [
  { value: 'pending', label: '未確認', color: 'gray' },
  { value: 'under_review', label: '検討中', color: 'blue' },
  { value: 'approved', label: '承認', color: 'green' },
  { value: 'rejected', label: '却下', color: 'red' },
  { value: 'implemented', label: '実装済み', color: 'purple' },
] as const;

// プロジェクト内メッセージ（管理部⇔営業の連絡）
export interface ProjectMessage {
  message_id: string;
  project_id: string;
  sender_id: string; // 送信者のUser ID (email)
  sender_name: string; // 送信者名
  sender_role: 'admin' | 'sales'; // 送信者の役割
  content: string; // メッセージ本文
  created_at: string; // 送信日時
  is_read: boolean; // 既読フラグ
  message_type: 'inquiry' | 'reply' | 'system'; // 種類
}
