import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, MapPin } from 'lucide-react';
import { PolygonMapEditor } from '../PolygonMapEditor';
import type { usePoiForm } from './usePoiForm';

type UsePoiFormReturn = ReturnType<typeof usePoiForm>;

interface PoiFormPolygonProps {
  form: UsePoiFormReturn;
  segmentId: string;
  pois: Array<{ segment_id?: string; poi_type?: string; polygon?: number[][] | null; poi_id?: string }>;
}

export function PoiFormPolygon({ form, segmentId, pois }: PoiFormPolygonProps) {
  const {
    polygons,
    showPolygonEditor,
    setShowPolygonEditor,
    selectedPolygonId,
    setSelectedPolygonId,
    handlePolygonsChange,
    handlePolygonNameUpdate,
  } = form;

  const existingPolygonPois = pois.filter(p =>
    p.segment_id === segmentId &&
    p.poi_type === 'polygon' &&
    p.polygon && p.polygon.length > 0
  );
  const remainingCount = 10 - existingPolygonPois.length;

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 text-blue-900 mb-2">
        <MapPin className="w-5 h-5" />
        <h3>ポリゴン選択（地図上で描画）</h3>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          地図上でポリゴンを描画して地点を指定します。1つのセグメント内で最大10個のポリゴンを登録できます。
        </p>

        <p className="text-xs text-gray-500">
          地点名はポリゴン一覧から入力できます（未入力の場合は自動生成されます）。
        </p>

        {remainingCount <= 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              ⚠️ このセグメントには既に10個のポリゴンが登録されています。新しいポリゴンを追加するには、既存のポリゴンを削除してください。
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              このセグメントには既に{existingPolygonPois.length}個のポリゴンが登録されています。あと{remainingCount}個登録できます。
            </p>
          </div>
        )}

        <Button
          type="button"
          onClick={() => setShowPolygonEditor(true)}
          className="w-full bg-[#5b5fff] text-white hover:bg-[#4a4fef]"
        >
          <MapPin className="w-4 h-4 mr-2" />
          地図を開いてポリゴンを描画
        </Button>

        {polygons.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">登録済みポリゴン ({polygons.length}/10)</p>
            <p className="text-xs text-gray-500 mb-2">※ ポリゴンをクリックすると地図でその位置を表示します</p>
            <div className="space-y-2">
              {polygons.map((polygon, index) => (
                <div
                  key={polygon.id}
                  className="p-2 bg-white rounded border border-gray-200 hover:border-[#5b5fff] transition-colors"
                >
                  <div
                    className="flex items-center justify-between gap-2 cursor-pointer"
                    onClick={() => {
                      if (showPolygonEditor) {
                        setSelectedPolygonId(polygon.id);
                      } else {
                        setSelectedPolygonId(polygon.id);
                        setShowPolygonEditor(true);
                      }
                    }}
                  >
                    <div className="text-sm flex-1">
                      <Input
                        value={polygon.name || ''}
                        onChange={(e) => handlePolygonNameUpdate(polygon.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`ポリゴン ${index + 1}`}
                        className="h-8 text-sm bg-white"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        座標数: {polygon.coordinates.length}点
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        const newPolygons = polygons.filter(p => p.id !== polygon.id);
                        handlePolygonsChange(newPolygons);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ポリゴンエディタモーダル */}
      {showPolygonEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-7xl flex flex-col">
            <PolygonMapEditor
              polygons={polygons}
              maxPolygons={10}
              onPolygonsChange={handlePolygonsChange}
              onClose={() => {
                setShowPolygonEditor(false);
                setSelectedPolygonId(undefined);
              }}
              selectedPolygonId={selectedPolygonId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
