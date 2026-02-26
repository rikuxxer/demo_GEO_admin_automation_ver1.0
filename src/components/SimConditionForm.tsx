import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SimConditions } from '@/types/schema';

const JAPAN_PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

interface FormValues {
  date_start: string;
  date_end: string;
  uid_type: string;
  poi_ids_raw: string;
  brand_ids_raw: string;
  prefectures: string[];
  cities_raw: string;
  radius_max: string;
  detection_count: string;
}

interface SimConditionFormProps {
  onSubmit: (conditions: SimConditions) => void;
  isLoading: boolean;
}

function splitRaw(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function SimConditionForm({ onSubmit, isLoading }: SimConditionFormProps) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      date_start: '',
      date_end: '',
      uid_type: '',
      poi_ids_raw: '',
      brand_ids_raw: '',
      prefectures: [],
      cities_raw: '',
      radius_max: '',
      detection_count: '',
    },
  });

  const selectedPrefectures = watch('prefectures');

  function togglePrefecture(pref: string) {
    const current = selectedPrefectures ?? [];
    if (current.includes(pref)) {
      setValue('prefectures', current.filter(p => p !== pref));
    } else {
      setValue('prefectures', [...current, pref]);
    }
  }

  function handleFormSubmit(values: FormValues) {
    const conditions: SimConditions = {
      date_start: values.date_start,
      date_end: values.date_end,
    };
    if (values.uid_type.trim()) conditions.uid_type = values.uid_type.trim();
    const poi_ids = splitRaw(values.poi_ids_raw);
    if (poi_ids.length) conditions.poi_ids = poi_ids;
    const brand_ids = splitRaw(values.brand_ids_raw);
    if (brand_ids.length) conditions.brand_ids = brand_ids;
    if (values.prefectures.length) conditions.prefectures = values.prefectures;
    const cities = splitRaw(values.cities_raw);
    if (cities.length) conditions.cities = cities;
    const radius_max = parseInt(values.radius_max, 10);
    if (!isNaN(radius_max) && radius_max > 0) conditions.radius_max = radius_max;
    const detection_count = parseInt(values.detection_count, 10);
    if (!isNaN(detection_count) && detection_count > 0) conditions.detection_count = detection_count;
    onSubmit(conditions);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date_start">開始日 *</Label>
          <Input
            id="date_start"
            type="date"
            {...register('date_start', { required: '開始日は必須です' })}
          />
          {errors.date_start && (
            <p className="text-xs text-red-500">{errors.date_start.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_end">終了日 *</Label>
          <Input
            id="date_end"
            type="date"
            {...register('date_end', { required: '終了日は必須です' })}
          />
          {errors.date_end && (
            <p className="text-xs text-red-500">{errors.date_end.message}</p>
          )}
        </div>
      </div>

      {/* UID type */}
      <div className="space-y-1.5">
        <Label htmlFor="uid_type">UID種別（任意）</Label>
        <Input
          id="uid_type"
          placeholder="例: cookie, device_id"
          {...register('uid_type')}
        />
      </div>

      {/* Prefectures */}
      <div className="space-y-1.5">
        <Label>都道府県（任意・複数選択可）</Label>
        <Controller
          name="prefectures"
          control={control}
          render={() => (
            <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {JAPAN_PREFECTURES.map(pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePrefecture(pref)}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      selectedPrefectures?.includes(pref)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>
          )}
        />
        {selectedPrefectures?.length > 0 && (
          <p className="text-xs text-gray-500">{selectedPrefectures.length}件選択中</p>
        )}
      </div>

      {/* Cities */}
      <div className="space-y-1.5">
        <Label htmlFor="cities_raw">市区町村（任意・カンマ区切り）</Label>
        <Input
          id="cities_raw"
          placeholder="例: 渋谷区, 新宿区"
          {...register('cities_raw')}
        />
      </div>

      {/* POI IDs */}
      <div className="space-y-1.5">
        <Label htmlFor="poi_ids_raw">POI ID（任意・カンマ区切り）</Label>
        <Input
          id="poi_ids_raw"
          placeholder="例: poi_001, poi_002"
          {...register('poi_ids_raw')}
        />
      </div>

      {/* Brand IDs */}
      <div className="space-y-1.5">
        <Label htmlFor="brand_ids_raw">ブランド ID（任意・カンマ区切り）</Label>
        <Input
          id="brand_ids_raw"
          placeholder="例: brand_001, brand_002"
          {...register('brand_ids_raw')}
        />
      </div>

      {/* Radius max */}
      <div className="space-y-1.5">
        <Label htmlFor="radius_max">最大半径 m（任意）</Label>
        <Input
          id="radius_max"
          type="number"
          min={1}
          placeholder="例: 500"
          {...register('radius_max')}
        />
      </div>

      {/* Detection count */}
      <div className="space-y-1.5">
        <Label htmlFor="detection_count">最低検知回数（任意）</Label>
        <Input
          id="detection_count"
          type="number"
          min={1}
          placeholder="例: 2"
          {...register('detection_count')}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? '推計中...' : 'UU数を推計する'}
      </Button>
    </form>
  );
}
