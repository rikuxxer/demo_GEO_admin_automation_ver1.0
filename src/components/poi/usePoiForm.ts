import { useState, useEffect, useRef, startTransition } from 'react';
import { PoiInfo, Segment } from '../../types/schema';
import { getCitiesByPrefecture } from '../../utils/prefectureData';
import { geocodeAddress } from '../../utils/geocoding';
import { toast } from 'sonner';
import { CSVValidationError, parseAndValidateExcel } from '../../utils/csvParser';
import { validatePolygonRange } from '../../utils/polygonUtils';

export interface PoiFormProps {
  projectId: string;
  segmentId: string;
  segmentName?: string;
  segment?: Segment;
  pois?: PoiInfo[];
  poi?: PoiInfo | null;
  defaultCategory?: 'tg' | 'visit_measurement';
  defaultGroupId?: string | null;
  visitMeasurementGroups?: Array<{ group_id: string; group_name: string; designated_radius?: string; extraction_period?: string; extraction_period_type?: 'preset' | 'custom' | 'specific_dates'; extraction_start_date?: string; extraction_end_date?: string; extraction_dates?: string[]; attribute?: string; detection_count?: number; detection_time_start?: string; detection_time_end?: string; stay_time?: string; group_name?: string }>;
  onSubmit: (poi: Partial<PoiInfo>) => void;
  onBulkSubmit?: (pois: Partial<PoiInfo>[]) => void;
  onCancel: () => void;
}

export function usePoiForm({
  projectId,
  segmentId,
  segment,
  pois = [],
  poi,
  defaultCategory,
  defaultGroupId,
  visitMeasurementGroups = [],
  onSubmit,
  onBulkSubmit,
  onCancel,
}: PoiFormProps) {
  const segmentPoiCount = pois.filter(p => p.segment_id === segmentId).length;

  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  const [showDateRangeWarning, setShowDateRangeWarning] = useState(false);

  const getSixMonthsAgoDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  };

  const getFiveDaysAgoDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date.toISOString().split('T')[0];
  };

  const isDateMoreThanSixMonthsAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return selectedDate < sixMonthsAgo;
  };

  const [designatedRadiusDraft, setDesignatedRadiusDraft] = useState('');
  const designatedRadiusRef = useRef(
    poi?.designated_radius ||
    (defaultCategory === 'visit_measurement' && visitMeasurementGroups.find(g => g.group_id === (poi?.visit_measurement_group_id || defaultGroupId))?.designated_radius) ||
    segment?.designated_radius ||
    ''
  );
  const isFirstPoi = segmentPoiCount === 0 && !poi;

  const hasSegmentCommonConditions = segment && segment.designated_radius;
  const fixedRadiusOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

  const isVisitMeasurement = poi?.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement';
  const isLocationLocked = !isVisitMeasurement && segment && segment.location_request_status !== 'not_requested';

  const isVisitMeasurementCategory = poi?.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement';
  const initialGroupId = isVisitMeasurementCategory
    ? (poi?.visit_measurement_group_id || defaultGroupId || undefined)
    : undefined;
  const initialSelectedGroup = isVisitMeasurementCategory
    ? visitMeasurementGroups.find(g => g.group_id === initialGroupId)
    : undefined;

  const [formData, setFormData] = useState<Partial<PoiInfo>>({
    project_id: projectId,
    segment_id: segmentId,
    poi_type: poi?.poi_type || 'manual',
    poi_category: poi?.poi_category || defaultCategory || undefined,
    visit_measurement_group_id: initialGroupId,
    poi_name: poi?.poi_name || '',
    address: poi?.address || '',
    location_id: poi?.location_id || undefined,
    prefectures: poi?.prefectures || [],
    cities: poi?.cities || [],
    latitude: poi?.latitude,
    longitude: poi?.longitude,
    polygon: poi?.polygon || undefined,
    designated_radius: poi?.designated_radius ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.designated_radius
        ? initialSelectedGroup.designated_radius
        : (segment?.designated_radius ? segment.designated_radius : '')),
    extraction_period: poi?.extraction_period ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.extraction_period
        ? initialSelectedGroup.extraction_period
        : (segment?.extraction_period ? segment.extraction_period : '')),
    extraction_period_type: (() => {
      const poiPeriodType = poi?.extraction_period_type;
      if (poiPeriodType) {
        if (poi?.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') {
          return poiPeriodType === 'preset' ? 'custom' : poiPeriodType;
        }
        return poiPeriodType;
      }
      if (defaultCategory === 'visit_measurement' && initialSelectedGroup?.extraction_period_type) {
        const groupPeriodType = initialSelectedGroup.extraction_period_type;
        return groupPeriodType === 'preset' ? 'custom' : groupPeriodType;
      }
      const segmentPeriodType = segment?.extraction_period_type || 'custom';
      if (defaultCategory === 'visit_measurement') {
        return segmentPeriodType === 'preset' ? 'custom' : segmentPeriodType;
      }
      return segmentPeriodType;
    })(),
    extraction_start_date: poi?.extraction_start_date ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.extraction_start_date
        ? initialSelectedGroup.extraction_start_date
        : (segment?.extraction_start_date ? segment.extraction_start_date : '')),
    extraction_end_date: poi?.extraction_end_date ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.extraction_end_date
        ? initialSelectedGroup.extraction_end_date
        : (segment?.extraction_end_date ? segment.extraction_end_date : '')),
    extraction_dates: poi?.extraction_dates ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.extraction_dates
        ? initialSelectedGroup.extraction_dates.slice()
        : (segment?.extraction_dates ? segment.extraction_dates.slice() : [])),
    attribute: poi?.attribute ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.attribute
        ? initialSelectedGroup.attribute
        : (segment?.attribute || undefined)),
    detection_count: poi?.detection_count ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.detection_count
        ? initialSelectedGroup.detection_count
        : (segment?.detection_count ? segment.detection_count : undefined)),
    detection_time_start: poi?.detection_time_start ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.detection_time_start
        ? initialSelectedGroup.detection_time_start
        : (segment?.detection_time_start ? segment.detection_time_start : '')),
    detection_time_end: poi?.detection_time_end ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.detection_time_end
        ? initialSelectedGroup.detection_time_end
        : (segment?.detection_time_end ? segment.detection_time_end : '')),
    stay_time: poi?.stay_time ||
      (defaultCategory === 'visit_measurement' && initialSelectedGroup?.stay_time
        ? initialSelectedGroup.stay_time
        : (segment?.stay_time ? segment.stay_time : '')),
  });

  designatedRadiusRef.current = formData.designated_radius || designatedRadiusRef.current || '';

  const selectedGroup = (formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement')
    ? visitMeasurementGroups.find(g =>
        g.group_id === (formData.visit_measurement_group_id || poi?.visit_measurement_group_id || defaultGroupId)
      )
    : undefined;

  useEffect(() => {
    designatedRadiusRef.current = formData.designated_radius || designatedRadiusRef.current;
  }, [formData.designated_radius]);

  useEffect(() => {
    if ((defaultCategory === 'visit_measurement' || formData.poi_category === 'visit_measurement') && selectedGroup) {
      setFormData(prev => ({
        ...prev,
        designated_radius: selectedGroup.designated_radius || '',
        extraction_period: selectedGroup.extraction_period || '1month',
        extraction_period_type: (() => {
          const periodType = selectedGroup.extraction_period_type || 'custom';
          return periodType === 'preset' ? 'custom' : periodType;
        })(),
        extraction_start_date: selectedGroup.extraction_start_date || '',
        extraction_end_date: selectedGroup.extraction_end_date || '',
        extraction_dates: selectedGroup.extraction_dates ? selectedGroup.extraction_dates.slice() : [],
        attribute: selectedGroup.attribute || 'detector',
        detection_count: selectedGroup.detection_count || 1,
        detection_time_start: selectedGroup.detection_time_start || '',
        detection_time_end: selectedGroup.detection_time_end || '',
        stay_time: selectedGroup.stay_time || '',
      }));
    }
  }, [formData.visit_measurement_group_id, selectedGroup, defaultCategory, formData.poi_category]);

  const [currentStep, setCurrentStep] = useState<'info' | 'conditions'>('info');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showPrefectureDropdown, setShowPrefectureDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [autoSelectAllCities, setAutoSelectAllCities] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showExtractionConditionsPopup, setShowExtractionConditionsPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [entryMethod, setEntryMethod] = useState<string>(() => {
    if (poi) {
      if (poi.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') {
        return 'manual';
      }
      return poi.poi_type || 'manual';
    }
    return defaultCategory === 'visit_measurement' ? 'manual' : 'paste';
  });
  const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
  const [parsedPois, setParsedPois] = useState<Partial<PoiInfo>[]>([]);
  const [csvErrors, setCsvErrors] = useState<CSVValidationError[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);

  const [pasteStep, setPasteStep] = useState<'paste' | 'preview'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [pastedHtml, setPastedHtml] = useState<string>('');
  const [parsedPastePois, setParsedPastePois] = useState<Partial<PoiInfo>[]>([]);
  const [pasteErrors, setPasteErrors] = useState<CSVValidationError[]>([]);
  const [isPasteProcessing, setIsPasteProcessing] = useState(false);
  const [isGeocodingPaste, setIsGeocodingPaste] = useState(false);
  const [bulkGroupId, setBulkGroupId] = useState<string | null>(defaultGroupId || null);
  const [polygons, setPolygons] = useState<Array<{ id: string; coordinates: number[][]; name?: string }>>(
    poi?.polygon ? [{ id: 'polygon-0', coordinates: poi.polygon, name: poi.poi_name || '' }] : []
  );
  const [showPolygonEditor, setShowPolygonEditor] = useState(false);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | undefined>(undefined);
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
    extraction_period_type: segment?.extraction_period_type || 'custom',
    attribute: (segment?.attribute || 'detector') as 'detector' | 'resident' | 'worker' | 'resident_and_worker',
    detection_count: segment?.detection_count || 1,
    detection_time_start: segment?.detection_time_start || '',
    detection_time_end: segment?.detection_time_end || '',
    stay_time: segment?.stay_time || '',
  });
  const pasteTableRef = useRef<HTMLDivElement>(null);

  const [bulkPoiCategory, setBulkPoiCategory] = useState<'tg' | 'visit_measurement'>(defaultCategory || 'tg');

  const handleEntryMethodChange = (value: string) => {
    if (poi && (poi.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement')) {
      return;
    }
    if (value === 'csv') {
      return;
    }
    setEntryMethod(value);
    if (value === 'prefecture') {
      handleChange('poi_type', 'prefecture');
    } else if (value === 'polygon') {
      handleChange('poi_type', 'polygon');
      setShowPolygonEditor(true);
    } else if (value !== 'paste') {
      handleChange('poi_type', value);
    }
  };

  const handlePolygonsChange = (newPolygons: Array<{ id: string; coordinates: number[][]; name?: string }>) => {
    setPolygons(newPolygons);
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
      const result = await parseAndValidateExcel(selectedFile, projectId, segmentId, false);

      if (result.success.length > 5000) {
        toast.error('一度に登録できる地点数は最大5000件です。データを分割して登録してください。', {
          duration: 5000,
        });
        handleResetCsv();
        return;
      }

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

      const needsGeocoding = result.success.filter(poi =>
        (poi.latitude === undefined || poi.latitude === null ||
         poi.longitude === undefined || poi.longitude === null) &&
        poi.address && poi.address.trim() !== ''
      );

      if (needsGeocoding.length > 0) {
        setTimeout(async () => {
          const updatedPois = [...result.success];
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < updatedPois.length; i++) {
            const p = updatedPois[i];

            if (p.latitude !== undefined && p.latitude !== null &&
                p.longitude !== undefined && p.longitude !== null) {
              continue;
            }

            if (!p.address || p.address.trim() === '') {
              continue;
            }

            try {
              const geocodeResult = await geocodeAddress(p.address);
              if (geocodeResult.isJapan === false) {
                errorCount++;
                console.error(`海外の地点が検出されました: "${p.address}"`);
                continue;
              }
              updatedPois[i] = {
                ...p,
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude,
              };
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Geocoding error for "${p.address}":`, error);
            }

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

  const removeDuplicatePois = (poisList: Partial<PoiInfo>[]): { filtered: Partial<PoiInfo>[]; removedCount: number } => {
    const tgPois = poisList.filter(p => (p.poi_category || defaultCategory) === 'tg');
    const nonTgPois = poisList.filter(p => (p.poi_category || defaultCategory) !== 'tg');

    if (tgPois.length === 0) {
      return { filtered: poisList, removedCount: 0 };
    }

    const seen = new Map<string, number>();
    const filtered: Partial<PoiInfo>[] = [];
    let removedCount = 0;

    for (const p of tgPois) {
      const poiName = (p.poi_name || '').trim();
      const address = (p.address || '').trim();

      if (poiName && address) {
        const key = `${poiName}|${address}`;
        if (seen.has(key)) {
          removedCount++;
          continue;
        }
        seen.set(key, 1);
      }
      filtered.push(p);
    }

    filtered.push(...nonTgPois);

    return { filtered, removedCount };
  };

  const handleCsvSubmit = async () => {
    if (onBulkSubmit) {
      setErrorMessage(null);
      const existingPrefecturePois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'prefecture'
      );
      if (existingPrefecturePois.length > 0) {
        setErrorMessage('都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません');
        return;
      }
      const existingPolygonPois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'polygon'
      );
      if (existingPolygonPois.length > 0) {
        setErrorMessage('ポリゴン指定の地点が既に登録されているセグメントには、他のタイプの地点を登録できません');
        return;
      }

      const isVisitMeasurementCat = defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement';
      if (isVisitMeasurementCat) {
        if (visitMeasurementGroups.length === 0) {
          setErrorMessage('来店計測地点を登録するには、先に計測地点グループを作成してください。');
          return;
        }
        const poisWithoutGroup = parsedPois.filter(p => {
          const category = p.poi_category || defaultCategory || bulkPoiCategory;
          return category === 'visit_measurement' && !p.visit_measurement_group_id && !bulkGroupId;
        });
        if (poisWithoutGroup.length > 0) {
          setErrorMessage('来店計測地点には計測地点グループの選択が必須です。すべての来店計測地点にグループを設定してください。');
          return;
        }
      }

      const poisWithCategory = parsedPois.map(p => ({
        ...p,
        poi_category: p.poi_category || defaultCategory || bulkPoiCategory,
        location_id: undefined,
      }));

      const { filtered, removedCount } = removeDuplicatePois(poisWithCategory);

      if (removedCount > 0) {
        toast.info(`${removedCount}件の重複地点を削除しました`);
      }

      if (filtered.length >= 1000) {
        await processBatchSubmit(filtered);
      } else {
        onBulkSubmit(filtered);
      }
    }
  };

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

  const parsePastedTable = (text: string): { pois: Partial<PoiInfo>[]; errors: CSVValidationError[] } => {
    const parsedPoiList: Partial<PoiInfo>[] = [];
    const errors: CSVValidationError[] = [];

    if (!text || text.trim() === '') {
      return { pois: parsedPoiList, errors };
    }

    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return { pois: parsedPoiList, errors };
    }

    const firstLine = lines[0];
    const isTabDelimited = firstLine.includes('\t');
    const delimiter = isTabDelimited ? '\t' : ',';

    let startIndex = 0;
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('地点名') || headerLine.includes('住所') ||
                      headerLine.includes('poi_name') || headerLine.includes('address');

    if (hasHeader) {
      startIndex = 1;
    }

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

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(delimiter).map(col => col.trim());

      const poiName = poiNameIndex >= 0 && poiNameIndex < columns.length ? columns[poiNameIndex] : '';
      const address = addressIndex >= 0 && addressIndex < columns.length ? columns[addressIndex] : '';
      const latStr = latIndex >= 0 && latIndex < columns.length ? columns[latIndex] : '';
      const lngStr = lngIndex >= 0 && lngIndex < columns.length ? columns[lngIndex] : '';

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

      const parsedPoi: Partial<PoiInfo> = {
        project_id: projectId,
        segment_id: segmentId,
        poi_type: 'manual',
        poi_name: poiName.trim(),
        address: address.trim(),
        latitude,
        longitude,
      };

      parsedPoiList.push(parsedPoi);
    }

    return { pois: parsedPoiList, errors };
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    if (htmlData && htmlData.includes('<table')) {
      setPastedHtml(htmlData);
      const extractedText = extractDataFromHtmlTable(htmlData);
      setPastedText(extractedText);

      setTimeout(() => {
        handlePasteProcess(extractedText);
      }, 100);
    } else if (textData) {
      setPastedText(textData);
      setPastedHtml('');

      setTimeout(() => {
        handlePasteProcess(textData);
      }, 100);
    }
  };

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

      if (result.pois.length > 5000) {
        toast.error('一度に登録できる地点数は最大5000件です。データを分割して登録してください。', {
          duration: 5000,
        });
        setIsPasteProcessing(false);
        return;
      }

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

        const needsGeocoding = result.pois.filter(p =>
          (p.latitude === undefined || p.latitude === null ||
           p.longitude === undefined || p.longitude === null) &&
          p.address && p.address.trim() !== ''
        );

        if (needsGeocoding.length > 0) {
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

  const handlePasteGeocode = async () => {
    const needsGeocoding = parsedPastePois.filter(p =>
      (p.latitude === undefined || p.latitude === null ||
       p.longitude === undefined || p.longitude === null) &&
      p.address && p.address.trim() !== ''
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
        const p = updatedPois[i];

        if (p.latitude !== undefined && p.latitude !== null &&
            p.longitude !== undefined && p.longitude !== null) {
          continue;
        }

        if (!p.address || p.address.trim() === '') {
          continue;
        }

        try {
          const result = await geocodeAddress(p.address);
          if (result.isJapan === false) {
            errorCount++;
            console.error(`海外の地点が検出されました: "${p.address}"`);
            continue;
          }
          updatedPois[i] = {
            ...p,
            latitude: result.latitude,
            longitude: result.longitude,
          };
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Geocoding error for "${p.address}":`, error);
        }

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

  const processBatchSubmit = async (poisList: Partial<PoiInfo>[]) => {
    if (!onBulkSubmit) return;

    const BATCH_SIZE = 100;
    const batches = [];

    for (let i = 0; i < poisList.length; i += BATCH_SIZE) {
      batches.push(poisList.slice(i, i + BATCH_SIZE));
    }

    setIsBatchProcessing(true);
    setBatchTotal(batches.length);
    setBatchProgress(0);

    try {
      for (let i = 0; i < batches.length; i++) {
        await onBulkSubmit(batches[i]);
        setBatchProgress(i + 1);

        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast.success(`${poisList.length}件の地点を登録しました`);
      onCancel();
    } catch (error) {
      console.error('Batch submit error:', error);
      toast.error('一括登録中にエラーが発生しました');
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(0);
      setBatchTotal(0);
    }
  };

  const handlePasteSubmit = async () => {
    if (onBulkSubmit && parsedPastePois.length > 0) {
      setErrorMessage(null);
      const existingPrefecturePois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'prefecture'
      );
      if (existingPrefecturePois.length > 0) {
        setErrorMessage('都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません');
        return;
      }
      const existingPolygonPois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'polygon'
      );
      if (existingPolygonPois.length > 0) {
        setErrorMessage('ポリゴン指定の地点が既に登録されているセグメントには、他のタイプの地点を登録できません');
        return;
      }

      const isVisitMeasurementCat = defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement';
      if (isVisitMeasurementCat) {
        if (visitMeasurementGroups.length === 0) {
          setErrorMessage('来店計測地点を登録するには、先に計測地点グループを作成してください。');
          return;
        }
        const poisWithoutGroup = parsedPastePois.filter(p => {
          const category = p.poi_category || defaultCategory || bulkPoiCategory;
          return category === 'visit_measurement' && !p.visit_measurement_group_id && !bulkGroupId;
        });
        if (poisWithoutGroup.length > 0) {
          setErrorMessage('来店計測地点には計測地点グループの選択が必須です。すべての来店計測地点にグループを設定してください。');
          return;
        }
      }

      const poisWithConditions = parsedPastePois.map(p => ({
        ...p,
        designated_radius: pasteExtractionConditions.designated_radius,
        extraction_period: pasteExtractionConditions.extraction_period,
        extraction_period_type: pasteExtractionConditions.extraction_period_type,
        attribute: pasteExtractionConditions.attribute,
        detection_count: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_count : undefined,
        detection_time_start: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_time_start : undefined,
        detection_time_end: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.detection_time_end : undefined,
        stay_time: pasteExtractionConditions.attribute === 'detector' ? pasteExtractionConditions.stay_time : undefined,
        poi_category: p.poi_category || defaultCategory || bulkPoiCategory,
        visit_measurement_group_id: p.visit_measurement_group_id || ((defaultCategory === 'visit_measurement' || bulkPoiCategory === 'visit_measurement') && bulkGroupId ? bulkGroupId : undefined),
        location_id: undefined,
      }));

      const { filtered, removedCount } = removeDuplicatePois(poisWithConditions);

      if (removedCount > 0) {
        toast.info(`${removedCount}件の重複地点を削除しました`);
      }

      if (filtered.length >= 1000) {
        await processBatchSubmit(filtered);
      } else {
        onBulkSubmit(filtered);
      }
    }
  };

  useEffect(() => {
    if (selectedPrefecture) {
      setAvailableCities(getCitiesByPrefecture(selectedPrefecture));
    }
  }, [selectedPrefecture]);

  useEffect(() => {
    if (formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') {
      setFormData(prev => ({
        ...prev,
        extraction_period: '3month',
        extraction_period_type: 'preset',
      }));
    }
  }, [formData.attribute]);

  useEffect(() => {
    if (entryMethod !== 'paste' && entryMethod !== 'csv' && entryMethod !== 'prefecture') {
      if (formData.address && formData.address.trim() !== '' &&
          (formData.latitude === undefined || formData.latitude === null ||
           formData.longitude === undefined || formData.longitude === null)) {
        if (poi && poi.address === formData.address) {
          return;
        }

        const timeoutId = setTimeout(async () => {
          try {
            const result = await geocodeAddress(formData.address!);
            if (result.isJapan === false) {
              toast.error('海外の地点が検出されました', {
                description: `住所「${formData.address}」は日本国外の地点です。日本国内の住所を入力してください。`,
                duration: 5000,
              });
              return;
            }
            setFormData(prev => ({
              ...prev,
              latitude: result.latitude,
              longitude: result.longitude,
            }));
          } catch (error) {
            console.error('自動ジオコーディングエラー:', error);
          }
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.address, entryMethod, poi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const radiusForSubmit = designatedRadiusRef.current || formData.designated_radius || '';
    const localFormData = { ...formData, designated_radius: radiusForSubmit };

    if (entryMethod === 'polygon' || formData.poi_type === 'polygon') {
      if (!formData.polygon || formData.polygon.length === 0) {
        setErrorMessage('ポリゴンを少なくとも1つ描画してください');
        return;
      }

      if (formData.polygon && Array.isArray(formData.polygon) && formData.polygon.length >= 3) {
        const validation = validatePolygonRange(formData.polygon);
        if (!validation.isValid) {
          setErrorMessage(validation.error || 'ポリゴンの範囲が広すぎます');
          return;
        }
      }

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

      const existingNonPolygonPois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type !== 'polygon' &&
        (!poi || p.poi_id !== poi.poi_id)
      );
      if (existingNonPolygonPois.length > 0) {
        const hasPrefecture = existingNonPolygonPois.some(p => p.poi_type === 'prefecture');
        if (hasPrefecture) {
          setErrorMessage('ポリゴン指定と都道府県指定は同一セグメントでは併用できません');
          return;
        }
        setErrorMessage('ポリゴン指定の地点は、ポリゴン指定単独のセグメントでのみ登録できます。このセグメントには既に他のタイプの地点が登録されています。');
        return;
      }

      const existingPolygonPois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'polygon' &&
        p.polygon && p.polygon.length > 0
      );

      const existingCount = poi
        ? existingPolygonPois.filter(p => p.poi_id !== poi.poi_id).length
        : existingPolygonPois.length;

      if (existingCount >= 10) {
        setErrorMessage('このセグメントには既に10個のポリゴンが登録されています。新しいポリゴンを追加するには、既存のポリゴンを削除してください。');
        return;
      }

      if (!poi && existingCount + polygons.length > 10) {
        setErrorMessage(`このセグメントには既に${existingCount}個のポリゴンが登録されています。あと${10 - existingCount}個まで登録できます。`);
        return;
      }
    }

    if (entryMethod === 'prefecture' || formData.poi_type === 'prefecture') {
      if (!formData.cities || formData.cities.length === 0) {
        setErrorMessage('市区町村を少なくとも1つ選択してください');
        return;
      }
    }

    if (formData.segment_id && formData.visit_measurement_group_id) {
      setErrorMessage('セグメントIDと来店計測グループIDは同時に設定できません。どちらか一方のみを設定してください。');
      return;
    }

    if (!formData.segment_id && !formData.visit_measurement_group_id && !segmentId) {
      setErrorMessage('セグメントIDまたは来店計測グループIDのどちらか一方は必須です。');
      return;
    }

    if (formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') {
      if (!formData.visit_measurement_group_id) {
        setErrorMessage('計測地点グループを選択してください。来店計測地点を登録するには、先に計測地点グループを作成する必要があります。');
        return;
      }
      if (formData.segment_id || segmentId) {
        setErrorMessage('来店計測地点の場合、セグメントIDは設定できません。');
        return;
      }
      const selGroup = visitMeasurementGroups.find(g => g.group_id === formData.visit_measurement_group_id);
      if (selGroup) {
        if (formData.poi_type !== 'prefecture' && formData.poi_type !== 'polygon') {
          if (!selGroup.designated_radius || selGroup.designated_radius.trim() === '') {
            setErrorMessage('選択されたグループに指定半径が設定されていません。グループの編集から抽出条件を設定してください。');
            return;
          }
        }
      }
      if (entryMethod !== 'polygon' && formData.poi_type !== 'polygon'
          && entryMethod !== 'prefecture' && formData.poi_type !== 'prefecture') {
        if (!formData.poi_name || formData.poi_name.trim() === '') {
          setErrorMessage('地点名は必須項目です');
          return;
        }
      }
      if (entryMethod === 'polygon' || formData.poi_type === 'polygon') {
        if (!formData.polygon || formData.polygon.length === 0) {
          setErrorMessage('ポリゴンを少なくとも1つ描画してください');
          return;
        }
      }
    } else {
      if (!formData.segment_id && !segmentId) {
        setErrorMessage('セグメントIDは必須です。TG地点を登録するには、セグメントを選択する必要があります。');
        return;
      }

      if (entryMethod !== 'polygon' && formData.poi_type !== 'polygon'
          && entryMethod !== 'prefecture' && formData.poi_type !== 'prefecture') {
        if (!formData.poi_name || formData.poi_name.trim() === '') {
          setErrorMessage('地点名は必須項目です');
          return;
        }
      }

      if (!(formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement')) {
        const existingPolygonPois = pois.filter(p =>
          p.segment_id === segmentId &&
          p.poi_type === 'polygon' &&
          (!poi || p.poi_id !== poi.poi_id)
        );
        if (existingPolygonPois.length > 0) {
          setErrorMessage('ポリゴン指定の地点が既に登録されているセグメントには、他のタイプの地点を登録できません。ポリゴン指定の地点は、ポリゴン指定単独のセグメントでのみ登録できます。');
          return;
        }
      }
    }

    if (formData.poi_type === 'prefecture') {
      const existingPrefecturePois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'prefecture' &&
        (!poi || p.poi_id !== poi.poi_id)
      );
      if (existingPrefecturePois.length >= 5) {
        setErrorMessage('都道府県指定の地点は1セグメントにつき5つまで登録できます');
        return;
      }
      const existingNonPrefecturePois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type !== 'prefecture' &&
        (!poi || p.poi_id !== poi.poi_id)
      );
      if (existingNonPrefecturePois.length > 0) {
        const hasPolygon = existingNonPrefecturePois.some(p => p.poi_type === 'polygon');
        if (hasPolygon) {
          setErrorMessage('都道府県指定とポリゴン指定は同一セグメントでは併用できません');
          return;
        }
        setErrorMessage('都道府県指定と緯度経度・住所指定での登録は同一セグメントでは併用できません');
        return;
      }
    }

    if (formData.poi_type !== 'prefecture' && formData.poi_type !== 'polygon' &&
        !(formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') &&
        !radiusForSubmit) {
      setErrorMessage('指定半径は必須項目です');
      return;
    }

    if (radiusForSubmit) {
      const radiusNum = parseInt(radiusForSubmit.replace('m', ''));
      if (
        isNaN(radiusNum) ||
        radiusNum < 1 ||
        radiusNum > 10000 ||
          (radiusNum >= 1000 && !fixedRadiusOptions.includes(radiusNum))
      ) {
        setErrorMessage('指定半径は1-1000m、または選択肢から指定してください');
        return;
      }
    }

    if (!(formData.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement')) {
      if (formData.extraction_period_type === 'preset' && !formData.extraction_period) {
        setErrorMessage('プリセット期間を選択してください。');
        return;
      }
      if (formData.extraction_period_type === 'custom' && (!formData.extraction_start_date || !formData.extraction_end_date)) {
        setErrorMessage('抽出期間の開始日と終了日を指定してください');
        return;
      }
      if (formData.extraction_period_type === 'custom') {
        const sixMonthsAgo = getSixMonthsAgoDate();
        const fiveDaysAgo = getFiveDaysAgoDate();
        if (formData.extraction_start_date && formData.extraction_start_date < sixMonthsAgo) {
          setErrorMessage('抽出開始日は直近6か月以内で指定してください');
          return;
        }
        if (formData.extraction_end_date && formData.extraction_end_date < sixMonthsAgo) {
          setErrorMessage('抽出終了日は直近6か月以内で指定してください');
          return;
        }
        if (formData.extraction_end_date && formData.extraction_end_date > fiveDaysAgo) {
          setErrorMessage('抽出終了日は5日以上前の日付で指定してください（データ連携リードタイム）');
          return;
        }
      }
      if (formData.extraction_period_type === 'specific_dates' && (!formData.extraction_dates || formData.extraction_dates.length === 0)) {
        setErrorMessage('抽出対象日付を少なくとも1つ選択してください');
        return;
      }
      if (formData.extraction_period_type === 'specific_dates') {
        const fiveDaysAgo = getFiveDaysAgoDate();
        const invalidDates = formData.extraction_dates?.filter(d => d > fiveDaysAgo);
        if (invalidDates && invalidDates.length > 0) {
          setErrorMessage('特定日付は5日以上前の日付を選択してください（データ連携リードタイム）');
          return;
        }
      }
    }

    const isPolygonEntry = entryMethod === 'polygon' || formData.poi_type === 'polygon';

    let finalFormData = { ...localFormData };
    if (isPolygonEntry) {
      const existingPolygonPois = pois.filter(p =>
        p.segment_id === segmentId &&
        p.poi_type === 'polygon' &&
        (!poi || p.poi_id !== poi.poi_id)
      );

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

        const segIdForBulk = segmentId || finalFormData.segment_id;
        if (segIdForBulk) {
          const others = pois.filter(p => p.segment_id === segIdForBulk);
          const hasNonPolygon = others.some(p => {
            if (p.poi_type === 'polygon') return false;
            if (p.polygon && Array.isArray(p.polygon) && p.polygon.length > 0) return false;
            return true;
          });
          if (hasNonPolygon) {
            toast.error('このセグメントには既にポリゴン以外のタイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。');
            return;
          }
        }

        onBulkSubmit(polygonPois);
        return;
      }

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

    if (isPolygonEntry || (formData.polygon && Array.isArray(formData.polygon) && formData.polygon.length > 0)) {
      finalFormData.poi_type = 'polygon';
    }

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

    const segId = segmentId || submitData.segment_id;
    if (segId) {
      const normalizeType = (p: Partial<PoiInfo>): string => {
        if (p.poi_type === 'polygon') return 'polygon';
        if (p.polygon && Array.isArray(p.polygon) && p.polygon.length > 0) return 'polygon';
        if (p.poi_type === 'prefecture') return 'prefecture';
        return p.poi_type === 'manual' ? 'manual' : 'manual';
      };
      const newType = normalizeType(submitData);
      const othersInSegment = pois.filter(
        p => p.segment_id === segId && (!poi || p.poi_id !== poi.poi_id)
      );
      for (const p of othersInSegment) {
        const existingType = normalizeType(p);
        if (existingType !== newType) {
          const typeLabels: Record<string, string> = {
            manual: '任意地点',
            prefecture: '都道府県・市区町村',
            polygon: 'ポリゴン',
          };
          toast.error(
            `このセグメントには既に「${typeLabels[existingType] || existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。`
          );
          return;
        }
      }
    }

    submitData.designated_radius = designatedRadiusRef.current || submitData.designated_radius || '';

    onSubmit(submitData);
  };

  const handleChange = (field: keyof PoiInfo, value: string | number | string[] | undefined) => {
    if (field === 'designated_radius') {
      designatedRadiusRef.current = String(value ?? '');
      startTransition(() => setFormData(prev => ({ ...prev, [field]: value })));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.address || formData.address.trim() === '') {
      toast.error('住所を入力してください');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(formData.address);

      if (result.isJapan === false) {
        toast.error('海外の地点が検出されました', {
          description: `住所「${formData.address}」は日本国外の地点です。日本国内の住所を入力してください。`,
          duration: 5000,
        });
        setIsGeocoding(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
      }));

    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error(error instanceof Error ? error.message : 'ジオコーディングに失敗しました');
    } finally {
      setIsGeocoding(false);
    }
  };

  const canProceedToConditions = () => {
    if (entryMethod === 'paste') return false;
    if (formData.poi_type === 'manual') {
      return !!formData.poi_name;
    } else if (formData.poi_type === 'prefecture') {
      return formData.cities && formData.cities.length > 0;
    } else if (formData.poi_type === 'polygon' || entryMethod === 'polygon') {
      return polygons.length > 0 && formData.polygon && formData.polygon.length > 0;
    }
    return false;
  };

  const handleAddPrefecture = (prefecture: string) => {
    const currentPrefectures = formData.prefectures || [];
    if (!currentPrefectures.includes(prefecture)) {
      setFormData(prev => ({
        ...prev,
        prefectures: [...currentPrefectures, prefecture],
      }));

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

  const handleSelectAllCities = (prefecture: string) => {
    const currentCities = formData.cities || [];
    const prefectureCities = getCitiesByPrefecture(prefecture);
    const newCities = [...new Set([...currentCities, ...prefectureCities])];

    setFormData(prev => ({
      ...prev,
      cities: newCities,
    }));
  };

  const handleDeselectAllCities = (prefecture: string) => {
    const currentCities = formData.cities || [];
    const prefectureCities = getCitiesByPrefecture(prefecture);
    const newCities = currentCities.filter(c => !prefectureCities.includes(c));

    setFormData(prev => ({
      ...prev,
      cities: newCities,
    }));
  };

  return {
    // state
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    entryMethod,
    setEntryMethod,
    selectedPrefecture,
    setSelectedPrefecture,
    availableCities,
    showPrefectureDropdown,
    setShowPrefectureDropdown,
    showCityDropdown,
    setShowCityDropdown,
    autoSelectAllCities,
    setAutoSelectAllCities,
    isGeocoding,
    showExtractionConditionsPopup,
    setShowExtractionConditionsPopup,
    errorMessage,
    setErrorMessage,
    csvStep,
    setCsvStep,
    parsedPois,
    csvErrors,
    csvTotalRows,
    isCsvProcessing,
    fileInputRef,
    isBatchProcessing,
    batchProgress,
    batchTotal,
    pasteStep,
    setPasteStep,
    pastedText,
    setPastedText,
    pastedHtml,
    setPastedHtml,
    parsedPastePois,
    pasteErrors,
    isPasteProcessing,
    isGeocodingPaste,
    bulkGroupId,
    setBulkGroupId,
    polygons,
    setPolygons,
    showPolygonEditor,
    setShowPolygonEditor,
    selectedPolygonId,
    setSelectedPolygonId,
    pasteExtractionConditions,
    setPasteExtractionConditions,
    pasteTableRef,
    bulkPoiCategory,
    setBulkPoiCategory,
    designatedRadiusDraft,
    setDesignatedRadiusDraft,
    designatedRadiusRef,
    showRadiusWarning,
    setShowRadiusWarning,
    hasShownRadiusWarning,
    setHasShownRadiusWarning,
    showDateRangeWarning,
    setShowDateRangeWarning,
    // derived
    isLocationLocked,
    isVisitMeasurementCategory,
    hasSegmentCommonConditions,
    fixedRadiusOptions,
    selectedGroup,
    isFirstPoi,
    // helpers
    getSixMonthsAgoDate,
    getFiveDaysAgoDate,
    isDateMoreThanSixMonthsAgo,
    // handlers
    handleSubmit,
    handleChange,
    handleEntryMethodChange,
    handlePolygonsChange,
    handlePolygonNameUpdate,
    handleFileSelect,
    handleResetCsv,
    handleCsvSubmit,
    handlePaste,
    handlePasteProcess,
    handlePasteGeocode,
    handleResetPaste,
    handlePasteSubmit,
    handleGeocodeAddress,
    canProceedToConditions,
    handleAddPrefecture,
    handleRemovePrefecture,
    handleToggleCity,
    handleSelectAllCities,
    handleDeselectAllCities,
  };
}
