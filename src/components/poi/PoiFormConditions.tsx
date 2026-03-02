import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Calendar, Clock, Users, Target, Settings2, AlertCircle } from 'lucide-react';
import { ATTRIBUTE_OPTIONS, EXTRACTION_PERIOD_PRESET_OPTIONS, STAY_TIME_OPTIONS } from '../../types/schema';
import type { usePoiForm } from './usePoiForm';

type UsePoiFormReturn = ReturnType<typeof usePoiForm>;

interface PoiFormConditionsProps {
  form: UsePoiFormReturn;
  isPopup?: boolean;
}

export function PoiFormConditions({ form, isPopup = false }: PoiFormConditionsProps) {
  const {
    formData,
    designatedRadiusDraft,
    setDesignatedRadiusDraft,
    designatedRadiusRef,
    fixedRadiusOptions,
    hasSegmentCommonConditions,
    isVisitMeasurementCategory,
    hasShownRadiusWarning,
    setShowRadiusWarning,
    setHasShownRadiusWarning,
    getSixMonthsAgoDate,
    isDateMoreThanSixMonthsAgo,
    setShowDateRangeWarning,
    handleChange,
  } = form;

  const namePrefix = isPopup ? 'period_type_popup' : 'period_type';

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-gray-500 mb-2">自由入力か選択のどちらかで指定してください</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs text-gray-500">自由入力（1〜1000m）</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      placeholder="1-1000"
                      value={(() => {
                        const draftNum = Number(designatedRadiusDraft);
                        if (designatedRadiusDraft !== '' && !Number.isNaN(draftNum) && draftNum <= 1000) {
                          return designatedRadiusDraft;
                        }
                        return '';
                      })()}
                      onChange={(e) => {
                        const value = e.target.value;
                        const valueNum = Number(value);
                        if (value === '' || (!Number.isNaN(valueNum) && valueNum >= 1 && valueNum <= 1000)) {
                          setDesignatedRadiusDraft(value);
                        }
                      }}
                      onBlur={() => {
                        requestAnimationFrame(() => {
                          const value = designatedRadiusDraft;
                          if (value === '') {
                            designatedRadiusRef.current = '';
                            return;
                          }
                          const radiusNum = parseInt(value, 10);
                          const isFixed = fixedRadiusOptions.includes(radiusNum);
                          if (!isNaN(radiusNum) && (radiusNum <= 1000 || isFixed)) {
                            designatedRadiusRef.current = `${radiusNum}m`;
                            if (!isVisitMeasurementCategory) {
                              if (radiusNum > 0 && radiusNum <= 50 && !hasShownRadiusWarning) {
                                setShowRadiusWarning(true);
                                setHasShownRadiusWarning(true);
                              } else if (radiusNum > 50) {
                                setHasShownRadiusWarning(false);
                              }
                            }
                          }
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <span className="text-xs text-gray-500">選択（1000m以上）</span>
                  <select
                    value={(() => {
                      const draftNum = Number(designatedRadiusDraft);
                      if (designatedRadiusDraft !== '' && !Number.isNaN(draftNum) && draftNum >= 1000) {
                        return fixedRadiusOptions.includes(draftNum) ? String(draftNum) : '';
                      }
                      return '';
                    })()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setDesignatedRadiusDraft('');
                        handleChange('designated_radius', '');
                        return;
                      }
                      setDesignatedRadiusDraft(value);
                      handleChange('designated_radius', `${value}m`);
                    }}
                    className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
                  >
                    <option value="">自由入力に戻す</option>
                    {fixedRadiusOptions.map((value) => (
                      <option key={value} value={value}>{value}m</option>
                    ))}
                  </select>
                </div>
              </div>
              {designatedRadiusDraft && (() => {
                const radiusNum = parseInt(String(designatedRadiusDraft).replace('m', ''), 10);
                if (isNaN(radiusNum)) {
                  return (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      半径は数値で入力してください
                    </p>
                  );
                }
                if (radiusNum >= 1000 && !fixedRadiusOptions.includes(radiusNum)) {
                  return (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      1000m以上は選択肢から指定してください
                    </p>
                  );
                }
                if (radiusNum < 1 || radiusNum > 10000) {
                  return (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      半径は1-1000m、または選択肢で指定してください
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
                name={namePrefix}
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
                name={namePrefix}
                checked={formData.extraction_period_type === 'custom'}
                onChange={() => handleChange('extraction_period_type', 'custom')}
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                className="text-[#5b5fff] focus:ring-[#5b5fff]"
              />
              <span className="text-sm text-gray-700">期間指定</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={namePrefix}
                checked={formData.extraction_period_type === 'specific_dates'}
                onChange={() => handleChange('extraction_period_type', 'specific_dates')}
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                className="text-[#5b5fff] focus:ring-[#5b5fff]"
              />
              <span className="text-sm text-gray-700">特定日付</span>
            </label>
          </div>

          {formData.extraction_period_type === 'preset' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-700">プリセット期間を選択してください</p>
              <select
                value={formData.extraction_period || '1month'}
                onChange={(e) => handleChange('extraction_period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fff] focus:border-transparent"
              >
                {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : formData.extraction_period_type === 'specific_dates' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">抽出対象とする日付を複数選択できます（直近6ヶ月まで）</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(formData.extraction_dates || []).map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={d}
                      min={getSixMonthsAgoDate()}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        if (isDateMoreThanSixMonthsAgo(selectedDate)) {
                          setShowDateRangeWarning(true);
                          return;
                        }
                        const arr = [...(formData.extraction_dates || [])];
                        arr[i] = selectedDate;
                        handleChange('extraction_dates', arr);
                      }}
                      className="flex-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = (formData.extraction_dates || []).filter((_, j) => j !== i);
                        handleChange('extraction_dates', arr);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm px-2"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleChange('extraction_dates', [...(formData.extraction_dates || []), ''])}
                className="text-sm text-[#5b5fff] hover:text-[#5b5fff]/80 font-medium"
              >
                + 日付を追加
              </button>
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

        {/* 検知回数（検知者の場合のみ、ポップアップのみ表示） */}
        {isPopup && formData.attribute === 'detector' && (
          <div>
            <Label className="block mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#5b5fff]" />
              検知回数（〇回以上）
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="15"
                value={formData.detection_count || 1}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  const clamped = Number.isNaN(raw) ? 1 : Math.min(15, Math.max(1, raw));
                  handleChange('detection_count', clamped);
                }}
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
  );
}
