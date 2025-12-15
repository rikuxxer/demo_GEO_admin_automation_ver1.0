import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import type { PoiInfo, EditRequest } from '../types/schema';
import { createChangeDiff, validateEditRequest, generateEditRequestId } from '../utils/editRequest';

interface PoiEditRequestDialogProps {
  poi: PoiInfo;
  open: boolean;
  onClose: () => void;
  onSubmit: (request: EditRequest) => void;
  currentUserId: string;
}

export function PoiEditRequestDialog({
  poi,
  open,
  onClose,
  onSubmit,
  currentUserId,
}: PoiEditRequestDialogProps) {
  const [formData, setFormData] = useState({
    poi_name: poi.poi_name || '',
    address: poi.address || '',
    location_id: poi.location_id || '',
    latitude: poi.latitude?.toString() || '',
    longitude: poi.longitude?.toString() || '',
    prefectures: poi.prefectures || '',
    cities: poi.cities || '',
  });
  const [requestReason, setRequestReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // ダイアログが開かれたときに初期値を設定
      setFormData({
        poi_name: poi.poi_name || '',
        address: poi.address || '',
        location_id: poi.location_id || '',
        latitude: poi.latitude?.toString() || '',
        longitude: poi.longitude?.toString() || '',
        prefectures: poi.prefectures || '',
        cities: poi.cities || '',
      });
      setRequestReason('');
      setErrors([]);
    }
  }, [open, poi]);

  const handleSubmit = () => {
    // 変更内容を作成
    const before: Record<string, any> = {
      poi_name: poi.poi_name,
      address: poi.address,
      location_id: poi.location_id,
      latitude: poi.latitude,
      longitude: poi.longitude,
      prefectures: poi.prefectures,
      cities: poi.cities,
    };

    const after: Record<string, any> = {
      poi_name: formData.poi_name,
      address: formData.address,
      location_id: formData.location_id,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      prefectures: formData.prefectures,
      cities: formData.cities,
    };

    const changes = createChangeDiff(before, after);

    // 修正依頼を作成
    const request: EditRequest = {
      request_id: generateEditRequestId(),
      request_type: 'poi',
      target_id: poi.poi_id,
      project_id: poi.project_id,
      segment_id: poi.segment_id,
      requested_by: currentUserId,
      requested_at: new Date().toISOString(),
      request_reason: requestReason,
      status: 'pending',
      changes,
    };

    // バリデーション
    const validation = validateEditRequest(request);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(request);
    onClose();
  };

  const hasChanges = () => {
    return (
      formData.poi_name !== (poi.poi_name || '') ||
      formData.address !== (poi.address || '') ||
      formData.location_id !== (poi.location_id || '') ||
      formData.latitude !== (poi.latitude?.toString() || '') ||
      formData.longitude !== (poi.longitude?.toString() || '') ||
      formData.prefectures !== (poi.prefectures || '') ||
      formData.cities !== (poi.cities || '')
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            地点修正依頼
          </DialogTitle>
          <DialogDescription>
            地点情報の変更内容と修正理由を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* エラー表示 */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 地点情報 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="poi_name">地点名</Label>
              <Input
                id="poi_name"
                value={formData.poi_name}
                onChange={(e) => setFormData({ ...formData, poi_name: e.target.value })}
                placeholder="地点名を入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="住所を入力"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location_id">地点ID</Label>
              <Input
                id="location_id"
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                placeholder="地点IDを入力"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">緯度</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="例: 35.681236"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">経度</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="例: 139.767125"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prefectures">都道府県</Label>
                <Input
                  id="prefectures"
                  value={formData.prefectures}
                  onChange={(e) => setFormData({ ...formData, prefectures: e.target.value })}
                  placeholder="例: 東京都"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cities">市区町村</Label>
                <Input
                  id="cities"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  placeholder="例: 渋谷区"
                />
              </div>
            </div>
          </div>

          {/* 修正理由 */}
          <div className="space-y-2">
            <Label htmlFor="request_reason">
              修正理由 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="request_reason"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="修正が必要な理由を10文字以上で入力してください"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {requestReason.length} / 10文字以上
            </p>
          </div>

          <Alert>
            <AlertDescription>
              ⚠️ 承認されるまで変更は反映されません。管理部が確認後、承認または却下されます。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-200">
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges() || requestReason.length < 10}
            className="bg-[#5b5fff] hover:bg-[#4949dd]"
          >
            修正依頼を送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}