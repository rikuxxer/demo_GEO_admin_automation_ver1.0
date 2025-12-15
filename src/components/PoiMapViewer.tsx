import { useState, useEffect, useMemo, useRef } from 'react';
import { PoiInfo, Segment } from '../types/schema';
import { MapPin, AlertCircle, Locate, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { enrichPOIsWithGeocode, GeocodeError } from '../utils/geocoding';
import { toast } from 'sonner';

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface PoiMapViewerProps {
  pois: PoiInfo[];
  segments: Segment[];
  onPoiUpdate?: (poiId: string, updates: Partial<PoiInfo>) => Promise<void>;
}

// セグメントごとに色を割り当て
const SEGMENT_COLORS = [
  '#5b5fff', // Primary purple
  '#ff5b9d', // Pink
  '#5bff8f', // Green
  '#ffb85b', // Orange
  '#5bc0ff', // Cyan
  '#ff5b5b', // Red
  '#b85bff', // Violet
  '#ffff5b', // Yellow
];

export function PoiMapViewer({ pois, segments, onPoiUpdate }: PoiMapViewerProps) {
  // デバッグログ（本番環境では削除可能）
  console.log('🗺️ PoiMapViewer rendered with pois:', pois.length, 'segments:', segments.length);
  
  // セグメント選択状態（デフォルトで全て選択）
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [selectedPoi, setSelectedPoi] = useState<PoiInfo | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  
  // ジオコーディング処理の状態
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [geocodeTotal, setGeocodeTotal] = useState(0);

  // 座標取得ヘルパー関数（latitude/lat両方に対応）
  const getLat = (poi: PoiInfo): number => {
    const lat = poi.latitude || (poi as any).lat;
    if (lat === undefined || lat === null) return NaN;
    // 文字列の場合も対応（既存データの互換性のため）
    const num = typeof lat === 'string' ? parseFloat(lat) : lat;
    return Number.isFinite(num) ? num : NaN;
  };
  
  const getLng = (poi: PoiInfo): number => {
    const lng = poi.longitude || (poi as any).lng;
    if (lng === undefined || lng === null) return NaN;
    // 文字列の場合も対応（既存データの互換性のため）
    const num = typeof lng === 'string' ? parseFloat(lng) : lng;
    return Number.isFinite(num) ? num : NaN;
  };

  // セグメントが変更されたら全て選択
  useEffect(() => {
    if (segments.length > 0) {
      const segmentIds = segments.map(s => s.segment_id);
      const segmentIdsSet = new Set(segmentIds);
      
      const currentSelected = Array.from(selectedSegments).sort();
      const newSelected = segmentIds.sort();
      const hasChanged = currentSelected.length !== newSelected.length || 
                        currentSelected.some((id, i) => id !== newSelected[i]);
      
      if (hasChanged || selectedSegments.size === 0) {
        console.log('🎯 Setting selected segments:', segmentIds);
        setSelectedSegments(segmentIdsSet);
      }
    }
  }, [segments, selectedSegments]);

  // 座標を持つ地点のみをフィルタリング（NaNを除外）
  const poisWithCoords = useMemo(
    () => {
      const filtered = pois.filter(p => {
        const lat = getLat(p);
        const lng = getLng(p);
        const isValid = !isNaN(lat) && !isNaN(lng) && Number.isFinite(lat) && Number.isFinite(lng);
        if (!isValid) {
          console.log('⚠️ Invalid coordinates for POI:', p.poi_name, 'lat:', lat, 'lng:', lng);
        }
        return isValid;
      });
      console.log('📍 Total POIs:', pois.length, 'POIs with valid coords:', filtered.length);
      return filtered;
    },
    [pois]
  );

  // 選択されたセグメントの地点のみをフィルタリング
  const validPois = useMemo(
    () => {
      const filtered = poisWithCoords.filter(p => selectedSegments.has(p.segment_id));
      console.log('🔍 Selected segments:', Array.from(selectedSegments), 'Valid POIs after filter:', filtered.length);
      return filtered;
    },
    [poisWithCoords, selectedSegments]
  );

  // セグメントごとの色マップを作成
  const segmentColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    segments.forEach((segment, index) => {
      colorMap.set(segment.segment_id, SEGMENT_COLORS[index % SEGMENT_COLORS.length]);
    });
    return colorMap;
  }, [segments]);

  // 地図の中心とズームを計算
  const mapBounds = useMemo(() => {
    if (validPois.length === 0) {
      return { centerLat: 35.6762, centerLng: 139.6503, zoom: 10 };
    }

    const lats = validPois.map(getLat);
    const lngs = validPois.map(getLng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // ズームレベルを調整
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const maxRange = Math.max(latRange, lngRange);
    
    let zoom = 10;
    if (maxRange < 0.01) zoom = 15;
    else if (maxRange < 0.05) zoom = 13;
    else if (maxRange < 0.1) zoom = 12;
    else if (maxRange < 0.5) zoom = 10;
    else zoom = 8;

    return { centerLat, centerLng, zoom };
  }, [validPois]);

  // セグメント選択の切り替え
  const toggleSegment = (segmentId: string) => {
    setSelectedSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  };

  const toggleAllSegments = () => {
    const newSelection = selectedSegments.size === segments.length 
      ? new Set() 
      : new Set(segments.map(s => s.segment_id));
    setSelectedSegments(newSelection);
  };

  // 緯度経度が不足している地点を検出
  const poisNeedingGeocode = useMemo(() => {
    return pois.filter(poi => 
      (poi.latitude === undefined || poi.latitude === null || 
       poi.longitude === undefined || poi.longitude === null) && 
      poi.address && poi.address.trim() !== ''
    );
  }, [pois]);

  // 緯度経度を一括取得
  const handleBulkGeocode = async () => {
    if (!onPoiUpdate) {
      toast.error('地点の更新機能が利用できません');
      return;
    }

    if (poisNeedingGeocode.length === 0) {
      toast.info('緯度経度の取得が必要な地点がありません');
      return;
    }

    setIsGeocoding(true);
    setGeocodeProgress(0);
    setGeocodeTotal(poisNeedingGeocode.length);

    try {
      const { enriched, errors } = await enrichPOIsWithGeocode(
        poisNeedingGeocode,
        (current, total) => {
          setGeocodeProgress(current);
          setGeocodeTotal(total);
        }
      );

      // 取得した緯度経度で地点を更新
      let successCount = 0;
      for (const poi of enriched) {
        if (poi.poi_id && poi.latitude !== undefined && poi.longitude !== undefined) {
          try {
            await onPoiUpdate(poi.poi_id, {
              latitude: poi.latitude,
              longitude: poi.longitude,
            });
            successCount++;
          } catch (error) {
            console.error('Failed to update POI:', poi.poi_id, error);
          }
        }
      }

      if (errors.length > 0) {
        toast.warning(
          `${successCount}件の地点を更新しました。${errors.length}件の地点で取得に失敗しました。`,
          { 
            description: '開発環境では都道府県・市区町村から推定した座標を使用しています',
            duration: 5000 
          }
        );
      } else {
        toast.success(`${successCount}件の地点の緯度経度を取得しました`, {
          description: '開発環境では都道府県・市区町村から推定した座標を使用しています',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Bulk geocoding error:', error);
      toast.error('緯度経度の取得中にエラーが発生しました');
    } finally {
      setIsGeocoding(false);
      setGeocodeProgress(0);
      setGeocodeTotal(0);
    }
  };

  // 半径を数値（メートル）に変換
  const parseRadius = (radius?: string | null): number => {
    if (!radius) return 500;
    const match = radius.match(/(\d+)/);
    if (!match) return 500;
    const value = parseInt(match[1]);
    // "km"が含まれている場合はメートルに変換
    if (radius.toLowerCase().includes('km')) {
      return value * 1000;
    }
    return value;
  };

  // Leaflet.jsのロードと地図の初期化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (validPois.length === 0) {
      console.log('⚠️ No valid POIs to display on map');
      return;
    }

    console.log('🗺️ Loading Leaflet for', validPois.length, 'POIs');

    // Leaflet.jsのCSSとJSをロード
    const loadLeaflet = async () => {
      // CSSが既に読み込まれているかチェック
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        console.log('✅ Leaflet CSS loaded');
      }

      // JSが既に読み込まれているかチェック
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
        console.log('✅ Leaflet JS loaded');
      }

      setIsMapReady(true);
      console.log('✅ Map is ready');
    };

    loadLeaflet();
  }, [validPois.length]);

  // 地図の描画とマーカーの更新
  useEffect(() => {
    console.log('🗺️ Map render effect:', { isMapReady, hasLeaflet: !!window.L, hasContainer: !!mapContainerRef.current, poisCount: validPois.length });
    
    if (!isMapReady || !window.L || !mapContainerRef.current) {
      console.log('⚠️ Map not ready yet');
      return;
    }
    if (validPois.length === 0) {
      console.log('⚠️ No valid POIs to render');
      return;
    }

    console.log('🎨 Rendering map with', validPois.length, 'POIs');

    // 既存のマーカーをクリア
    markersRef.current.forEach(marker => {
      if (marker.remove) marker.remove();
    });
    markersRef.current = [];

    // 地図が存在しない場合は作成
    if (!mapRef.current) {
      const { centerLat, centerLng, zoom } = mapBounds;
      
      console.log('📍 Creating new map at', centerLat, centerLng, 'zoom:', zoom);
      mapRef.current = window.L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
      console.log('✅ Map created');
    } else {
      // 地図の中心とズームを更新
      const { centerLat, centerLng, zoom } = mapBounds;
      console.log('🔄 Updating map view to', centerLat, centerLng, 'zoom:', zoom);
      mapRef.current.setView([centerLat, centerLng], zoom);
    }

    // マーカーと円を追加
    validPois.forEach(poi => {
      const lat = getLat(poi);
      const lng = getLng(poi);
      const color = segmentColorMap.get(poi.segment_id) || SEGMENT_COLORS[0];
      const radius = parseRadius(poi.designated_radius);

      // カスタムアイコンを作成
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      // マーカーを追加
      const marker = window.L.marker([lat, lng], { icon })
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif;">
            <strong style="color: ${color}; font-size: 14px;">${poi.poi_name}</strong>
            ${poi.location_id ? `<p style="font-size: 11px; margin: 2px 0; color: #666; font-family: monospace;">ID: ${poi.location_id}</p>` : ''}
            ${poi.address ? `<p style="font-size: 12px; margin: 4px 0; color: #666;">${poi.address}</p>` : ''}
            <p style="font-size: 11px; margin: 4px 0; color: #999;">
              緯度: ${lat.toFixed(6)}<br/>
              経度: ${lng.toFixed(6)}
            </p>
            ${poi.designated_radius ? `<p style="font-size: 11px; margin: 4px 0; color: #666;">半径: ${poi.designated_radius}</p>` : ''}
          </div>
        `)
        .addTo(mapRef.current);

      markersRef.current.push(marker);

      // 半径の円を追加
      if (poi.designated_radius) {
        const circle = window.L.circle([lat, lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          radius: radius,
          weight: 2,
        }).addTo(mapRef.current);

        markersRef.current.push(circle);
      }
    });

    // クリーンアップ
    return () => {
      // コンポーネントがアンマウントされた時のみ地図を削除
    };
  }, [isMapReady, validPois, mapBounds, segmentColorMap]);

  // 地点がない場合
  if (pois.length === 0) {
    console.log('ℹ️ No POIs at all');
    return (
      <div className="space-y-4">
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 mb-1">表示する地点がありません</p>
          <p className="text-muted-foreground">セグメント管理から地点を登録してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 緯度経度取得バナー */}
      {poisNeedingGeocode.length > 0 && !isGeocoding && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm text-yellow-900">緯度経度が未登録の地点があります</h3>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                {poisNeedingGeocode.length}件の地点で緯度経度が登録されていません。住所から自動取得できます。
              </p>
              <Button
                size="sm"
                onClick={handleBulkGeocode}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={!onPoiUpdate}
              >
                <Locate className="w-4 h-4 mr-2" />
                緯度経度を一括取得
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ジオコーディング進捗 */}
      {isGeocoding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <h3 className="text-sm text-blue-900">住所から緯度経度を取得中...</h3>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            {geocodeProgress} / {geocodeTotal} 件処理中
          </p>
          <Progress 
            value={(geocodeProgress / geocodeTotal) * 100} 
            className="h-2"
          />
        </div>
      )}

      {/* 緯度経度がない場合 */}
      {poisWithCoords.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 mb-1">緯度経度が設定されている地点がありません</p>
          <p className="text-muted-foreground">
            地点に緯度経度を設定するか、住所からジオコーディングを実行してください
          </p>
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 max-w-md mx-auto text-left">
            <p className="text-sm text-gray-700 mb-2">💡 緯度経度を取得する方法：</p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>セグメント管理タブから地点管理を開く</li>
              <li>「CSV一括登録」ボタンをクリック</li>
              <li>「住所から緯度経度を自動取得する」にチェック</li>
              <li>CSVファイルをアップロード</li>
            </ol>
          </div>
        </div>
      )}

      {poisWithCoords.length > 0 && (
        <>
          {/* セグメントフィルター */}
          {segments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-900">セグメントフィルター</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllSegments}
                  className="border border-gray-300"
                >
                  {selectedSegments.size === segments.length ? '全て解除' : '全て選択'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {segments.map((segment, index) => {
                  const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
                  const isSelected = selectedSegments.has(segment.segment_id);
                  const segmentPois = poisWithCoords.filter(p => p.segment_id === segment.segment_id);
                  
                  return (
                    <button
                      key={segment.segment_id}
                      onClick={() => toggleSegment(segment.segment_id)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                        isSelected
                          ? 'bg-white border-2 shadow-sm'
                          : 'bg-gray-100 border-2 border-transparent opacity-50'
                      }`}
                      style={{
                        borderColor: isSelected ? color : 'transparent',
                        color: isSelected ? color : '#666'
                      }}
                    >
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                      {segment.segment_name || segment.segment_id}
                      <span className="ml-1.5 text-xs opacity-75">({segmentPois.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 地図情報バー */}
          <div className="bg-[#5b5fff] text-white px-4 py-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">表示中の地点: {validPois.length}件</span>
            </div>
            {validPois.length === 0 && selectedSegments.size > 0 && (
              <span className="text-xs opacity-90">フィルターで全て除外されています</span>
            )}
          </div>

          {/* 地図本体 */}
          {validPois.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
              <div 
                ref={mapContainerRef}
                style={{ height: '600px', width: '100%' }}
              />
              {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm text-gray-600">地図を読み込んでいます...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-900 mb-1">表示する地点がありません</p>
              <p className="text-muted-foreground">セグメントフィルターを調整してください</p>
            </div>
          )}

          {/* 地点リスト */}
          {validPois.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm text-gray-900 mb-3">地点一覧</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {validPois.map((poi, index) => {
                  const color = segmentColorMap.get(poi.segment_id) || SEGMENT_COLORS[0];
                  const lat = getLat(poi);
                  const lng = getLng(poi);
                  
                  return (
                    <div
                      key={poi.poi_id || index}
                      className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedPoi(poi)}
                      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm text-gray-900 truncate">{poi.poi_name}</h5>
                          {poi.location_id && (
                            <p className="text-xs text-gray-500 font-mono mb-0.5">ID: {poi.location_id}</p>
                          )}
                          {poi.address && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{poi.address}</p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {lat.toFixed(6)}, {lng.toFixed(6)}
                          </div>
                          {poi.designated_radius && (
                            <div className="text-xs text-gray-500 mt-1">
                              半径: {poi.designated_radius}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 地点詳細ポップアップ */}
          {selectedPoi && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedPoi(null)}>
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                  <h4 
                    className="text-lg" 
                    style={{ color: segmentColorMap.get(selectedPoi.segment_id) || SEGMENT_COLORS[0] }}
                  >
                    {selectedPoi.poi_name}
                  </h4>
                  <button
                    onClick={() => setSelectedPoi(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  {selectedPoi.location_id && (
                    <p><strong>地点ID:</strong> <span className="font-mono">{selectedPoi.location_id}</span></p>
                  )}
                  {selectedPoi.address && (
                    <p><strong>住所:</strong> {selectedPoi.address}</p>
                  )}
                  <p><strong>緯度:</strong> {getLat(selectedPoi).toFixed(6)}</p>
                  <p><strong>経度:</strong> {getLng(selectedPoi).toFixed(6)}</p>
                  {selectedPoi.designated_radius && (
                    <p><strong>半径:</strong> {selectedPoi.designated_radius}</p>
                  )}
                  {selectedPoi.poi_type && (
                    <p><strong>種別:</strong> {selectedPoi.poi_type}</p>
                  )}
                </div>
                <div className="mt-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${getLat(selectedPoi)},${getLng(selectedPoi)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#5b5fff] hover:underline"
                  >
                    Google Mapsで開く →
                    </a>
                </div>
              </div>
            </div>
          )}

          {/* 凡例 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-xs text-gray-600 mb-2">凡例</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#5b5fff]" />
                <span className="text-gray-700">地点マーカー</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-[#5b5fff]"></div>
                <span className="text-gray-700">セグメント別色分け</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}