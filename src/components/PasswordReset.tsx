import { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { bigQueryService } from '../utils/bigquery';

interface PasswordResetProps {
  token?: string;
}

export function PasswordReset({ token: tokenFromProps, onBack }: PasswordResetProps & { onBack?: () => void }) {
  const [token, setToken] = useState(tokenFromProps || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // URLパラメータからトークンを取得
  useEffect(() => {
    if (!token && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('token');
      if (tokenFromUrl) {
        setToken(tokenFromUrl);
      }
    }
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!token) {
      newErrors.push('リセットトークンが必要です');
    }

    if (!newPassword) {
      newErrors.push('新しいパスワードは必須です');
    } else if (newPassword.length < 8) {
      newErrors.push('パスワードは8文字以上である必要があります');
    }

    if (newPassword !== confirmPassword) {
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
    setErrors([]);

    try {
      await bigQueryService.resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('パスワードリセットエラー:', error);
      setErrors([error.message || 'パスワードリセット中にエラーが発生しました']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                パスワードをリセットしました
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                パスワードのリセットが完了しました。
                <br />
                新しいパスワードでログインしてください。
              </p>
              <Button
                onClick={onBack || (() => window.location.href = '/')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                ログイン画面に戻る
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C11.6 4 8 7.6 8 12C8 18 16 28 16 28C16 28 24 18 24 12C24 7.6 20.4 4 16 4Z" fill="white" stroke="white" strokeWidth="2"/>
              <circle cx="16" cy="12" r="3" fill="#5b5fff"/>
            </svg>
          </div>
          <h1 className="text-gray-900 mb-2">パスワードをリセット</h1>
          <p className="text-muted-foreground">新しいパスワードを入力してください</p>
        </div>

        {/* フォーム */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* エラーメッセージ */}
            {errors.length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4" />
                <div className="ml-2">
                  {errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-800">{error}</p>
                  ))}
                </div>
              </Alert>
            )}

            {/* 新しいパスワード */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8文字以上"
                  className="pl-9"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* パスワード確認 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード確認</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="パスワードを再入力"
                  className="pl-9"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* 送信ボタン */}
            <Button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
            >
              {isSubmitting ? 'リセット中...' : 'パスワードをリセット'}
            </Button>

            {/* 戻るボタン */}
            <Button
              type="button"
              variant="outline"
              onClick={onBack || (() => window.location.href = '/')}
              className="w-full h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ログイン画面に戻る
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

