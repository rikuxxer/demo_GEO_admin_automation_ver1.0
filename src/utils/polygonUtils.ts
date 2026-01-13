/**
 * ポリゴン関連のユーティリティ関数
 */

/**
 * ポリゴンの範囲を計算（緯度経度の最小/最大値）
 */
export interface PolygonBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  latRange: number; // 緯度の範囲（度）
  lngRange: number; // 経度の範囲（度）
}

/**
 * 地球の半径（km）
 */
const EARTH_RADIUS_KM = 6371.0;

/**
 * ポリゴンの範囲を計算
 * @param coordinates ポリゴンの座標配列 [[lat, lng], [lat, lng], ...]
 * @returns ポリゴンの範囲情報
 */
export function calculatePolygonBounds(coordinates: number[][]): PolygonBounds {
  if (!coordinates || coordinates.length < 3) {
    throw new Error('ポリゴンの座標が不足しています（最低3点必要）');
  }

  let minLat = coordinates[0][0];
  let maxLat = coordinates[0][0];
  let minLng = coordinates[0][1];
  let maxLng = coordinates[0][1];

  for (const coord of coordinates) {
    if (coord.length < 2) {
      continue;
    }
    const lat = coord[0];
    const lng = coord[1];
    
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    latRange: maxLat - minLat,
    lngRange: maxLng - minLng,
  };
}

/**
 * 緯度経度の差からおおよその距離を計算（km）
 * 簡易的な計算（Haversine公式の近似）
 * @param latRange 緯度の範囲（度）
 * @param lngRange 経度の範囲（度）
 * @param centerLat 中心緯度（経度の距離計算に使用）
 * @returns おおよその距離（km）
 */
export function estimateDistanceFromRange(
  latRange: number,
  lngRange: number,
  centerLat: number
): { latDistance: number; lngDistance: number; maxDistance: number } {
  // 緯度1度 ≈ 111km
  const latDistance = latRange * 111;
  
  // 経度1度の距離は緯度によって異なる（日本付近では約90km）
  // より正確には: 111 * cos(緯度 * π / 180)
  const lngDistance = lngRange * 111 * Math.cos((centerLat * Math.PI) / 180);
  
  // 最大距離（対角線の距離）
  const maxDistance = Math.sqrt(latDistance * latDistance + lngDistance * lngDistance);
  
  return {
    latDistance,
    lngDistance,
    maxDistance,
  };
}

/**
 * ポリゴンの面積を計算（km²）
 * 球面座標系でのShoelace公式を使用（より正確な計算）
 * @param coordinates ポリゴンの座標配列 [[lat, lng], [lat, lng], ...]
 * @returns 面積（km²）
 */
export function calculatePolygonArea(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) {
    return 0;
  }

  // 座標をラジアンに変換
  const coords = coordinates.map(coord => [
    (coord[0] * Math.PI) / 180, // 緯度（ラジアン）
    (coord[1] * Math.PI) / 180, // 経度（ラジアン）
  ]);

  const n = coords.length;
  let area = 0;

  // 球面座標系でのShoelace公式を使用
  // 各頂点を球面座標（x, y, z）に変換して面積を計算
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = coords[i][0];
    const lng1 = coords[i][1];
    const lat2 = coords[j][0];
    const lng2 = coords[j][1];

    // 球面座標での面積計算
    // 経度の差 × (sin(緯度1) + sin(緯度2)) / 2 の積分
    area += (lng2 - lng1) * (Math.sin(lat1) + Math.sin(lat2));
  }

  // 面積をkm²に変換
  // 球面座標での面積（ラジアン²） × 地球の半径² / 2 = 面積（km²）
  const areaKm2 = Math.abs(area) * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2;

  return areaKm2;
}

/**
 * ポリゴンの範囲が許容範囲内かチェック（面積ベース）
 * @param coordinates ポリゴンの座標配列
 * @param maxAreaKm2 最大面積（km²、デフォルト: 2km²）
 * @returns 検証結果
 */
export interface PolygonValidationResult {
  isValid: boolean;
  error?: string;
  bounds?: PolygonBounds;
  distance?: { latDistance: number; lngDistance: number; maxDistance: number };
  areaKm2?: number; // 面積（km²）
}

export function validatePolygonRange(
  coordinates: number[][],
  maxAreaKm2: number = 2.0
): PolygonValidationResult {
  try {
    const bounds = calculatePolygonBounds(coordinates);
    
    // 中心緯度を計算
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    
    // 距離を推定（参考情報として）
    const distance = estimateDistanceFromRange(bounds.latRange, bounds.lngRange, centerLat);
    
    // 面積を計算
    const areaKm2 = calculatePolygonArea(coordinates);
    
    // 面積チェック
    if (areaKm2 > maxAreaKm2) {
      return {
        isValid: false,
        error: `ポリゴンの範囲が広すぎます。面積は${maxAreaKm2}km²以内にしてください。現在の面積: ${areaKm2.toFixed(2)}km²`,
        bounds,
        distance,
        areaKm2,
      };
    }
    
    return {
      isValid: true,
      bounds,
      distance,
      areaKm2,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'ポリゴンの検証中にエラーが発生しました',
    };
  }
}
