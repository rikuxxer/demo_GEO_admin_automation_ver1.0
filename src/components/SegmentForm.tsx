import { useState, useEffect, useCallback, startTransition } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { X, AlertCircle, Settings, Target, Clock, Calendar, Users } from 'lucide-react';
import { Segment, MEDIA_OPTIONS, DATA_LINK_STATUS_OPTIONS, LOCATION_REQUEST_STATUS_OPTIONS, PoiInfo, RADIUS_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { SegmentFormCommonConditions } from './SegmentFormCommonConditions';
import { validateSegment, validateMediaSelection, logValidationDebug } from '../utils/validation';

interface SegmentFormProps {
  projectId: string;
  segment?: Segment | null;
  existingSegments?: Segment[];
  pois?: PoiInfo[];
  onSubmit: (segment: Partial<Segment>, copyPoisFromSegmentId?: string) => void;
  onCancel: () => void;
}

export function SegmentForm({ projectId, segment, existingSegments = [], pois = [], onSubmit, onCancel }: SegmentFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // このセグメントの地点数を取得
  const poiCount = segment ? pois.filter(poi => poi.segment_id === segment.segment_id).length : 0;
  
  // 格納依頼済みかチェック（地点データの編集不可）
  const isLocationLocked = segment && segment.location_request_status !== 'not_requested';
  
  // データ抽出依頼済みかチェック（営業はアカウントID追記のみ可能）
  const isDataExtractionRequested = segment && segment.data_link_status !== 'before_request';
  
  // アカウントIDが既に設定されているかチェック（追記と修正を区別）
  const hasExistingAccountId = segment?.ads_account_id && segment.ads_account_id.trim() !== '';
  
  // 営業ユーザーがアカウントIDを編集可能かチェック（データ抽出依頼後も編集可能）
  const canEditAccountId = true; // 常にAdsアカウントIDは編集可能
  
  // media_idを配列として初期化
  const initialMediaIds = (() => {
    if (!segment?.media_id) return [];
    if (Array.isArray(segment.media_id)) return segment.media_id;
    return [segment.media_id];
  })();
  
  const [formData, setFormData] = useState<Partial<Segment>>({
    project_id: projectId,
    segment_name: segment?.segment_name || '',
    media_id: initialMediaIds,
    location_request_status: segment?.location_request_status || 'not_requested',
    request_confirmed: segment?.request_confirmed || false,
    ads_account_id: segment?.ads_account_id || '',
    provider_segment_id: segment?.provider_segment_id || '',
    data_link_status: segment?.data_link_status || 'before_request',
    data_link_scheduled_date: segment?.data_link_scheduled_date || '',
    // 共通条件
    designated_radius: segment?.designated_radius || '',
    extraction_period: segment?.extraction_period || '1month',
    extraction_period_type: segment?.extraction_period_type || 'custom',
    extraction_start_date: segment?.extraction_start_date || '',
    extraction_end_date: segment?.extraction_end_date || '',
    extraction_dates: segment?.extraction_dates || [],
    attribute: segment?.attribute || 'detector',
    detection_count: segment?.detection_count || 1,
    detection_time_start: segment?.detection_time_start || '',
    detection_time_end: segment?.detection_time_end || '',
    stay_time: segment?.stay_time || '',
  });

  // 既存セグメントから地点をコピーする場合のセグメントID
  const [copyFromSegmentId, setCopyFromSegmentId] = useState<string>('');

  // 居住者・勤務者・居住者&勤務者の場合は抽出期間を3ヶ月に固定（プリセットを使用）
  // 既に同じ値のときは setFormData しないことで不要な再レンダー・フリーズを防止
  useEffect(() => {
    if (formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') {
      setFormData(prev => {
        if (prev.extraction_period === '3month' && prev.extraction_period_type === 'preset' && (!prev.extraction_dates || prev.extraction_dates.length === 0)) {
          return prev;
        }
        return {
          ...prev,
          extraction_period: '3month',
          extraction_period_type: 'preset',
          extraction_dates: [],
        };
      });
    }
  }, [formData.attribute]);

  const selectedMediaIds = Array.isArray(formData.media_id) ? formData.media_id : [];

  // 開発環境でのバリデーションデバッグ
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 配信媒体のバリデーション
      const mediaValidation = validateMediaSelection(
        selectedMediaIds,
        existingSegments,
        segment?.segment_id
      );
      
      // セグメント全体のバリデーション
      const segmentValidation = validateSegment(formData, existingSegments, poiCount);
      
      logValidationDebug('SegmentForm', {
        formData,
        selectedMediaIds,
        existingSegments: existingSegments.length,
        poiCount,
      }, {
        media: mediaValidation,
        segment: segmentValidation,
      });
    }
  }, [selectedMediaIds, formData.request_confirmed, formData.ads_account_id, formData.data_link_scheduled_date]);

  // このセグメント以外の既存セグメントを取得
  const otherSegments = existingSegments.filter(s => s.segment_id !== segment?.segment_id);
  
  // 既存セグメントの全媒体を取得（空文字列やnullを除外）
  const otherMediaIds = otherSegments.flatMap(s => {
    if (!s.media_id) return [];
    const ids = Array.isArray(s.media_id) ? s.media_id : [s.media_id];
    return ids.filter(id => id && id.trim() !== '');
  });
  
  // 選択された媒体が競合するかチェック（同一セグメント内のみ）
  const hasMediaConflict = () => {
    // TVer(CTV)と他の媒体（UNIVERSE、Tver(SP)）が同時に選択されている場合は競合
    const hasUniverse = selectedMediaIds.includes('universe');
    const hasTverSP = selectedMediaIds.includes('tver_sp');
    const hasTverCTV = selectedMediaIds.includes('tver_ctv');
    
    // TVer(CTV)が選択されている場合、UNIVERSEまたはTVer(SP)が選択されていると競合
    if (hasTverCTV && (hasUniverse || hasTverSP)) {
      return true;
    }
    
    // UNIVERSEとTVer(SP)の同時選択は許可（競合なし）
    return false;
  };
  
  const mediaConflict = hasMediaConflict();

  // この案件の他のセグメントにTVer(CTV)が登録されているかチェック（管理部向け）
  const hasTverCTV = existingSegments.some(s => {
    if (s.segment_id === segment?.segment_id) return false; // 現在編集中のセグメントは除外
    const mediaIds = Array.isArray(s.media_id) ? s.media_id : s.media_id ? [s.media_id] : [];
    return mediaIds.includes('tver_ctv');
  });

  // この案件の他のセグメントにUNIVERSEまたはTVer(SP)が登録されているかチェック（管理部向け）
  const hasOtherMedia = existingSegments.some(s => {
    if (s.segment_id === segment?.segment_id) return false; // 現在編集中のセグメントは除外
    const mediaIds = Array.isArray(s.media_id) ? s.media_id : s.media_id ? [s.media_id] : [];
    return mediaIds.includes('universe') || mediaIds.includes('tver_sp');
  });
  
  // チェックボックスの変更ハンドラ
  const handleMediaToggle = (mediaValue: string) => {
    const currentIds = selectedMediaIds;
    const newIds = currentIds.includes(mediaValue)
      ? currentIds.filter(id => id !== mediaValue)
      : [...currentIds, mediaValue];
    
    setFormData(prev => ({ ...prev, media_id: newIds }));
  };
  
  // 媒体が選択可能かチェック（同一セグメント内のみチェック）
  const isMediaDisabled = (mediaValue: string) => {
    // 既に選択されている媒体は常に選択可能（チェックを外せるように）
    if (selectedMediaIds.includes(mediaValue)) {
      return false;
    }
    
    // TVer(CTV)は他の媒体と同時選択不可（CTV専用セグメントを作成する必要がある）
    if (mediaValue === 'tver_ctv') {
      const hasUniverse = selectedMediaIds.includes('universe');
      const hasTverSP = selectedMediaIds.includes('tver_sp');
      if (hasUniverse || hasTverSP) {
        return true;
      }
    }
    
    // UNIVERSEまたはTVer(SP)が選択されている場合、TVer(CTV)は選択不可
    if (mediaValue === 'universe' || mediaValue === 'tver_sp') {
      const hasTverCTV = selectedMediaIds.includes('tver_ctv');
      if (hasTverCTV) {
        return true;
      }
    }
    
    // UNIVERSEとTVer(SP)は複数選択可能
    return false;
  };

  const handleChange = useCallback((field: string, value: any) => {
    if (field === 'extraction_period_type' || field === 'extraction_period' || field === 'extraction_dates' || field === 'extraction_start_date' || field === 'extraction_end_date') {
      startTransition(() => setFormData(prev => ({ ...prev, [field]: value })));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMediaIds.length || !formData.data_link_status || !formData.location_request_status) {
      alert('必須項目を入力してください');
      return;
    }

    // 連携依頼確定時のバリデーション
    if (formData.request_confirmed) {
      // 地点数チェック
      if (poiCount === 0) {
        alert('連携依頼を確定するには、少なくとも1件の地点を登録してください。');
        return;
      }
      
      // AdsアカウントIDチェック
      if (!formData.ads_account_id || formData.ads_account_id.trim() === '') {
        alert('連携依頼を確定するには、AdsアカウントIDを入力してください。');
        return;
      }
    }

    // データ連携が完了した場合、有効期限を6ヶ月後に設定
    let updatedFormData = { ...formData };
    if (formData.data_link_status === 'linked' && !segment?.segment_expire_date) {
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + 6);
      updatedFormData.segment_expire_date = expireDate.toISOString().split('T')[0];
    }

    // 管理部が編集する場合は、request_confirmedを変更しない（営業が設定した値を保持）
    if (isAdmin && segment) {
      updatedFormData.request_confirmed = segment.request_confirmed;
    } else {
      // 営業が編集する場合のみ、連携依頼フラグの処理を実行
      // 連携依頼フラグがONの場合、自動的にステータスを連携依頼済みに変更
      if (updatedFormData.request_confirmed && updatedFormData.data_link_status === 'before_request') {
        updatedFormData.data_link_status = 'requested';
      }

      // データ連携依頼日を自動設定（連携依頼済に変更した場合、または連携依頼フラグがONの場合）
      if ((updatedFormData.data_link_status === 'requested' || updatedFormData.request_confirmed) && !segment?.data_link_request_date) {
        updatedFormData.data_link_request_date = new Date().toISOString();
      }
    }

    // 既存セグメントから地点をコピーする場合、セグメントIDを渡す
    onSubmit(updatedFormData, copyFromSegmentId || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl">
            {segment ? 'セグメント編集' : '新規セグメント登録'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 営業向け簡略表示 */}
          {!isAdmin && (
            <>
              {/* 格納依頼済みの警告 */}
              {isLocationLocked && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">地点格納依頼済み</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        セグメント名と配信媒体の変更はできません。AdsアカウントIDと連携依頼の設定のみ変更可能です。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* セグメント名 */}
              <div>
                <Label htmlFor="segment_name" className="block mb-2">
                  セグメント名
                </Label>
                <Input
                  id="segment_name"
                  type="text"
                  value={formData.segment_name}
                  onChange={(e) => handleChange('segment_name', e.target.value)}
                  placeholder="例: 東京都内店舗訪問者"
                  className="w-full"
                  disabled={isLocationLocked}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {isLocationLocked 
                    ? '※ 格納依頼後はセグメント名の変更ができません' 
                    : '※ 任意入力。セグメントを識別しやすい名前を付けてください'}
                </p>
              </div>

              {/* 配信媒体 */}
              <div>
                <Label className="block mb-3">
                  配信媒体 <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-3">
                  {MEDIA_OPTIONS.map(option => {
                    const isChecked = selectedMediaIds.includes(option.value);
                    const isDisabled = isMediaDisabled(option.value) || isLocationLocked;
                    
                    return (
                      <div key={option.value} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            id={`media_${option.value}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleMediaToggle(option.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="ml-3">
                          <label
                            htmlFor={`media_${option.value}`}
                            className={`text-sm ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                          >
                            {option.label}
                          </label>
                          {option.value === 'tver_ctv' && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              ※ CTV専用セグメントを作成してください
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedMediaIds.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    少なくとも1つの配信媒体を選択してください
                  </p>
                )}
                
              </div>

              {/* AdsアカウントID */}
              <div>
                <Label htmlFor="ads_account_id" className="block mb-2">
                  AdsアカウントID
                </Label>
                <Input
                  id="ads_account_id"
                  type="text"
                  value={formData.ads_account_id}
                  onChange={(e) => handleChange('ads_account_id', e.target.value)}
                  placeholder="例: 17890"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ※ 後から入力することも可能です
                </p>
              </div>

              {/* 連携依頼 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="request_confirmed"
                    checked={formData.request_confirmed || false}
                    onChange={(e) => handleChange('request_confirmed', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="request_confirmed" className="cursor-pointer block">
                      <span className="text-sm">連携依頼を確定する</span>
                      <p className="text-xs text-gray-600 mt-1">
                        チェックすると、管理部に連携依頼が送信されます。地点情報の入力が完了したら、このチェックを入れてください。
                      </p>
                    </label>
                  </div>
                </div>
                
                {/* バリデーションステータス */}
                <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2 text-xs">
                    {poiCount > 0 ? (
                      <>
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">地点登録済み（{poiCount}件）</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-600">地点が登録されていません</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {formData.ads_account_id && formData.ads_account_id.trim() !== '' ? (
                      <>
                        <span className="text-green-600">✓</span>
                        <span className="text-gray-700">AdsアカウントID: {formData.ads_account_id}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-600">AdsアカウントIDが未入力です</span>
                      </>
                    )}
                  </div>
                  
                  {(poiCount === 0 || !formData.ads_account_id || formData.ads_account_id.trim() === '') && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      連携依頼を確定するには、上記の条件を満たす必要があります
                    </div>
                  )}
                </div>
              </div>

              {/* 既存セグメントから地点をコピー（新規作成時のみ） */}
              {!segment && otherSegments.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <Label className="block mb-2 text-sm font-medium">
                    既存セグメントから地点をコピー（任意）
                  </Label>
                  <select
                    value={copyFromSegmentId}
                    onChange={(e) => {
                      setCopyFromSegmentId(e.target.value);
                      // 選択したセグメントの条件をコピー
                      if (e.target.value) {
                        const sourceSegment = otherSegments.find(s => s.segment_id === e.target.value);
                        if (sourceSegment) {
                          setFormData(prev => ({
                            ...prev,
                            designated_radius: sourceSegment.designated_radius || prev.designated_radius,
                            extraction_period: sourceSegment.extraction_period || prev.extraction_period,
                            extraction_period_type: sourceSegment.extraction_period_type || prev.extraction_period_type,
                            extraction_start_date: sourceSegment.extraction_start_date || prev.extraction_start_date,
                            extraction_end_date: sourceSegment.extraction_end_date || prev.extraction_end_date,
                            extraction_dates: sourceSegment.extraction_dates || prev.extraction_dates || [],
                            attribute: sourceSegment.attribute || prev.attribute,
                            detection_count: sourceSegment.detection_count || prev.detection_count,
                            detection_time_start: sourceSegment.detection_time_start || prev.detection_time_start,
                            detection_time_end: sourceSegment.detection_time_end || prev.detection_time_end,
                            stay_time: sourceSegment.stay_time || prev.stay_time,
                          }));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">コピーしない</option>
                    {otherSegments.map(s => {
                      const segmentPois = pois.filter(p => p.segment_id === s.segment_id);
                      const mediaIds = Array.isArray(s.media_id) ? s.media_id : s.media_id ? [s.media_id] : [];
                      const mediaLabel = mediaIds.map(id => {
                        const option = MEDIA_OPTIONS.find(opt => opt.value === id);
                        return option ? option.label : id;
                      }).join(', ');
                      return (
                        <option key={s.segment_id} value={s.segment_id}>
                          {s.segment_name || `セグメント ${s.segment_id}`} ({mediaLabel}) - {segmentPois.length}件の地点
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-xs text-gray-600">
                    既存セグメントを選択すると、そのセグメントの地点情報と抽出条件が新しいセグメントにコピーされます。
                  </p>
                  {copyFromSegmentId && (
                    <div className="mt-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-800">
                      ✓ 選択したセグメントの抽出条件を適用しました
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 管理部向け詳細表示 */}
          {isAdmin && (
            <>
              {/* 格納依頼済みの警告 */}
              {isLocationLocked && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">地点格納依頼済み</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        セグメント名と配信媒体の変更はできません。その他の項目は編集可能です。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* セグメント名 */}
              <div>
                <Label htmlFor="segment_name" className="block mb-2">
                  セグメント名
                </Label>
                <Input
                  id="segment_name"
                  type="text"
                  value={formData.segment_name}
                  onChange={(e) => handleChange('segment_name', e.target.value)}
                  placeholder="例: 東京都内店舗訪問者"
                  className="w-full"
                  disabled={isLocationLocked}
                />
              </div>

              {/* 配信媒体 */}
              <div>
                <Label className="block mb-3">
                  配信媒体 <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-3">
                  {MEDIA_OPTIONS.map(option => {
                    const isChecked = selectedMediaIds.includes(option.value);
                    const isDisabled = isMediaDisabled(option.value) || isLocationLocked;
                    
                    return (
                      <div key={option.value} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            id={`media_${option.value}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleMediaToggle(option.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="ml-3">
                          <label
                            htmlFor={`media_${option.value}`}
                            className={`text-sm ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                          >
                            {option.label}
                          </label>
                          {option.value === 'tver_ctv' && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              ※ CTV専用セグメントを作成してください
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedMediaIds.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    少なくとも1つの配信媒体を選択してください
                  </p>
                )}
                
                {mediaConflict && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">⚠️</span>
                      <span>
                        <strong>選択できません：</strong>
                        {selectedMediaIds.includes('tver_ctv') && selectedMediaIds.some(id => id !== 'tver_ctv') ? (
                          <span>TVer(CTV)はCTV専用セグメントを作成してください。</span>
                        ) : selectedMediaIds.includes('tver_ctv') && hasOtherMedia ? (
                          <span>この案件には既に他の配信媒体（UNIVERSE、TVer(SP)）が登録されています。TVer(CTV)はCTV専用セグメントを作成してください。</span>
                        ) : selectedMediaIds.some(id => id !== 'tver_ctv') && hasTverCTV ? (
                          <span>この案件には既にTVer(CTV)が登録されています。TVer(CTV)はCTV専用セグメントを作成してください。</span>
                        ) : null}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* AdsアカウントID */}
              <div>
                <Label htmlFor="ads_account_id" className="block mb-2">
                  AdsアカウントID
                </Label>
                <Input
                  id="ads_account_id"
                  type="text"
                  value={formData.ads_account_id}
                  onChange={(e) => handleChange('ads_account_id', e.target.value)}
                  placeholder="例: 17890"
                  className="w-full"
                />
              </div>

              {/* パイロット/プロバイダセグメントID */}
              <div>
                <Label htmlFor="provider_segment_id" className="block mb-2">
                  パイロット/プロバイダセグメントID
                </Label>
                <Input
                  id="provider_segment_id"
                  type="text"
                  value={formData.provider_segment_id}
                  onChange={(e) => handleChange('provider_segment_id', e.target.value)}
                  placeholder="例：12340など"
                  className="w-full"
                />
              </div>

              {/* データ連携依頼ステータス */}
              <div>
                <Label htmlFor="data_link_status" className="block mb-2">
                  データ連携依頼ステータス <span className="text-red-500">*</span>
                </Label>
                <select
                  id="data_link_status"
                  value={formData.data_link_status}
                  onChange={(e) => handleChange('data_link_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {DATA_LINK_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              {segment ? '更新する' : '登録する'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}