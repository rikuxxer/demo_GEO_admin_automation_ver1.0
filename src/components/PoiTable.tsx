import { useState } from 'react';
import { Edit, Trash2, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import type { PoiInfo } from '../types/schema';
import { RADIUS_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
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
  
  // 編集モードの地点があるかチェック
  const hasEditingRow = editingId !== null;
  
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
      const updates = {
        ...editForm,
        latitude: editForm.latitude !== undefined && editForm.latitude !== '' ? Number(editForm.latitude) : undefined,
        longitude: editForm.longitude !== undefined && editForm.longitude !== '' ? Number(editForm.longitude) : undefined,
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
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[10%]">検知回数</th>
              {hasEditingRow && !readOnly && (
                <>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[12%]">抽出期間</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[10%]">属性</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[12%]">滞在時間</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[15%]">検知時間</th>
                </>
              )}
              {!readOnly && (
                <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap w-[5%]">アクション</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPois.map((poi) => {
              const isEditing = editingId === poi.poi_id;
              
              return (
                <tr key={poi.poi_id} className={isEditing ? "bg-blue-50/50" : "hover:bg-gray-50"}>
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
                  <td className="px-4 py-4 align-top">
                    {isEditing ? (
                      <Input
                        value={editForm.poi_name || ''}
                        onChange={(e) => handleInputChange('poi_name', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="地点名"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">
                        {poi.poi_type === 'prefecture' ? (
                          <>
                            {poi.prefectures && poi.prefectures.length > 0 ? poi.prefectures.join('・') : '都道府県指定'}
                            <span className="ml-2 text-xs text-white bg-green-600 px-2 py-0.5 rounded">都道府県指定</span>
                          </>
                        ) : (
                          poi.poi_name || '（地点名未設定）'
                        )}
                      </div>
                    )}
                  </td>

                  {/* 住所 */}
                  <td className="px-4 py-4 align-top">
                    {isEditing ? (
                      <Input
                        value={editForm.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="住所"
                      />
                    ) : (
                      poi.poi_type === 'prefecture' && poi.cities && poi.cities.length > 0 ? (
                        <div className="text-sm text-gray-900">
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
                      ) : (
                        <div className="text-sm text-gray-900">{poi.address || '-'}</div>
                      )
                    )}
                  </td>

                  {/* 指定半径 */}
                  <td className="px-4 py-4 align-top">
                    {isEditing ? (
                      <select
                        value={editForm.designated_radius || ''}
                        onChange={(e) => handleInputChange('designated_radius', e.target.value)}
                        className="h-8 text-sm w-24 px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">選択</option>
                        {RADIUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900">
                        {poi.poi_type === 'prefecture' 
                          ? <span className="text-gray-400 text-xs">指定なし</span>
                          : (poi.designated_radius || '-')
                        }
                      </div>
                    )}
                  </td>

                  {/* 緯度経度 */}
                  <td className="px-4 py-4 align-top">
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
                      <div className="text-sm text-gray-900">
                        {poi.latitude && poi.longitude 
                          ? `${poi.latitude}, ${poi.longitude}` 
                          : '-'}
                      </div>
                    )}
                  </td>

                  {/* 検知回数（検知者の場合のみ表示） */}
                  <td className="px-4 py-4 align-top">
                    {(isEditing ? editForm.attribute : poi.attribute) === 'detector' ? (
                      isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={editForm.detection_count || 1}
                            onChange={(e) => handleInputChange('detection_count', e.target.value)}
                            className="h-8 text-sm w-16"
                          />
                          <span className="text-xs text-gray-500">回</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">{poi.detection_count || 1}回以上</div>
                      )
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>

                  {/* 抽出条件（編集モード時のみ表示） */}
                  {isEditing && (
                    <>
                      {/* 抽出期間 */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">抽出期間</Label>
                          <div className="space-y-1">
                            <div className="flex gap-2 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`period_type_${poi.poi_id}`}
                                  checked={editForm.extraction_period_type === 'preset'}
                                  onChange={() => handleInputChange('extraction_period_type', 'preset')}
                                  disabled={editForm.attribute === 'resident' || editForm.attribute === 'worker'}
                                  className="text-[#5b5fff] focus:ring-[#5b5fff]"
                                />
                                <span>プリセット</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`period_type_${poi.poi_id}`}
                                  checked={editForm.extraction_period_type === 'custom'}
                                  onChange={() => handleInputChange('extraction_period_type', 'custom')}
                                  disabled={editForm.attribute === 'resident' || editForm.attribute === 'worker'}
                                  className="text-[#5b5fff] focus:ring-[#5b5fff]"
                                />
                                <span>期間指定</span>
                              </label>
                            </div>
                            {editForm.extraction_period_type === 'preset' ? (
                              <select
                                value={editForm.extraction_period || ''}
                                onChange={(e) => handleInputChange('extraction_period', e.target.value)}
                                className="h-8 text-sm w-full px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={editForm.attribute === 'resident' || editForm.attribute === 'worker'}
                              >
                                <option value="">選択</option>
                                {EXTRACTION_PERIOD_PRESET_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex gap-1">
                                <Input
                                  type="date"
                                  value={editForm.extraction_start_date || ''}
                                  onChange={(e) => handleInputChange('extraction_start_date', e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <span className="text-xs text-gray-400 self-center">〜</span>
                                <Input
                                  type="date"
                                  value={editForm.extraction_end_date || ''}
                                  onChange={(e) => handleInputChange('extraction_end_date', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 属性 */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">属性</Label>
                          <select
                            value={editForm.attribute || ''}
                            onChange={(e) => handleInputChange('attribute', e.target.value)}
                            className="h-8 text-sm w-full px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">選択</option>
                            {ATTRIBUTE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 滞在時間 */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">滞在時間</Label>
                          <select
                            value={editForm.stay_time || ''}
                            onChange={(e) => handleInputChange('stay_time', e.target.value)}
                            className="h-8 text-sm w-full px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">選択</option>
                            {STAY_TIME_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 検知時間（検知者の場合のみ表示） */}
                      {editForm.attribute === 'detector' && (
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">検知時間</Label>
                            <div className="flex gap-1">
                              <Input
                                type="time"
                                value={editForm.detection_time_start || ''}
                                onChange={(e) => handleInputChange('detection_time_start', e.target.value)}
                                className="h-8 text-sm w-20"
                                placeholder="開始"
                              />
                              <span className="text-xs text-gray-400 self-center">〜</span>
                              <Input
                                type="time"
                                value={editForm.detection_time_end || ''}
                                onChange={(e) => handleInputChange('detection_time_end', e.target.value)}
                                className="h-8 text-sm w-20"
                                placeholder="終了"
                              />
                            </div>
                          </div>
                        </td>
                      )}
                      {editForm.attribute !== 'detector' && (
                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-gray-400">-</div>
                        </td>
                      )}
                    </>
                  )}

                  {/* 抽出条件（編集モードでない場合の空セル） */}
                  {hasEditingRow && !readOnly && !isEditing && (
                    <>
                      <td className="px-4 py-4 align-top"></td>
                      <td className="px-4 py-4 align-top"></td>
                      <td className="px-4 py-4 align-top"></td>
                      <td className="px-4 py-4 align-top"></td>
                    </>
                  )}

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
                  className="rounded-l-md w-8 h-8 p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="inline-flex items-center px-4 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0 bg-white">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-r-md w-8 h-8 p-0"
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
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
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
    </>
  );
}