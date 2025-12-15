import { useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { PoiInfo, Segment } from '../types/schema';

interface DataDiagnosticsProps {
  pois: PoiInfo[];
  segments: Segment[];
  onRefresh?: () => void;
}

export function DataDiagnostics({ pois, segments, onRefresh }: DataDiagnosticsProps) {
  const [isExpanded, setIsExpanded] = useState(false); // デフォルトで閉じた状態

  // localStorageの確認
  const checkLocalStorage = () => {
    try {
      const storedPois = localStorage.getItem('universegeo_pois');
      const storedSegments = localStorage.getItem('universegeo_segments');
      
      return {
        poisInStorage: storedPois ? JSON.parse(storedPois).length : 0,
        segmentsInStorage: storedSegments ? JSON.parse(storedSegments).length : 0,
        hasPoiData: !!storedPois,
        hasSegmentData: !!storedSegments,
      };
    } catch (error) {
      return {
        poisInStorage: 0,
        segmentsInStorage: 0,
        hasPoiData: false,
        hasSegmentData: false,
        error: String(error),
      };
    }
  };

  const storageInfo = checkLocalStorage();

  const handleClearCache = () => {
    if (confirm('本当にキャッシュをクリアしますか？（データは削除されません）')) {
      window.location.reload();
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700 font-medium">
            データ診断
          </span>
          <span className="text-xs text-gray-500">
            ({pois.length}件の地点 / {segments.length}件のセグメント)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-300 bg-white space-y-4">
          {/* 現在のプロップス */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">📊 現在の表示データ</h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="text-xs text-gray-500">地点（props）</div>
                <div className={`text-lg ${pois.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pois.length}件
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="text-xs text-gray-500">セグメント（props）</div>
                <div className={`text-lg ${segments.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {segments.length}件
                </div>
              </div>
            </div>
          </div>

          {/* localStorageの状態 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">💾 localStorageの状態</h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="text-xs text-gray-500">地点（storage）</div>
                <div className={`text-lg ${storageInfo.poisInStorage > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {storageInfo.poisInStorage}件
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="text-xs text-gray-500">セグメント（storage）</div>
                <div className={`text-lg ${storageInfo.segmentsInStorage > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {storageInfo.segmentsInStorage}件
                </div>
              </div>
            </div>
          </div>

          {/* 診断結果 */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">🔍 診断結果</h5>
            
            {pois.length === 0 && storageInfo.poisInStorage === 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                ❌ 地点データが全く登録されていません。セグメント管理から地点を登録してください。
              </div>
            )}
            
            {pois.length === 0 && storageInfo.poisInStorage > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
                ⚠️ localStorageには{storageInfo.poisInStorage}件の地点がありますが、表示されていません。
                データの読み込みに問題がある可能性があります。
              </div>
            )}
            
            {pois.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-700">
                ✅ {pois.length}件の地点データが正常に読み込まれています。
              </div>
            )}
          </div>

          {/* サンプルデータ */}
          {pois.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">📍 地点サンプル（最初の3件）</h5>
              <div className="space-y-1">
                {pois.slice(0, 3).map((poi, idx) => (
                  <div key={idx} className="bg-gray-50 p-2 rounded text-xs border border-gray-200">
                    <div className="font-medium text-gray-900">{poi.poi_name}</div>
                    <div className="text-gray-600 mt-1">
                      緯度: {poi.latitude || '❌'} / 経度: {poi.longitude || '❌'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                データ再読み込み
              </Button>
            )}
            <Button
              onClick={handleClearCache}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              キャッシュクリア
            </Button>
            <Button
              onClick={() => console.log('POIs:', pois, 'Segments:', segments)}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              コンソールに出力
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
