import { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, X, Settings, Copy, Hash, MapPinned, Navigation, Ruler } from 'lucide-react';
import { Button } from './ui/button';
import type { PoiInfo } from '../types/schema';
import { convertToPolygonWKT } from '../utils/polygonUtils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { AlertCircle } from 'lucide-react';
import { Input } from './ui/input';

interface PoiTableProps {
  pois: PoiInfo[];
  onEdit: (poi: PoiInfo) => void;
  onUpdate?: (poiId: string, updates: Partial<PoiInfo>) => Promise<void>;
  onDelete: (poiId: string) => void;
  readOnly?: boolean;
}

export function PoiTable({ pois, onEdit, onUpdate, onDelete, readOnly = false }: PoiTableProps) {
  const fixedRadiusOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PoiInfo>>({});
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);

  // デバッグ: ポリゴン指定の地点を確認
  useEffect(() => {
    const polygonPois = pois.filter(p => {
      const isPolygon = p.poi_type === 'polygon' || (p.polygon && Array.isArray(p.polygon) && p.polygon.length > 0);
      return isPolygon;
    });
    if (polygonPois.length > 0) {
      console.log('🔍 ポリゴン指定の地点:', polygonPois.map(p => ({
        poi_id: p.poi_id,
        poi_name: p.poi_name,
        poi_type: p.poi_type,
        polygon: p.polygon,
        polygon_type: typeof p.polygon,
        polygon_isArray: Array.isArray(p.polygon),
        polygon_length: Array.isArray(p.polygon) ? p.polygon.length : 'N/A',
        isPolygonPoi: p.poi_type === 'polygon' || (p.polygon && Array.isArray(p.polygon) && p.polygon.length > 0)
      })));
    }
  }, [pois]);
  
  const itemsPerPage = 20;
  const maxVisibleItems = 100; // 一度に表示する最大件数（パフォーマンス最適化）

  const totalPages = Math.ceil(pois.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // メモ化: 現在のページの地点データを計算
  const currentPois = useMemo(() => {
    return pois.slice(startIndex, endIndex);
  }, [pois, startIndex, endIndex]);
  
  // 大量データの場合の最適化: 表示する範囲を制限
  const visiblePois = useMemo(() => {
    if (pois.length <= maxVisibleItems) {
      return currentPois; 
    }
    // 大量データの場合は、現在のページのみ表示
    return currentPois;
  }, [currentPois, pois.length, maxVisibleItems]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ切り替え時に編集モードをキャンセル
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (poiId: string) => {
    // 来店計測地点の場合は削除を実行しない
    const poi = pois.find(p => p.poi_id === poiId);
    if (poi && poi.poi_category === 'visit_measurement') {
      toast.error('来店計測地点は削除できません');
      setDeleteTarget(null);
      return;
    }
    onDelete(poiId);
    setDeleteTarget(null);
  };

  const handleStartEdit = (poi: PoiInfo) => {
    // 都道府県指定やPKG指定、または更新関数がない場合は従来通りのモーダル編集
    // それ以外（manual, csv, undefinedなど）はインライン編集
    if (poi.poi_type === 'prefecture' || !onUpdate) {
      onEdit(poi);
      return;
    }
    setEditingId(poi.poi_id || null);
    setEditForm({ ...poi });
  };

  const handleSave = async () => {
    if (!editingId || !onUpdate) return;
    
    try {
      // 編集中の地点を取得
      const editingPoi = pois.find(p => p.poi_id === editingId);
      if (!editingPoi) return;
      
      // ポリゴン指定の判定
      let normalizedPolygon: number[][] | undefined = undefined;
      if (editingPoi.polygon) {
        if (Array.isArray(editingPoi.polygon)) {
          normalizedPolygon = editingPoi.polygon;
        } else if (typeof editingPoi.polygon === 'string') {
          try {
            const parsed = JSON.parse(editingPoi.polygon);
            if (Array.isArray(parsed) && parsed.length > 0) {
              normalizedPolygon = parsed;
            }
          } catch (e) {
            console.warn('Failed to parse polygon data:', e);
          }
        }
      }
      const isPolygonPoi = editingPoi.poi_type === 'polygon' || (normalizedPolygon && normalizedPolygon.length > 0);
      
      // 数値型の変換
      const latValue = editForm.latitude;
      const lngValue = editForm.longitude;
      const latStr = latValue !== undefined && latValue !== null ? String(latValue).trim() : '';
      const lngStr = lngValue !== undefined && lngValue !== null ? String(lngValue).trim() : '';
      
      const updates: Partial<PoiInfo> = {
        ...editForm,
        latitude: latStr !== '' ? Number(latValue) : undefined,
        longitude: lngStr !== '' ? Number(lngValue) : undefined,
        detection_count: editForm.detection_count ? Number(editForm.detection_count) : 1,
      };
      
      // ポリゴン指定の地点の場合、編集不可項目を元の値に戻す
      if (isPolygonPoi) {
        updates.location_id = editingPoi.location_id; // 地点IDは変更不可
        updates.address = editingPoi.address; // 住所は変更不可
        updates.designated_radius = editingPoi.designated_radius; // 半径は変更不可
        updates.latitude = editingPoi.latitude; // 緯度は変更不可
        updates.longitude = editingPoi.longitude; // 経度は変更不可
      } else {
        // 地点IDは常に変更不可
        updates.location_id = editingPoi.location_id;
      }

      await onUpdate(editingId, updates);
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Update failed:', error);
      // エラー処理は親コンポー���ント側で行われることを想定
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleInputChange = (field: keyof PoiInfo, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (pois.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-900 mb-1">地点が登録されていません</p>
        <p className="text-muted-foreground">
          {readOnly ? 'このセグメントには地点が登録されていません' : '「地点追加」ボタンから登録してください'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
        {/* スクロール可能なテーブルコンテナ */}
        <div className="overflow-y-auto overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[12%]">
                <div className="flex items-center justify-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-gray-500" />
                  <span>地点ID</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[18%]">
                <div className="flex items-center justify-center gap-1.5">
                  <MapPinned className="w-3.5 h-3.5 text-gray-500" />
                  <span>地点名/エリア</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[25%]">
                <div className="flex items-center justify-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>住所/市区町村</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[12%]">
                <div className="flex items-center justify-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-gray-500" />
                  <span>指定半径</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[18%]">
                <div className="flex items-center justify-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-gray-500" />
                  <span>緯度経度</span>
                </div>
              </th>
              {!readOnly && (
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap w-[5%]">
                  <span className="sr-only">操作</span>
                </th>
              )}
            </tr>
          </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {visiblePois.map((poi) => {
              const isEditing = editingId === poi.poi_id;
              
              // ポリゴンデータの正規化（文字列の場合はパース）
              let normalizedPolygon: number[][] | undefined = undefined;
              if (poi.polygon) {
                if (Array.isArray(poi.polygon)) {
                  normalizedPolygon = poi.polygon;
                } else if (typeof poi.polygon === 'string') {
                  try {
                    const parsed = JSON.parse(poi.polygon);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      normalizedPolygon = parsed;
                    }
                  } catch (e) {
                    console.warn('Failed to parse polygon data:', e);
                  }
                }
              }
              
              // ポリゴン指定の判定: poi_typeが'polygon'、またはpolygonフィールドが存在して配列で長さが0より大きい場合
              const isPolygonPoi = poi.poi_type === 'polygon' || (normalizedPolygon && normalizedPolygon.length > 0);
              
              // 半径指定（自由指定）の判定: poi_typeが'manual'でdesignated_radiusがある
              const isManualRadiusPoi = poi.poi_type === 'manual' && poi.designated_radius;
              
              // 半径指定（カテゴリ指定）の判定: poi_typeが'prefecture'
              const isPrefecturePoi = poi.poi_type === 'prefecture';
              
              // 行のサイズクラスを決定
              let rowSizeClass = '';
              if (isPolygonPoi) {
                rowSizeClass = 'py-6'; // ポリゴン指定: 大きめ
              } else if (isPrefecturePoi) {
                rowSizeClass = 'py-3'; // カテゴリ指定: 小さめ
              } else if (isManualRadiusPoi) {
                rowSizeClass = 'py-5'; // 自由指定: 中くらい
              } else {
                rowSizeClass = 'py-4'; // デフォルト
              }
              
              return (
                <tr key={poi.poi_id} className={`${isEditing ? "bg-blue-50/50 border-l-4 border-l-blue-500" : "hover:bg-blue-50/30 transition-colors"} ${rowSizeClass} border-l-4 border-l-transparent`}>
                  {/* 地点ID */}
                  <td className="px-4 py-3 text-center align-middle">
                    {isEditing ? (
                      <div className="flex justify-center">
                        <Input
                          value={editForm.location_id || ''}
                          onChange={(e) => handleInputChange('location_id', e.target.value)}
                          className="h-8 text-sm w-32 font-mono"
                          placeholder="地点ID"
                          disabled={true}
                          title="地点IDは自動採番のため編集できません"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {poi.location_id || '-'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 地点名 */}
                  <td className="px-4 text-center align-middle">
                    {isEditing ? (
                      <div className="flex justify-center">
                        <Input
                          value={editForm.poi_name || ''}
                          onChange={(e) => handleInputChange('poi_name', e.target.value)}
                          className="h-8 text-sm w-full max-w-[180px] font-medium"
                          placeholder="地点名"
                          maxLength={50}
                        />
                      </div>
                    ) : (
                      <div className="text-sm flex flex-col items-center gap-1.5">
                        {poi.poi_type === 'prefecture' ? (
                          <>
                            <div className="max-w-full truncate font-semibold text-gray-900">
                              {poi.prefectures && poi.prefectures.length > 0 ? poi.prefectures.join('・') : '都道府県指定'}
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              都道府県指定
                            </span>
                          </>
                        ) : isPolygonPoi ? (
                          <>
                            <div className="max-w-full truncate font-semibold text-gray-900" title={poi.poi_name || 'ポリゴン地点'}>
                              {poi.poi_name || 'ポリゴン地点'}
                            </div>
                            {normalizedPolygon && normalizedPolygon.length > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                ポリゴン ({normalizedPolygon.length}点)
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="max-w-full truncate font-semibold text-gray-900" title={poi.poi_name || '（地点名未設定）'}>
                            {poi.poi_name || <span className="text-gray-400 italic">（地点名未設定）</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 住所 */}
                  <td className="px-4 text-center align-middle">
                    {isEditing ? (
                      <div className="flex justify-center">
                        <Input
                          value={editForm.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="h-8 text-sm w-48"
                          placeholder="住所"
                          disabled={isPolygonPoi}
                          title={isPolygonPoi ? "ポリゴン指定の地点では住所は編集できません" : ""}
                        />
                      </div>
                    ) : (
                      poi.poi_type === 'prefecture' && poi.cities && poi.cities.length > 0 ? (
                        <div className="text-sm text-gray-900 flex justify-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {poi.cities.slice(0, 3).map((city, idx) => (
                              <span key={idx} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                {city}
                              </span>
                            ))}
                            {poi.cities.length > 3 && (
                              <span className="text-xs text-gray-500">
                                他{poi.cities.length - 3}件
                              </span>
                            )}
                          </div>
                        </div>
                      ) : isPolygonPoi && normalizedPolygon && normalizedPolygon.length > 0 ? (
                        <div className="text-sm text-gray-900">
                          <div className="space-y-2 text-center">
                            <div className="text-sm text-gray-600">
                              ポリゴン座標範囲:
                            </div>
                            <div className="text-sm text-gray-500 font-mono">
                              緯度: {Math.min(...normalizedPolygon.map((c: number[]) => c[0])).toFixed(6)} ～ {Math.max(...normalizedPolygon.map((c: number[]) => c[0])).toFixed(6)}
                            </div>
                            <div className="text-sm text-gray-500 font-mono">
                              経度: {Math.min(...normalizedPolygon.map((c: number[]) => c[1])).toFixed(6)} ～ {Math.max(...normalizedPolygon.map((c: number[]) => c[1])).toFixed(6)}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">POLYGON形式:</div>
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex-1 text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded break-all max-w-xs">
                                  {(() => {
                                    try {
                                      return convertToPolygonWKT(normalizedPolygon);
                                    } catch (e) {
                                      return '変換エラー';
                                    }
                                  })()}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 flex-shrink-0"
                                  onClick={async () => {
                                    try {
                                      const polygonWKT = convertToPolygonWKT(normalizedPolygon);
                                      await navigator.clipboard.writeText(polygonWKT);
                                      toast.success('POLYGON形式をクリップボードにコピーしました');
                                    } catch (e) {
                                      toast.error('コピーに失敗しました');
                                    }
                                  }}
                                  title="POLYGON形式をコピー"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {poi.address && (
                              <div className="text-sm text-gray-400 mt-1">
                                備考: {poi.address}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">{poi.address || '-'}</div>
                      )
                    )}
                  </td>

                  {/* 指定半径 */}
                  <td className="px-4 text-center align-middle">
                    {isEditing ? (
                      isPolygonPoi ? (
                        <div className="text-sm text-gray-400">指定なし</div>
                      ) : (
                        <div className="space-y-1 flex flex-col items-center">
                          <div className="flex items-start gap-2 justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-gray-500">自由入力</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  step="1"
                                  placeholder="1-1000"
                                  value={(() => {
                                    const radiusNum = parseInt(String(editForm.designated_radius || '').replace('m', ''), 10);
                                    if (!isNaN(radiusNum) && radiusNum <= 1000) {
                                      return String(radiusNum);
                                    }
                                    return '';
                                  })()}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const radiusNum = parseInt(value, 10);
                                    if (value === '' || (!isNaN(radiusNum) && radiusNum >= 1 && radiusNum <= 1000)) {
                                      handleInputChange('designated_radius', value ? `${value}m` : '');
                                      
                                      // 来店計測地点の場合は警告を表示しない
                                      const editingPoi = pois.find(p => p.poi_id === editingId);
                                      const isVisitMeasurement = editingPoi?.poi_category === 'visit_measurement';
                                      if (!isVisitMeasurement) {
                                        // 半径が50m以下の場合、警告ポップアップを表示（一度だけ）
                                        if (!isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 50 && !hasShownRadiusWarning) {
                                          setShowRadiusWarning(true);
                                          setHasShownRadiusWarning(true);
                                        } else if (!isNaN(radiusNum) && radiusNum > 50) {
                                          // 50mを超えた場合は警告表示フラグをリセット
                                          setHasShownRadiusWarning(false);
                                        }
                                      }
                                    }
                                  }}
                                  className="h-8 text-sm w-20 px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="text-xs text-gray-500">m</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-gray-500">選択</span>
                              <select
                                value={(() => {
                                  const radiusNum = parseInt(String(editForm.designated_radius || '').replace('m', ''), 10);
                                  if (!isNaN(radiusNum) && radiusNum >= 1000) {
                                    return fixedRadiusOptions.includes(radiusNum) ? String(radiusNum) : '';
                                  }
                                  return '';
                                })()}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (!value) {
                                    handleInputChange('designated_radius', '');
                                    return;
                                  }
                                  handleInputChange('designated_radius', `${value}m`);
                                }}
                                className="h-8 text-xs px-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">自由入力</option>
                                {fixedRadiusOptions.map((value) => (
                                  <option key={value} value={value}>{value}m</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {editForm.designated_radius && (() => {
                            const radiusNum = parseInt(String(editForm.designated_radius).replace('m', ''), 10);
                            if (isNaN(radiusNum)) {
                              return (
                                <p className="text-xs text-red-600 text-center">数値で入力</p>
                              );
                            }
                            if (radiusNum >= 1000 && !fixedRadiusOptions.includes(radiusNum)) {
                              return (
                                <p className="text-xs text-red-600 text-center">1000m以上は選択</p>
                              );
                            }
                            if (radiusNum < 1 || radiusNum > 10000) {
                              return (
                                <p className="text-xs text-red-600 text-center">1-1000m、または選択</p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-center">
                        {(poi.poi_type === 'prefecture' || isPolygonPoi) ? (
                          <span className="text-xs text-gray-400 italic">指定なし</span>
                        ) : (() => {
                          if (!poi.designated_radius) return <span className="text-gray-400 italic">-</span>;
                          const radiusValue = parseInt(String(poi.designated_radius).replace('m', ''));
                          if (isNaN(radiusValue)) return <span className="font-medium">{poi.designated_radius}</span>;
                          
                          // 選択可能な半径値（1000m以上）のリスト
                          const selectableRadiusValues = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];
                          const isCategorySpecified = selectableRadiusValues.includes(radiusValue);
                          
                          if (isCategorySpecified) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                {poi.designated_radius}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {poi.designated_radius}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </td>

                  {/* 緯度経度 */}
                  <td className="px-4 text-center align-middle">
                    {isEditing ? (
                      isPolygonPoi ? (
                        <div className="text-sm text-gray-400 italic">ポリゴン座標から自動計算</div>
                      ) : (
                      <div className="flex gap-2 justify-center">
                        <Input
                          value={editForm.latitude || ''}
                          onChange={(e) => handleInputChange('latitude', e.target.value)}
                          className="h-8 text-sm w-24 font-mono"
                          placeholder="緯度"
                        />
                        <Input
                          value={editForm.longitude || ''}
                          onChange={(e) => handleInputChange('longitude', e.target.value)}
                          className="h-8 text-sm w-24 font-mono"
                          placeholder="経度"
                        />
                      </div>
                      )
                    ) : (
                      <div className="text-sm text-center">
                        {isPolygonPoi && normalizedPolygon && normalizedPolygon.length > 0 ? (
                          <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                            <div className="font-medium">中心座標</div>
                            <div className="mt-0.5">{(() => {
                              const centerLat = normalizedPolygon.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / normalizedPolygon.length;
                              const centerLng = normalizedPolygon.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / normalizedPolygon.length;
                              return `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`;
                            })()}</div>
                          </div>
                        ) : poi.latitude && poi.longitude ? (
                          <div className="text-xs text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                            {poi.latitude}, {poi.longitude}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 検知回数（UI非表示） */}
                      <td className="px-2 py-3 align-middle"></td>

                  {/* アクション */}
                  {!readOnly && (
                    <td className="px-2 py-3 text-center align-middle whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="保存"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            title="キャンセル"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="w-px h-4 bg-gray-300 mx-1"></div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(poi)}
                            className="text-primary hover:text-primary/80"
                            title="詳細設定"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(poi)}
                            className="text-primary hover:text-primary/80"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {/* 来店計測地点の場合は削除ボタンを非表示 */}
                          {poi.poi_category !== 'visit_measurement' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(poi.poi_id!)}
                              className="text-red-600 hover:text-red-700"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="font-medium"
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="font-medium"
            >
              次へ
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                全 <span className="font-semibold text-gray-900">{pois.length}</span> 件中 <span className="font-semibold text-gray-900">{startIndex + 1}</span> から <span className="font-semibold text-gray-900">{Math.min(endIndex, pois.length)}</span> 件目を表示
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-l-md w-8 h-8 p-0 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 p-0 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="inline-flex items-center px-4 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-offset-0 bg-white">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 p-0 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-r-md w-8 h-8 p-0 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {!readOnly && (
        <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>地点を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。地点を完全に削除します。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50">
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                className="bg-red-600 hover:bg-red-700"
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    </>
  );
}