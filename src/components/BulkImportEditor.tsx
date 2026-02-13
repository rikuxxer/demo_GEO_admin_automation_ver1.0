import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle, Pencil, X, Save, Calendar as CalendarIcon, Wand2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import type { ExcelProjectData, ExcelSegmentData, ExcelLocationData, ExcelParseError } from '../utils/excelParser';
import { MEDIA_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS } from '../types/schema';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BulkImportEditorProps {
  project: ExcelProjectData | null;
  segments: ExcelSegmentData[];
  locations: ExcelLocationData[];
  errors: ExcelParseError[];
  onUpdate: (data: {
    project: ExcelProjectData | null;
    segments: ExcelSegmentData[];
    locations: ExcelLocationData[];
  }) => void;
  onCancel: () => void;
}

export function BulkImportEditor({
  project,
  segments,
  locations,
  errors,
  onUpdate,
  onCancel
}: BulkImportEditorProps) {
  const [editingProject, setEditingProject] = useState<ExcelProjectData | null>(project);
  const [editingSegments, setEditingSegments] = useState<ExcelSegmentData[]>(segments);
  const [editingLocations, setEditingLocations] = useState<ExcelLocationData[]>(locations);
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState<Record<number, boolean>>({});

  // セグメントの属性と抽出期間のキーを記憶
  const segmentAttributeKey = useMemo(
    () => editingSegments.map(s => `${s.attribute}-${s.extraction_period}`).join('|'),
    [editingSegments]
  );

  // 居住者・勤務者・居住者&勤務者の場合は抽出期間を3ヶ月に固定
  useEffect(() => {
    let needsUpdate = false;
    const updated = editingSegments.map(segment => {
      if ((segment.attribute === 'resident' || segment.attribute === 'worker' || segment.attribute === 'resident_and_worker') && 
          segment.extraction_period !== '3month') {
        needsUpdate = true;
        return { ...segment, extraction_period: '3month' };
      }
      return segment;
    });
    
    // 変更が必要な場合のみ更新
    if (needsUpdate) {
      setEditingSegments(updated);
    }
  }, [segmentAttributeKey]);

  // プロジェクトエラーを取得
  const projectErrors = errors.filter(e => e.section === '②案件情報');
  const segmentErrors = errors.filter(e => e.section === '③セグメント設定');
  const locationErrors = errors.filter(e => e.section === '④地点リスト');
  const errorCounts = useMemo(() => ({
    project: projectErrors.length,
    segment: segmentErrors.length,
    location: locationErrors.length,
  }), [projectErrors.length, segmentErrors.length, locationErrors.length]);

  // エラーがある行を特定
  const getSegmentErrors = (index: number) => {
    const segment = editingSegments[index];
    return segmentErrors.filter(e => e.row === segment._rowNum);
  };

  const getLocationErrors = (index: number) => {
    const location = editingLocations[index];
    return locationErrors.filter(e => e.row === location._rowNum);
  };

  const handleAutoFixCommonIssues = () => {
    // よくある入力ゆれ・ルール違反を自動補正
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        advertiser_name: (editingProject.advertiser_name || '').trim(),
        agency_name: (editingProject.agency_name || '').trim(),
        appeal_point: (editingProject.appeal_point || '').trim(),
      });
    }

    setEditingSegments(prev => prev.map(segment => {
      const radiusRaw = String(segment.designated_radius || '').trim();
      const numMatch = radiusRaw.match(/^(\d+)$/);
      const mMatch = radiusRaw.match(/^(\d+)m$/);
      const radiusNum = numMatch ? parseInt(numMatch[1], 10) : (mMatch ? parseInt(mMatch[1], 10) : NaN);
      const normalizedRadius = Number.isNaN(radiusNum)
        ? segment.designated_radius
        : `${Math.min(10000, Math.max(0, radiusNum))}m`;

      if (segment.attribute === 'resident' || segment.attribute === 'worker' || segment.attribute === 'resident_and_worker') {
        return {
          ...segment,
          extraction_period: '3month',
          extraction_start_date: '',
          extraction_end_date: '',
          detection_count: 3,
          detection_time_start: '',
          detection_time_end: '',
          stay_time: '',
          designated_radius: normalizedRadius,
        };
      }

      const detectorCount = Math.min(15, Math.max(1, Number(segment.detection_count || 1)));
      return {
        ...segment,
        extraction_period: segment.extraction_period || '1month',
        detection_count: detectorCount,
        designated_radius: normalizedRadius,
      };
    }));

    setEditingLocations(prev => prev.map(location => ({
      ...location,
      poi_name: (location.poi_name || '').trim(),
      address: (location.address || '').trim(),
      segment_name_ref: location.segment_name_ref ? location.segment_name_ref.trim() : location.segment_name_ref,
      group_name_ref: location.group_name_ref ? location.group_name_ref.trim() : location.group_name_ref,
    })));
  };

  const handleSave = () => {
    // UNIVERSEサービスIDのバリデーション
    if (editingProject?.universe_service_id && !/^\d{5,}$/.test(editingProject.universe_service_id)) {
      alert('UNIVERSEサービスIDは半角数字のみ5桁以上で入力してください');
      return;
    }

    onUpdate({
      project: editingProject,
      segments: editingSegments,
      locations: editingLocations
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">データを修正</h3>
        <div className="flex gap-2">
          <Button onClick={handleAutoFixCommonIssues} variant="outline" size="sm">
            <Wand2 className="w-4 h-4 mr-1" />
            よくある不整合を自動補正
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            <X className="w-4 h-4 mr-1" />
            キャンセル
          </Button>
          <Button onClick={handleSave} size="sm" className="bg-[#5b5fff] hover:bg-[#4d4dff]">
            <Save className="w-4 h-4 mr-1" />
            修正を適用
          </Button>
        </div>
      </div>

      {/* エラーサマリー */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{errors.length}件のエラーがあります</p>
              <div className="text-sm flex flex-wrap gap-3">
                <span>案件: {errorCounts.project}件</span>
                <span>セグメント: {errorCounts.segment}件</span>
                <span>地点: {errorCounts.location}件</span>
              </div>
              <p className="text-sm">「よくある不整合を自動補正」後に「修正を適用」を押すと確認が楽になります。</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 案件情報編集 */}
      {editingProject && (
        <Card className={`p-6 ${projectErrors.length > 0 ? 'border-red-500 border-2' : 'border-[#5b5fff]/20'}`}>
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              {projectErrors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-[#5b5fff]" />
              )}
              案件情報
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>広告主名 ⭐</Label>
                <Input
                  value={editingProject.advertiser_name || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, advertiser_name: e.target.value })
                  }
                  className={projectErrors.some(e => e.field === '広告主名') ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>代理店名</Label>
                <Input
                  value={editingProject.agency_name || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, agency_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>訴求内容 ⭐</Label>
                <Input
                  value={editingProject.appeal_point || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, appeal_point: e.target.value })
                  }
                  className={projectErrors.some(e => e.field === '訴求内容') ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>UNIVERSEサービスID</Label>
                <Input
                  value={editingProject.universe_service_id || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, universe_service_id: e.target.value })
                  }
                  placeholder="例: 12345"
                />
              </div>
              <div>
                <Label>UNIVERSEサービス名</Label>
                <Input
                  value={editingProject.universe_service_name || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, universe_service_name: e.target.value })
                  }
                  placeholder="例: サンプルキャンペーン"
                />
              </div>
              <div>
                <Label>副担当者</Label>
                <Input
                  value={editingProject.sub_person_in_charge || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, sub_person_in_charge: e.target.value })
                  }
                  placeholder="副担当者名"
                />
              </div>
              <div>
                <Label>配信開始日 ⭐</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !editingProject.delivery_start_date ? 'text-muted-foreground' : ''
                      } ${projectErrors.some(e => e.field === '配信開始日') ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingProject.delivery_start_date ? (
                        format(new Date(editingProject.delivery_start_date), 'yyyy年MM月dd日', { locale: ja })
                      ) : (
                        <span>日付を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingProject.delivery_start_date ? new Date(editingProject.delivery_start_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEditingProject({
                            ...editingProject,
                            delivery_start_date: format(date, 'yyyy-MM-dd')
                          });
                        }
                      }}
                      locale={ja}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>配信終了日 ⭐</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !editingProject.delivery_end_date ? 'text-muted-foreground' : ''
                      } ${projectErrors.some(e => e.field === '配信終了日') ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingProject.delivery_end_date ? (
                        format(new Date(editingProject.delivery_end_date), 'yyyy年MM月dd日', { locale: ja })
                      ) : (
                        <span>日付を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingProject.delivery_end_date ? new Date(editingProject.delivery_end_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEditingProject({
                            ...editingProject,
                            delivery_end_date: format(date, 'yyyy-MM-dd')
                          });
                        }
                      }}
                      locale={ja}
                      disabled={(date) => {
                        // 配信開始日が設定されている場合、それより前の日付を無効化
                        if (editingProject.delivery_start_date) {
                          return date < new Date(editingProject.delivery_start_date);
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="col-span-2">
                <Label>備考</Label>
                <Input
                  value={editingProject.remarks || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, remarks: e.target.value })
                  }
                />
              </div>
            </div>

            {projectErrors.length > 0 && (
              <div className="text-sm text-red-600 space-y-1">
                {projectErrors.map((error, i) => (
                  <p key={i}>• {error.message}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* セグメント＋地点編集（セット表示） */}
      {editingSegments.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">セグメント＋地点 ({editingSegments.length}セグメント / {editingLocations.length}地点)</h4>
          
          <div className="space-y-4">
            {editingSegments.map((segment, segIndex) => {
              const segmentErrorsForRow = getSegmentErrors(segIndex);
              const segmentError = segmentErrorsForRow[0];
              const segmentLocations = editingLocations
                .map((loc, locIndex) => ({ ...loc, _originalIndex: locIndex }))
                .filter(loc => loc.segment_name_ref === segment.segment_name);
              
              const hasLocationErrors = segmentLocations.some(loc =>
                getLocationErrors(loc._originalIndex).length > 0
              );
              const hasSegmentErrors = segmentErrorsForRow.length > 0;

              return (
                <Card key={segIndex} className={`overflow-hidden ${hasSegmentErrors || hasLocationErrors ? 'border-red-500 border-2' : 'border-[#5b5fff]/20'}`}>
                  {/* セグメント編集エリア */}
                  <div className={`p-4 ${hasSegmentErrors ? 'bg-red-50' : 'bg-[#f8f8ff]'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {hasSegmentErrors ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-[#5b5fff]" />
                        )}
                        <span className="font-medium">セグメント {segIndex + 1}</span>
                        <span className="text-xs bg-[#e9e9ff] text-[#5b5fff] px-2 py-1 rounded border border-[#5b5fff]/20">
                          {segmentLocations.length}地点
                        </span>
                      </div>
                      {hasSegmentErrors && (
                        <span className="text-sm text-red-600">{segmentError?.message}</span>
                      )}
                    </div>
                    {hasSegmentErrors && (
                      <ul className="mb-3 text-xs text-red-700 list-disc list-inside space-y-1">
                        {segmentErrorsForRow.slice(0, 3).map((error, i) => (
                          <li key={i}>
                            {error.field ? `[${error.field}] ` : ''}{error.message}
                          </li>
                        ))}
                        {segmentErrorsForRow.length > 3 && (
                          <li>...他 {segmentErrorsForRow.length - 3} 件</li>
                        )}
                      </ul>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">セグメント名 ⭐</Label>
                          <Input
                            value={segment.segment_name || ''}
                            onChange={(e) => {
                              const updated = [...editingSegments];
                              updated[segIndex] = { ...segment, segment_name: e.target.value };
                              setEditingSegments(updated);
                            }}
                            className={`h-8 ${segmentError && segmentError.field === 'セグメント名' ? 'border-red-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">AdsアカウントID</Label>
                          <Input
                            value={segment.ads_account_id || ''}
                            onChange={(e) => {
                              const updated = [...editingSegments];
                              updated[segIndex] = { ...segment, ads_account_id: e.target.value };
                              setEditingSegments(updated);
                            }}
                            className="h-8"
                            placeholder="例: 17890"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs block mb-2">配信先 ⭐（複数選択可）</Label>
                        <div className="flex gap-4">
                          {MEDIA_OPTIONS.map((option) => {
                            const selectedMediaIds = Array.isArray(segment.media_id) ? segment.media_id : segment.media_id ? [segment.media_id] : [];
                            const isChecked = selectedMediaIds.includes(option.value);
                            
                            // TVer(CTV)は他の媒体と同時選択不可（CTV専用セグメントを作成する必要がある）
                            const hasUniverse = selectedMediaIds.includes('universe');
                            const hasTverSP = selectedMediaIds.includes('tver_sp');
                            const hasTverCTV = selectedMediaIds.includes('tver_ctv');
                            
                            let isDisabled = false;
                            if (!isChecked) {
                              // TVer(CTV)を選択しようとしている場合、UNIVERSEまたはTVer(SP)が選択されていると無効
                              if (option.value === 'tver_ctv' && (hasUniverse || hasTverSP)) {
                                isDisabled = true;
                              }
                              // UNIVERSEまたはTVer(SP)を選択しようとしている場合、TVer(CTV)が選択されていると無効
                              else if ((option.value === 'universe' || option.value === 'tver_sp') && hasTverCTV) {
                                isDisabled = true;
                              }
                            }
                            
                            return (
                              <label key={option.value} className="flex items-center gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => {
                                    const updated = [...editingSegments];
                                    let newMediaIds = [...selectedMediaIds];
                                    
                                    if (checked) {
                                      newMediaIds.push(option.value);
                                    } else {
                                      newMediaIds = newMediaIds.filter(id => id !== option.value);
                                    }
                                    
                                    updated[segIndex] = { 
                                      ...segment, 
                                      media_id: newMediaIds.length === 0 ? '' : (newMediaIds.length === 1 ? newMediaIds[0] : newMediaIds)
                                    };
                                    setEditingSegments(updated);
                                  }}
                                />
                                <span className="text-sm">{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {(() => {
                          const selectedMediaIds = Array.isArray(segment.media_id) ? segment.media_id : segment.media_id ? [segment.media_id] : [];
                          const hasUniverse = selectedMediaIds.includes('universe');
                          const hasTverSP = selectedMediaIds.includes('tver_sp');
                          const hasTverCTV = selectedMediaIds.includes('tver_ctv');
                          
                          // TVer(CTV)と他の媒体（UNIVERSE、TVer(SP)）が同時に選択されている場合は警告
                          const hasConflict = hasTverCTV && (hasUniverse || hasTverSP);
                          
                          return hasConflict && (
                            <p className="text-xs text-amber-700 mt-1">
                              ⚠️ TVer(CTV)はCTV専用セグメントを作成してください。UNIVERSEやTVer(SP)と同時に選択できません。
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <Label className="text-xs">配信範囲 ⭐</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder="0-10000"
                            value={segment.designated_radius ? String(segment.designated_radius).replace('m', '') : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                                const updated = [...editingSegments];
                                updated[segIndex] = { ...segment, designated_radius: value ? `${value}m` : '' };
                                setEditingSegments(updated);
                                
                                // 半径が50m以下の場合、警告ポップアップを表示（セグメントごとに一度だけ）
                                const radiusNum = parseInt(value);
                                if (!isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 50 && !hasShownRadiusWarning[segIndex]) {
                                  setShowRadiusWarning(true);
                                  setHasShownRadiusWarning(prev => ({ ...prev, [segIndex]: true }));
                                } else if (radiusNum > 50) {
                                  // 50mを超えた場合は警告表示フラグをリセット
                                  setHasShownRadiusWarning(prev => {
                                    const newState = { ...prev };
                                    delete newState[segIndex];
                                    return newState;
                                  });
                                }
                              }
                            }}
                            className="h-8 text-sm"
                          />
                          <span className="text-xs text-gray-500">m</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">配信期間 ⭐</Label>
                        <Select
                          value={segment.extraction_period || ''}
                          disabled={segment.attribute === 'resident' || segment.attribute === 'worker' || segment.attribute === 'resident_and_worker'}
                          onValueChange={(value) => {
                            const updated = [...editingSegments];
                            updated[segIndex] = { ...segment, extraction_period: value };
                            setEditingSegments(updated);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(segment.attribute === 'resident' || segment.attribute === 'worker' || segment.attribute === 'resident_and_worker') && (
                          <p className="text-xs text-[#5b5fff] mt-1">
                            ※ 居住者・勤務者・居住者&勤務者は直近3ヶ月固定です
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">対象者 ⭐</Label>
                        <Select
                          value={segment.attribute || ''}
                          onValueChange={(value) => {
                            const updated = [...editingSegments];
                            if (value === 'resident' || value === 'worker' || value === 'resident_and_worker') {
                              // 対象者が検知者以外の場合は、業務ルールに合わせて固定値へ自動補正
                              updated[segIndex] = {
                                ...segment,
                                attribute: value,
                                extraction_period: '3month',
                                extraction_start_date: '',
                                extraction_end_date: '',
                                detection_count: 3,
                                detection_time_start: '',
                                detection_time_end: '',
                                stay_time: '',
                              };
                            } else {
                              updated[segIndex] = {
                                ...segment,
                                attribute: value,
                                detection_count: segment.detection_count || 1,
                              };
                            }
                            setEditingSegments(updated);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTRIBUTE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">検知回数 ⭐</Label>
                        <Select
                          value={String(segment.detection_count || 1)}
                          disabled={segment.attribute !== 'detector'}
                          onValueChange={(value) => {
                            const updated = [...editingSegments];
                            updated[segIndex] = { ...segment, detection_count: Number(value) };
                            setEditingSegments(updated);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(v => (
                              <SelectItem key={v} value={String(v)}>{v}回以上</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {segment.attribute !== 'detector' && (
                          <p className="text-xs text-[#5b5fff] mt-1">※ 居住者・勤務者・居住者&勤務者は3回以上固定です</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 地点リスト編集エリア */}
                  <div className="p-4 bg-gray-50 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-muted-foreground">このセグメントの地点</p>
                      {hasLocationErrors && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          地点にエラーがあります
                        </span>
                      )}
                    </div>
                    
                    {segmentLocations.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {segmentLocations.map((location) => {
                          const locationErrorsForRow = getLocationErrors(location._originalIndex);
                          const error = locationErrorsForRow[0];
                          return (
                            <div
                              key={location._originalIndex}
                              className={`p-3 bg-white border rounded ${locationErrorsForRow.length > 0 ? 'border-red-500' : 'border-gray-200'}`}
                            >
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                <div>
                                  <Label className="text-xs">地点名 ⭐</Label>
                                  <Input
                                    value={location.poi_name || ''}
                                    onChange={(e) => {
                                      const updated = [...editingLocations];
                                      updated[location._originalIndex] = { ...location, poi_name: e.target.value };
                                      setEditingLocations(updated);
                                    }}
                                    className="h-8"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs">住所 ⭐</Label>
                                  <Input
                                    value={location.address || ''}
                                    onChange={(e) => {
                                      const updated = [...editingLocations];
                                      updated[location._originalIndex] = { ...location, address: e.target.value };
                                      setEditingLocations(updated);
                                    }}
                                    className="h-8"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <Label className="text-xs">緯度</Label>
                                    <Input
                                      type="number"
                                      step="0.000001"
                                      value={location.latitude || ''}
                                      onChange={(e) => {
                                        const updated = [...editingLocations];
                                        updated[location._originalIndex] = { 
                                          ...location, 
                                          latitude: e.target.value ? Number(e.target.value) : undefined 
                                        };
                                        setEditingLocations(updated);
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">経度</Label>
                                    <Input
                                      type="number"
                                      step="0.000001"
                                      value={location.longitude || ''}
                                      onChange={(e) => {
                                        const updated = [...editingLocations];
                                        updated[location._originalIndex] = { 
                                          ...location, 
                                          longitude: e.target.value ? Number(e.target.value) : undefined 
                                        };
                                        setEditingLocations(updated);
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                              {locationErrorsForRow.length > 0 && (
                                <ul className="text-xs text-red-600 mt-2 list-disc list-inside space-y-1">
                                  {locationErrorsForRow.slice(0, 2).map((e, i) => (
                                    <li key={i}>{e.field ? `[${e.field}] ` : ''}{e.message}</li>
                                  ))}
                                  {locationErrorsForRow.length > 2 && (
                                    <li>...他 {locationErrorsForRow.length - 2} 件</li>
                                  )}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground bg-white border border-dashed rounded">
                        このセグメントに地点が登録されていません
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
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
    </div>
  );
}
