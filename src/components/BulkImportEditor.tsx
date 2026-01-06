import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle, Pencil, X, Save, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
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

  // 居住者・勤務者の場合は抽出期間を3ヶ月に固定
  useEffect(() => {
    let needsUpdate = false;
    const updated = editingSegments.map(segment => {
      if ((segment.attribute === 'resident' || segment.attribute === 'worker') && 
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

  // エラーがある行を特定
  const getSegmentError = (index: number) => {
    const segment = editingSegments[index];
    return segmentErrors.find(e => e.row === segment._rowNum);
  };

  const getLocationError = (index: number) => {
    const location = editingLocations[index];
    return locationErrors.find(e => e.row === location._rowNum);
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
          <Button onClick={onCancel} variant="outline" size="sm">
            <X className="w-4 h-4 mr-1" />
            キャンセル
          </Button>
          <Button onClick={handleSave} size="sm" className="bg-[#5b5fff]">
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
            <div className="space-y-1">
              <p className="font-medium">{errors.length}件のエラーがあります</p>
              <p className="text-sm">下記の項目を修正してください</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 案件情報編集 */}
      {editingProject && (
        <Card className={`p-6 ${projectErrors.length > 0 ? 'border-red-500 border-2' : ''}`}>
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              {projectErrors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
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
              const segmentError = getSegmentError(segIndex);
              const segmentLocations = editingLocations
                .map((loc, locIndex) => ({ ...loc, _originalIndex: locIndex }))
                .filter(loc => loc.segment_name_ref === segment.segment_name);
              
              const hasLocationErrors = segmentLocations.some(loc => 
                getLocationError(loc._originalIndex)
              );

              return (
                <Card key={segIndex} className={`overflow-hidden ${segmentError || hasLocationErrors ? 'border-red-500 border-2' : ''}`}>
                  {/* セグメント編集エリア */}
                  <div className={`p-4 ${segmentError ? 'bg-red-50' : 'bg-gradient-to-r from-purple-50 to-blue-50'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {segmentError ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        <span className="font-medium">セグメント {segIndex + 1}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {segmentLocations.length}地点
                        </span>
                      </div>
                      {segmentError && (
                        <span className="text-sm text-red-600">{segmentError.message}</span>
                      )}
                    </div>

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
                            
                            // 同一セグメント内で、UNIVERSE、Tver(SP)、TVer(CTV)のいずれかが既に選択されている場合は無効
                            const hasUniverse = selectedMediaIds.includes('universe');
                            const hasTverSP = selectedMediaIds.includes('tver_sp');
                            const hasTverCTV = selectedMediaIds.includes('tver_ctv');
                            const hasAnyMedia = hasUniverse || hasTverSP || hasTverCTV;
                            
                            const isDisabled = isChecked ? false : hasAnyMedia;
                            
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
                          const selectedCount = [hasUniverse, hasTverSP, hasTverCTV].filter(Boolean).length;
                          
                          return selectedCount >= 2 && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ 同一セグメント内では、UNIVERSE、Tver(SP)、TVer(CTV)のいずれか1つのみ選択できます
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
                          disabled={segment.attribute === 'resident' || segment.attribute === 'worker'}
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
                        {(segment.attribute === 'resident' || segment.attribute === 'worker') && (
                          <p className="text-xs text-purple-600 mt-1">
                            ※ 居住者・勤務者は直近3ヶ月固定です
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">対象者 ⭐</Label>
                        <Select
                          value={segment.attribute || ''}
                          onValueChange={(value) => {
                            const updated = [...editingSegments];
                            updated[segIndex] = { ...segment, attribute: value };
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
                          value={String(segment.detection_count || '')}
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
                            <SelectItem value="1">1回以上</SelectItem>
                            <SelectItem value="2">2回以上</SelectItem>
                            <SelectItem value="3">3回以上</SelectItem>
                            <SelectItem value="4">4回以上</SelectItem>
                            <SelectItem value="5">5回以上</SelectItem>
                          </SelectContent>
                        </Select>
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
                          const error = getLocationError(location._originalIndex);
                          return (
                            <div
                              key={location._originalIndex}
                              className={`p-3 bg-white border rounded ${error ? 'border-red-500' : 'border-gray-200'}`}
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
                                  <Label className="text-xs">住所</Label>
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
                              {error && (
                                <p className="text-xs text-red-600 mt-2">• {error.message}</p>
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
