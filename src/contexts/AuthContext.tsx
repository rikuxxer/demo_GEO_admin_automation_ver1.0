import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { isFirstLogin, markManualAsSeen } from '../utils/firstLogin';
import { bigQueryService } from '../utils/bigquery';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS.admin) => boolean;
  markManualAsSeen: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firstLogin, setFirstLogin] = useState(false);

  // ローカルストレージから認証状態を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // ロールが有効かチェック（古いロールの場合はクリア）
        if (parsedUser.role === 'admin' || parsedUser.role === 'sales') {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          // 古いロール（manager, user等）の場合はクリア
          console.warn('Invalid role detected, clearing saved user');
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // デモ用の簡易認証（本番環境では適切なバックエンド認証を実装）
    const demoUsers: User[] = [
      {
        id: 'user-admin',
        name: '管理太郎',
        email: 'admin@example.com',
        role: 'admin',
        department: '管理部',
      },
      {
        id: 'user-sales-a',
        name: '営業A',
        email: 'salesA@example.com',
        role: 'sales',
        department: '営業部',
      },
      {
        id: 'user-sales-b',
        name: '営業B',
        email: 'salesB@example.com',
        role: 'sales',
        department: '営業部',
      },
    ];

    // 1. デモユーザーでのログイン試行
    const demoUser = demoUsers.find(u => u.email === email);
    if (demoUser && password === 'demo123') {
      setUser(demoUser);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(demoUser));
      
      // 初回ログイン判定（営業のみ）
      if (demoUser.role === 'sales' && isFirstLogin(demoUser.id)) {
        setFirstLogin(true);
      }
      
      return true;
    }

    // 2. 登録済みユーザーでのログイン試行
    try {
      let registeredUsers;
      try {
        registeredUsers = await bigQueryService.getUsers();
      } catch (fetchError: any) {
        // 拡張機能関連のエラーやネットワークエラーを処理
        const errorMessage = fetchError?.message || String(fetchError);
        if (errorMessage.includes('message channel closed') || 
            errorMessage.includes('asynchronous response')) {
          console.warn('⚠️ 拡張機能関連のエラーが発生しました。リトライします...');
          // 少し待ってからリトライ
          await new Promise(resolve => setTimeout(resolve, 100));
          registeredUsers = await bigQueryService.getUsers();
        } else {
          throw fetchError;
        }
      }
      
      // メールアドレスを小文字に変換して検索（承認時も小文字で保存されているため）
      const normalizedEmail = email.trim().toLowerCase();
      
      // デバッグ: 取得したユーザー一覧をログ出力
      console.log('👥 取得したユーザー数:', registeredUsers.length);
      if (registeredUsers.length > 0) {
        console.log('📋 ユーザー一覧（メールアドレスのみ）:', 
          registeredUsers.map(u => ({
            email: u.email,
            email_normalized: u.email ? u.email.trim().toLowerCase() : null,
            user_id: u.user_id,
            is_active: u.is_active
          }))
        );
      }
      
      const registeredUser = registeredUsers.find(u => 
        u.email && u.email.trim().toLowerCase() === normalizedEmail
      );
      
      if (!registeredUser) {
        console.warn('❌ ユーザーが見つかりません:', {
          searchEmail: normalizedEmail,
          availableEmails: registeredUsers.map(u => u.email).filter(Boolean)
        });
      }
      
      if (registeredUser) {
        // パスワードの検証（簡易エンコード）
        const passwordHash = btoa(password);
        
        // パスワードハッシュを正規化（BigQueryから取得したデータが文字列でない場合に対応）
        const storedPasswordHash = String(registeredUser.password_hash || '').trim();
        const normalizedPasswordHash = String(passwordHash).trim();
        
        // is_activeフィールドを明示的にbooleanに変換（BigQueryから取得したデータの型を確実にする）
        const isActive = registeredUser.is_active === true || 
                        registeredUser.is_active === 'true' || 
                        registeredUser.is_active === 1;
        
        // デバッグ用ログ（常に出力して問題を特定しやすくする）
        console.log('🔐 ログイン試行:', {
          inputEmail: email,
          normalizedEmail: normalizedEmail,
          storedEmail: registeredUser.email,
          emailMatch: registeredUser.email && registeredUser.email.trim().toLowerCase() === normalizedEmail,
          inputPasswordHash: normalizedPasswordHash,
          storedPasswordHash: storedPasswordHash,
          storedPasswordHashLength: storedPasswordHash.length,
          inputPasswordHashLength: normalizedPasswordHash.length,
          passwordMatch: storedPasswordHash === normalizedPasswordHash,
          isActive: isActive,
          isActiveRaw: registeredUser.is_active,
          isActiveType: typeof registeredUser.is_active,
          user_id: registeredUser.user_id,
          role: registeredUser.role
        });
        
        if (storedPasswordHash === normalizedPasswordHash) {
          // アクティブなユーザーのみログイン可能
          if (!isActive) {
            console.warn('❌ このアカウントは無効化されています:', {
              user_id: registeredUser.user_id,
              email: registeredUser.email,
              is_active: registeredUser.is_active
            });
            return false;
          }
          
          console.log('✅ パスワード一致、ログイン処理を続行');

          // Userオブジェクトに変換
          const user: User = {
            id: registeredUser.user_id,
            name: registeredUser.name,
            email: registeredUser.email,
            role: registeredUser.role as UserRole,
            department: registeredUser.department,
          };

          setUser(user);
          setIsAuthenticated(true);
          localStorage.setItem('currentUser', JSON.stringify(user));

          // 最終ログイン時刻を更新（エラーが発生してもログインは成功させる）
          try {
            await bigQueryService.updateUser(registeredUser.user_id, {
              last_login: new Date().toISOString()
            });
          } catch (updateError: any) {
            // 拡張機能関連のエラーやネットワークエラーは無視
            const errorMessage = updateError?.message || String(updateError);
            if (errorMessage.includes('message channel closed') || 
                errorMessage.includes('asynchronous response')) {
              // ブラウザ拡張機能関連のエラーは無視
              console.warn('⚠️ 拡張機能関連のエラーを無視しました（ログインは成功）:', errorMessage);
            } else {
              // その他のエラーはログに記録するが、ログインは成功させる
              console.warn('⚠️ ログイン時刻の更新に失敗しました（ログインは成功）:', updateError);
            }
          }

          // 初回ログイン判定（営業のみ）
          if (user.role === 'sales' && isFirstLogin(user.id)) {
            setFirstLogin(true);
          }

          return true;
        } else {
          // パスワードが一致しない場合の詳細ログ
          console.error('❌ パスワードが一致しません:', {
            user_id: registeredUser.user_id,
            email: registeredUser.email,
            storedHash: storedPasswordHash.substring(0, 20) + '...',
            inputHash: normalizedPasswordHash.substring(0, 20) + '...',
            storedHashLength: storedPasswordHash.length,
            inputHashLength: normalizedPasswordHash.length,
            hashesEqual: storedPasswordHash === normalizedPasswordHash
          });
        }
      } else {
        console.warn('⚠️ ユーザーが見つかりませんでした');
      }
    } catch (error) {
      console.error('❌ 登録済みユーザーのログイン処理エラー:', error);
      // エラーの詳細を出力
      if (error instanceof Error) {
        console.error('エラー詳細:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
  };

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS.admin): boolean => {
    if (!user) return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    if (!rolePermissions) {
      console.warn(`Invalid role: ${user.role}`);
      return false;
    }
    return rolePermissions[permission] || false;
  };

  const handleMarkManualAsSeen = () => {
    if (user) {
      markManualAsSeen(user.id);
      setFirstLogin(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isFirstLogin: firstLogin,
      login, 
      logout, 
      hasPermission,
      markManualAsSeen: handleMarkManualAsSeen
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
