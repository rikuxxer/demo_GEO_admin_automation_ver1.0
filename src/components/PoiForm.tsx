import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, MapPin, Building2, Package, Calendar, Clock, Users, Target, Check, ChevronDown, Settings, Settings2, AlertCircle, Loader2, Upload, Download, FileText, CheckCircle, PenLine, Table } from 'lucide-react';
import { PoiInfo, Segment, POI_TYPE_OPTIONS, ATTRIBUTE_OPTIONS, RADIUS_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { Badge } from './ui/badge';
import { getPrefectures, getCitiesByPrefecture } from '../utils/prefectureData';
import { geocodeAddress } from '../utils/geocoding';
import { toast } from 'sonner';
import { CSVValidationError, parseAndValidateExcel, downloadExcelTemplate } from '../utils/csvParser';

interface PoiFormProps {
  projectId: string;
  segmentId: string;
  segmentName?: string;
  segment?: Segment;
  pois?: PoiInfo[];
  poi?: PoiInfo | null;
  onSubmit: (poi: Partial<PoiInfo>) => void;
  onBulkSubmit?: (pois: Partial<PoiInfo>[]) => void;
  onCancel: () => void;
}

export function PoiForm({ projectId, segmentId, segmentName, segment, pois = [], poi, onSubmit, onBulkSubmit, onCancel }: PoiFormProps) {
  // このセグメントに属する地点数を確認
  const segmentPoiCount = pois.filter(p => p.segment_id === segmentId).length;
  const isFirstPoi = segmentPoiCount === 0 && !poi;
  
  // セグメントに共通条件が設定されているかチェック
  const hasSegmentCommonConditions = segment && segment.designated_radius;
  
  // 格納依頼済みの場合は編集不可
  const isLocationLocked = segment && segment.location_request_status !== 'not_requested';
  
  // 格納依頼済みの場合はフォームを表示しない
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
    poi_name: poi?.poi_name || '',
    address: poi?.address || '',
    location_id: poi?.location_id || '', // 地点IDを追加
    prefectures: poi?.prefectures || [],
    cities: poi?.cities || [],
    latitude: poi?.latitude,
    longitude: poi?.longitude,
    // 編集時は既存の地点データを使用、新規登録時はセグメント共通条件があればそれを使用、なければ空
    designated_radius: poi?.designated_radius || (segment?.designated_radius ? segment.designated_radius : ''),
    extraction_period: poi?.extraction_period || (segment?.extraction_period ? segment.extraction_period : ''),
    extraction_period_type: poi?.extraction_period_type || (segment?.extraction_period_type ? segment.extraction_period_type : 'preset'),
    extraction_start_date: poi?.extraction_start_date || (segment?.extraction_start_date ? segment.extraction_start_date : ''),
    extraction_end_date: poi?.extraction_end_date || (segment?.extraction_end_date ? segment.extraction_end_date : ''),
    attribute: poi?.attribute || (segment?.attribute ? segment.attribute : ''),
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

  // CSV関連のState
  const [entryMethod, setEntryMethod] = useState<string>(poi?.poi_type || 'manual');
  const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
  const [parsedPois, setParsedPois] = useState<Partial<PoiInfo>[]>([]);
  const [csvErrors, setCsvErrors] = useState<CSVValidationError[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表形式コピペ関連のState
  const [pasteStep, setPasteStep] = useState<'paste' | 'preview'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [pastedHtml, setPastedHtml] = useState<string>('');
  const [parsedPastePois, setParsedPastePois] = useState<Partial<PoiInfo>[]>([]);
  const [pasteErrors, setPasteErrors] = useState<CSVValidationError[]>([]);
  const [isPasteProcessing, setIsPasteProcessing] = useState(false);
  const [isGeocodingPaste, setIsGeocodingPaste] = useState(false);
  // 表形式コピペ用の抽出条件
  const [pasteExtractionConditions, setPasteExtractionConditions] = useState<{
    designated_radius: string;
    extraction_period: string;
    attribute: string;
    detection_count: number | undefined;
    detection_time_start: string;
    detection_time_end: string;
    stay_time: string;
  }>({
    designated_radius: segment?.designated_radius || '',
    extraction_period: segment?.extraction_period || '1month',
    attribute: segment?.attribute || 'detector',
    detection_count: segment?.detection_count || 1,
    detection_time_start: segment?.detection_time_start || '',
    detection_time_end: segment?.detection_time_end || '',
    stay_time: segment?.stay_time || '',
  });
  const pasteTableRef = useRef<HTMLDivElement>(null);

  const handleEntryMethodChange = (value: string) => {
    setEntryMethod(value);
    if (value !== 'csv' && value !== 'paste') {
      handleChange('poi_type', value);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsCsvProcessing(true);

    try {
      // Excelファイルとして処理
      const result = await parseAndValidateExcel(selectedFile, projectId, segmentId, false);
      
      setParsedPois(result.success);
      setCsvErrors(result.errors);
      setCsvTotalRows(result.total);
      
      if (result.total === 0) {
        toast.error('ファイルにデータ行が含まれていません');
        handleResetCsv();
        return;
      }
      
      setCsvStep('preview');
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

  const handleCsvSubmit = () => {
    if (onBulkSubmit) {
      onBulkSubmit(parsedPois);
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

    // 列のインデックスを推測（地点名、住所、緯度、経度、地点ID）
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
    const locationIdIndex = hasHeader ? getColumnIndex(['地点id', 'location_id', 'id']) : 4;

    // データ行を処理
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(delimiter).map(col => col.trim());
      
      const poiName = poiNameIndex >= 0 && poiNameIndex < columns.length ? columns[poiNameIndex] : '';
      const address = addressIndex >= 0 && addressIndex < columns.length ? columns[addressIndex] : '';
      const latStr = latIndex >= 0 && latIndex < columns.length ? columns[latIndex] : '';
      const lngStr = lngIndex >= 0 && lngIndex < columns.length ? columns[lngIndex] : '';
      const locationId = locationIdIndex >= 0 && locationIdIndex < columns.length ? columns[locationIdIndex] : '';

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
        location_id: locationId.trim() || undefined,
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

      setParsedPastePois(result.pois);
      setPasteErrors(result.errors);
      
      if (result.pois.length > 0) {
        setPasteStep('preview');
        toast.success(`${result.pois.length}件の地点データを読み込みました`);
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
        toast.warning(`${errorCount}件の地点で緯度経度の取得に失敗しました`);
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

  // 表形式コピペの登録
  const handlePasteSubmit = () => {
    if (onBulkSubmit && parsedPastePois.length > 0) {
      // 抽出条件をすべてのPOIに適用
      const poisWithConditions = parsedPastePois.map(poi => ({
        ...poi,
        ...pasteExtractionConditions,
      }));
      onBulkSubmit(poisWithConditions);
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
    if (formData.attribute === 'resident' || formData.attribute === 'worker') {
      setFormData(prev => ({
        ...prev,
        extraction_period: '3month',
        extraction_period_type: 'preset',
      }));
    }
  }, [formData.attribute]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (formData.poi_type === 'manual' && !formData.poi_name) {
      alert('地点名は必須項目です');
      return;
    }
    if (formData.poi_type === 'prefecture' && (!formData.cities || formData.cities.length === 0)) {
      alert('市区町村を少なくとも1つ選択してください');
      return;
    }
    // 都道府県指定以外の場合のみ半径が必須
    if (formData.poi_type !== 'prefecture' && !formData.designated_radius) {
      alert('指定半径は必須項目です');
      return;
    }
    if (!formData.extraction_period && formData.extraction_period_type === 'preset') {
      alert('抽出期間は必須項目です');
      return;
    }
    if (formData.extraction_period_type === 'custom' && (!formData.extraction_start_date || !formData.extraction_end_date)) {
      alert('抽出期間の開始日と終了日を指定してください');
      return;
    }

    // 緯度経度を数値に変換
    const submitData = {
      ...formData,
      latitude: formData.latitude !== undefined && formData.latitude !== null && formData.latitude !== '' 
        ? (typeof formData.latitude === 'string' ? parseFloat(formData.latitude) : formData.latitude)
        : undefined,
      longitude: formData.longitude !== undefined && formData.longitude !== null && formData.longitude !== ''
        ? (typeof formData.longitude === 'string' ? parseFloat(formData.longitude) : formData.longitude)
        : undefined,
    };

    onSubmit(submitData);
  };

  const handleChange = (field: keyof PoiInfo, value: string | number) => {
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
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* ステップインジケーター */}
          {entryMethod !== 'csv' && (
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
          {currentStep === 'info' && (
            <div className="p-6 space-y-6">
              {/* 地点タイプ選択 */}
              {/* 登録モード切替タ��（新規登録時のみ） */}
              {!poi && (
                <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange(formData.poi_type || 'manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                      entryMethod !== 'csv' && entryMethod !== 'paste'
                        ? 'bg-white text-[#5b5fff] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                    手動で登録
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('paste')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                      entryMethod === 'paste'
                        ? 'bg-white text-[#5b5fff] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    表形式コピペ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('csv')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                      entryMethod === 'csv'
                        ? 'bg-white text-[#5b5fff] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Table className="w-4 h-4" />
                    Excel一括登録
                  </button>
                </div>
              )}

              {/* ���動登録の場合の地点タイプ選択 */}
              {entryMethod !== 'csv' && entryMethod !== 'paste' && (
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#5b5fff]" />
                    地点タイプ
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {POI_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleEntryMethodChange(option.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          entryMethod === option.value
                            ? 'border-[#5b5fff] bg-[#5b5fff]/5 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            entryMethod === option.value
                              ? 'bg-[#5b5fff] text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getPoiTypeIcon(option.value)}
                          </div>
                          <span className={`text-sm text-center ${
                            entryMethod === option.value ? 'text-[#5b5fff]' : 'text-gray-700'
                          }`}>
                            {option.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                            <h3 className="text-sm text-blue-900 mb-2">Excelテンプレート</h3>
                            <p className="text-sm text-blue-700 mb-3">
                              テンプレートをダウンロードし、地点情報（地点名、住所、緯度、経度、地点ID）を入力してください
                            </p>
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
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">地点ID</th>
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

                      <div className="flex justify-between pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={handleResetCsv} className="border-gray-200">
                          クリア
                        </Button>
                        <Button
                          onClick={handleCsvSubmit}
                          disabled={parsedPois.length === 0}
                          className="bg-primary text-primary-foreground"
                        >
                          この内容で登録する ({parsedPois.length}件)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 表形式コピペ */}
              {entryMethod === 'paste' && (
                <div className="space-y-6">
                  {/* Step 1: Paste */}
                  {pasteStep === 'paste' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm text-blue-900 mb-2">表形式データの貼り付け</h3>
                            <p className="text-sm text-blue-700 mb-2">
                              ExcelやGoogleスプレッドシートからコピーした表形式データを貼り付けてください
                            </p>
                            <p className="text-xs text-blue-600">
                              • 地点名と住所は必須です<br />
                              • タブ区切りまたはカンマ区切りのデータに対応<br />
                              • ヘッダー行がある場合は自動検出されます（地点名、住所、緯度、経度、地点ID）
                            </p>
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
                                className="w-full min-h-80 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white overflow-auto font-mono text-sm relative"
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
                          onClick={(e) => {
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
                          onClick={(e) => {
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
                                className="text-xs"
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
                                  <th className="px-4 py-2 text-left text-xs text-gray-500">地点ID</th>
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
                            <select
                              value={pasteExtractionConditions.designated_radius}
                              onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, designated_radius: e.target.value }))}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">指定なし</option>
                              {RADIUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
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
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {EXTRACTION_PERIOD_PRESET_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
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
                                const newAttribute = e.target.value as 'detector' | 'resident' | 'worker';
                                setPasteExtractionConditions(prev => ({
                                  ...prev,
                                  attribute: newAttribute,
                                  extraction_period: (newAttribute === 'resident' || newAttribute === 'worker') ? '3month' : prev.extraction_period,
                                  extraction_period_type: (newAttribute === 'resident' || newAttribute === 'worker') ? 'preset' : prev.extraction_period_type
                                }));
                              }}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {ATTRIBUTE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* 滞在時間 */}
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              滞在時間
                            </p>
                            <select
                              value={pasteExtractionConditions.stay_time}
                              onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, stay_time: e.target.value }))}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">指定なし</option>
                              {STAY_TIME_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* 検知回数（検知者の場合のみ） */}
                          {pasteExtractionConditions.attribute === 'detector' && (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                検知回数
                              </p>
                              <Input
                                type="number"
                                min="1"
                                value={pasteExtractionConditions.detection_count || ''}
                                onChange={(e) => setPasteExtractionConditions(prev => ({ ...prev, detection_count: e.target.value ? parseInt(e.target.value) : 1 }))}
                                placeholder="1"
                                className="w-full text-sm h-8 px-2"
                              />
                              {pasteExtractionConditions.detection_count && (
                                <p className="text-xs text-gray-400">{pasteExtractionConditions.detection_count}回以上</p>
                              )}
                            </div>
                          )}

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

                      <div className="flex justify-between pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={handleResetPaste} className="border-gray-200">
                          クリア
                        </Button>
                        <Button
                          onClick={handlePasteSubmit}
                          disabled={parsedPastePois.length === 0}
                          className="bg-primary text-primary-foreground"
                        >
                          この内容で登録する ({parsedPastePois.length}件)
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
                        className="border-gray-200"
                      >
                        {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : '緯度経度取得'}
                      </Button>
                    </div>
                  </div>

                  {/* 地点ID入力 */}
                  <div>
                    <Label htmlFor="location_id" className="block mb-2">
                      地点ID
                    </Label>
                    <Input
                      id="location_id"
                      type="text"
                      value={formData.location_id || ''}
                      onChange={(e) => handleChange('location_id', e.target.value)}
                      placeholder="例：LOC-001"
                      className="w-full bg-white"
                    />
                  </div>

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
                          className="w-full justify-between bg-white"
                          onClick={() => setShowPrefectureDropdown(!showPrefectureDropdown)}
                        >
                          {selectedPrefecture || '都道府県を選択してください'}
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                        
                        {showPrefectureDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
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
                {/* 指定半径 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#5b5fff]" />
                    指定半径
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {RADIUS_OPTIONS.slice(0, 12).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('designated_radius', option.value)}
                        className={`px-3 py-2 text-sm rounded-md border transition-all ${
                          formData.designated_radius === option.value
                            ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <select
                      value={RADIUS_OPTIONS.find(r => r.value === formData.designated_radius) ? '' : formData.designated_radius}
                      onChange={(e) => e.target.value && handleChange('designated_radius', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">その他の半径を選択...</option>
                      {RADIUS_OPTIONS.slice(12).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

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
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
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
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
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
                          disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            formData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(formData.attribute === 'resident' || formData.attribute === 'worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  
                  {(formData.attribute === 'resident' || formData.attribute === 'worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
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
                  {currentStep === 'info' && entryMethod === 'manual' ? (
                    // 手動登録の場合は抽出条件が同じ画面にあるので、直接登録
                    <Button
                      type="submit"
                      disabled={!formData.poi_name}
                      className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {poi ? '更新する' : '登録する'}
                    </Button>
                  ) : currentStep === 'info' ? (
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
                {/* 指定半径 */}
                <div>
                  <Label className="block mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#5b5fff]" />
                    指定半径
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {RADIUS_OPTIONS.slice(0, 12).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('designated_radius', option.value)}
                        className={`px-3 py-2 text-sm rounded-md border transition-all ${
                          formData.designated_radius === option.value
                            ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <select
                      value={RADIUS_OPTIONS.find(r => r.value === formData.designated_radius) ? '' : formData.designated_radius}
                      onChange={(e) => e.target.value && handleChange('designated_radius', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">その他の半径を選択...</option>
                      {RADIUS_OPTIONS.slice(12).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

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
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
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
                        disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
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
                          disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            formData.extraction_period === option.value
                              ? 'bg-[#5b5fff] text-white border-[#5b5fff]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          } ${(formData.attribute === 'resident' || formData.attribute === 'worker') && option.value !== '3month' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  
                  {(formData.attribute === 'resident' || formData.attribute === 'worker') && (
                    <p className="text-xs text-orange-600 mt-2">
                      ※居住者・勤務者の場合、抽出期間は「直近3ヶ月」に固定されます。
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
    </div>
  );
}