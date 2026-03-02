import { Button } from '../ui/button';
import { X, AlertCircle, Loader2, Settings2 } from 'lucide-react';
import { PoiInfo, Segment } from '../../types/schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { usePoiForm, PoiFormProps } from './usePoiForm';
import { PoiFormPaste } from './PoiFormPaste';
import { PoiFormManual } from './PoiFormManual';
import { PoiFormPrefecture } from './PoiFormPrefecture';
import { PoiFormPolygon } from './PoiFormPolygon';
import { PoiFormConditions } from './PoiFormConditions';

export function PoiForm(props: PoiFormProps) {
  const {
    segmentId,
    segmentName,
    segment,
    pois = [],
    poi,
    defaultCategory,
    visitMeasurementGroups = [],
    onCancel,
  } = props;

  const form = usePoiForm(props);

  const {
    currentStep,
    setCurrentStep,
    entryMethod,
    isBatchProcessing,
    batchProgress,
    batchTotal,
    errorMessage,
    setErrorMessage,
    isLocationLocked,
    showRadiusWarning,
    setShowRadiusWarning,
    showDateRangeWarning,
    setShowDateRangeWarning,
    showExtractionConditionsPopup,
    setShowExtractionConditionsPopup,
    hasSegmentCommonConditions,
    handleSubmit,
    canProceedToConditions,
    handleEntryMethodChange,
  } = form;

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">
                {poi ? '地点情報編集' : '新規地点登録'}
              </h2>
              <div className="flex items-center gap-2 text-white/90 text-xs">
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

          {/* Step 1: 地点情報 */}
          {currentStep === 'info' && (
            <div className="p-6 space-y-6">
              {/* 登録モード切替タブ（新規登録時のみ） */}
              {!poi && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => handleEntryMethodChange('paste')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all border ${
                      entryMethod === 'paste'
                        ? 'bg-white text-[#5b5fff] shadow-sm border-[#5b5fff]'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-4 h-4">📋</span>
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
                    <span className="w-4 h-4">🏛️</span>
                    <span className="hidden sm:inline">都道府県指定</span>
                    <span className="sm:hidden">都道府県</span>
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
                    <span className="w-4 h-4">📍</span>
                    <span className="hidden sm:inline">ポリゴン選択</span>
                    <span className="sm:hidden">ポリゴン</span>
                  </button>
                </div>
              )}

              {/* 表形式コピペ */}
              {entryMethod === 'paste' && (
                <PoiFormPaste
                  form={form}
                  defaultCategory={defaultCategory}
                  visitMeasurementGroups={visitMeasurementGroups}
                />
              )}

              {/* 任意地点（手動入力） */}
              {entryMethod === 'manual' && (
                <PoiFormManual
                  form={form}
                  poi={poi}
                  defaultCategory={defaultCategory}
                  visitMeasurementGroups={visitMeasurementGroups}
                />
              )}

              {/* 既存地点の編集時（entryMethodがmanual以外の場合）にも抽出条件設定ボタンを表示（来店計測地点の場合は非表示） */}
              {poi && entryMethod !== 'manual' && !(poi.poi_category === 'visit_measurement' || defaultCategory === 'visit_measurement') && (
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
                <PoiFormPrefecture form={form} />
              )}

              {/* ポリゴン選択 */}
              {entryMethod === 'polygon' && (
                <PoiFormPolygon
                  form={form}
                  segmentId={segmentId}
                  pois={pois}
                />
              )}
            </div>
          )}

          {/* Step 2: 抽出条件 */}
          {currentStep === 'conditions' && (
            <div className="p-6 space-y-6">
              <PoiFormConditions form={form} isPopup={false} />
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
                <span className="rotate-90 inline-block mr-2">›</span>
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

              {entryMethod === 'paste' ? (
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
                      <span className="-rotate-90 inline-block ml-2">›</span>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-[#5b5fff] hover:bg-[#5b5fff]/90"
                    >
                      ✓ {poi ? '更新する' : '登録する'}
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
              <PoiFormConditions form={form} isPopup={true} />
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

      {/* 6ヶ月以上前の日付選択警告ポップアップ */}
      <AlertDialog open={showDateRangeWarning} onOpenChange={setShowDateRangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              日付範囲の制限
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  6ヶ月以上前の日付は選択できません。
                </p>
                <p className="text-sm text-gray-700">
                  6ヶ月以上前の日付を指定する場合は、アースラでBW依頼をしてください。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDateRangeWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
