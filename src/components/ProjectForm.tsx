import { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Project } from '../types/schema';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'project_id' | '_register_datetime' | 'person_in_charge'>) => void;
}

export function ProjectForm({ isOpen, onClose, onSubmit }: ProjectFormProps) {
  const registrationStartTimeRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    advertiser_name: '',
    agency_name: '',
    appeal_point: '',
    universe_service_id: '',
    universe_service_name: '',
    delivery_start_date: '',
    delivery_end_date: '',
    sub_person_in_charge: '',
    remarks: '',
  });

  // フォームが開いた時点を記録
  useEffect(() => {
    if (isOpen && !registrationStartTimeRef.current) {
      registrationStartTimeRef.current = new Date().toISOString();
    } else if (!isOpen) {
      // フォームが閉じられたらリセット
      registrationStartTimeRef.current = null;
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 必須フィールドのバリデーション
    if (!formData.advertiser_name || !formData.appeal_point || !formData.delivery_start_date || !formData.delivery_end_date) {
      alert('必須項目を入力��てください');
      return;
    }

    // UNIVERSEサービスIDのバリデーション（入力がある場合のみ）
    if (formData.universe_service_id && !/^\d{5,}$/.test(formData.universe_service_id)) {
      alert('UNIVERSEサービスIDは半角数字のみ5桁以上で入力してください');
      return;
    }

    // 登録開始時点を含めて送信
    onSubmit({
      ...formData,
      project_registration_started_at: registrationStartTimeRef.current || undefined,
    });
    
    // フォームをリセット
    setFormData({
      advertiser_name: '',
      agency_name: '',
      appeal_point: '',
      universe_service_id: '',
      universe_service_name: '',
      delivery_start_date: '',
      delivery_end_date: '',
      sub_person_in_charge: '',
      remarks: '',
    });
    registrationStartTimeRef.current = null;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-gray-900">新規案件登録</h2>
            <p className="text-muted-foreground mt-0.5">案件の基本情報を入力してください</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-gray-900 pb-2 border-b border-gray-200">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="advertiser_name">広告主法人名 <span className="text-red-500">*</span></Label>
                <Input
                  id="advertiser_name"
                  value={formData.advertiser_name}
                  onChange={(e) => handleChange('advertiser_name', e.target.value)}
                  placeholder="株式会社〇〇"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency_name">代理店名</Label>
                <Input
                  id="agency_name"
                  value={formData.agency_name}
                  onChange={(e) => handleChange('agency_name', e.target.value)}
                  placeholder="代理店名"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appeal_point">訴求内容 <span className="text-red-500">*</span></Label>
              <Textarea
                id="appeal_point"
                value={formData.appeal_point}
                onChange={(e) => handleChange('appeal_point', e.target.value)}
                placeholder="広告で訴求する内容を入力してください"
                rows={3}
                required
              />
            </div>
          </div>

          {/* UNIVERSEサービス情報 */}
          <div className="space-y-4">
            <h3 className="text-gray-900 pb-2 border-b border-gray-200">UNIVERSEサービス情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="universe_service_id">UNIVERSEサービスID</Label>
                <Input
                  id="universe_service_id"
                  value={formData.universe_service_id}
                  onChange={(e) => handleChange('universe_service_id', e.target.value)}
                  placeholder="サービスID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="universe_service_name">UNIVERSEサービス名</Label>
                <Input
                  id="universe_service_name"
                  value={formData.universe_service_name}
                  onChange={(e) => handleChange('universe_service_name', e.target.value)}
                  placeholder="サービス名"
                />
              </div>
            </div>
          </div>

          {/* 配信情報 */}
          <div className="space-y-4">
            <h3 className="text-gray-900 pb-2 border-b border-gray-200">配信情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_start_date">配信開始日 <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 border border-gray-300"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.delivery_start_date ? (
                        format(new Date(formData.delivery_start_date), 'yyyy年MM月dd日', { locale: ja })
                      ) : (
                        <span className="text-muted-foreground">開始日を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.delivery_start_date ? new Date(formData.delivery_start_date) : undefined}
                      onSelect={(date) => handleChange('delivery_start_date', date ? format(date, 'yyyy-MM-dd') : '')}
                      locale={ja}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_end_date">配信終了日 <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 border border-gray-300"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.delivery_end_date ? (
                        format(new Date(formData.delivery_end_date), 'yyyy年MM月dd日', { locale: ja })
                      ) : (
                        <span className="text-muted-foreground">終了日を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.delivery_end_date ? new Date(formData.delivery_end_date) : undefined}
                      onSelect={(date) => handleChange('delivery_end_date', date ? format(date, 'yyyy-MM-dd') : '')}
                      locale={ja}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* その他情報 */}
          <div className="space-y-4">
            <h3 className="text-gray-900 pb-2 border-b border-gray-200">その他情報</h3>
            <div className="space-y-2">
              <Label htmlFor="sub_person_in_charge">副担当者</Label>
              <Input
                id="sub_person_in_charge"
                value={formData.sub_person_in_charge}
                onChange={(e) => handleChange('sub_person_in_charge', e.target.value)}
                placeholder="副担当者名を入力"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">備考</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder="特記事項、注意点、連絡事項などを記載してください"
                rows={4}
                className="bg-white resize-none"
              />
            </div>
          </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px] border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50">
              キャンセル
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]">
              登録する
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}