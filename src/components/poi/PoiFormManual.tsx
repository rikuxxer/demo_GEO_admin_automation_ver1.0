import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { MapPin, Settings2, AlertCircle, Loader2 } from 'lucide-react';
import { isGeocodingConfigured } from '@/utils/geocoding';
import type { usePoiForm } from './usePoiForm';

type UsePoiFormReturn = ReturnType<typeof usePoiForm>;

interface PoiFormManualProps {
  form: UsePoiFormReturn;
  poi?: { poi_id?: string; poi_category?: string; visit_measurement_group_id?: string } | null;
  defaultCategory?: 'tg' | 'visit_measurement';
  visitMeasurementGroups: Array<{ group_id: string; group_name: string }>;
}

export function PoiFormManual({ form, poi, defaultCategory, visitMeasurementGroups }: PoiFormManualProps) {
  const {
    formData,
    isGeocoding,
    hasSegmentCommonConditions,
    selectedGroup,
    handleChange,
    handleGeocodeAddress,
    setShowExtractionConditionsPopup,
  } = form;

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 text-blue-900 mb-2">
        <MapPin className="w-4 h-4" />
        <h3 className="text-sm font-semibold">{poi ? '地点情報編集' : '地点コピペ'}</h3>
      </div>

      <div>
        <Label htmlFor="poi_name" className="block mb-1 text-xs font-medium text-gray-700">
          地点名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="poi_name"
          type="text"
          value={formData.poi_name}
          onChange={(e) => handleChange('poi_name', e.target.value)}
          placeholder="例：東京駅、渋谷スクランブル交差点"
          className="w-full bg-white text-sm h-8"
          required
        />
      </div>

      <div>
        <Label htmlFor="address" className="block mb-1 text-xs font-medium text-gray-700">
          住所
        </Label>
        <div className="flex gap-2">
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="例：東京都千代田区丸の内1丁目"
            className="flex-1 bg-white text-sm h-8"
          />
          <Button
            type="button"
            onClick={handleGeocodeAddress}
            disabled={isGeocoding || !formData.address || !isGeocodingConfigured()}
            variant="outline"
            className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : '緯度経度取得'}
          </Button>
        </div>
        {!isGeocodingConfigured() && (
          <Alert className="mt-1.5 bg-yellow-50 border-yellow-200 py-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-xs">
              Google Maps APIキーが未設定のため、緯度経度取得は使用できません。管理者に連絡してください。
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* 地点カテゴリ選択（defaultCategoryが設定されていない場合、または編集時のみ表示） */}
      {(!defaultCategory || poi) && (
        <div>
          <Label htmlFor="poi_category" className="block mb-1 text-xs font-medium text-gray-700">
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
        <div className="space-y-4">
          {visitMeasurementGroups.length > 0 ? (
            <div>
              <Label htmlFor="visit_measurement_group_id" className="block mb-2">
                計測地点グループ <span className="text-red-600">*</span>
              </Label>
              <select
                id="visit_measurement_group_id"
                value={formData.visit_measurement_group_id || ''}
                onChange={(e) => handleChange('visit_measurement_group_id', e.target.value || undefined)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                required
              >
                <option value="">選択してください</option>
                {visitMeasurementGroups.map(group => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                グループが存在しない場合は、先にグループを作成してください。
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <Label className="text-base font-semibold text-yellow-900">
                  グループが存在しません
                </Label>
              </div>
              <p className="text-sm text-yellow-800">
                来店計測地点を追加するには、先に計測地点グループを作成してください。
              </p>
            </div>
          )}
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

      {/* 抽出条件設定ボタン（来店計測地点の場合は非表示） */}
      {!(defaultCategory === 'visit_measurement' || formData.poi_category === 'visit_measurement') && (
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

      {/* 来店計測地点の場合、グループの抽出条件を表示 */}
      {(defaultCategory === 'visit_measurement' || formData.poi_category === 'visit_measurement') && selectedGroup && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">グループの抽出条件</p>
            <p className="text-xs text-blue-700 mb-1">
              この地点は「{selectedGroup.group_name}」グループの抽出条件が適用されます。
            </p>
            <p className="text-xs text-blue-600">
              抽出条件を変更する場合は、グループの編集から変更してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
