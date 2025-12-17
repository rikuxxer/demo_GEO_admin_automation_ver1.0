import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, UserPlus, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface UserRegistrationRequestProps {
  onSubmit: (userData: {
    name: string;
    email: string;
    password: string;
    requested_role: 'admin' | 'sales';
    department?: string;
    reason?: string;
  }) => Promise<void>;
  onBack?: () => void;
}

export function UserRegistrationRequest({ onSubmit, onBack }: UserRegistrationRequestProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    requested_role: 'sales' as 'admin' | 'sales',
    department: '',
    reason: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('お名前は必須です');
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
        requested_role: formData.requested_role,
        department: formData.department.trim() || undefined,
        reason: formData.reason.trim() || undefined
      });

      setIsSuccess(true);
    } catch (error: any) {
      console.error('ユーザー登録申請エラー:', error);
      setErrors([error.message || 'ユーザー登録申請中にエラーが発生しました']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">申請を受け付けました</h2>
              <p className="text-gray-600">
                ユーザー登録申請が完了しました。<br />
                管理部門の承認をお待ちください。
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                承認が完了次第、ご登録のメールアドレス宛に通知いたします。<br />
                通常、1〜2営業日以内に承認されます。
              </AlertDescription>
            </Alert>
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                ログイン画面に戻る
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-[#5b5fff]/10 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-[#5b5fff]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">新規ユーザー登録申請</h2>
            <p className="text-sm text-gray-600">
              管理部門の承認後、ログインが可能になります
            </p>
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
            {/* お名前 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                お名前 <span className="text-red-500">*</span>
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

            {/* 希望ロール */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                希望するロール <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.requested_role}
                onValueChange={(value: 'admin' | 'sales') => setFormData({ ...formData, requested_role: value })}
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
            </div>

            {/* 部署 */}
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

            {/* 申請理由 */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                申請理由（任意）
              </Label>
              <Input
                id="reason"
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="業務上UNIVERSEGEOの利用が必要なため"
                disabled={isSubmitting}
              />
            </div>

            {/* ボタン */}
            <div className="flex flex-col gap-3 pt-4">
              <Button
                type="submit"
                className="w-full bg-[#5b5fff] hover:bg-[#4a4acc]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    申請中...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    申請する
                  </>
                )}
              </Button>
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ログイン画面に戻る
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

