import { Bell, Search, Settings, User, LogOut, ChevronDown, FileEdit, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import type { EditRequest } from '../types/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  currentPage?: string;
  editRequests?: EditRequest[];
  onNavigateToEditRequests?: () => void;
  onOpenHelp?: () => void;
}

export function Header({ 
  currentPage = 'projects',
  editRequests = [],
  onNavigateToEditRequests,
  onOpenHelp
}: HeaderProps) {
  const { user, logout, hasPermission } = useAuth();
  
  const isAdmin = hasPermission('canViewAdminDashboard');
  
  // 管理者：承認待ちの修正依頼数（営業は案件詳細の履歴タブで確認）
  const notificationCount = isAdmin
    ? editRequests.filter(r => r.status === 'pending').length
    : 0;

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'ダッシュボード';
      case 'proposals': return '提案管理';
      case 'projects': return '案件管理';
      case 'report': return 'レポート作成';
      case 'notifications': return 'お知らせ';
      case 'admin-dashboard': return '管理ダッシュボード';
      case 'admin-status': return '案件一覧';
      case 'admin-edit-requests': return '修正依頼管理';
      default: return '案件管理';
    }
  };
  
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left Section - Title */}
        <div>
          <h1 className="text-sm text-gray-700">{getPageTitle(currentPage)}</h1>
        </div>
        
        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* ヘルプボタン（営業のみ） */}
          {user?.role === 'sales' && onOpenHelp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHelp}
              title="操作ガイドを表示"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </Button>
          )}
          
          {/* 通知ベル（管理者のみ） */}
          {isAdmin && onNavigateToEditRequests && (
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={onNavigateToEditRequests}
              title="承認待ちの修正依頼を確認"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notificationCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-white text-xs bg-red-500"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          )}
          
          {/* User Info */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm text-gray-900">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.department}</p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs hidden md:inline-flex ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user.role === 'admin' ? '管理' : '営業'}
                  </Badge>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}