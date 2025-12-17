import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { FEATURE_REQUEST_CATEGORY_OPTIONS, FEATURE_REQUEST_PRIORITY_OPTIONS, type FeatureRequest } from '../types/schema';

interface FeatureRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<FeatureRequest, 'request_id' | 'requested_at' | 'status'>) => void;
  currentUserId: string;
  currentUserName: string;
}

export function FeatureRequestForm({
  open,
  onClose,
  onSubmit,
  currentUserId,
  currentUserName,
}: FeatureRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'new_feature' | 'improvement' | 'bug_fix' | 'other'>('new_feature');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const validationErrors: string[] = [];

    if (!title.trim()) {
      validationErrors.push('タイトルを入力してください');
    }
    if (!description.trim()) {
      validationErrors.push('詳細説明を入力してください');
    }
    if (title.length > 100) {
      validationErrors.push('タイトルは100文字以内で入力してください');
    }
    if (description.length > 2000) {
      validationErrors.push('詳細説明は2000文字以内で入力してください');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSubmit({
      requested_by: currentUserId,
      requested_by_name: currentUserName,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('new_feature');
    setPriority('medium');
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>機能リクエスト</DialogTitle>
          <DialogDescription>
            新機能の追加や改善案を管理部に送信できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Label htmlFor="title" className="block mb-2">
              タイトル <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: CSV一括登録でグループ選択機能を追加"
              maxLength={100}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100文字</p>
          </div>

          <div>
            <Label htmlFor="category" className="block mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
            >
              {FEATURE_REQUEST_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="priority" className="block mb-2">
              優先度 <span className="text-red-500">*</span>
            </Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
            >
              {FEATURE_REQUEST_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description" className="block mb-2">
              詳細説明 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="機能の詳細や改善案を詳しく記入してください..."
              rows={8}
              maxLength={2000}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/2000文字</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              送信
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

