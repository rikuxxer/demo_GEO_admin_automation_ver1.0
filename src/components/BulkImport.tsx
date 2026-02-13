import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Info, Loader2, Edit } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { downloadExcelTemplate } from '../utils/excelTemplateGenerator';
import { parseExcelFile, type ExcelParseResult, type ExcelProjectData, type ExcelSegmentData, type ExcelLocationData } from '../utils/excelParser';
import { BulkImportEditor } from './BulkImportEditor';
import { MEDIA_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, type PoiInfo } from '../types/schema';
import { bigQueryService } from '../utils/bigquery';
import { useAuth } from '../contexts/AuthContext';
import { exportPoisToSheet } from '../utils/googleSheets';

interface BulkImportProps {
  onImportComplete: () => void;
  /** 一括登録の開始/終了時に呼ばれ、画面上部のプログレッシブバー表示に利用 */
  onImportProgress?: (importing: boolean) => void;
}

export function BulkImport({ onImportComplete, onImportProgress }: BulkImportProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ExcelParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setDownloadProgress(0);

    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      // 実進捗は取得できないため、体感進捗を表示（上限90%）
      timer = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + (prev < 60 ? 8 : 3);
        });
      }, 120);

      await downloadExcelTemplate();

      setDownloadProgress(100);
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
      }, 350);
    } catch (error) {
      console.error('テンプレートダウンロードエラー:', error);
      alert('テンプレートのダウンロード中にエラーが発生しました。');
      setDownloading(false);
      setDownloadProgress(0);
    } finally {
      if (timer) {
        clearInterval(timer);
      }
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setParsing(true);
    setResult(null);
    setIsEditing(false);

    try {
      const parseResult = await parseExcelFile(file);
      setResult(parseResult);
    } catch (error) {
      console.error('Excel読み込みエラー:', error);
      alert('Excelファイルの読み込み中にエラーが発生しました。');
    } finally {
      setParsing(false);
    }
  };

  const handleUpdate = (updatedData: {
    project: ExcelProjectData | null;
    segments: ExcelSegmentData[];
    locations: ExcelLocationData[];
  }) => {
    if (!result) return;

    // 更新されたデータで再パース（再バリデーション）
    const newResult: ExcelParseResult = {
      project: updatedData.project,
      segments: updatedData.segments,
      locations: updatedData.locations,
      errors: []
    };

    // 簡易バリデーション
    if (!newResult.project?.advertiser_name) {
      newResult.errors.push({
        section: '②案件情報',
        field: '広告主名',
        message: '広告主名は必須です'
      });
    }

    if (!newResult.project?.appeal_point) {
      newResult.errors.push({
        section: '②案件情報',
        field: '訴求内容',
        message: '訴求内容は必須です'
      });
    }

    // セグメント名の重複チェック
    const segmentNames = newResult.segments.map(s => s.segment_name);
    const duplicates = segmentNames.filter((name, index) => segmentNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      newResult.errors.push({
        section: '③セグメント設定',
        message: `セグメント名が重複しています: ${[...new Set(duplicates)].join(', ')}`
      });
    }

    setResult(newResult);
    setIsEditing(false);
  };

  const handleImport = async () => {
    if (!result || result.errors.length > 0 || !result.project) return;

    setImporting(true);
    onImportProgress?.(true);

    try {
      // 1. 案件を登録
      const createdProject = await bigQueryService.createProject(
        {
          ...result.project,
          // 手動登録フォームとの整合性のため、各種フィールドを空文字列で初期化
          universe_service_id: result.project.universe_service_id || '',
          universe_service_name: result.project.universe_service_name || '',
          sub_person_in_charge: result.project.sub_person_in_charge || '',
        },
        user?.name
      );

      console.log('✅ 案件登録完了:', createdProject);

      // 2. セグメントを登録（セグメント名とIDのマップを作成）
      const segmentMap = new Map<string, string>();
      const segmentDataMap = new Map<string, any>(); // セグメントデータのマップ（スプレッドシート出力用）
      for (const segment of result.segments) {
        const createdSegment = await bigQueryService.createSegment({
          ...segment,
          project_id: createdProject.project_id,
          // 手動登録フォームとの整合性のため、各種フィールドを初期化
          ads_account_id: segment.ads_account_id || '',
          provider_segment_id: segment.provider_segment_id || '',
          location_request_status: 'not_requested',
          request_confirmed: false,
          data_link_status: 'before_request',
          data_link_scheduled_date: '',
          extraction_period_type: segment.extraction_period === 'custom' ? 'custom' : 'preset',
          extraction_start_date: segment.extraction_start_date || '',
          extraction_end_date: segment.extraction_end_date || '',
        });
        
        segmentMap.set(segment.segment_name, createdSegment.segment_id);
        segmentDataMap.set(segment.segment_name, createdSegment);
        console.log('✅ セグメント登録完了:', createdSegment);
      }

      // 2.5. 来店計測地点グループを読み込み（グループ名とIDのマップを作成）
      const groupMap = new Map<string, string>();
      const existingGroups = await bigQueryService.getVisitMeasurementGroups(createdProject.project_id);
      for (const group of existingGroups) {
        groupMap.set(group.group_name, group.group_id);
      }

      // 3. 地点を登録
      let successCount = 0;
      const createdPois: PoiInfo[] = []; // 作成された地点を蓄積（スプレッドシート出力用）
      
      for (const location of result.locations) {
        // 来店計測地点の場合はセグメント不要、グループ必須
        let segmentId: string | undefined;
        let segmentData: ExcelSegmentData | undefined;
        let visitMeasurementGroupId: string | undefined;

        if (location.poi_category === 'visit_measurement') {
          // 来店計測地点：セグメント不要、グループ必須
          segmentId = undefined;
          segmentData = undefined;
          
          // グループ名からグループIDを取得
          if (location.group_name_ref) {
            visitMeasurementGroupId = groupMap.get(location.group_name_ref);
            if (!visitMeasurementGroupId) {
              console.error(`❌ グループ「${location.group_name_ref}」が見つかりません。先にグループを作成してください。`);
              continue;
            }
          } else {
            console.error(`❌ 来店計測地点にはグループ名が必要です`);
            continue;
          }
        } else {
          // TG地点：セグメント必須
          segmentId = segmentMap.get(location.segment_name_ref || '');
          if (!segmentId) {
            console.error(`❌ セグメント「${location.segment_name_ref}」が見つかりません`);
            continue;
          }
          // 対応するセグメントデータを取得（共通条件を引き継ぐため）
          segmentData = result.segments.find(s => s.segment_name === location.segment_name_ref);
        }

        const createdPoi = await bigQueryService.createPoi({
          poi_name: location.poi_name,
          address: location.address || undefined,
          latitude: location.latitude,
          longitude: location.longitude,
          project_id: createdProject.project_id,
          segment_id: segmentId, // 来店計測地点の場合はundefined
          visit_measurement_group_id: visitMeasurementGroupId, // 来店計測地点の場合のみ
          // 手動登録フォームとの整合性のため、poi_typeを設定
          poi_type: 'manual',
          // 地点カテゴリを設定（v4.0で追加）
          poi_category: location.poi_category || 'tg',
          // セグメントの共通条件を地点にも引き継ぐ（TG地点の場合のみ）
          designated_radius: segmentData?.designated_radius,
          extraction_period: segmentData?.extraction_period,
          extraction_period_type: segmentData ? 'preset' : undefined,
          extraction_start_date: segmentData?.extraction_start_date || '',
          extraction_end_date: segmentData?.extraction_end_date || '',
          attribute: segmentData?.attribute,
          detection_count: segmentData?.detection_count,
          detection_time_start: segmentData?.detection_time_start || '',
          detection_time_end: segmentData?.detection_time_end || '',
          stay_time: segmentData?.stay_time || '',
        });

        // 作成された地点を蓄積（スプレッドシート出力用）
        if (user?.role === 'sales') {
          createdPois.push(createdPoi);
        }

        successCount++;
        console.log('✅ 地点登録完了:', createdPoi);
      }

      // 一括登録の場合、全ての地点をまとめてスプレッドシートに送信
      // 全地点を出力（TG地点・来店計測地点・ポリゴン地点を含む）
      if (user?.role === 'sales' && createdPois.length > 0) {
        try {
          const createdSegments = Array.from(segmentDataMap.values());
          const sheetResult = await exportPoisToSheet(
            createdPois,
            createdProject,
            createdSegments,
            {
              useAccumulation: true,
              exportedBy: user?.email || user?.user_id || 'system',
              exportedByName: user?.name || 'システム',
            }
          );
          
          if (sheetResult.success) {
            console.log('✅ スプレッドシートに一括自動入力成功:', sheetResult.message);
            if (sheetResult.exportId) {
              console.log('📊 エクスポートID:', sheetResult.exportId);
            }
          } else {
            console.warn('⚠️ スプレッドシート自動入力失敗:', sheetResult.message);
            // スプレッドシート出力失敗してもエラーにはしない（一括登録自体は成功）
          }
        } catch (error) {
          console.error('スプレッドシート一括出力に失敗しました:', error);
          // エラーでも処理は継続
        }
      }

      alert(`一括登録が完了しました。\n案件: 1件\nセグメント: ${result.segments.length}件\n地点: ${successCount}件`);
      
      // ファイルと結果をリセット
      setFile(null);
      setResult(null);
      setIsEditing(false);
      
      // 親コンポーネントに完了を通知
      onImportComplete();
    } catch (error) {
      console.error('❌ 一括登録エラー:', error);
      alert('一括登録中にエラーが発生しました。\n詳細はコンソールを確認してください。');
    } finally {
      setImporting(false);
      onImportProgress?.(false);
    }
  };

  const hasErrors = result && result.errors.length > 0;
  // セグメントまたは地点のどちらかがあればOK（来店計測地点のみの場合、セグメントは不要）
  const canImport = result && !hasErrors && result.project && result.locations.length > 0;

  return (
    <div className="space-y-6 min-w-0">

      {/* 説明カード */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-blue-900">Excelファイルの構成</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>①入力ガイド</strong>: 使い方の説明</li>
              <li><strong>②案件情報</strong>: 案件の基本情報（<span className="text-red-600 font-bold">1案件のみ登録可能</span>）</li>
              <li><strong>③セグメント・TG地点設定</strong>: セグメント＋TG地点（複数件可）</li>
              <li><strong>④来店計測地点リスト</strong>: 来店計測地点（複数件可）</li>
            </ul>
            <p className="text-red-600 font-semibold mt-3 border-t border-red-200 pt-2">
              ⚠️ 複数案件を登録する場合は、案件ごとにExcelファイルを分けてください
            </p>
            <p className="text-blue-700 mt-2">
              ※ プルダウンで簡単入力。広告主や代理店の方も入力しやすい形式です
            </p>
          </div>
        </div>
      </Card>

      {/* テンプレートダウンロード */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#5b5fff]" />
            <h3 className="font-medium">テンプレートをダウンロード</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            まずはテンプレートをダウンロードして、必要な情報を入力してください
          </p>
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            className="flex items-center gap-2 border border-gray-300 text-blue-600 hover:bg-gray-50"
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ダウンロード中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-blue-600" />
                Excelテンプレートをダウンロード
              </>
            )}
          </Button>
          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-700">
                <span>テンプレートを準備中...</span>
                <span>{Math.min(downloadProgress, 100)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* ファイルアップロード */}
      <Card className="p-6" data-guide="bulk-import-form">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#5b5fff]" />
            <h3 className="font-medium">Excelファイルをアップロード</h3>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="excel-file">Excelファイルを選択</Label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-[#5b5fff] file:text-white hover:file:bg-[#5b5fff]/90"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                選択されたファイル: {file.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleParse}
            disabled={!file || parsing}
            className="w-full bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] text-white hover:from-[#5b5fff]/90 hover:to-[#7b7bff]/90"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                読み込み中...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Excelを読み込み
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 読み込み結果 */}
      {result && !isEditing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                {hasErrors ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-600">エラーが見つかりました</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600">読み込み成功</span>
                  </>
                )}
              </h3>
              {hasErrors && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  データを修正
                </Button>
              )}
            </div>

            {/* エラー表示 */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{result.errors.length}件のエラーがあります。「データを修正」ボタンで修正できます。</p>
                    <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>
                          <strong>{error.section}</strong>
                          {error.row && ` ${error.row}行目`}
                          {error.field && ` [${error.field}]`}: {error.message}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-muted-foreground">...他 {result.errors.length - 5} 件</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 統計情報 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">案件</p>
                <p className="text-2xl">{result.project ? 1 : 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-muted-foreground">セグメント</p>
                <p className="text-2xl">{result.segments.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">地点</p>
                <p className="text-2xl">{result.locations.length}</p>
              </div>
            </div>

            {/* データプレビュー */}
            {result.project && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground">読み込み内容</h4>
                
                {/* 案件情報 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">📋 案件情報</p>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">広告主:</span> {result.project.advertiser_name}</p>
                    {result.project.agency_name && (
                      <p><span className="text-muted-foreground">代理店:</span> {result.project.agency_name}</p>
                    )}
                    <p><span className="text-muted-foreground">訴求内容:</span> {result.project.appeal_point}</p>
                    <p><span className="text-muted-foreground">配信期間:</span> {result.project.delivery_start_date} 〜 {result.project.delivery_end_date}</p>
                    {result.project.remarks && (
                      <p><span className="text-muted-foreground">備考:</span> {result.project.remarks}</p>
                    )}
                  </div>
                </div>

                {/* セグメント＋地点セット */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">📊 セグメント＋地点 ({result.segments.length}セグメント / {result.locations.length}地点)</p>
                  {result.segments.map((segment, index) => {
                    const segmentLocations = result.locations.filter(loc => loc.segment_name_ref === segment.segment_name);
                    
                    // 配信媒体名を取得（複数対応）
                    const mediaIds = Array.isArray(segment.media_id) ? segment.media_id : (segment.media_id ? [segment.media_id] : []);
                    const mediaNames = mediaIds
                      .filter(id => id) // 空文字列を除外
                      .map(id => {
                        const option = MEDIA_OPTIONS.find(m => m.value === id);
                        return option ? option.label : id;
                      })
                      .join('、');
                    const mediaName = mediaNames || '未設定';
                    
                    // 対象者名を取得
                    const attributeOption = ATTRIBUTE_OPTIONS.find(a => a.value === segment.attribute);
                    const attributeName = attributeOption ? attributeOption.label : segment.attribute;
                    
                    // 配信期間名を取得
                    const periodOption = EXTRACTION_PERIOD_PRESET_OPTIONS.find(p => p.value === segment.extraction_period);
                    const periodName = periodOption ? periodOption.label : segment.extraction_period;
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* セグメントヘッダー */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded font-medium">
                                セグメント {index + 1}
                              </span>
                              <p className="font-medium">{segment.segment_name}</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                              📍 {segmentLocations.length}地点
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>📺 配信先: <span className="font-medium text-gray-700">{mediaName}</span></p>
                            <p>📏 配信範囲: <span className="font-medium text-gray-700">{segment.designated_radius}</span> / 期間: <span className="font-medium text-gray-700">{periodName}</span></p>
                            <p>👥 対象者: <span className="font-medium text-gray-700">{attributeName}</span> / 検知: <span className="font-medium text-gray-700">{segment.detection_count}回以上</span></p>
                            {segment.detection_time_start && segment.detection_time_end && (
                              <p>⏰ 検知時間: <span className="font-medium text-gray-700">{segment.detection_time_start}〜{segment.detection_time_end}</span></p>
                            )}
                            {segment.stay_time && <p>⏱️ 滞在時間: <span className="font-medium text-gray-700">{segment.stay_time}</span></p>}
                            {segment.ads_account_id && <p>🔑 AdsアカウントID: <span className="font-medium text-gray-700">{segment.ads_account_id}</span></p>}
                          </div>
                        </div>
                        
                        {/* 地点リスト */}
                        {segmentLocations.length > 0 ? (
                          <div className="p-4 bg-gray-50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">このセグメントの地点</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {segmentLocations.map((location, locIndex) => (
                                <div key={locIndex} className="bg-white rounded p-3 border border-gray-200 text-xs">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm mb-1">{location.poi_name}</p>
                                      {location.address && (
                                        <p className="text-muted-foreground mb-1">📍 {location.address}</p>
                                      )}
                                      {location.latitude && location.longitude && (
                                        <p className="text-muted-foreground">
                                          🌐 緯度: {location.latitude.toFixed(6)} / 経度: {location.longitude.toFixed(6)}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2 whitespace-nowrap">
                                      {locIndex + 1}/{segmentLocations.length}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 text-center text-sm text-muted-foreground">
                            このセグメントに地点が登録されていません
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 登録ボタン */}
            {canImport && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登録中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    一括登録を実行
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* データ編集モード */}
      {result && isEditing && (
        <BulkImportEditor
          project={result.project}
          segments={result.segments}
          locations={result.locations}
          errors={result.errors}
          onUpdate={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
