import { useState } from 'react';
import { Lock, Mail, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { UserRegistrationRequest } from './UserRegistrationRequest';
import { PasswordResetRequest } from './PasswordResetRequest';
import { bigQueryService } from '../utils/bigquery';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        // デバッグ用：登録済みユーザーを確認（メールアドレスを小文字に変換して検索）
        const users = await bigQueryService.getUsers();
        const normalizedEmail = email.trim().toLowerCase();
        const userExists = users.find(u => 
          u.email && u.email.trim().toLowerCase() === normalizedEmail
        );
        
        // is_activeフィールドを明示的にbooleanに変換
        const isActive = userExists && (
          userExists.is_active === true || 
          userExists.is_active === 'true' || 
          userExists.is_active === 1
        );
        
        if (userExists && !isActive) {
          setError('このアカウントは無効化されています。管理者にお問い合わせください。');
        } else if (userExists) {
          setError('パスワードが正しくありません');
        } else {
          setError('メールアドレスまたはパスワードが正しくありません');
        }
      }
    } catch (err) {
      console.error('ログインエラー:', err);
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@example.com', role: '管理', color: 'text-purple-600' },
    { email: 'salesA@example.com', role: '営業A', color: 'text-blue-600' },
    { email: 'salesB@example.com', role: '営業B', color: 'text-green-600' },
  ];

  const handleRegistrationSubmit = async (userData: any) => {
    try {
      await bigQueryService.createUserRequest(userData);
    } catch (error: any) {
      throw error;
    }
  };

  if (showPasswordReset) {
    return (
      <PasswordResetRequest
        onBack={() => setShowPasswordReset(false)}
      />
    );
  }

  if (showRegistration) {
    return (
      <UserRegistrationRequest
        onSubmit={handleRegistrationSubmit}
        onBack={() => setShowRegistration(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C11.6 4 8 7.6 8 12C8 18 16 28 16 28C16 28 24 18 24 12C24 7.6 20.4 4 16 4Z" fill="white" stroke="white" strokeWidth="2"/>
              <circle cx="16" cy="12" r="3" fill="#5b5fff"/>
            </svg>
          </div>
          <h1 className="text-gray-900 mb-2">UNIVERSEGEO 案件管理システム</h1>
          <p className="text-muted-foreground">アカウントにログインしてください</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* エラーメッセージ */}
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm text-red-800 ml-2">{error}</p>
              </Alert>
            )}

            {/* メールアドレス */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* パスワード */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">パスワード</Label>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-[#5b5fff] hover:underline"
                >
                  パスワードを忘れた場合
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* ログインボタン */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>

            {/* 新規ユーザー登録申請ボタン */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-muted-foreground">または</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRegistration(true)}
              className="w-full h-11 border-[#5b5fff] text-[#5b5fff] hover:bg-[#5b5fff]/5"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              新規ユーザー登録申請
            </Button>
          </form>
        </div>

        {/* デモアカウント情報 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-blue-900 mb-3">
            <strong>デモアカウント</strong>（パスワード: demo123）
          </p>
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword('demo123');
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{account.email}</span>
                  <span className={`text-xs ${account.color}`}>{account.role}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* フッター */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2025 UNIVERSEGEO Project Management System
        </p>
      </div>
    </div>
  );
}
