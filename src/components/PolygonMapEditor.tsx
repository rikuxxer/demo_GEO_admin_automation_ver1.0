import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { validatePolygonRange } from '../utils/polygonUtils';

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface PolygonData {
  id: string;
  coordinates: number[][]; // [[lat, lng], [lat, lng], ...]
}

interface PolygonMapEditorProps {
  polygons: PolygonData[];
  maxPolygons?: number;
  onPolygonsChange: (polygons: PolygonData[]) => void;
  onClose?: () => void;
  selectedPolygonId?: string; // 選択されたポリゴンID
  poiName?: string;
  onPoiNameChange?: (value: string) => void;
}

export function PolygonMapEditor({ 
  polygons: initialPolygons, 
  maxPolygons = 10,
  onPolygonsChange,
  onClose,
  selectedPolygonId,
  poiName,
  onPoiNameChange
}: PolygonMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const drawnLayersRef = useRef<any[]>([]);
  const [polygons, setPolygons] = useState<PolygonData[]>(initialPolygons);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLeafletDrawLoaded, setIsLeafletDrawLoaded] = useState(false);

  // LeafletとLeaflet Drawを読み込む
  useEffect(() => {
    const loadLeaflet = async () => {
      // Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const leafletCss = document.createElement('link');
        leafletCss.rel = 'stylesheet';
        leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCss);
      }

      // Leaflet Draw CSS
      if (!document.querySelector('link[href*="leaflet.draw.css"]')) {
        const drawCss = document.createElement('link');
        drawCss.rel = 'stylesheet';
        drawCss.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        document.head.appendChild(drawCss);
      }

      // Leaflet JS
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      // Leaflet Draw JS
      if (!window.L?.Draw) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
          script.onload = () => {
            setIsLeafletDrawLoaded(true);
            resolve();
          };
          document.body.appendChild(script);
        });
      } else {
        setIsLeafletDrawLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  // 地図の初期化
  useEffect(() => {
    if (!isLeafletDrawLoaded || !window.L || !mapContainerRef.current || mapRef.current) {
      return;
    }

    // Leaflet Drawの言語設定を日本語化
    try {
      if (window.L.drawLocal) {
        // 既存の設定を保持しつつ日本語化
        const originalDrawLocal = window.L.drawLocal;
        window.L.drawLocal = {
          ...originalDrawLocal,
          draw: {
            ...originalDrawLocal.draw,
            toolbar: {
              ...originalDrawLocal.draw.toolbar,
              actions: {
                title: '描画をキャンセル',
                text: 'キャンセル'
              },
              finish: {
                title: '描画を完了',
                text: '完了'
              },
              undo: {
                title: '最後の点を削除',
                text: '最後の点を削除'
              },
              buttons: {
                polygon: 'ポリゴンを描画',
                polyline: '線を描画',
                rectangle: '四角形を描画',
                circle: '円を描画',
                marker: 'マーカーを配置',
                circlemarker: '円マーカーを配置'
              }
            },
            handlers: {
              ...originalDrawLocal.draw.handlers,
              polygon: {
                ...originalDrawLocal.draw.handlers.polygon,
                tooltip: {
                  start: 'ポリゴンを描画するには、地図上をクリックして開始してください',
                  cont: 'ポリゴンを続けるには、地図上をクリックしてください',
                  end: 'ポリゴンを完成するには、最初の点をクリックしてください'
                }
              }
            }
          },
          edit: {
            ...originalDrawLocal.edit,
            toolbar: {
              ...originalDrawLocal.edit.toolbar,
              actions: {
                save: {
                  title: '変更を保存',
                  text: '保存'
                },
                cancel: {
                  title: '編集をキャンセル、すべての変更を破棄',
                  text: 'キャンセル'
                },
                clearAll: {
                  title: 'すべてのレイヤーをクリア',
                  text: 'すべてクリア'
                }
              },
              buttons: {
                edit: 'ポリゴンを編集',
                editDisabled: '編集するポリゴンがありません',
                remove: 'ポリゴンを削除',
                removeDisabled: '削除するポリゴンがありません'
              }
            },
            handlers: {
              ...originalDrawLocal.edit.handlers,
              edit: {
                ...originalDrawLocal.edit.handlers.edit,
                tooltip: {
                  text: 'ポリゴンを編集するには、頂点をドラッグしてください',
                  subtext: 'キャンセルするには、ESCキーを押してください'
                }
              },
              remove: {
                ...originalDrawLocal.edit.handlers.remove,
                tooltip: {
                  text: 'ポリゴンを削除するには、ポリゴンをクリックしてください'
                }
              }
            }
          }
        };
      }
    } catch (error) {
      console.warn('Leaflet Drawの言語設定に失敗しました。DOM操作で日本語化します。', error);
    }

    // 地図を作成（日本中心）
    mapRef.current = window.L.map(mapContainerRef.current).setView([35.681236, 139.767125], 10);

    // OpenStreetMapタイルレイヤーを追加
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // FeatureGroupを作成（編集可能なレイヤーグループ）
    const featureGroup = window.L.featureGroup();
    featureGroup.addTo(mapRef.current);

    // 描画コントロールを追加（日本語化）
    const drawControl = new window.L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>エラー:</strong> ポリゴンが交差しています。',
          },
          shapeOptions: {
            color: '#5b5fff',
            fillColor: '#5b5fff',
            fillOpacity: 0.2,
          },
          tooltip: {
            start: 'ポリゴンを描画するには、地図上をクリックして開始してください',
            cont: 'ポリゴンを続けるには、地図上をクリックしてください',
            end: 'ポリゴンを完成するには、最初の点をクリックしてください',
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: featureGroup,
        remove: true,
      },
    });

    mapRef.current.addControl(drawControl);
    drawControlRef.current = drawControl;

    // コントロールボタンのツールチップとテキストを日本語化（より包括的に）
    const updateButtonTitles = () => {
      // ツールバーのボタンを更新
      const drawToolbar = document.querySelector('.leaflet-draw-toolbar');
      if (drawToolbar) {
        const drawButtons = drawToolbar.querySelectorAll('a');
        drawButtons.forEach((button) => {
          const title = button.getAttribute('title') || '';
          const text = button.textContent || '';
          
          // タイトル属性を更新
          if (title) {
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('polygon') || lowerTitle.includes('draw')) {
              button.setAttribute('title', 'ポリゴンを描画');
            } else if (lowerTitle.includes('edit')) {
              button.setAttribute('title', 'ポリゴンを編集');
            } else if (lowerTitle.includes('delete') || lowerTitle.includes('remove')) {
              button.setAttribute('title', 'ポリゴンを削除');
            }
          }
          
          // ボタンのテキストも更新（表示されている場合）
          const lowerText = text.toLowerCase().trim();
          if (lowerText.includes('cancel') || lowerText === 'cancel') {
            button.textContent = 'キャンセル';
          } else if (lowerText.includes('finish') || lowerText === 'finish') {
            button.textContent = '完了';
          } else if (lowerText.includes('undo') || lowerText === 'undo') {
            button.textContent = '元に戻す';
          }
        });
      }
      
      // アクションバーのボタンも更新
      const actionBar = document.querySelector('.leaflet-draw-actions');
      if (actionBar) {
        const actionButtons = actionBar.querySelectorAll('a');
        actionButtons.forEach((button) => {
          const text = button.textContent || '';
          const lowerText = text.toLowerCase().trim();
          if (lowerText.includes('cancel') || lowerText === 'cancel') {
            button.textContent = 'キャンセル';
            button.setAttribute('title', '描画をキャンセル');
          } else if (lowerText.includes('finish') || lowerText === 'finish') {
            button.textContent = '完了';
            button.setAttribute('title', '描画を完了');
          } else if (lowerText.includes('undo') || lowerText === 'undo') {
            button.textContent = '元に戻す';
            button.setAttribute('title', '最後の点を削除');
          } else if (lowerText.includes('save') || lowerText === 'save') {
            button.textContent = '保存';
            button.setAttribute('title', '変更を保存');
          } else if (lowerText.includes('clear') || lowerText.includes('すべて')) {
            button.textContent = 'すべてクリア';
            button.setAttribute('title', 'すべてのレイヤーをクリア');
          }
        });
      }
      
      // ツールチップも更新
      const tooltips = document.querySelectorAll('.leaflet-draw-tooltip');
      tooltips.forEach((tooltip) => {
        const text = tooltip.textContent || '';
        const lowerText = text.toLowerCase();
        if (lowerText.includes('click to start') || lowerText.includes('click to continue') || lowerText.includes('click first point')) {
          // ツールチップのテキストは既に設定されているので、そのまま使用
        }
      });
    };

    // 初回と定期的にボタンのタイトルを更新（複数回実行して確実に適用）
    const updateInterval = setInterval(() => {
      updateButtonTitles();
    }, 500);
    
    // 5秒後に停止
    setTimeout(() => {
      clearInterval(updateInterval);
    }, 5000);
    
    // 初回実行
    setTimeout(updateButtonTitles, 500);
    setTimeout(updateButtonTitles, 1000);
    setTimeout(updateButtonTitles, 2000);

    // ポリゴンを地図に追加する関数（地図初期化内で定義）
    const addPolygonToMap = (polygon: PolygonData) => {
      if (!mapRef.current || !window.L || !drawControlRef.current) return;

      // 座標が空の場合はスキップ
      if (!polygon.coordinates || polygon.coordinates.length < 3) {
        console.warn('ポリゴンの座標が不足しています:', polygon);
        return;
      }

      const latlngs = polygon.coordinates.map((coord) => {
        // 座標が配列の場合
        if (Array.isArray(coord) && coord.length >= 2) {
          return window.L.latLng(coord[0], coord[1]);
        }
        return window.L.latLng(coord[0], coord[1]);
      });

      const layer = window.L.polygon(latlngs, {
        color: '#5b5fff',
        fillColor: '#5b5fff',
        fillOpacity: 0.2,
        weight: 2,
      });

      drawnLayersRef.current.push(layer);
      const featureGroup = drawControlRef.current.options.edit.featureGroup;
      if (featureGroup) {
        featureGroup.addLayer(layer);
      }
      mapRef.current.addLayer(layer);
    };

    // 既存のポリゴンを描画（地図が完全に初期化された後）
    setTimeout(() => {
      if (initialPolygons && initialPolygons.length > 0) {
        console.log('既存のポリゴンを読み込み中:', initialPolygons);
        initialPolygons.forEach((polygon) => {
          addPolygonToMap(polygon);
        });
        // ポリゴンが読み込まれたら地図のビューを調整
        if (initialPolygons.length > 0 && initialPolygons[0].coordinates.length > 0) {
          const firstCoord = initialPolygons[0].coordinates[0];
          mapRef.current.setView([firstCoord[0], firstCoord[1]], 13);
        }
      }
    }, 300);

    // ポリゴン描画完了イベント
    mapRef.current.on(window.L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0];
      const coordinates = latlngs.map((ll: any) => [ll.lat, ll.lng]);

      // 最大数チェック
      if (drawnLayersRef.current.length >= maxPolygons) {
        toast.error(`ポリゴンは最大${maxPolygons}個まで登録できます`);
        mapRef.current.removeLayer(layer);
        return;
      }

      // ポリゴンの範囲を検証
      const validation = validatePolygonRange(coordinates);
      if (!validation.isValid) {
        toast.error(validation.error || 'ポリゴンの範囲が広すぎます');
        mapRef.current.removeLayer(layer);
        return;
      }

      const newPolygon: PolygonData = {
        id: `polygon-${Date.now()}`,
        coordinates,
      };

      const newPolygons = [...polygons, newPolygon];
      setPolygons(newPolygons);
      onPolygonsChange(newPolygons);

      // レイヤーを保存
      drawnLayersRef.current.push(layer);
      const featureGroup = drawControlRef.current.options.edit.featureGroup;
      featureGroup.addLayer(layer);
      mapRef.current.addLayer(layer);

      toast.success('ポリゴンを追加しました');
    });

    // ポリゴン編集完了イベント
    mapRef.current.on(window.L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      let hasError = false;
      
      layers.eachLayer((layer: any) => {
        const latlngs = layer.getLatLngs()[0];
        const coordinates = latlngs.map((ll: any) => [ll.lat, ll.lng]);
        
        // ポリゴンの範囲を検証
        const validation = validatePolygonRange(coordinates);
        if (!validation.isValid) {
          toast.error(validation.error || 'ポリゴンの範囲が広すぎます');
          hasError = true;
          // 編集を元に戻す（元の座標に戻す）
          const layerId = layer._leaflet_id;
          const originalPolygon = polygons.find(() => {
            const polyLayer = drawnLayersRef.current.find((l) => l._leaflet_id === layerId);
            return polyLayer === layer;
          });
          if (originalPolygon) {
            const originalLatlngs = originalPolygon.coordinates.map((coord) => 
              window.L.latLng(coord[0], coord[1])
            );
            layer.setLatLngs([originalLatlngs]);
          }
          return;
        }
        
        // 対応するポリゴンを更新
        const layerId = layer._leaflet_id;
        const updatedPolygons = polygons.map((polygon) => {
          const polyLayer = drawnLayersRef.current.find((l) => l._leaflet_id === layerId);
          if (polyLayer === layer) {
            return { ...polygon, coordinates };
          }
          return polygon;
        });
        
        setPolygons(updatedPolygons);
        onPolygonsChange(updatedPolygons);
      });

      if (!hasError) {
        toast.success('ポリゴンを更新しました');
      }
    });

    // ポリゴン削除イベント
    mapRef.current.on(window.L.Draw.Event.DELETED, (e: any) => {
      const layers = e.layers;
      const deletedIds: string[] = [];
      
      layers.eachLayer((layer: any) => {
        const layerId = layer._leaflet_id;
        const index = drawnLayersRef.current.findIndex((l) => l._leaflet_id === layerId);
        if (index !== -1) {
          drawnLayersRef.current.splice(index, 1);
          // ポリゴンIDを特定（レイヤーIDから）
          const polygon = polygons.find((_, i) => {
            // 簡易的なマッピング（実際の実装ではより確実な方法が必要）
            return i === index;
          });
          if (polygon) {
            deletedIds.push(polygon.id);
          }
        }
      });

      const updatedPolygons = polygons.filter((p) => !deletedIds.includes(p.id));
      setPolygons(updatedPolygons);
      onPolygonsChange(updatedPolygons);

      toast.success('ポリゴンを削除しました');
    });

    setIsMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      drawnLayersRef.current = [];
    };
  }, [isLeafletDrawLoaded, initialPolygons]);

  // 選択されたポリゴンIDが変更されたときに地図を移動
  useEffect(() => {
    if (selectedPolygonId && mapRef.current && window.L && isMapReady) {
      const polygon = polygons.find((p) => p.id === selectedPolygonId);
      if (polygon) {
        handleSelectPolygon(polygon);
      }
    }
  }, [selectedPolygonId, isMapReady, polygons]);


  // ポリゴンを選択して地図を移動
  const handleSelectPolygon = (polygon: PolygonData) => {
    if (!mapRef.current || !window.L) return;

    // ポリゴンの中心座標を計算
    if (polygon.coordinates && polygon.coordinates.length > 0) {
      let sumLat = 0;
      let sumLng = 0;
      polygon.coordinates.forEach((coord) => {
        sumLat += coord[0];
        sumLng += coord[1];
      });
      const centerLat = sumLat / polygon.coordinates.length;
      const centerLng = sumLng / polygon.coordinates.length;

      // 地図をポリゴンの中心に移動
      mapRef.current.setView([centerLat, centerLng], 15, {
        animate: true,
        duration: 0.5,
      });

      // 対応するレイヤーをハイライト
      const index = polygons.findIndex((p) => p.id === polygon.id);
      if (index >= 0 && index < drawnLayersRef.current.length) {
        const layer = drawnLayersRef.current[index];
        if (layer) {
          // 一時的にハイライト
          layer.setStyle({
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.3,
            weight: 3,
          });
          
          setTimeout(() => {
            layer.setStyle({
              color: '#5b5fff',
              fillColor: '#5b5fff',
              fillOpacity: 0.2,
              weight: 2,
            });
          }, 2000);
        }
      }
    }
  };

  // ポリゴンを削除
  const handleDeletePolygon = (id: string) => {
    const index = polygons.findIndex((p) => p.id === id);
    if (index === -1) return;

    // 地図からレイヤーを削除
    const layer = drawnLayersRef.current[index];
    if (layer && mapRef.current) {
      mapRef.current.removeLayer(layer);
      drawnLayersRef.current.splice(index, 1);
      
      const featureGroup = drawControlRef.current?.options?.edit?.featureGroup;
      if (featureGroup) {
        featureGroup.removeLayer(layer);
      }
    }

    const updatedPolygons = polygons.filter((p) => p.id !== id);
    setPolygons(updatedPolygons);
    onPolygonsChange(updatedPolygons);
    toast.success('ポリゴンを削除しました');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">ポリゴン選択</h3>
          <p className="text-sm text-gray-500 mt-1">
            地図上でポリゴンを描画してください（最大{maxPolygons}個）
          </p>
          {onPoiNameChange && (
            <div className="mt-3">
              <Label htmlFor="polygon_poi_name" className="text-xs text-gray-600">
                地点名
              </Label>
              <Input
                id="polygon_poi_name"
                type="text"
                value={poiName || ''}
                onChange={(e) => onPoiNameChange(e.target.value)}
                placeholder="例：渋谷エリア、新宿駅周辺"
                className="mt-1 h-8 text-sm w-72"
              />
            </div>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">地図を読み込み中...</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-gray-50">
        <div className="mb-2">
          <p className="text-sm font-medium mb-2">登録済みポリゴン ({polygons.length}/{maxPolygons})</p>
          {polygons.length === 0 ? (
            <p className="text-sm text-gray-500">ポリゴンが登録されていません</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {polygons.map((polygon, index) => (
                <div
                  key={polygon.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:border-[#5b5fff] cursor-pointer transition-colors"
                  onClick={() => handleSelectPolygon(polygon)}
                >
                  <span className="text-sm flex-1">ポリゴン {index + 1} ({polygon.coordinates.length}点)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDeletePolygon(polygon.id);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {polygons.length >= maxPolygons && (
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ 最大{maxPolygons}個のポリゴンに達しました。新しいポリゴンを追加するには、既存のポリゴンを削除してください。
          </p>
        )}
      </div>
    </div>
  );
}

