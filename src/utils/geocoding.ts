/**
 * Geocoding API utilities
 * Google Maps Geocoding API を使用して住所から緯度経度を取得
 * 
 * ■ 本番環境
 * - Google Maps Geocoding APIを使用（APIキーが必要）
 * - 正確な緯度経度を返します
 * 
 * ■ 開発環境（モックデータ）
 * - APIキー不要で動作します
 * - 以下の優先順位でマッチング：
 *   1. 特定の住所（完全一致）
 *   2. 市区町村レベルのマッチング（中心座標から±0.02度の範囲でランダム生成）
 *   3. 都道府県レベルのマッチング（中心座標から±0.1度の範囲でランダム生成）
 *   4. マッチなしの場合は東京都の座標をデフォルトで返す
 * - 47都道府県と主要都市（約40都市）の座標データを保持
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  countryCode?: string; // 国コード（例: 'JP'）
  isJapan?: boolean; // 日本国内かどうか
}

export interface GeocodeError {
  address: string;
  error: string;
}

// 都道府県の中心座標データ
const PREFECTURE_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  '北海道': { lat: 43.064615, lng: 141.346807 },
  '青森県': { lat: 40.824308, lng: 140.739998 },
  '岩手県': { lat: 39.703531, lng: 141.152684 },
  '宮城県': { lat: 38.268837, lng: 140.872104 },
  '秋田県': { lat: 39.718614, lng: 140.102364 },
  '山形県': { lat: 38.240436, lng: 140.363633 },
  '福島県': { lat: 37.750299, lng: 140.467551 },
  '茨城県': { lat: 36.341811, lng: 140.446793 },
  '栃木県': { lat: 36.565725, lng: 139.883565 },
  '群馬県': { lat: 36.390668, lng: 139.060406 },
  '埼玉県': { lat: 35.856999, lng: 139.648849 },
  '千葉県': { lat: 35.605057, lng: 140.123306 },
  '東京都': { lat: 35.689487, lng: 139.691706 },
  '神奈川県': { lat: 35.447753, lng: 139.642514 },
  '新潟県': { lat: 37.902418, lng: 139.023221 },
  '富山県': { lat: 36.695291, lng: 137.211338 },
  '石川県': { lat: 36.594682, lng: 136.625573 },
  '福井県': { lat: 36.065178, lng: 136.221527 },
  '山梨県': { lat: 35.664158, lng: 138.568449 },
  '長野県': { lat: 36.651289, lng: 138.180956 },
  '岐阜県': { lat: 35.391227, lng: 136.722291 },
  '静岡県': { lat: 34.976987, lng: 138.383084 },
  '愛知県': { lat: 35.180188, lng: 136.906565 },
  '三重県': { lat: 34.730283, lng: 136.508588 },
  '滋賀県': { lat: 35.004531, lng: 135.868605 },
  '京都府': { lat: 35.021247, lng: 135.755597 },
  '大阪府': { lat: 34.686297, lng: 135.519661 },
  '兵庫県': { lat: 34.691269, lng: 135.183071 },
  '奈良県': { lat: 34.685334, lng: 135.832748 },
  '和歌山県': { lat: 34.226034, lng: 135.167509 },
  '鳥取県': { lat: 35.503891, lng: 134.237736 },
  '島根県': { lat: 35.472295, lng: 133.050651 },
  '岡山県': { lat: 34.661751, lng: 133.934406 },
  '広島県': { lat: 34.396642, lng: 132.459595 },
  '山口県': { lat: 34.186211, lng: 131.470513 },
  '徳島県': { lat: 34.065718, lng: 134.559293 },
  '香川県': { lat: 34.340149, lng: 134.043444 },
  '愛媛県': { lat: 33.841624, lng: 132.765681 },
  '高知県': { lat: 33.559706, lng: 133.531096 },
  '福岡県': { lat: 33.606576, lng: 130.418297 },
  '佐賀県': { lat: 33.249442, lng: 130.299794 },
  '長崎県': { lat: 32.744839, lng: 129.873756 },
  '熊本県': { lat: 32.789827, lng: 130.741667 },
  '大分県': { lat: 33.238172, lng: 131.612619 },
  '宮崎県': { lat: 31.911096, lng: 131.423855 },
  '鹿児島県': { lat: 31.560146, lng: 130.557978 },
  '沖縄県': { lat: 26.212401, lng: 127.680932 },
};

// 主要都市の座標データ
const CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  // 東京都
  '新宿区': { lat: 35.694003, lng: 139.703790 },
  '渋谷区': { lat: 35.663991, lng: 139.698334 },
  '港区': { lat: 35.658034, lng: 139.751387 },
  '千代田区': { lat: 35.694003, lng: 139.753634 },
  '中央区': { lat: 35.670479, lng: 139.772695 },
  '品川区': { lat: 35.609039, lng: 139.730103 },
  '目黒区': { lat: 35.642297, lng: 139.698134 },
  '大田区': { lat: 35.561297, lng: 139.716119 },
  '世田谷区': { lat: 35.646389, lng: 139.653244 },
  '中野区': { lat: 35.707413, lng: 139.663618 },
  '杉並区': { lat: 35.699167, lng: 139.636364 },
  '豊島区': { lat: 35.732297, lng: 139.715092 },
  '北区': { lat: 35.753349, lng: 139.736339 },
  '荒川区': { lat: 35.736297, lng: 139.783264 },
  '板橋区': { lat: 35.751297, lng: 139.708414 },
  '練馬区': { lat: 35.735297, lng: 139.651962 },
  '足立区': { lat: 35.775391, lng: 139.804108 },
  '葛飾区': { lat: 35.743297, lng: 139.848739 },
  '江戸川区': { lat: 35.707230, lng: 139.868149 },
  '八王子市': { lat: 35.655555, lng: 139.338989 },
  '立川市': { lat: 35.698353, lng: 139.413333 },
  '武蔵野市': { lat: 35.701763, lng: 139.566317 },
  '三鷹市': { lat: 35.683061, lng: 139.559455 },
  '府中市': { lat: 35.669167, lng: 139.477778 },
  '町田市': { lat: 35.546945, lng: 139.438611 },
  
  // 神奈川県
  '横浜市': { lat: 35.447753, lng: 139.642514 },
  '川崎市': { lat: 35.530895, lng: 139.703140 },
  '相模原市': { lat: 35.565556, lng: 139.371111 },
  '横須賀市': { lat: 35.283889, lng: 139.667222 },
  '鎌倉市': { lat: 35.319167, lng: 139.546111 },
  '藤沢市': { lat: 35.338889, lng: 139.489722 },
  
  // 大阪府
  '大阪市': { lat: 34.693737, lng: 135.502165 },
  '堺市': { lat: 34.573405, lng: 135.482897 },
  '豊中市': { lat: 34.781389, lng: 135.469167 },
  '吹田市': { lat: 34.761667, lng: 135.516111 },
  '高槻市': { lat: 34.848611, lng: 135.616944 },
  '枚方市': { lat: 34.814167, lng: 135.654722 },
  '茨木市': { lat: 34.816667, lng: 135.568611 },
  '八尾市': { lat: 34.626667, lng: 135.600278 },
  '寝屋川市': { lat: 34.766111, lng: 135.627222 },
  
  // 愛知県
  '名古屋市': { lat: 35.181446, lng: 136.906398 },
  '豊田市': { lat: 35.083333, lng: 137.155556 },
  '岡崎市': { lat: 34.954722, lng: 137.174167 },
  '一宮市': { lat: 35.303333, lng: 136.803889 },
  '春日井市': { lat: 35.247778, lng: 136.970833 },
  
  // 福岡県
  '福岡市': { lat: 33.590355, lng: 130.401716 },
  '北九州市': { lat: 33.883611, lng: 130.875278 },
  '久留米市': { lat: 33.319444, lng: 130.508333 },
  
  // 北海道
  '札幌市': { lat: 43.064615, lng: 141.346807 },
  '旭川市': { lat: 43.770556, lng: 142.364722 },
  '函館市': { lat: 41.768793, lng: 140.729086 },
  
  // その他主要都市
  '仙台市': { lat: 38.268215, lng: 140.869356 },
  '京都市': { lat: 35.021247, lng: 135.755597 },
  '神戸市': { lat: 34.690083, lng: 135.195511 },
  '広島市': { lat: 34.396642, lng: 132.459595 },
};

// 開発環境用のモックデータ（特定の住所）
const MOCK_GEOCODE_DATA: { [key: string]: GeocodeResult } = {
  '東京都新宿区新宿3-38-1': {
    latitude: 35.690921,
    longitude: 139.700258,
    formattedAddress: '日本、〒160-0022 東京都新宿区新宿３丁目３８−１',
    countryCode: 'JP',
    isJapan: true,
  },
  '東京都渋谷区道玄坂2-1': {
    latitude: 35.659517,
    longitude: 139.700572,
    formattedAddress: '日本、〒150-0043 東京都渋谷区道玄坂２丁目１',
    countryCode: 'JP',
    isJapan: true,
  },
  '東京都千代田区丸の内1-9-1': {
    latitude: 35.681236,
    longitude: 139.767125,
    formattedAddress: '日本、〒100-0005 東京都千代田区丸の内１丁目９−１',
    countryCode: 'JP',
    isJapan: true,
  },
  '東京都港区六本木6-10-1': {
    latitude: 35.664706,
    longitude: 139.729493,
    formattedAddress: '日本、〒106-0032 東京都港区六本木６丁目１０−１',
    countryCode: 'JP',
    isJapan: true,
  },
  '東京都豊島区南池袋1-28-1': {
    latitude: 35.728926,
    longitude: 139.710388,
    formattedAddress: '日本、〒171-0022 東京都豊島区南池袋１丁目２８−１',
    countryCode: 'JP',
    isJapan: true,
  },
};

// Google Maps Geocoding API の設定（Viteビルド時に VITE_GOOGLE_MAPS_API_KEY を注入、main.tsx で process.env にも設定）
const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && process?.env?.GOOGLE_MAPS_API_KEY) ||
  'YOUR_API_KEY_HERE';
const USE_MOCK_DATA = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE';

export function isGeocodingConfigured(): boolean {
  return !USE_MOCK_DATA;
}

// ジオコーディング結果のキャッシュ（メモリ内）
// APIコストを削減するため、同じ住所に対するリクエストを避ける
// 注意: ブラウザをリロードするとキャッシュはクリアされます
// 本番環境では Redis や localStorage の利用を推奨
const geocodeCache = new Map<string, GeocodeResult>();

// キャッシュの統計情報（デバッグ用）
let cacheHits = 0;
let cacheMisses = 0;

/**
 * 緯度経度が日本国内かどうかを判定
 */
function isInJapan(latitude: number, longitude: number): boolean {
  // 日本の範囲: 緯度 24-46度、経度 123-146度
  return latitude >= 24 && latitude <= 46 && longitude >= 123 && longitude <= 146;
}

/**
 * 住所から緯度経度を取得（単一）
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim() === '') {
    throw new Error('住所が指定されていません');
  }

  // 住所を正規化（前後の空白を削除）
  const normalizedAddress = address.trim();

  // キャッシュをチェック
  if (geocodeCache.has(normalizedAddress)) {
    cacheHits++;
    console.log(`📍 Geocode cache HIT: "${normalizedAddress}" (hits: ${cacheHits}, misses: ${cacheMisses})`);
    return geocodeCache.get(normalizedAddress)!;
  }

  cacheMisses++;

  // モックデータを使用
  if (USE_MOCK_DATA) {
    throw new Error('Google Maps APIキーが設定されていないため、緯度経度を取得できません。管理者に連絡してください。');
  }

  // Google Maps Geocoding API を使用
  try {
    const encodedAddress = encodeURIComponent(normalizedAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&language=ja`;
    
    console.log(`🌐 Geocoding API request: "${normalizedAddress}"`);
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
    }
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const latitude = result.geometry.location.lat;
      const longitude = result.geometry.location.lng;
      
      // 国コードを取得
      const countryComponent = result.address_components?.find((component: any) => 
        component.types.includes('country')
      );
      const countryCode = countryComponent?.short_name || '';
      const isJapan = countryCode === 'JP' || isInJapan(latitude, longitude);
      
      const geocodeResult = {
        latitude,
        longitude,
        formattedAddress: result.formatted_address,
        countryCode,
        isJapan,
      };
      
      // 成功した結果をキャッシュに保存
      geocodeCache.set(normalizedAddress, geocodeResult);
      console.log(`✅ Geocoding success: "${normalizedAddress}" -> (${latitude}, ${longitude}), Country: ${countryCode}, IsJapan: ${isJapan}`);
      
      return geocodeResult;
    } else if (data.status === 'ZERO_RESULTS') {
      throw new Error('住所が見つかりませんでした');
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('API利用制限に達しました。しばらくしてから再度お試しください');
    } else if (data.status === 'REQUEST_DENIED') {
      throw new Error('APIキーが無効または制限されています。管理者に連絡してください');
    } else if (data.status === 'INVALID_REQUEST') {
      throw new Error('住所の形式が正しくありません');
    } else if (data.status === 'UNKNOWN_ERROR') {
      throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
    } else {
      throw new Error('緯度経度の取得に失敗しました');
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * 住所から緯度経度を取得（モック版）
 */
async function geocodeAddressMock(address: string): Promise<GeocodeResult> {
  // 遅延をシミュレート
  await new Promise(resolve => setTimeout(resolve, 300));

  // 1. 完全一致を探す
  if (MOCK_GEOCODE_DATA[address]) {
    return MOCK_GEOCODE_DATA[address];
  }

  // 2. 特定の住所の部分一致を探す
  for (const [mockAddress, result] of Object.entries(MOCK_GEOCODE_DATA)) {
    if (address.includes(mockAddress) || mockAddress.includes(address)) {
      return result;
    }
  }

  // 3. 市区町村レベルでマッチング
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (address.includes(city)) {
      // 市区町村内でランダムな座標を生成（中心から±0.02度の範囲）
      const latOffset = (Math.random() - 0.5) * 0.04;
      const lngOffset = (Math.random() - 0.5) * 0.04;
      const latitude = parseFloat((coords.lat + latOffset).toFixed(6));
      const longitude = parseFloat((coords.lng + lngOffset).toFixed(6));
      
      return {
        latitude,
        longitude,
        formattedAddress: address,
        countryCode: 'JP',
        isJapan: isInJapan(latitude, longitude),
      };
    }
  }

  // 4. 都道府県レベルでマッチング
  for (const [prefecture, coords] of Object.entries(PREFECTURE_COORDINATES)) {
    if (address.includes(prefecture)) {
      // 都道府県内でランダムな座標を生成（中心から±0.1度の範囲）
      const latOffset = (Math.random() - 0.5) * 0.2;
      const lngOffset = (Math.random() - 0.5) * 0.2;
      const latitude = parseFloat((coords.lat + latOffset).toFixed(6));
      const longitude = parseFloat((coords.lng + lngOffset).toFixed(6));
      
      return {
        latitude,
        longitude,
        formattedAddress: address,
        countryCode: 'JP',
        isJapan: isInJapan(latitude, longitude),
      };
    }
  }

  // 5. マッチしない場合は東京都の座標をデフォルトで返す
  console.warn(`住所 "${address}" に一致する座標が見つかりませんでした。東京都の座標を返します。`);
  
  const tokyoCoords = PREFECTURE_COORDINATES['東京都'];
  const latOffset = (Math.random() - 0.5) * 0.2;
  const lngOffset = (Math.random() - 0.5) * 0.2;
  const latitude = parseFloat((tokyoCoords.lat + latOffset).toFixed(6));
  const longitude = parseFloat((tokyoCoords.lng + lngOffset).toFixed(6));
  
  return {
    latitude,
    longitude,
    formattedAddress: address,
    countryCode: 'JP',
    isJapan: isInJapan(latitude, longitude),
  };
}

/**
 * 複数の住所から緯度経度を一括取得
 */
export async function geocodeAddressesBatch(
  addresses: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ results: GeocodeResult[]; errors: GeocodeError[] }> {
  const results: GeocodeResult[] = [];
  const errors: GeocodeError[] = [];

  for (let i = 0; i < addresses.length; i++) {
    try {
      const result = await geocodeAddress(addresses[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }

      // レート制限対策（Google Maps APIは1秒あたり50リクエストまで）
      if (!USE_MOCK_DATA && i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      errors.push({
        address: addresses[i],
        error: error instanceof Error ? error.message : 'ジオコーディングに失敗しました',
      });
      
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }
    }
  }

  return { results, errors };
}

/**
 * POIデータに緯度経度を追加
 */
export async function enrichPOIsWithGeocode<T extends { address?: string; latitude?: number; longitude?: number; prefectures?: string[]; cities?: string[] }>(
  pois: T[],
  onProgress?: (current: number, total: number) => void
): Promise<{ enriched: T[]; errors: GeocodeError[] }> {
  const enriched: T[] = [];
  const errors: GeocodeError[] = [];

  // 既に緯度経度があるPOIを先に追加
  const poisWithCoords: T[] = [];
  const poisNeedingGeocode: T[] = [];

  for (const poi of pois) {
    const hasCoords = poi.latitude !== undefined && poi.latitude !== null && 
                      poi.longitude !== undefined && poi.longitude !== null &&
                      poi.latitude !== 0 && poi.longitude !== 0;
    
    if (hasCoords) {
      poisWithCoords.push(poi);
    } else {
      // 住所がある場合、または都道府県・市区町村がある場合（都道府県指定の地点）
      const hasAddress = poi.address && poi.address.trim() !== '';
      const hasPrefecture = poi.prefectures && poi.prefectures.length > 0;
      
      if (hasAddress || hasPrefecture) {
        poisNeedingGeocode.push(poi);
      } else {
        // 住所も都道府県もない場合はそのまま追加
        poisWithCoords.push(poi);
      }
    }
  }

  let processedCount = 0;
  const totalToProcess = poisNeedingGeocode.length;

  console.log(`🗺️ enrichPOIsWithGeocode: 総地点数=${pois.length}, 既に緯度経度あり=${poisWithCoords.length}, ジオコーディング必要=${totalToProcess}`);

  // ジオコーディングが必要なPOIを処理
  for (const poi of poisNeedingGeocode) {
    try {
      let addressToGeocode: string;
      
      // 住所がある場合はそれを使用、ない場合は都道府県・市区町村から推測
      const hasAddress = poi.address && poi.address.trim() !== '';
      if (hasAddress) {
        addressToGeocode = poi.address!;
      } else {
        // 都道府県・市区町村から住所を推測
        const prefecture = poi.prefectures?.[0] || '';
        const city = poi.cities?.[0] || '';
        addressToGeocode = `${prefecture}${city}`;
      }
      
      console.log(`🌐 Geocoding ${processedCount + 1}/${totalToProcess}: "${addressToGeocode}"`);
      const result = await geocodeAddress(addressToGeocode);
      
      // 海外の地点が検出された場合はエラーとして扱う
      if (result.isJapan === false) {
        errors.push({
          address: addressToGeocode,
          error: '海外の地点が検出されました。日本国内の住所を入力してください。',
        });
      enriched.push(poi);
        processedCount++;
        if (onProgress) {
          onProgress(processedCount, totalToProcess);
        }
      continue;
    }

      enriched.push({
        ...poi,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      
      processedCount++;
      console.log(`✅ Geocoded ${processedCount}/${totalToProcess}: "${addressToGeocode}" -> (${result.latitude}, ${result.longitude})`);
      
      if (onProgress) {
        onProgress(processedCount, totalToProcess);
      }

      // レート制限対策
      if (!USE_MOCK_DATA && processedCount < totalToProcess) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      const addressToGeocode = poi.address || (poi.prefectures?.[0] + poi.cities?.[0]) || '不明';
      errors.push({
        address: addressToGeocode,
        error: error instanceof Error ? error.message : 'ジオコーディングに失敗しました',
      });
      
      // エラーの場合も元のPOIを追加
      enriched.push(poi);
      
      processedCount++;
      console.error(`❌ Geocoding failed ${processedCount}/${totalToProcess}: "${addressToGeocode}"`, error);
      
      if (onProgress) {
        onProgress(processedCount, totalToProcess);
      }
    }
  }

  // 既に緯度経度があるPOIとジオコーディング済みのPOIを結合
  const allEnriched = [...poisWithCoords, ...enriched];
  
  console.log(`✅ enrichPOIsWithGeocode完了: 処理済み=${processedCount}, エラー=${errors.length}, 総結果=${allEnriched.length}`);

  return { enriched: allEnriched, errors };
}

/**
 * キャッシュ統計を取得（デバッグ・コスト監視用）
 */
export function getGeocodeStats() {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(1) : '0.0';
  
  return {
    cacheHits,
    cacheMisses,
    cacheSize: geocodeCache.size,
    totalRequests,
    hitRate: `${hitRate}%`,
    estimatedCost: USE_MOCK_DATA ? 0 : calculateEstimatedCost(cacheMisses),
  };
}

/**
 * キャッシュをクリア
 */
export function clearGeocodeCache() {
  const size = geocodeCache.size;
  geocodeCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  console.log(`🗑️ Geocode cache cleared (${size} entries)`);
}

/**
 * キャッシュ統計をコンソールに表示
 */
export function logGeocodeStats() {
  const stats = getGeocodeStats();
  console.log('📊 Geocoding Statistics:');
  console.log(`  Cache Hits: ${stats.cacheHits}`);
  console.log(`  Cache Misses (API Calls): ${stats.cacheMisses}`);
  console.log(`  Cache Size: ${stats.cacheSize} entries`);
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Cache Hit Rate: ${stats.hitRate}`);
  console.log(`  Estimated Cost: $${stats.estimatedCost.toFixed(4)}`);
  console.log(`  Using: ${USE_MOCK_DATA ? 'Mock Data (Free)' : 'Google Maps API'}`);
}

/**
 * APIコストを推定（Google Maps Geocoding API料金に基づく）
 */
function calculateEstimatedCost(apiCalls: number): number {
  // Google Maps Geocoding API 料金 (2024年時点)
  // 無料枠: 40,000リクエスト/月（$200クレジット）
  // 40,001-100,000: $5.00/1,000リクエスト
  // 100,001-500,000: $4.00/1,000リクエスト
  // 500,001+: $3.50/1,000リクエスト
  
  if (apiCalls <= 40000) {
    return 0; // 無料枠内
  } else if (apiCalls <= 100000) {
    return ((apiCalls - 40000) / 1000) * 5.00;
  } else if (apiCalls <= 500000) {
    const tier1 = (60000 / 1000) * 5.00; // 40,001-100,000
    const tier2 = ((apiCalls - 100000) / 1000) * 4.00; // 100,001-500,000
    return tier1 + tier2;
  } else {
    const tier1 = (60000 / 1000) * 5.00; // 40,001-100,000
    const tier2 = (400000 / 1000) * 4.00; // 100,001-500,000
    const tier3 = ((apiCalls - 500000) / 1000) * 3.50; // 500,001+
    return tier1 + tier2 + tier3;
  }
}
