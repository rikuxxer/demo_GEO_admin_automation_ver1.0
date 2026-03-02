import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, MapPin, Calendar, Clock, Users, Target, Settings2, AlertCircle, Loader2, FileText, Database } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ATTRIBUTE_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, STAY_TIME_OPTIONS } from '../../types/schema';
import type { usePoiForm } from './usePoiForm';

type UsePoiFormReturn = ReturnType<typeof usePoiForm>;

interface PoiFormPasteProps {
  form: UsePoiFormReturn;
  defaultCategory?: 'tg' | 'visit_measurement';
  visitMeasurementGroups: Array<{ group_id: string; group_name: string }>;
}

export function PoiFormPaste({ form, defaultCategory, visitMeasurementGroups }: PoiFormPasteProps) {
  const {
    pasteStep,
    pastedText,
    pastedHtml,
    parsedPastePois,
    pasteErrors,
    isPasteProcessing,
    isGeocodingPaste,
    bulkGroupId,
    setBulkGroupId,
    pasteExtractionConditions,
    setPasteExtractionConditions,
    pasteTableRef,
    bulkPoiCategory,
    setBulkPoiCategory,
    isBatchProcessing,
    errorMessage,
    setErrorMessage,
    handlePaste,
    handlePasteProcess,
    handlePasteGeocode,
    handleResetPaste,
    handlePasteSubmit,
  } = form;

  return (
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
                    style={{ minHeight: '300px' }}
                    onInput={(e) => {
                      const html = (e.currentTarget as HTMLElement).innerHTML;
                      if (html.includes('<table')) {
                        form.setPastedHtml(html);
                      } else {
                        form.setPastedHtml('');
                        form.setPastedText((e.currentTarget as HTMLElement).textContent || '');
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
                        style={{ top: '1rem', left: '1rem', right: '1rem', pointerEvents: 'none' }}
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
              • 地点名と住所は必須です<br />
              • 来店計測地点は計測地点グループの選択が必須です
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
                {parsedPastePois.some(p =>
                  (p.latitude === undefined || p.latitude === null ||
                   p.longitude === undefined || p.longitude === null) &&
                  p.address && p.address.trim() !== ''
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
                    {parsedPastePois.slice(0, 5).map((p, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{p.poi_name}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{p.address || '-'}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {p.latitude !== undefined && p.latitude !== null ? (
                            p.latitude
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                              要取得
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {p.longitude !== undefined && p.longitude !== null ? (
                            p.longitude
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                              要取得
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{p.location_id || '-'}</td>
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
                      extraction_period_type: isNonDetector ? 'custom' : prev.extraction_period_type,
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
  );
}
