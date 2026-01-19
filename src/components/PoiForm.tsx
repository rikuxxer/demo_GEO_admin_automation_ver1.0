import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, MapPin, Building2, Package, Calendar, Clock, Users, Target, Check, ChevronDown, Settings, Settings2, AlertCircle, Loader2, Upload, Download, FileText, CheckCircle, PenLine, Table, Database } from 'lucide-react';
import { PoiInfo, Segment, POI_TYPE_OPTIONS, ATTRIBUTE_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { Badge } from './ui/badge';
import { getPrefectures, getCitiesByPrefecture } from '../utils/prefectureData';
import { geocodeAddress } from '../utils/geocoding';
import { toast } from 'sonner';
import { CSVValidationError, parseAndValidateExcel, downloadExcelTemplate } from '../utils/csvParser';
import { PolygonMapEditor } from './PolygonMapEditor';
import { validatePolygonRange } from '../utils/polygonUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface PoiFormProps {
  projectId: string;
  segmentId: string;
  segmentName?: string;
  segment?: Segment;
  pois?: PoiInfo[];
  poi?: PoiInfo | null;
  defaultCategory?: 'tg' | 'visit_measurement';
  defaultGroupId?: string | null;
  visitMeasurementGroups?: Array<{ group_id: string; group_name: string }>;
  onSubmit: (poi: Partial<PoiInfo>) => void;
  onBulkSubmit?: (pois: Partial<PoiInfo>[]) => void;
  onCancel: () => void;
}

export function PoiForm({ projectId, segmentId, segmentName, segment, pois = [], poi, defaultCategory, defaultGroupId, visitMeasurementGroups = [], onSubmit, onBulkSubmit, onCancel }: PoiFormProps) {
  // このセグメントに属する地点数を確認
  const segmentPoiCount = pois.filter(p => p.segment_id === segmentId).length;
  
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  const isFirstPoi = segmentPoiCount === 0 && !poi;
  
  // セグメントに共通条件が設定されているかチェック
  const hasSegmentCommonConditions = segment && segment.designated_radius;
  
  // 来店計測地点はセグメントに従属しないため、セグメントの状態に関係なく編集可能
  const isVisitMeasurement = poi?.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement';
  
  // 格納依頼済みの場合は編集不可（来店計測地点を除く）
  const isLocationLocked = !isVisitMeasurement && segment && segment.location_request_status !== 'not_requested';
  
  // 格納依頼済みの場合はフォームを表示しない（来店計測地点を除く）
  if (isLocationLocked) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">地点の編集はできません</h3>
            <p className="text-sm text-gray-600 mb-6">
              このセグメントは既に格納依頼が完了しているため、地点の追加・編集・削除はできません。
            </p>
            <Button
              onClick={onCancel}
              className="bg-[#5b5fff] text-white hover:bg-[#5b5fff]/90"
            >
              閉じる
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<Partial<PoiInfo>>({
    project_id: projectId,
    segment_id: segmentId,
    poi_type: poi?.poi_type || 'manual',
    poi_category: poi?.poi_category || defaultCategory || undefined,
    visit_measurement_group_id: poi?.visit_measurement_group_id || defaultGroupId || undefined,
    poi_name: poi?.poi_name || '',
    address: poi?.address || '',
    // 地点IDは自動採番のため入力不可
    location_id: poi?.location_id || undefined,
    prefectures: poi?.prefectures || [],
    cities: poi?.cities || [],
    latitude: poi?.latitude,
    longitude: poi?.longitude,
    polygon: poi?.polygon || undefined,
    // 編集時は既存の地点データを使用、新規登録時はセグメント共通条件があればそれを使用、なければ空
    designated_radius: poi?.designated_radius || (segment?.designated_radius ? segment.designated_radius : ''),
    extraction_period: poi?.extraction_period || (segment?.extraction_period ? segment.extraction_period : ''),
    extraction_period_type: poi?.extraction_period_type || (segment?.extraction_period_type ? segment.extraction_period_type : 'preset'),
    extraction_start_date: poi?.extraction_start_date || (segment?.extraction_start_date ? segment.extraction_start_date : ''),
    extraction_end_date: poi?.extraction_end_date || (segment?.extraction_end_date ? segment.extraction_end_date : ''),
    attribute: poi?.attribute || segment?.attribute || undefined,
    detection_count: poi?.detection_count || (segment?.detection_count ? segment.detection_count : undefined),
    detection_time_start: poi?.detection_time_start || (segment?.detection_time_start ? segment.detection_time_start : ''),
    detection_time_end: poi?.detection_time_end || (segment?.detection_time_end ? segment.detection_time_end : ''),
    stay_time: poi?.stay_time || (segment?.stay_time ? segment.stay_time : ''),
  });

  const [currentStep, setCurrentStep] = useState<'info' | 'conditions'>('info');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showPrefectureDropdown, setShowPrefectureDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [autoSelectAllCities, setAutoSelectAllCities] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showExtractionConditionsPopup, setShowExtractionConditionsPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CSV関連のState
  // 新規登録時は表形式コピペをデフォルトに、編集時は既存のpoi_typeを使用
  const [entryMethod, setEntryMethod] = useState<string>(poi ? (poi.poi_type || 'manual') : 'paste');
  const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
  const [parsedPois, setParsedPois] = useState<Partial<PoiInfo>[]>([]);
  const [csvErrors, setCsvErrors] = useState<CSVValidationError[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // バッチ処理用の状態
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);

  // 表形式コピペ関連のState
  const [pasteStep, setPasteStep] = useState<'paste' | 'preview'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [pastedHtml, setPastedHtml] = useState<string>('');
  const [parsedPastePois, setParsedPastePois] = useState<Partial<PoiInfo>[]>([]);
  const [pasteErrors, setPasteErrors] = useState<CSVValidationError[]>([]);
  const [isPasteProcessing, setIsPasteProcessing] = useState(false);
  const [isGeocodingPaste, setIsGeocodingPaste] = useState(false);
  // 一括登録用のグループ選択
  const [bulkGroupId, setBulkGroupId] = useState<string | null>(defaultGroupId || null);
  // ポリゴン選択関連のState
  const [polygons, setPolygons] = useState<Array<{ id: string; coordinates: number[][]; name?: string }>>(
    poi?.polygon ? [{ id: 'polygon-0', coordinates: poi.polygon, name: poi.poi_name || '' }] : []
  );
  const [showPolygonEditor, setShowPolygonEditor] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | undefined>(undefined);
  // 表形式コピペ用の抽出条件
  const [pasteExtractionConditions, setPasteExtractionConditions] = useState<{
    designated_radius: string;
    extraction_period: string;
    extraction_period_type: 'preset' | 'custom';
    attribute: 'detector' | 'resident' | 'worker' | 'resident_and_worker';
    detection_count: number | undefined;
    detection_time_start: string;
    detection_time_end: string;
    stay_time: string;
  }>({
    designated_radius: segment?.designated_radius || '',
    extraction_period: segment?.extraction_period || '1month',
    extraction_period_type: segment?.extraction_period_type || 'preset',
    attribute: (segment?.attribute || 'detector') as 'detector' | 'resident' | 'worker' | 'resident_and_worker',
    detection_count: segment?.detection_count || 1,
    detection_time_start: segment?.detection_time_start || '',
    detection_time_end: segment?.detection_time_end || '',
    stay_time: segment?.stay_time || '',
  });
  const pasteTableRef = useRef<HTMLDivElement>(null);
  
  // 一括登録時の地点カテゴリ選択
  const [bulkPoiCategory, setBulkPoiCategory] = useState<'tg' | 'visit_measurement'>(defaultCategory || 'tg');

  const handleEntryMethodChange = (value: string) => {
    setEntryMethod(value);
    if (value === 'prefecture') {
      handleChange('poi_type', 'prefecture');
    } else if (value === 'polygon') {
      handleChange('poi_type', 'polygon');
      setShowPolygonEditor(true);
    } else if (value !== 'csv' && value !== 'paste') {
      handleChange('poi_type', value);
    }
  };

  // ポリゴンデータの更新ハンドラ
  const handlePolygonsChange = (newPolygons: Array<{ id: string; coordinates: number[][]; name?: string }>) => {
    setPolygons(newPolygons);
    // 最初のポリゴンの座標と地点名をformDataに保存（編集時の単一ポリゴン用）
    if (newPolygons.length > 0) {
      setFormData(prev => ({
        ...prev,
        polygon: newPolygons[0].coordinates,
        poi_name: newPolygons[0].name ?? prev.poi_name,
      }));
    } else {
      setFormData(prev => ({ ...prev, polygon: undefined }));
    }
  };

  const handlePolygonNameUpdate = (polygonId: string, value: string) => {
    const updatedPolygons = polygons.map((polygon) =>
      polygon.id === polygonId ? { ...polygon, name: value } : polygon
    );
    handlePolygonsChange(updatedPolygons);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsCsvProcessing(true);

    try {
      // Excelファイルとして処理
      const result = await parseAndValidateExcel(selectedFile, projectId, segmentId, false);
      
      // 処理上限チェック（最大5000件）
      if (result.success.length > 5000) {
        toast.error('一度に登録できる地点数は最大5000件です。データを分割して登録してください。', {
          duration: 5000,
        });
        handleResetCsv();
        return;
      }

      // 大量登録の警告
      if (result.success.length > 1000) {
        toast.warning(`${result.success.length}件の大量登録です。バックグラウンドで分割処理を行います。`, {
          duration: 5000,
        });
      } else if (result.success.length > 100) {
        toast.warning(`${result.success.length}件の地点を登録します。ジオコーディングに時間がかかる場合があります。`, {
          duration: 5000,
        });
      }
      
      setParsedPois(result.success);
      setCsvErrors(result.errors);
      setCsvTotalRows(result.total);
      
      if (result.total === 0) {
        toast.error('ファイルにデータ行が含まれていません');
        handleResetCsv();
        return;
      }
      
      setCsvStep('preview');
      
      // 自動的にジオコーディングを実行
      const needsGeocoding = result.success.filter(poi => 
        (poi.latitude === undefined || poi.latitude === null || 
         poi.longitude === undefined || poi.longitude === null) && 
        poi.address && poi.address.trim() !== ''
      );
      
      if (needsGeocoding.length > 0) {
        // バックグラウンドで自動ジオコーディングを実行
        setTimeout(async () => {
          const updatedPois = [...result.success];
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < updatedPois.length; i++) {
            const poi = updatedPois[i];
            
            // 既に緯度経度がある場合はスキップ
            if (poi.latitude !== undefined && poi.latitude !== null && 
                poi.longitude !== undefined && poi.longitude !== null) {
              continue;
            }

            // 住所がない場合はスキップ
            if (!poi.address || poi.address.trim() === '') {
              continue;
            }

            try {
              const geocodeResult = await geocodeAddress(poi.address);
              // 海外の地点が検出された場合はエラーとして扱う
              if (geocodeResult.isJapan === false) {
                errorCount++;
                console.error(`海外の地点が検出されました: "${poi.address}"`);
                // エラーとして扱うが、緯度経度は設定しない
                continue;
              }
              updatedPois[i] = {
                ...poi,
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude,
              };
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Geocoding error for "${poi.address}":`, error);
            }

            // レート制限対策
            if (i < updatedPois.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          setParsedPois(updatedPois);
          
          if (successCount > 0) {
            toast.success(`${successCount}件の地点の緯度経度を自動取得しました`);
          }
          if (errorCount > 0) {
            toast.error(`${errorCount}件の地点で緯度経度の取得に失敗しました（海外の地点が含まれている可能性があります）`, {
              duration: 5000,
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error('File parse error:', error);
      toast.error('ファイルの読み込みに失敗しました');
      handleResetCsv();
    } finally {
      setIsCsvProcessing(false);
    }
  };

  const handleResetCsv = () => {
    setCsvStep('upload');
    setParsedPois([]);
    setCsvErrors([]);
    setCsvTotalRows(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 重複地点を削除する関数（TG地点の場合のみ）
  const removeDuplicatePois = (pois: Partial<PoiInfo>[]): { filtered: Partial<PoiInfo>[]; removedCount: number } => {
    // TG地点の場合のみ重複チェック
    const tgPois = pois.filter(poi => (poi.poi_category || defaultCategory) === 'tg');
    const nonTgPois = pois.filter(poi => (poi.poi_category || defaultCategory) !== 'tg');
    
    if (tgPois.length === 0) {
      return { filtered: pois, removedCount: 0 };
    }

    const seen = new Map<string, number>();
    const filtered: Partial<PoiInfo>[] = [];
    let removedCount = 0;

    // TG地点の重複チェック
    for (const poi of tgPois) {
      const poiName = (poi.poi_name || '').trim();
      const address = (poi.address || '').trim();
      
      // 地点名と住所の両方が存在する場合のみ重複チェック
      if (poiName && address) {
        const key = `${poiName}|${address}`;
        if (seen.has(key)) {
          removedCount++;
          continue;
        }
        seen.set(key, 1);
      }
      filtered.push(poi);
    }

    // 非TG地点はそのまま追加
    filtered.push(...nonTgPois);

    return { filtered, removedCount };
  };

  const handleCsvSubmit = async () => {
    if (onBulkSubmit) {
      setErrorMessage(null); // エラーメッセージをクリア
      // 都道府県指定の地点が存在する場合はエラー
      const existingPrefecturePois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'prefecture'
      );
      if (existingPrefecturePois.length > 0) {
        const errorMsg = '都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません';
        setErrorMessage(errorMsg);
        return;
      }

      // カテゴリが未設定の場合はデフォルトカテゴリまたは選択されたカテゴリを設定
      const poisWithCategory = parsedPois.map(poi => ({
        ...poi,
        poi_category: poi.poi_category || defaultCategory || bulkPoiCategory,
        location_id: undefined, // 地点IDは自動採番
      }));
      
      // TG地点の場合、重複を削除
      const { filtered, removedCount } = removeDuplicatePois(poisWithCategory);
      
      if (removedCount > 0) {
        toast.info(`${removedCount}件の重複地点を削除しました`);
      }
      
      // 1000件以上の場合はバッチ処理
      if (filtered.length >= 1000) {
        await processBatchSubmit(filtered);
      } else {
        onBulkSubmit(filtered);
      }
    }
  };

  // HTMLテーブルからデータを抽出
  const extractDataFromHtmlTable = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) {
      return '';
    }

    const rows: string[] = [];
    const tableRows = table.querySelectorAll('tr');
    
    tableRows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const rowData = Array.from(cells).map(cell => cell.textContent?.trim() || '').join('\t');
      if (rowData.trim()) {
        rows.push(rowData);
      }
    });

    return rows.join('\n');
  };

  // 表形式コピペのパース機能
  const parsePastedTable = (text: string): { pois: Partial<PoiInfo>[]; errors: CSVValidationError[] } => {
    const pois: Partial<PoiInfo>[] = [];
    const errors: CSVValidationError[] = [];
    
    if (!text || text.trim() === '') {
      return { pois, errors };
    }

    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return { pois, errors };
    }

    // 最初の行をヘッダーとして扱う（オプション）
    // タブ区切りかカンマ区切りかを自動判定
    const firstLine = lines[0];
    const isTabDelimited = firstLine.includes('\t');
    const delimiter = isTabDelimited ? '\t' : ',';
    
    // ヘッダー行があるかチェック（地点名、住所などの列名がある場合）
    let startIndex = 0;
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('地点名') || headerLine.includes('住所') || 
                      headerLine.includes('poi_name') || headerLine.includes('address');
    
    if (hasHeader) {
      startIndex = 1;
    }

    // 列のインデックスを推測（地点名、住所、緯度、経度）
    const headerColumns = hasHeader ? lines[0].split(delimiter).map(col => col.trim().toLowerCase()) : [];
    const getColumnIndex = (keywords: string[]): number => {
      for (let i = 0; i < headerColumns.length; i++) {
        const col = headerColumns[i];
        if (keywords.some(keyword => col.includes(keyword))) {
          return i;
        }
      }
      return -1;
    };

    const poiNameIndex = hasHeader ? getColumnIndex(['地点名', 'poi_name', '名称', 'name']) : 0;
    const addressIndex = hasHeader ? getColumnIndex(['住所', 'address', 'アドレス']) : 1;
    const latIndex = hasHeader ? getColumnIndex(['緯度', 'latitude', 'lat']) : 2;
    const lngIndex = hasHeader ? getColumnIndex(['経度', 'longitude', 'lng', 'lon']) : 3;
    // 地点IDは自動採番のためCSVでは使用しない

    // データ行を処理
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(delimiter).map(col => col.trim());
      
      const poiName = poiNameIndex >= 0 && poiNameIndex < columns.length ? columns[poiNameIndex] : '';
      const address = addressIndex >= 0 && addressIndex < columns.length ? columns[addressIndex] : '';
      const latStr = latIndex >= 0 && latIndex < columns.length ? columns[latIndex] : '';
      const lngStr = lngIndex >= 0 && lngIndex < columns.length ? columns[lngIndex] : '';
      // 必須チェック：地点名と住所
      if (!poiName || poiName.trim() === '') {
        errors.push({
          row: i + 1,
          field: '地点名',
          message: '地点名は必須です',
          value: poiName,
        });
        continue;
      }

      if (!address || address.trim() === '') {
        errors.push({
          row: i + 1,
          field: '住所',
          message: '住所は必須です',
          value: address,
        });
        continue;
      }

      // 緯度経度の変換
      let latitude: number | undefined = undefined;
      let longitude: number | undefined = undefined;
      
      if (latStr && lngStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          latitude = lat;
          longitude = lng;
        }
      }

      const poi: Partial<PoiInfo> = {
        project_id: projectId,
        segment_id: segmentId,
        poi_type: 'manual',
        poi_name: poiName.trim(),
        address: address.trim(),
        latitude,
        longitude,
      };

      pois.push(poi);
    }

    return { pois, errors };
  };

  // 貼り付けイベントハンドラー
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');
    
    if (htmlData && htmlData.includes('<table')) {
      // HTMLテーブル形式の場合
      setPastedHtml(htmlData);
      const extractedText = extractDataFromHtmlTable(htmlData);
      setPastedText(extractedText);
      
      // 自動的に解析を実行
      setTimeout(() => {
        handlePasteProcess(extractedText);
      }, 100);
    } else if (textData) {
      // プレーンテキストの場合
      setPastedText(textData);
      setPastedHtml('');
      
      // 自動的に解析を実行
      setTimeout(() => {
        handlePasteProcess(textData);
      }, 100);
    }
  };

  // 表形式コピペの処理
  const handlePasteProcess = async (text?: string) => {
    const dataToProcess = text || pastedText;
    
    if (!dataToProcess || dataToProcess.trim() === '') {
      toast.error('データを貼り付けてください');
      return;
    }

    setIsPasteProcessing(true);
    setPasteErrors([]);
    setParsedPastePois([]);

    try {
      const result = parsePastedTable(dataToProcess);
      
      if (result.pois.length === 0 && result.errors.length === 0) {
        toast.error('データが見つかりませんでした');
        setIsPasteProcessing(false);
        return;
      }

      // 処理上限チェック（最大5000件）
      if (result.pois.length > 5000) {
        toast.error('一度に登録できる地点数は最大5000件です。データを分割して登録してください。', {
          duration: 5000,
        });
        setIsPasteProcessing(false);
        return;
      }

      // 大量登録の警告
      if (result.pois.length > 1000) {
        toast.warning(`${result.pois.length}件の大量登録です。バックグラウンドで分割処理を行います。`, {
          duration: 5000,
        });
      } else if (result.pois.length > 100) {
        toast.warning(`${result.pois.length}件の地点を登録します。ジオコーディングに時間がかかる場合があります。`, {
          duration: 5000,
        });
      }

      setParsedPastePois(result.pois);
      setPasteErrors(result.errors);
      
      if (result.pois.length > 0) {
        setPasteStep('preview');
        toast.success(`${result.pois.length}件の地点データを読み込みました`);
        
        // 自動的にジオコーディングを実行
        const needsGeocoding = result.pois.filter(poi => 
          (poi.latitude === undefined || poi.latitude === null || 
           poi.longitude === undefined || poi.longitude === null) && 
          poi.address && poi.address.trim() !== ''
        );
        
        if (needsGeocoding.length > 0) {
          // バックグラウンドで自動ジオコーディングを実行
          setTimeout(() => {
            handlePasteGeocode();
          }, 500);
        }
      } else {
        toast.error('有効なデータが見つかりませんでした');
      }
    } catch (error) {
      console.error('Paste parse error:', error);
      toast.error('データの解析に失敗しました');
    } finally {
      setIsPasteProcessing(false);
    }
  };

  // 表形式コピペのジオコーディング処理
  const handlePasteGeocode = async () => {
    const needsGeocoding = parsedPastePois.filter(poi => 
      (poi.latitude === undefined || poi.latitude === null || 
       poi.longitude === undefined || poi.longitude === null) && 
      poi.address && poi.address.trim() !== ''
    );

    if (needsGeocoding.length === 0) {
      toast.info('ジオコーディングが必要な地点はありません');
      return;
    }

    setIsGeocodingPaste(true);

    try {
      const updatedPois = [...parsedPastePois];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < updatedPois.length; i++) {
        const poi = updatedPois[i];
        
        // 既に緯度経度がある場合はスキップ
        if (poi.latitude !== undefined && poi.latitude !== null && 
            poi.longitude !== undefined && poi.longitude !== null) {
          continue;
        }

        // 住所がない場合はスキップ
        if (!poi.address || poi.address.trim() === '') {
          continue;
        }

        try {
          const result = await geocodeAddress(poi.address);
          // 海外の地点が検出された場合はエラーとして扱う
          if (result.isJapan === false) {
            errorCount++;
            console.error(`海外の地点が検出されました: "${poi.address}"`);
            // エラーとして扱うが、緯度経度は設定しない
            continue;
          }
          updatedPois[i] = {
            ...poi,
            latitude: result.latitude,
            longitude: result.longitude,
          };
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Geocoding error for "${poi.address}":`, error);
        }

        // レート制限対策
        if (i < updatedPois.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setParsedPastePois(updatedPois);
      
      if (successCount > 0) {
        toast.success(`${successCount}件の地点の緯度経度を取得しました`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount}件の地点で緯度経度の取得に失敗しました（海外の地点が含まれている可能性があります）`, {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('ジオコーディング処理中にエラーが発生しました');
    } finally {
      setIsGeocodingPaste(false);
    }
  };

  // 表形式コピペのリセット
  const handleResetPaste = () => {
    setPasteStep('paste');
    setPastedText('');
    setPastedHtml('');
    setParsedPastePois([]);
    setPasteErrors([]);
    if (pasteTableRef.current) {
      pasteTableRef.current.innerHTML = '';
    }
  };

  // バッチ処理用関数（1000件以上の場合に分割処理）
  const processBatchSubmit = async (pois: Partial<PoiInfo>[]) => {
    if (!onBulkSubmit) return;
    
    const BATCH_SIZE = 100; // 1バッチあたりの件数
    const batches = [];
    
    // バッチに分割
    for (let i = 0; i < pois.length; i += BATCH_SIZE) {
      batches.push(pois.slice(i, i + BATCH_SIZE));
    }
    
    setIsBatchProcessing(true);
    setBatchTotal(batches.length);
    setBatchProgress(0);
    
    try {
      for (let i = 0; i < batches.length; i++) {
        await onBulkSubmit(batches[i]);
        setBatchProgress(i + 1);
        
        // レート制限対策（各バッチ間で少し待機）
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      toast.success(`${pois.length}件の地点を登録しました`);
      onCancel(); // フォームを閉じる
    } catch (error) {
      console.error('Batch submit error:', error);
      toast.error('一括登録中にエラーが発生しました');
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(0);
      setBatchTotal(0);
    }
  };

  // 表形式コピペの登録
  const handlePasteSubmit = async () => {
    if (onBulkSubmit && parsedPastePois.length > 0) {
      setErrorMessage(null); // エラーメッセージをクリア
      // 都道府県指定の地点が存在する場合はエラー
      const existingPrefecturePois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'prefecture'
      );
      if (existingPrefecturePois.length > 0) {
        const errorMsg = '都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません';
        setErrorMessage(errorMsg);
        return;
      }

      console.log(`📋 表形式コピペ - 一括登録: ${parsedPastePois.length}件`);

      // 抽出条件とカテゴリをすべてのPOIに適用
      // 来店計測地点でグループが選択されている場合は、グループIDも設定
      const poisWithConditions = parsedPastePois.map(poi => ({
        ...poi,
        designated_radius: pasteExtractionConditions.designated_radius,
        extraction_period: pasteExtractionConditions.extraction_period,
        extraction_period_type: pasteExtractionConditions.extraction_period_type,
        attribute: pasteExtractionConditions.attribute,
        detection_count: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_count : undefined,
        detection_time_start: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_time_start : undefined,
        detection_time_end: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_time_end : undefined,
        stay_time: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.stay_time : undefined,
        poi_category: poi.poi_category || defaultCategory || bulkPoiCategory,
        visit_measurement_group_id: poi.visit_measurement_group_id || ((defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement') && bulkGroupId ? bulkGroupId : undefined),
        location_id: undefined, // 地点IDは自動採番
      }));
      
      // TG地点の場合、重複を削除
      const { filtered, removedCount } = removeDuplicatePois(poisWithConditions);
      
      if (removedCount > 0) {
        toast.info(`${removedCount}件の重複地点を削除しました`);
      }
      
      // 1000件以上の場合はバッチ処理
      if (filtered.length >= 1000) {
        await processBatchSubmit(filtered);
      } else {
        onBulkSubmit(filtered);
      }
    }
  };

  // 都道府県選択時に市区町村リストを更新
  useEffect(() => {
    if (selectedPrefecture) {
      setAvailableCities(getCitiesByPrefecture(selectedPrefecture));
    }
  }, [selectedPrefecture]);

  // 居住者・勤務者の場合��抽出期間を3ヶ月に固定
  useEffect(() => {
    if (formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') {
      setFormData(prev => ({
        ...prev,
        extraction_period: '3month',
        extraction_period_type: 'preset',
      }));
    }
  }, [formData.attribute]);

  // 住所入力時に自動的に緯度経度を取得（debounce付き）
  useEffect(() => {
    // 手動登録モードで、住所があり、緯度経度がない場合のみ自動実行
    if (entryMethod !== 'paste' && entryMethod !== 'csv' && entryMethod !== 'prefecture') {
      if (formData.address && formData.address.trim() !== '' && 
          (formData.latitude === undefined || formData.latitude === null || 
           formData.longitude === undefined || formData.longitude === null)) {
        // 編集時は既存の住所が設定されている場合をスキップ（初回のみ）
        if (poi && poi.address === formData.address) {
          return;
        }
        
        const timeoutId = setTimeout(async () => {
          try {
            const result = await geocodeAddress(formData.address!);
            // 海外の地点が検出された場合はエラーを通知
            if (result.isJapan === false) {
              toast.error('海外の地点が検出されました', {
                description: `住所「${formData.address}」は日本国外の地点です。日本国内の住所を入力してください。`,
                duration: 5000,
              });
              return; // 緯度経度は設定しない
            }
            setFormData(prev => ({
              ...prev,
              latitude: result.latitude,
              longitude: result.longitude,
            }));
            console.log('自動ジオコーディング成功:', result);
          } catch (error) {
            console.error('自動ジオコーディングエラー:', error);
            // エラー時は静かに失敗（ユーザーに通知しない）
          }
        }, 1000); // 1秒後に実行

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.address, entryMethod, poi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // エラーメッセージをクリア
    
    // バリデーション
    // ポリゴン選択の場合
    if (entryMethod === 'polygon' || formData.poi_type === 'polygon') {
      if (!formData.polygon || formData.polygon.length === 0) {
        setErrorMessage('ポリゴンを少なくとも1つ描画してください');
        return;
      }
      
      // ポリゴンの範囲を検証
      if (formData.polygon && Array.isArray(formData.polygon) && formData.polygon.length >= 3) {
        const validation = validatePolygonRange(formData.polygon);
        if (!validation.isValid) {
          setErrorMessage(validation.error || 'ポリゴンの範囲が広すぎます');
          return;
        }
      }
      
      // 複数のポリゴンがある場合、すべてを検証
      if (polygons && polygons.length > 0) {
        for (const polygon of polygons) {
          if (polygon.coordinates && polygon.coordinates.length >= 3) {
            const validation = validatePolygonRange(polygon.coordinates);
            if (!validation.isValid) {
              setErrorMessage(validation.error || 'ポリゴンの範囲が広すぎます');
              return;
            }
          }
        }
      }
      
      // ポリゴン指定の地点は、ポリゴン指定単独のセグメントでのみ登録可能
      // 既に他のタイプの地点（manual, prefecture）が存在する場合はエラー
      const existingNonPolygonPois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type !== 'polygon' &&
        (!poi || p.poi_id !== poi.poi_id) // 編集時は現在編集中の地点を除外
      );
      if (existingNonPolygonPois.length > 0) {
        const errorMsg = 'ポリゴン指定の地点は、ポリゴン指定単独のセグメントでのみ登録できます。このセグメントには既に他のタイプの地点が登録されています。';
        setErrorMessage(errorMsg);
        return;
      }
      
      // 1セグメント内で10個のポリゴンまでという制限をチェック
      const existingPolygonPois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'polygon' &&
        p.polygon && p.polygon.length > 0
      );
      
      // 編集時は現在のPOIを除外
      const existingCount = poi 
        ? existingPolygonPois.filter(p => p.poi_id !== poi.poi_id).length
        : existingPolygonPois.length;
      
      if (existingCount >= 10) {
        setErrorMessage('このセグメントには既に10個のポリゴンが登録されています。新しいポリゴンを追加するには、既存のポリゴンを削除してください。');
        return;
      }
      
      // 新しいポリゴンを追加する場合のチェック
      if (!poi && existingCount + polygons.length > 10) {
        setErrorMessage(`このセグメントには既に${existingCount}個のポリゴンが登録されています。あと${10 - existingCount}個まで登録できます。`);
        return;
      }
    }
    
    // 都道府県指定の場合
    if (entryMethod === 'prefecture' || formData.poi_type === 'prefecture') {
      if (!formData.cities || formData.cities.length === 0) {
        setErrorMessage('市区町村を少なくとも1つ選択してください');
        return;
      }
    } else if (entryMethod !== 'polygon' && formData.poi_type !== 'polygon') {
      // ポリゴン選択以外の場合、地点名が必須
      if (!formData.poi_name || formData.poi_name.trim() === '') {
        setErrorMessage('地点名は必須項目です');
        return;
      }
      
      // ポリゴン指定以外の地点は、ポリゴン指定の地点が存在するセグメントには登録不可
      const existingPolygonPois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'polygon' &&
        (!poi || p.poi_id !== poi.poi_id) // 編集時は現在編集中の地点を除外
      );
      if (existingPolygonPois.length > 0) {
        const errorMsg = 'ポリゴン指定の地点が既に登録されているセグメントには、他のタイプの地点を登録できません。ポリゴン指定の地点は、ポリゴン指定単独のセグメントでのみ登録できます。';
        setErrorMessage(errorMsg);
        return;
      }
    }
    // 都道府県指定の場合、1セグメント5つまで、かつ緯度経度・住所指定での登録とは併用不可
    if (formData.poi_type === 'prefecture') {
      const existingPrefecturePois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'prefecture' &&
        (!poi || p.poi_id !== poi.poi_id) // 編集時は現在編集中の地点を除外
      );
      if (existingPrefecturePois.length >= 5) {
        const errorMsg = '都道府県指定の地点は1セグメントにつき5つまで登録できます';
        setErrorMessage(errorMsg);
        return;
      }
      // 都道府県指定以外の地点（緯度経度・住所指定など）が存在する場合はエラー
      const existingNonPrefecturePois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type !== 'prefecture' &&
        (!poi || p.poi_id !== poi.poi_id) // 編集時は現在編集中の地点を除外
      );
      if (existingNonPrefecturePois.length > 0) {
        const errorMsg = '都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません';
        setErrorMessage(errorMsg);
        return;
      }
    }
    // 都道府県指定とポリゴン選択以外の場合のみ半径が必須
    if (formData.poi_type !== 'prefecture' && formData.poi_type !== 'polygon' && !formData.designated_radius) {
      setErrorMessage('指定半径は必須項目です');
      return;
    }
    
    // 半径のバリデーション（0-10000の範囲）
    if (formData.designated_radius) {
      const radiusNum = parseInt(formData.designated_radius.replace('m', ''));
      if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
        setErrorMessage('指定半径は0-10000の範囲で入力してください');
        return;
      }
    }
    if (!formData.extraction_period && formData.extraction_period_type === 'preset') {
      setErrorMessage('抽出期間は必須項目です');
      return;
    }
    if (formData.extraction_period_type === 'custom' && (!formData.extraction_start_date || !formData.extraction_end_date)) {
      setErrorMessage('抽出期間の開始日と終了日を指定してください');
      return;
    }

    const isPolygonEntry = entryMethod === 'polygon' || formData.poi_type === 'polygon';

    // ポリゴン選択の場合、地点名を自動生成（未設定の場合）
    let finalFormData = { ...formData };
    if (isPolygonEntry) {
      // 既存のポリゴン地点名から連番を決定
      const existingPolygonPois = pois.filter(p => 
        p.segment_id === segmentId && 
        p.poi_type === 'polygon' &&
        (!poi || p.poi_id !== poi.poi_id) // 編集時は現在編集中の地点を除外
      );
      
      // 「ポリゴン地点」で始まる地点名から最大の番号を取得
      let maxNumber = 0;
      existingPolygonPois.forEach(p => {
        if (p.poi_name && p.poi_name.startsWith('ポリゴン地点')) {
          const match = p.poi_name.match(/^ポリゴン地点\s*(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextPolygonName = () => {
        maxNumber += 1;
        return `ポリゴン地点 ${maxNumber}`;
      };

      // 複数ポリゴンの場合は一括登録
      if (polygons.length > 1) {
        if (!onBulkSubmit) {
          setErrorMessage('複数ポリゴンの登録に失敗しました。管理者にお問い合わせください。');
          return;
        }
        if (poi) {
          setErrorMessage('編集時は1つのポリゴンのみ更新できます。');
          return;
        }

        const basePolygonData: Partial<PoiInfo> = {
          ...finalFormData,
          poi_type: 'polygon',
          poi_name: undefined,
          polygon: undefined,
          address: undefined,
          latitude: undefined,
          longitude: undefined,
          designated_radius: undefined,
        };

        const polygonPois = polygons.map((polygon) => ({
          ...basePolygonData,
          poi_name: polygon.name && polygon.name.trim() !== '' ? polygon.name.trim() : nextPolygonName(),
          polygon: polygon.coordinates,
        }));

        onBulkSubmit(polygonPois);
        return;
      }

      // 単一ポリゴンの場合は通常登録
      if (polygons.length === 1) {
        const polygonName = polygons[0].name && polygons[0].name.trim() !== ''
          ? polygons[0].name.trim()
          : nextPolygonName();
        finalFormData.poi_name = polygonName;
        finalFormData.polygon = polygons[0].coordinates;
      } else if (!finalFormData.poi_name || finalFormData.poi_name.trim() === '') {
        finalFormData.poi_name = nextPolygonName();
      }
    }

    // ポリゴン選択の場合、poi_typeを確実に'polygon'に設定
    if (isPolygonEntry || (formData.polygon && Array.isArray(formData.polygon) && formData.polygon.length > 0)) {
      finalFormData.poi_type = 'polygon';
    }

    // 緯度経度を数値に変換
    const submitData = {
      ...finalFormData,
      latitude: (() => {
        const lat = finalFormData.latitude;
        if (lat === undefined || lat === null) return undefined;
        if (typeof lat === 'string') {
          return lat === '' ? undefined : parseFloat(lat);
        }
        return typeof lat === 'number' ? lat : undefined;
      })(),
      longitude: (() => {
        const lng = finalFormData.longitude;
        if (lng === undefined || lng === null) return undefined;
        if (typeof lng === 'string') {
          return lng === '' ? undefined : parseFloat(lng);
        }
        return typeof lng === 'number' ? lng : undefined;
      })(),
    };

    // デバッグ: ポリゴン指定の場合、送信データをログ出力
    if (submitData.poi_type === 'polygon' || (submitData.polygon && Array.isArray(submitData.polygon) && submitData.polygon.length > 0)) {
      console.log('📤 ポリゴン指定地点を送信:', {
        poi_type: submitData.poi_type,
        poi_name: submitData.poi_name,
        polygon: submitData.polygon,
        polygon_length: Array.isArray(submitData.polygon) ? submitData.polygon.length : 'N/A',
        entryMethod: entryMethod
      });
    }

    onSubmit(submitData);
  };

  const handleChange = (field: keyof PoiInfo, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 住所から緯度経度を取得
  const handleGeocodeAddress = async () => {
    if (!formData.address || formData.address.trim() === '') {
      toast.error('住所を入力してください');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(formData.address);
      
      // 海外の地点が検出された場合はエラーを通知
      if (result.isJapan === false) {
        toast.error('海外の地点が検出されました', {
          description: `住所「${formData.address}」は日本国外の地点です。日本国内の住所を入力してください。`,
          duration: 5000,
        });
        setIsGeocoding(false);
        return; // 緯度経度は設定しない
      }
      
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      
      // 開発環境ではモックデータを使用していることを通知
      const isDevelopment = !process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE';
      if (isDevelopment) {
        toast.success('緯度経度を取得しました（開発環境：推定座標）', {
          description: '都道府県・市区町村から推定した座標です。正確な座標が必要な場合は手動で入力してください。',
          duration: 5000,
        });
      } else {
        toast.success('緯度経度を取得しました');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error(error instanceof Error ? error.message : 'ジオコーディングに失敗しました');
    } finally {
      setIsGeocoding(false);
    }
  };

  const getPoiTypeIcon = (type: string) => {
    switch (type) {
      case 'manual': return <MapPin className="w-4 h-4" />;
      case 'prefecture': return <Building2 className="w-4 h-4" />;
      case 'csv': return <FileText className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const canProceedToConditions = () => {
    if (entryMethod === 'csv' || entryMethod === 'paste') return false;
    if (formData.poi_type === 'manual') {
      return !!formData.poi_name;
    } else if (formData.poi_type === 'prefecture') {
      return formData.cities && formData.cities.length > 0;
    } else if (formData.poi_type === 'polygon' || entryMethod === 'polygon') {
      // ポリゴンが1つ以上存在する場合
      return polygons.length > 0 && formData.polygon && formData.polygon.length > 0;
    }
    return false;
  };

  // 都道府県を追加
  const handleAddPrefecture = (prefecture: string) => {
    const currentPrefectures = formData.prefectures || [];
    if (!currentPrefectures.includes(prefecture)) {
      setFormData(prev => ({
        ...prev,
        prefectures: [...currentPrefectures, prefecture],
      }));
      
      // 自動全選択がオンの場合、全市区町村を選択
      if (autoSelectAllCities) {
        const currentCities = formData.cities || [];
        const prefectureCities = getCitiesByPrefecture(prefecture);
        const newCities = [...new Set([...currentCities, ...prefectureCities])];
        setFormData(prev => ({
          ...prev,
          cities: newCities,
        }));
      }
    }
    setSelectedPrefecture(prefecture);
    setShowPrefectureDropdown(false);
  };

  // 都道府県を削除
  const handleRemovePrefecture = (prefecture: string) => {
    const currentPrefectures = formData.prefectures || [];
    const currentCities = formData.cities || [];
    const citiesToRemove = getCitiesByPrefecture(prefecture);
    
    setFormData(prev => ({
      ...prev,
      prefectures: currentPrefectures.filter(p => p !== prefecture),
      cities: currentCities.filter(c => !citiesToRemove.includes(c)),
    }));

    if (selectedPrefecture === prefecture) {
      setSelectedPrefecture('');
    }
  };

  // 市区町村を追加/削除
  const handleToggleCity = (city: string) => {
    const currentCities = formData.cities || [];
    if (currentCities.includes(city)) {
      setFormData(prev => ({
        ...prev,
        cities: currentCities.filter(c => c !== city),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        cities: [...currentCities, city],
      }));
    }
  };

  // 都道府県の全市区町村を選択
  const handleSelectAllCities = (prefecture: string) => {
    const currentCities = formData.cities || [];
    const prefectureCities = getCitiesByPrefecture(prefecture);
    const newCities = [...new Set([...currentCities, ...prefectureCities])];
    
    setFormData(prev => ({
      ...prev,
      cities: newCities,
    }));
  };

  // 都道府県の全市区町村を解除
  const handleDeselectAllCities = (prefecture: string) => {
    const currentCities = formData.cities || [];
    const prefectureCities = getCitiesByPrefecture(prefecture);
    const newCities = currentCities.filter(c => !prefectureCities.includes(c));
    
    setFormData(prev => ({
      ...prev,
      cities: newCities,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl mb-2">
                {poi ? '地点情報編集' : '新規地点登録'}
              </h2>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span>セグメントID: {segmentId}</span>
                {segmentName && <span>({segmentName})</span>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-white hover:bg-white/20 -mt-2 -mr-2"
              disabled={isBatchProcessing}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* バッチ処理プログレス */}
          {isBatchProcessing && (
            <div className="mt-4 bg-white/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">大量登録処理中...</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/90">
                  <span>バッチ {batchProgress} / {batchTotal} 完了</span>
                  <span>{Math.round((batchProgress / batchTotal) * 100)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(batchProgress / batchTotal) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-white/80">
                  100件ずつ分割処理しています。しばらくお待ちください...
                </p>
              </div>
            </div>
          )}

          {/* ステップインジケーター */}
          {entryMethod !== 'csv' && !isBatchProcessing && (
            <div className="flex items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep('info')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 'info'
                    ? 'bg-white text-[#5b5fff]'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep === 'info' ? 'bg-[#5b5fff] text-white' : 'bg-white/30'
                }`}>
                  1
                </div>
                <span>地点情報</span>
              </button>
              <div className="h-0.5 flex-1 bg-white/30"></div>
              <button
                type="button"
                onClick={() => canProceedToConditions() && setCurrentStep('conditions')}
                disabled={!canProceedToConditions()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 'conditions'
                    ? 'bg-white text-[#5b5fff]'
                    : canProceedToConditions()
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep === 'conditions' ? 'bg-[#5b5fff] text-white' : 'bg-white/30'
                }`}>
                  2
                </div>
                <span>抽出条件</span>
              </button>
            </div>
          )}
        </div>

        {/* コンテンツエリア */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* エラーメッセージ表示 */}
          {errorMessage && (entryMethod === 'prefecture' || entryMethod === 'manual' || entryMethod === 'polygon') && (
            <div className="mx-6 mt-6 bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">エラー</p>
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setErrorMessage(null)}
                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {currentStep === 'info' && (
            <div className="p-6 space-y-6">
              {/* 地点タイプ選択 */}
              {/* 登録モード切替タ��（新規登録時のみ） */}
              {!poi && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('paste')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all border ${
                      entryMethod === 'paste'
                        ? 'bg-white text-[#5b5fff] shadow-sm border-[#5b5fff]'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">表形式コピペ</span>
                    <span className="sm:hidden">コピペ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('prefecture')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all border ${
                      entryMethod === 'prefecture'
                        ? 'bg-white text-[#5b5fff] shadow-sm border-[#5b5fff]'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">都道府県指定</span>
                    <span className="sm:hidden">都道府県</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('csv')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all border ${
                      entryMethod === 'csv'
                        ? 'bg-white text-[#5b5fff] shadow-sm border-[#5b5fff]'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Table className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel一括登録</span>
                    <span className="sm:hidden">Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('polygon')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all border ${
                      entryMethod === 'polygon'
                        ? 'bg-white text-[#5b5fff] shadow-sm border-[#5b5fff]'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">ポリゴン選択</span>
                    <span className="sm:hidden">ポリゴン</span>
                  </button>
                </div>
              )}

              {/* ���動登録の場合の地点タイプ選択 */}

              {/* CSV一括登録 */}
              {entryMethod === 'csv' && (
                <div className="space-y-6">
                  {/* Step 1: Upload */}
                  {csvStep === 'upload' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">Excel一括登録</h3>
                            <p className="text-sm text-blue-700 mb-2">
                              Excelテンプレートをダウンロードし、地点情報を入力してアップロードしてください。<br />
                              <strong>TG地点・来店計測地点の両方に対応しています。</strong>
                            </p>
                            <div className="bg-white/50 rounded p-2 mb-2">
                              <p className="text-xs font-semibold text-blue-900 mb-1">📋 入力項目</p>
                              <p className="text-xs text-blue-700">
                                • <strong>地点名</strong>: 必須<br />
                                • <strong>住所</strong>: 必須<br />
                                • <strong>緯度・経度</strong>: 任意（未入力の場合、住所から自動変換されます）<br />
                                • <strong>地点ID</strong>: 自動採番（入力不要）
                              </p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                              <p className="text-xs font-semibold text-yellow-900 mb-1">⚠️ 処理上限</p>
                              <p className="text-xs text-yellow-800">
                                • <strong>推奨: 100件以下</strong> / 1回の登録<br />
                                • <strong>最大: 5,000件</strong> / 1回の登録<br />
                                • <strong>1,000件以上</strong>: 100件ずつバッチ処理で自動分割登録されます<br />
                                • 大量登録時は自動ジオコーディングに時間がかかる場合があります
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadExcelTemplate('basic')}
                                className="text-blue-600 border border-gray-300 hover:bg-gray-50"
                              >
                                <Download className="w-4 h-4 mr-2 text-blue-600" />
                                Excelテンプレート
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="csv-upload-form"
                        />
                        <label htmlFor="csv-upload-form" className="cursor-pointer block w-full h-full">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-900 mb-1">Excelファイルをアップロード</p>
                          <p className="text-sm text-muted-foreground">
                            クリックしてファイルを選択 (.xlsx, .xls)
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Preview */}
                  {csvStep === 'preview' && (
                    <div className="space-y-6">
                      {/* エラーメッセージ表示 */}
                      {errorMessage && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-900 mb-1">エラー</p>
                              <p className="text-sm text-red-800">{errorMessage}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setErrorMessage(null)}
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 block mb-1">総データ数</span>
                          <span className="text-lg font-bold">{csvTotalRows}件</span>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <span className="text-xs text-green-600 block mb-1">正常</span>
                          <span className="text-lg font-bold text-green-700">{parsedPois.length}件</span>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <span className="text-xs text-red-600 block mb-1">エラー</span>
                          <span className="text-lg font-bold text-red-700">{csvErrors.length}件</span>
                        </div>
                      </div>

                      {parsedPois.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-2">プレビュー（最初の5件）</h3>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">地点名</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">住所</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">緯度</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">経度</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {parsedPois.slice(0, 5).map((poi, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{poi.poi_name}</td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">{poi.address || '-'}</td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">
                                      {poi.latitude !== undefined ? poi.latitude : <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">要取得</Badge>}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">
                                      {poi.longitude !== undefined ? poi.longitude : <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">要取得</Badge>}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">{poi.location_id || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {csvErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                          <h3 className="text-sm text-red-900 mb-2">エラー詳細</h3>
                          <div className="space-y-1">
                            {csvErrors.map((error, index) => (
                              <div key={index} className="text-xs text-red-700">
                                {error.row}行目 [{error.field}]: {error.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 計測地点グループ選択（来店計測地点の場合のみ） */}
                      {(defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement' || parsedPois.some(p => p.poi_category === 'visit_measurement')) && (
                        <div>
                          <Label htmlFor="bulk_group_id" className="block mb-2">
                            計測地点グループ
                          </Label>
                          <select
                            id="bulk_group_id"
                            value={bulkGroupId || ''}
                            onChange={(e) => setBulkGroupId(e.target.value || null)}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                          >
                            <option value="">グループなし</option>
                            {visitMeasurementGroups.map(group => (
                              <option key={group.group_id} value={group.group_id}>
                                {group.group_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex justify-between pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={handleResetCsv} className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50">
                          クリア
                        </Button>
                        <Button
                          onClick={handleCsvSubmit}
                          disabled={parsedPois.length === 0 || isBatchProcessing}
                          className="bg-primary text-primary-foreground"
                        >
                          {isBatchProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            `この内容で登録する (${parsedPois.length}件)`
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 表形式コピペ */}
              {entryMethod === 'paste' && (
                <div className="space-y-6">
                  {/* 地点カテゴリ選択タブ */}
                  {!defaultCategory && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <Label className="block mb-3 text-sm font-medium text-gray-700">登録する地点カテゴリ</Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setBulkPoiCategory('tg')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            bulkPoiCategory === 'tg'
                              ? 'border-[#5b5fff] bg-[#5b5fff]/10 text-[#5b5fff]'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <MapPin className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-semibold">TG地点</div>
                            <div className="text-xs opacity-80">ターゲティング用の地点</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkPoiCategory('visit_measurement')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            bulkPoiCategory === 'visit_measurement'
                              ? 'border-[#5b5fff] bg-[#5b5fff]/10 text-[#5b5fff]'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Database className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-semibold">来店計測地点</div>
                            <div className="text-xs opacity-80">来店計測用の地点</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 1: Paste */}
                  {pasteStep === 'paste' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">
                              表形式データの貼り付け
                              {bulkPoiCategory === 'tg' && <span className="ml-2 text-xs bg-[#5b5fff]/20 text-[#5b5fff] px-2 py-1 rounded">TG地点</span>}
                              {bulkPoiCategory === 'visit_measurement' && <span className="ml-2 text-xs bg-[#5b5fff]/20 text-[#5b5fff] px-2 py-1 rounded">来店計測地点</span>}
                            </h3>
                            <p className="text-sm text-blue-700 mb-2">
                              ExcelやGoogleスプレッドシートからコピーした表形式データを貼り付けてください。
                            </p>
                            <div className="bg-white/50 rounded p-2 mb-2">
                              <p className="text-xs font-semibold text-blue-900 mb-1">📋 入力形式</p>
                              <p className="text-xs text-blue-700">
                                • <strong>地点名</strong>と<strong>住所</strong>は必須です<br />
                                • <strong>緯度・経度</strong>は任意（未入力の場合、住所から自動変換されます）<br />
                                • タブ区切りまたはカンマ区切りのデータに対応<br />
                                • ヘッダー行は自動検出されます（地点名、住所、緯度、経度）
                              </p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-xs font-semibold text-yellow-900 mb-1">⚠️ 処理上限</p>
                              <p className="text-xs text-yellow-800">
                                • <strong>推奨: 100件以下</strong> / 1回の登録<br />
                                • <strong>最大: 5,000件</strong> / 1回の登録<br />
                                • <strong>1,000件以上</strong>: 100件ずつバッチ処理で自動分割登録されます<br />
                                • 大量登録時は自動ジオコーディングに時間がかかる場合があります
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 relative z-10">表形式データを貼り付け</Label>
                        <div className="relative">
                          {pastedHtml && pastedHtml.includes('<table') ? (
                            <div className="w-full border border-gray-300 rounded-lg overflow-auto bg-white relative z-0" style={{ maxHeight: '500px' }}>
                              <div
                                ref={pasteTableRef}
                                contentEditable
                                onPaste={handlePaste}
                                suppressContentEditableWarning
                                dangerouslySetInnerHTML={{ __html: pastedHtml }}
                                className="w-full p-4 focus:outline-none focus:ring-2 focus:ring-primary"
                                style={{ 
                                  minHeight: '300px',
                                }}
                                onInput={(e) => {
                                  const html = (e.currentTarget as HTMLElement).innerHTML;
                                  if (html.includes('<table')) {
                                    setPastedHtml(html);
                                  } else {
                                    setPastedHtml('');
                                    setPastedText((e.currentTarget as HTMLElement).textContent || '');
                                  }
                                }}
                              />
                              <style>{`
                                [contenteditable] table {
                                  border-collapse: collapse;
                                  width: 100%;
                                  margin: 0;
                                }
                                [contenteditable] table td,
                                [contenteditable] table th {
                                  border: 1px solid #e5e7eb;
                                  padding: 8px;
                                  text-align: left;
                                }
                                [contenteditable] table th {
                                  background-color: #f9fafb;
                                  font-weight: 600;
                                }
                                [contenteditable] table tr:nth-child(even) {
                                  background-color: #f9fafb;
                                }
                                [contenteditable] table tr:hover {
                                  background-color: #f3f4f6;
                                }
                              `}</style>
                            </div>
                          ) : (
                            <div className="relative z-0 overflow-hidden">
                              <div
                                ref={pasteTableRef}
                                contentEditable
                                onPaste={handlePaste}
                                suppressContentEditableWarning
                                className="w-full min-h-80 p-4 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input-background overflow-auto font-mono text-sm relative"
                                style={{ 
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: '500px'
                                }}
                              >
                                {pastedText || ''}
                                {!pastedHtml && !pastedText && (
                                  <div 
                                    className="absolute top-4 left-4 right-4 text-gray-400 pointer-events-none text-sm"
                                    style={{
                                      top: '1rem',
                                      left: '1rem',
                                      right: '1rem',
                                      pointerEvents: 'none'
                                    }}
                                  >
                                    ExcelやGoogleスプレッドシートから表形式データをコピーして貼り付けてください
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {pastedHtml && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700">
                              ✓ Excel形式の表データを検出しました。自動的に解析されます。
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 relative z-10">
                          • ExcelやGoogleスプレッドシートから表をコピーして貼り付けると、表形式で表示されます<br />
                          • タブ区切りまたはカンマ区切りのテキストデータも対応しています<br />
                          • 地点名と住所は必須です
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 relative z-10">
                        <Button
                          variant="outline"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResetPaste();
                          }}
                          disabled={isPasteProcessing}
                          className="relative z-20 border-gray-200"
                        >
                          クリア
                        </Button>
                        <Button
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePasteProcess();
                          }}
                          disabled={(!pastedText && !pastedHtml) || isPasteProcessing}
                          className="bg-primary text-primary-foreground relative z-20"
                        >
                          {isPasteProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            'データを解析'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Preview */}
                  {pasteStep === 'preview' && (
                    <div className="space-y-6">
                      {/* エラーメッセージ表示 */}
                      {errorMessage && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-900 mb-1">エラー</p>
                              <p className="text-sm text-red-800">{errorMessage}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setErrorMessage(null)}
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 block mb-1">総データ数</span>
                          <span className="text-lg font-bold">{parsedPastePois.length + pasteErrors.length}件</span>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <span className="text-xs text-green-600 block mb-1">正常</span>
                          <span className="text-lg font-bold text-green-700">{parsedPastePois.length}件</span>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <span className="text-xs text-red-600 block mb-1">エラー</span>
                          <span className="text-lg font-bold text-red-700">{pasteErrors.length}件</span>
                        </div>
                      </div>

                      {parsedPastePois.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900">プレビュー（最初の5件）</h3>
                            {parsedPastePois.some(poi => 
                              (poi.latitude === undefined || poi.latitude === null || 
                               poi.longitude === undefined || poi.longitude === null) && 
                              poi.address && poi.address.trim() !== ''
                            ) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePasteGeocode}
                                disabled={isGeocodingPaste}
                                className="text-xs border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                {isGeocodingPaste ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    変換中...
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-3 h-3 mr-1" />
                                    住所から緯度経度を取得
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">地点名</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">住所</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">緯度</th>
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">経度</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {parsedPastePois.slice(0, 5).map((poi, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{poi.poi_name}</td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">{poi.address || '-'}</td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">
                                      {poi.latitude !== undefined && poi.latitude !== null ? (
                                        poi.latitude
                                      ) : (
                                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                                          要取得
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">
                                      {poi.longitude !== undefined && poi.longitude !== null ? (
                                        poi.longitude
                                      ) : (
                                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                                          要取得
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs">{poi.location_id || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {pasteErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                          <h3 className="text-sm text-red-900 mb-2">エラー詳細</h3>
                          <div className="space-y-1">
                            {pasteErrors.map((error, index) => (
                              <div key={index} className="text-xs text-red-700">
                                {error.row}行目 [{error.field}]: {error.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 抽出条件設定 */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-gray-500" />
                          抽出条件設定
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {/* 指定半径 */}
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              指定半径
                            </p>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="10000"
                                step="1"
                                placeholder="0-10000"
                                value={pasteExtractionConditions.designated_radius ? String(pasteExtractionConditions.designated_radius).replace('m', '') : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                                    setPasteExtractionConditions(prev => ({ ...prev, designated_radius: value ? `${value}m` : '' }));
                                  }
                                }}
                                className="flex-1 text-sm"
                              />
                              <span className="text-xs text-gray-500">m</span>
                            </div>
                          </div>

                          {/* 抽出期間 */}
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              抽出期間
                            </p>
                            <select
                              value={pasteExtractionConditions.extraction_period}
                              onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, extraction_period: e.target.value }))}
                              disabled={pasteExtractionConditions.attribute !== 'detector'}
                              className="w-full text-sm px-2 py-1 border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              {EXTRACTION_PERIOD_PRESET_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            {pasteExtractionConditions.attribute !== 'detector' && (
                              <p className="text-xs text-orange-600 mt-1">※検知者以外は3ヶ月固定です</p>
                            )}
                          </div>

                          {/* 属性 */}
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              属性
                            </p>
                            <select
                              value={pasteExtractionConditions.attribute}
                              onChange={(e) => {
                                const newAttribute = e.target.value as 'detector' | 'resident' | 'worker' | 'resident_and_worker';
                                const isNonDetector = newAttribute !== 'detector';
                                setPasteExtractionConditions(prev => ({
                                  ...prev,
                                  attribute: newAttribute,
                                  extraction_period: isNonDetector ? '3month' : prev.extraction_period,
                                  extraction_period_type: isNonDetector ? 'preset' : prev.extraction_period_type,
                                  // 検知者以外の場合は滞在時間、検知時間、検知回数をクリア
                                  stay_time: isNonDetector ? '' : prev.stay_time,
                                  detection_time_start: isNonDetector ? '' : prev.detection_time_start,
                                  detection_time_end: isNonDetector ? '' : prev.detection_time_end,
                                  detection_count: isNonDetector ? undefined : prev.detection_count,
                                }));
                              }}
                              className="w-full text-sm px-2 py-1 border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {ATTRIBUTE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* 滞在時間（検知者の場合のみ） */}
                          {pasteExtractionConditions.attribute === 'detector' && (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                滞在時間
                              </p>
                              <select
                                value={pasteExtractionConditions.stay_time}
                                onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, stay_time: e.target.value }))}
                                className="w-full text-sm px-2 py-1 border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">指定なし</option>
                                {STAY_TIME_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* 検知回数（UI非表示） */}

                          {/* 検知時間帯（検知者の場合のみ） */}
                          {pasteExtractionConditions.attribute === 'detector' && (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                検知時間帯
                              </p>
                              <div className="flex gap-1">
                                <Input
                                  type="time"
                                  value={pasteExtractionConditions.detection_time_start || ''}
                                  onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, detection_time_start: e.target.value }))}
                                  className="w-full text-xs h-8 px-1"
                                />
                                <span className="text-xs text-gray-400 self-center">〜</span>
                                <Input
                                  type="time"
                                  value={pasteExtractionConditions.detection_time_end || ''}
                                  onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, detection_time_end: e.target.value }))}
                                  className="w-full text-xs h-8 px-1"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 計測地点グループ選択（来店計測地点の場合のみ） */}
                      {(defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement' || parsedPastePois.some(p => p.poi_category === 'visit_measurement')) && (
                        <div>
                          <Label htmlFor="paste_bulk_group_id" className="block mb-2">
                            計測地点グループ
                          </Label>
                          <select
                            id="paste_bulk_group_id"
                            value={bulkGroupId || ''}
                            onChange={(e) => setBulkGroupId(e.target.value || null)}
                            className="w-full h-10 px-3 py-2 border border-input rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                          >
                            <option value="">グループなし</option>
                            {visitMeasurementGroups.map(group => (
                              <option key={group.group_id} value={group.group_id}>
                                {group.group_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex justify-between pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={handleResetPaste} className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50">
                          クリア
                        </Button>
                        <Button
                          onClick={handlePasteSubmit}
                          disabled={parsedPastePois.length === 0 || isBatchProcessing}
                          className="bg-primary text-primary-foreground"
                        >
                          {isBatchProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            `この内容で登録する (${parsedPastePois.length}件)`
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 任意地点指定 */}
              {entryMethod === 'manual' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-900 mb-2">
                    <MapPin className="w-5 h-5" />
                    <h3>{poi ? '地点情報編集' : '任意地点指定'}</h3>
                  </div>
                  
                  <div>
                    <Label htmlFor="poi_name" className="block mb-2">
                      地点名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="poi_name"
                      type="text"
                      value={formData.poi_name}
                      onChange={(e) => handleChange('poi_name', e.target.value)}
                      placeholder="例：東京駅、渋谷スクランブル交差点"
                      className="w-full bg-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="block mb-2">
                      住所
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="例：東京都千代田区丸の内1丁目"
                        className="flex-1 bg-white"
                      />
                      <Button
                        type="button"
                        onClick={handleGeocodeAddress}
                        disabled={isGeocoding || !formData.address}
                        variant="outline"
                        className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : '緯度経度取得'}
                      </Button>
                    </div>
                  </div>

                  {/* 地点IDは自動採番のため表示・入力不可 */}

                  {/* 地点カテゴリ選択（defaultCategoryが設定されていない場合、または編集時のみ表示） */}
                  {(!defaultCategory || poi) && (
                    <div>
                      <Label htmlFor="poi_category" className="block mb-2">
                        地点カテゴリ
                      </Label>
                      <select
                        id="poi_category"
                        value={formData.poi_category || ''}
                        onChange={(e) => handleChange('poi_category', e.target.value || undefined)}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                      >
                        <option value="">選択してください</option>
                        <option value="tg">TG地点</option>
                        <option value="visit_measurement">来店計測地点</option>
                      </select>
                    </div>
                  )}

                  {/* 計測地点グループ選択（来店計測地点の場合のみ） */}
                  {(formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') && (
                    <div>
                      <Label htmlFor="visit_measurement_group_id" className="block mb-2">
                        計測地点グループ
                      </Label>
                      <select
                        id="visit_measurement_group_id"
                        value={formData.visit_measurement_group_id || ''}
                        onChange={(e) => handleChange('visit_measurement_group_id', e.target.value || undefined)}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                      >
                        <option value="">グループなし</option>
                        {visitMeasurementGroups.map(group => (
                          <option key={group.group_id} value={group.group_id}>
                            {group.group_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude" className="block mb-2">
                        緯度
                      </Label>
                      <Input
                        id="latitude"
                        type="text"
                        value={formData.latitude || ''}
                        onChange={(e) => handleChange('latitude', e.target.value)}
                        placeholder="例：35.681236"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="block mb-2">
                        経度
                      </Label>
                      <Input
                        id="longitude"
                        type="text"
                        value={formData.longitude || ''}
                        onChange={(e) => handleChange('longitude', e.target.value)}
                        placeholder="例：139.767125"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  {/* 抽出条件設定ボタン */}
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowExtractionConditionsPopup(true)}
                      className="w-full border-[#5b5fff] text-[#5b5fff] hover:bg-[#5b5fff]/5"
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      抽出条件を設定
                    </Button>
                    {hasSegmentCommonConditions && (
                      <p className="text-xs text-gray-500 mt-2">
                        ※ セグメント共通条件が設定されていますが、地点ごとに個別の抽出条件を設定することも可能です。
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 既存地点の編集時（entryMethodがmanual以外の場合）にも抽出条件設定ボタンを表示 */}
              {poi && entryMethod !== 'manual' && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExtractionConditionsPopup(true)}
                    className="w-full border-[#5b5fff] text-[#5b5fff] hover:bg-[#5b5fff]/5"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    抽出条件を設定
                  </Button>
                  {hasSegmentCommonConditions && (
                    <p className="text-xs text-gray-500 mt-2">
                      ※ セグメント共通条件が設定されていますが、地点ごとに個別の抽出条件を設定することも可能です。
                    </p>
                  )}
                </div>
              )}

              {/* 都道府県指定 */}
              {entryMethod === 'prefecture' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-900 mb-2">
                    <Building2 className="w-5 h-5" />
                    <h3>都道府県・市区町村指定</h3>
                  </div>

                  {/* ... 既存のコード ... */}
                  <div className="space-y-4">
                    {/* ... */}
                    {/* 省略部分は元のコードを維持する必要があるため、ここは書き換え範囲外 */}
                    
                    {/* ここは書き換えない部分なので、実際の書き換えはファイル全体で行う */}
                    <div className="relative">
                      <Label className="block mb-2">都道府県を選択</Label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between bg-input-background border-input"
                          onClick={() => setShowPrefectureDropdown(!showPrefectureDropdown)}
                        >
                          {selectedPrefecture || '都道府県を選択してください'}
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                        
                        {showPrefectureDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-popover border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                            {getPrefectures().map((pref) => (
                              <button
                                key={pref}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                                onClick={() => handleAddPrefecture(pref)}
                              >
                                {pref}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 選択された都道府県リスト */}
                    {formData.prefectures && formData.prefectures.length > 0 && (
                      <div className="space-y-4">
                        {formData.prefectures.map((pref) => (
                          <div key={pref} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{pref}</h4>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllCities(pref)}
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  全選択
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeselectAllCities(pref)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  全解除
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePrefecture(pref)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {getCitiesByPrefecture(pref).map((city) => {
                                const isSelected = formData.cities?.includes(city);
                                return (
                                  <button
                                    key={city}
                                    type="button"
                                    onClick={() => handleToggleCity(city)}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                                      isSelected
                                        ? 'bg-green-500 text-white border-green-600'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {city}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 自動全選択オプション */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoSelectAll"
                        checked={autoSelectAllCities}
                        onChange={(e) => setAutoSelectAllCities(e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label htmlFor="autoSelectAll" className="text-sm text-gray-600 cursor-pointer">
                        都道府県追加時に全市区町村を自動選択する
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ポリゴン選択 */}
              {entryMethod === 'polygon' && (
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
                    
                    {/* 既存のポリゴン数をチェック */}
                    {(() => {
                      const existingPolygonPois = pois.filter(p => 
                        p.segment_id === segmentId && 
                        p.poi_type === 'polygon' &&
                        p.polygon && p.polygon.length > 0
                      );
                      const remainingCount = 10 - existingPolygonPois.length;
                      
                      if (remainingCount <= 0) {
                        return (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">
                              ⚠️ このセグメントには既に10個のポリゴンが登録されています。新しいポリゴンを追加するには、既存のポリゴンを削除してください。
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            このセグメントには既に{existingPolygonPois.length}個のポリゴンが登録されています。あと{remainingCount}個登録できます。
                          </p>
                        </div>
                      );
                    })()}
                    
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
                                  // ポリゴンエディタが開いている場合は、地図を移動
                                  if (showPolygonEditor) {
                                    setSelectedPolygonId(polygon.id);
                                  } else {
                                    // ポリゴンエディタが閉じている場合は開く
                                    setSelectedPolygonId(polygon.id);
                                    setShowPolygonEditor(true);
                                  }
                                }}
                              >
                                <div className="text-sm flex-1">
                                  <div className="font-medium">
                                    {polygon.name?.trim() ? polygon.name : `ポリゴン ${index + 1}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
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
                              <Input
                                value={polygon.name || ''}
                                onChange={(e) => handlePolygonNameUpdate(polygon.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="地点名を入力"
                                className="mt-2 h-8 text-sm bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PKG指定削除済み */}
            </div>
          )}

          {/* Step 2: 抽出条件 */}
          {currentStep === 'conditions' && (
            <div className="p-6 space-y-6">
              {/* セグメント共通条件が表示される場合のイ��フォメーション */}
              {hasSegmentCommonConditions && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <div className="flex gap-2 text-blue-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">セグメント共通条件が設定されています</p>
                      <p>
                        このセグメントには共通条件が設定されていますが、地点ごとに個別の抽出条件を設定することも可能です。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* 指定半径（都道府県指定とポリゴン選択の場合は非表示） */}
                {formData.poi_type !== 'prefecture' && formData.poi_type !== 'polygon' && (
                  <div>
                    <Label className="block mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#5b5fff]" />
                      指定半径
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          placeholder="0-10000の範囲で自由入力（m単位）"
                          value={formData.designated_radius ? String(formData.designated_radius).replace('m', '') : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                              handleChange('designated_radius', value ? `${value}m` : '');
                              
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
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
                      </div>
                      {formData.designated_radius && (() => {
                        const radiusNum = parseInt(String(formData.designated_radius).replace('m', ''));
                        if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
                          return (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              半径は0-10000の範囲で入力してください
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* 抽出期間 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5b5fff]" />
                    抽出期間
                  </Label>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type"
                        checked={formData.extraction_period_type === 'preset'}
                        onChange={() => handleChange('extraction_period_type', 'preset')}
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">プリセット</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type"
                        checked={formData.extraction_period_type === 'custom'}
                        onChange={() => handleChange('extraction_period_type', 'custom')}
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">期間指定</span>
                    </label>
                  </div>

                  {formData.extraction_period_type === 'preset' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange('extraction_period', option.value)}
                          disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            formData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={formData.extraction_start_date}
                        onChange={(e) => handleChange('extraction_start_date', e.target.value)}
                        className="bg-white"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="date"
                        value={formData.extraction_end_date}
                        onChange={(e) => handleChange('extraction_end_date', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                  
                  {(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者・居住者&勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
                    </p>
                  )}
                </div>

                {/* 属性 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5b5fff]" />
                    属性
                  </Label>
                  <div className="flex p-1 bg-gray-100 rounded-lg">
                    {ATTRIBUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('attribute', option.value)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          formData.attribute === option.value
                            ? 'bg-white text-[#5b5fff] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 検知回数（検知者の場合のみ） */}
                {/* 検知回数（UI非表示） */}

                {/* 検知時間帯（検知者の場合のみ） */}
                {formData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5b5fff]" />
                      検知時間帯
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">開始時刻</Label>
                        <Input
                          type="time"
                          value={formData.detection_time_start || ''}
                          onChange={(e) => handleChange('detection_time_start', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">終了時刻</Label>
                        <Input
                          type="time"
                          value={formData.detection_time_end || ''}
                          onChange={(e) => handleChange('detection_time_end', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 滞在時間 */}
                <div>
                  <Label className="block mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#5b5fff]" />
                    滞在時間
                  </Label>
                  <select
                    value={formData.stay_time || ''}
                    onChange={(e) => handleChange('stay_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
                  >
                    <option value="">指定なし</option>
                    {STAY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* フッター */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            {currentStep === 'conditions' ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep('info')}
                className="text-gray-600"
              >
                <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                地点情報に戻る
              </Button>
            ) : (
              <div></div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-300"
              >
                キャンセル
              </Button>
              
              {entryMethod === 'csv' || entryMethod === 'paste' ? (
                // CSV/表形式コピペの場合はここでは何もしない（ステップ内で完結）
                <></>
              ) : (
                <>
                  {currentStep === 'info' ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep('conditions')}
                      disabled={!canProceedToConditions()}
                      className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
                    >
                      次へ
                      <ChevronDown className="w-4 h-4 ml-2 -rotate-90" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {poi ? '更新する' : '登録する'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 抽出条件設定ポップアップ */}
      {showExtractionConditionsPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#5b5fff]" />
                <h2 className="text-xl font-semibold text-gray-900">抽出条件設定</h2>
              </div>
              <button
                onClick={() => setShowExtractionConditionsPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {hasSegmentCommonConditions && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex gap-2 text-blue-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">セグメント共通条件が設定されています</p>
                      <p>
                        このセグメントには共通条件が設定されていますが、地点ごとに個別の抽出条件を設定することも可能です。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* 指定半径（都道府県指定とポリゴン選択の場合は非表示） */}
                {formData.poi_type !== 'prefecture' && formData.poi_type !== 'polygon' && (
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#5b5fff]" />
                    指定半径
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        step="1"
                        placeholder="0-10000の範囲で自由入力（m単位）"
                        value={formData.designated_radius ? String(formData.designated_radius).replace('m', '') : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                            handleChange('designated_radius', value ? `${value}m` : '');
                            
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
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
                    </div>
                    {formData.designated_radius && (() => {
                      const radiusNum = parseInt(String(formData.designated_radius).replace('m', ''));
                      if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
                        return (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            半径は0-10000の範囲で入力してください
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                )}

                {/* 抽出期間 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5b5fff]" />
                    抽出期間
                  </Label>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={formData.extraction_period_type === 'preset'}
                        onChange={() => handleChange('extraction_period_type', 'preset')}
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">プリセット</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="period_type_popup"
                        checked={formData.extraction_period_type === 'custom'}
                        onChange={() => handleChange('extraction_period_type', 'custom')}
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                        className="text-[#5b5fff] focus:ring-[#5b5fff]"
                      />
                      <span className="text-sm text-gray-700">期間指定</span>
                    </label>
                  </div>

                  {formData.extraction_period_type === 'preset' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange('extraction_period', option.value)}
                          disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            formData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={formData.extraction_start_date}
                        onChange={(e) => handleChange('extraction_start_date', e.target.value)}
                        className="bg-white"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="date"
                        value={formData.extraction_end_date}
                        onChange={(e) => handleChange('extraction_end_date', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                  
                  {(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者・居住者&勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
                    </p>
                  )}
                </div>

                {/* 属性 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5b5fff]" />
                    属性
                  </Label>
                  <div className="flex p-1 bg-gray-100 rounded-lg">
                    {ATTRIBUTE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('attribute', option.value)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          formData.attribute === option.value
                            ? 'bg-white text-[#5b5fff] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 検知回数（検知者の場合のみ） */}
                {formData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#5b5fff]" />
                      検知回数（〇回以上）
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={formData.detection_count || 1}
                        onChange={(e) => handleChange('detection_count', parseInt(e.target.value) || 1)}
                        className="bg-white"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">回以上</span>
                    </div>
                  </div>
                )}

                {/* 検知時間帯（検知者の場合のみ） */}
                {formData.attribute === 'detector' && (
                  <div>
                    <Label className="block mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5b5fff]" />
                      検知時間帯
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">開始時刻</Label>
                        <Input
                          type="time"
                          value={formData.detection_time_start || ''}
                          onChange={(e) => handleChange('detection_time_start', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">終了時刻</Label>
                        <Input
                          type="time"
                          value={formData.detection_time_end || ''}
                          onChange={(e) => handleChange('detection_time_end', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 滞在時間 */}
                <div>
                  <Label className="block mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#5b5fff]" />
                    滞在時間
                  </Label>
                  <select
                    value={formData.stay_time || ''}
                    onChange={(e) => handleChange('stay_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
                  >
                    <option value="">指定なし</option>
                    {STAY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExtractionConditionsPopup(false)}
                className="border-gray-300"
              >
                閉じる
              </Button>
              <Button
                type="button"
                onClick={() => setShowExtractionConditionsPopup(false)}
                className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
              >
                設定を保存
              </Button>
            </div>
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