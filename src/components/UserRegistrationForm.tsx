import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, UserPlus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface UserRegistrationFormProps {
  onSubmit: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'sales';
    department?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function UserRegistrationForm({ onSubmit, onCancel }: UserRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'sales' as 'admin' | 'sales',
    department: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('ユーザー名は必須です');
    }

    if (!formData.email.trim()) {
      newErrors.push('メールアドレスは必須です');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('有効なメールアドレスを入力してください');
    }

    if (!formData.password) {
      newErrors.push('パスワードは必須です');
    } else if (formData.password.length < 8) {
      newErrors.push('パスワードは8文字以上である必要があります');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push('パスワードが一致しません');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        department: formData.department.trim() || undefined
      });

      // フォームをリセット
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'sales',
        department: ''
      });
      setErrors([]);
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      setErrors(['ユーザー登録中にエラーが発生しました']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#5b5fff]" />
          <h3 className="text-lg font-medium">新規ユーザー登録</h3>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ユーザー名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              ユーザー名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="山田 太郎"
              disabled={isSubmitting}
            />
          </div>

          {/* メールアドレス */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              メールアドレス <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="yamada@example.com"
              disabled={isSubmitting}
            />
          </div>

          {/* パスワード */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              パスワード <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="8文字以上"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              8文字以上のパスワードを入力してください
            </p>
          </div>

          {/* パスワード確認 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              パスワード（確認） <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="パスワードを再入力"
              disabled={isSubmitting}
            />
          </div>

          {/* ロール */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              ロール <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'sales') => setFormData({ ...formData, role: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">営業（Sales）</SelectItem>
                <SelectItem value="admin">管理部門（Admin）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.role === 'admin' 
                ? '編集リクエストの承認・却下、全案件の閲覧が可能' 
                : '案件の登録・編集、編集リクエストの申請が可能'}
            </p>
          </div>

          {/* 部署（任意） */}
          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm font-medium">
              部署（任意）
            </Label>
            <Input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="営業1部"
              disabled={isSubmitting}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-[#5b5fff] hover:bg-[#4a4acc]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登録中...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  登録する
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}







