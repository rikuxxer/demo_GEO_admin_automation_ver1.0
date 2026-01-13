import { useState, useEffect } from 'react';
import { Edit, Trash2, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, X, Settings, Copy } from 'lucide-react';
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

  const totalPages = Math.ceil(pois.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPois = pois.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ切り替え時に編集モードをキャンセル
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (poiId: string) => {
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
      // 数値型の変換
      const latValue = editForm.latitude;
      const lngValue = editForm.longitude;
      const latStr = latValue !== undefined && latValue !== null ? String(latValue).trim() : '';
      const lngStr = lngValue !== undefined && lngValue !== null ? String(lngValue).trim() : '';
      const updates = {
        ...editForm,
        latitude: latStr !== '' ? Number(latValue) : undefined,
        longitude: lngStr !== '' ? Number(lngValue) : undefined,
        detection_count: editForm.detection_count ? Number(editForm.detection_count) : 1,
      };

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[10%]">地点ID</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[20%]">地点名/エリア</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[25%]">住所/市区町村</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[10%]">指定半径</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[20%]">緯度経度</th>
              {!readOnly && (
                <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[5%]"></th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPois.map((poi) => {
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
                <tr key={poi.poi_id} className={`${isEditing ? "bg-blue-50/50" : "hover:bg-gray-50"} ${rowSizeClass}`}>
                  {/* 地点ID */}
                  <td className="px-4 py-4 align-top">
                    {isEditing ? (
                      <Input
                        value={editForm.location_id || ''}
                        onChange={(e) => handleInputChange('location_id', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="地点ID"
                      />
                    ) : (
                      <div className="text-sm text-gray-900 font-mono">{poi.location_id || '-'}</div>
                    )}
                  </td>

                  {/* 地点名 */}
                  <td className="px-4 align-top">
                    {isEditing ? (
                      <Input
                        value={editForm.poi_name || ''}
                        onChange={(e) => handleInputChange('poi_name', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="地点名"
                      />
                    ) : (
                      <div className={isPolygonPoi ? "text-base text-gray-900" : isPrefecturePoi ? "text-xs text-gray-900" : "text-sm text-gray-900"}>
                        {poi.poi_type === 'prefecture' ? (
                          <>
                            {poi.prefectures && poi.prefectures.length > 0 ? poi.prefectures.join('・') : '都道府県指定'}
                            <span className="ml-2 text-xs text-white bg-green-600 px-2 py-0.5 rounded">都道府県指定</span>
                          </>
                        ) : isPolygonPoi ? (
                          <>
                            <div className="font-medium">{poi.poi_name || 'ポリゴン地点'}</div>
                            <span className="ml-2 text-xs text-white bg-blue-600 px-2 py-0.5 rounded">ポリゴン指定</span>
                            {normalizedPolygon && normalizedPolygon.length > 0 && (
                              <div className="mt-1 text-sm text-gray-500">
                                座標数: {normalizedPolygon.length}点
                              </div>
                            )}
                          </>
                        ) : (
                          poi.poi_name || '（地点名未設定）'
                        )}
                      </div>
                    )}
                  </td>

                  {/* 住所 */}
                  <td className="px-4 align-top">
                    {isEditing ? (
                      <Input
                        value={editForm.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="住所"
                      />
                    ) : (
                      poi.poi_type === 'prefecture' && poi.cities && poi.cities.length > 0 ? (
                        <div className={isPrefecturePoi ? "text-xs text-gray-900" : "text-sm text-gray-900"}>
                          <div className="flex flex-wrap gap-1">
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
                        <div className="text-base text-gray-900">
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600 font-medium">
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
                              <div className="flex items-start gap-2">
                                <div className="flex-1 text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded break-all">
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
                        <div className={isManualRadiusPoi ? "text-base text-gray-900" : isPrefecturePoi ? "text-xs text-gray-900" : "text-sm text-gray-900"}>{poi.address || '-'}</div>
                      )
                    )}
                  </td>

                  {/* 指定半径 */}
                  <td className="px-4 align-top">
                    {isEditing ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder="0-10000"
                            value={editForm.designated_radius ? String(editForm.designated_radius).replace('m', '') : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                                handleInputChange('designated_radius', value ? `${value}m` : '');
                                
                                // 半径が50m以下の場合、警告ポップアップを表示（一度だけ）
                                const radiusNum = parseInt(value);
                                if (!isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 50 && !hasShownRadiusWarning) {
                                  setShowRadiusWarning(true);
                                  setHasShownRadiusWarning(true);
                                } else if (radiusNum > 50) {
                                  // 50mを超えた場合は警告表示フラグをリセット
                                  setHasShownRadiusWarning(false);
                                }
                              }
                            }}
                            className="h-8 text-sm w-20 px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-xs text-gray-500">m</span>
                        </div>
                        {editForm.designated_radius && (() => {
                          const radiusNum = parseInt(String(editForm.designated_radius).replace('m', ''));
                          if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
                            return (
                              <p className="text-xs text-red-600">0-10000の範囲で入力</p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div className={isManualRadiusPoi ? "text-base text-gray-900 font-medium" : isPrefecturePoi ? "text-xs text-gray-900" : "text-sm text-gray-900"}>
                        {poi.poi_type === 'prefecture' || isPolygonPoi
                          ? <span className="text-gray-400 text-xs">指定なし</span>
                          : (poi.designated_radius || '-')
                        }
                      </div>
                    )}
                  </td>

                  {/* 緯度経度 */}
                  <td className="px-4 align-top">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          value={editForm.latitude || ''}
                          onChange={(e) => handleInputChange('latitude', e.target.value)}
                          className="h-8 text-sm w-24"
                          placeholder="緯度"
                        />
                        <Input
                          value={editForm.longitude || ''}
                          onChange={(e) => handleInputChange('longitude', e.target.value)}
                          className="h-8 text-sm w-24"
                          placeholder="経度"
                        />
                      </div>
                    ) : (
                      <div className={isPolygonPoi ? "text-base text-gray-900" : isPrefecturePoi ? "text-xs text-gray-900" : "text-sm text-gray-900"}>
                        {isPolygonPoi && normalizedPolygon && normalizedPolygon.length > 0 ? (
                          <div className="text-sm text-gray-600">
                            <div className="font-medium">中心: {(() => {
                              const centerLat = normalizedPolygon.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / normalizedPolygon.length;
                              const centerLng = normalizedPolygon.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / normalizedPolygon.length;
                              return `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`;
                            })()}</div>
                          </div>
                        ) : poi.latitude && poi.longitude ? (
                          <span className={isManualRadiusPoi ? "font-medium" : ""}>{poi.latitude}, {poi.longitude}</span>
                        ) : (
                          '-'
                        )}
                      </div>
                    )}
                  </td>

                  {/* 検知回数（UI非表示） */}
                      <td className="px-4 py-4 align-top"></td>

                  {/* アクション */}
                  {!readOnly && (
                    <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(poi)}
                            className="text-primary hover:text-primary/80"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(poi.poi_id!)}
                            className="text-red-600 hover:text-red-700"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              次へ
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                全 <span className="font-medium">{pois.length}</span> 件中 <span className="font-medium">{startIndex + 1}</span> から <span className="font-medium">{Math.min(endIndex, pois.length)}</span> 件目を表示
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