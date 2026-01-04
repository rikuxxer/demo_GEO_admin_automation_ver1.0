import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit, 
  Power, 
  Trash2,
  Shield,
  Briefcase
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { UserRegistrationForm } from './UserRegistrationForm';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales';
  department?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserManagementProps {
  users: User[];
  onUserCreate: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'sales';
    department?: string;
  }) => Promise<void>;
  onUserUpdate: (userId: string, updates: Partial<User>) => Promise<void>;
  onUserDelete: (userId: string) => Promise<void>;
}

export function UserManagement({ 
  users, 
  onUserCreate, 
  onUserUpdate, 
  onUserDelete 
}: UserManagementProps) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleStatus = async (user: User) => {
    await onUserUpdate(user.user_id, { is_active: !user.is_active });
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'sales' : 'admin';
    await onUserUpdate(user.user_id, { role: newRole });
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await onUserDelete(deleteTarget.user_id);
      setDeleteTarget(null);
    }
  };

  const handleRegistrationComplete = async (userData: any) => {
    await onUserCreate(userData);
    setShowRegistrationForm(false);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#5b5fff]" />
          <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
        </div>
        <Button
          onClick={() => setShowRegistrationForm(!showRegistrationForm)}
          className="bg-[#5b5fff] hover:bg-[#4a4acc]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {showRegistrationForm ? '一覧に戻る' : '新規ユーザー登録'}
        </Button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総ユーザー数</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Power className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">有効</p>
              <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">管理者</p>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">営業</p>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'sales').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 登録フォーム または ユーザー一覧 */}
      {showRegistrationForm ? (
        <UserRegistrationForm
          onSubmit={handleRegistrationComplete}
          onCancel={() => setShowRegistrationForm(false)}
        />
      ) : (
        <Card className="p-6">
          {/* 検索バー */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="ユーザー名、メール、部署で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* ユーザー一覧テーブル */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ユーザー</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">メールアドレス</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ロール</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">部署</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状態</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">登録日</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {searchTerm
                        ? '該当するユーザーが見つかりませんでした'
                        : 'ユーザーがまだ登録されていません'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.user_id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="secondary" 
                          className={
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-orange-100 text-orange-700'
                          }
                        >
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              管理者
                            </>
                          ) : (
                            <>
                              <Briefcase className="w-3 h-3 mr-1" />
                              営業
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {user.department || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="secondary"
                          className={
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {user.is_active ? '🟢 有効' : '⚫ 無効'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(user.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              ロールを変更
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              <Power className="w-4 h-4 mr-2" />
                              {user.is_active ? '無効化' : '有効化'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteTarget(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ユーザーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} さんを削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}





