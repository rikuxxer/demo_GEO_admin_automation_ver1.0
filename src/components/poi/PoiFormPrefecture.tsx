import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { X, Building2, ChevronDown } from 'lucide-react';
import { getPrefectures, getCitiesByPrefecture } from '../../utils/prefectureData';
import type { usePoiForm } from './usePoiForm';

type UsePoiFormReturn = ReturnType<typeof usePoiForm>;

interface PoiFormPrefectureProps {
  form: UsePoiFormReturn;
}

export function PoiFormPrefecture({ form }: PoiFormPrefectureProps) {
  const {
    formData,
    selectedPrefecture,
    showPrefectureDropdown,
    setShowPrefectureDropdown,
    autoSelectAllCities,
    setAutoSelectAllCities,
    handleAddPrefecture,
    handleRemovePrefecture,
    handleToggleCity,
    handleSelectAllCities,
    handleDeselectAllCities,
  } = form;

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2 text-green-900 mb-2">
        <Building2 className="w-5 h-5" />
        <h3>都道府県・市区町村指定</h3>
      </div>

      <div className="space-y-4">
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
  );
}
