import { useState } from 'react';
import { 
  LayoutGrid, 
  Presentation, 
  Users, 
  FileBarChart, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  ListChecks,
  FileEdit,
  Lightbulb,
  UserCog,
  UserCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentPage?: string;
  onPageChange?: (page: string) => void;
  unreadCount?: number;
}

export function Sidebar({ isCollapsed, onToggle, currentPage = 'projects', onPageChange, unreadCount = 0 }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth();

  const menuItems = [
    { icon: Users, label: '案件管理', count: null, page: 'projects', disabled: false },
    { icon: LayoutGrid, label: 'ダッシュボード', count: null, page: 'dashboard', disabled: true },
    { icon: Presentation, label: '提案', count: 3, page: 'proposals', disabled: true },
    { icon: FileBarChart, label: 'レポート作成', count: null, page: 'report', disabled: true },
    { icon: Bell, label: 'お知らせ', count: unreadCount > 0 ? unreadCount : null, page: 'notifications', disabled: false },
    { icon: Lightbulb, label: '機能リクエスト', count: null, page: 'feature-requests', disabled: false },
  ];

  const adminMenuItems = [
    { 
      icon: Settings, 
      label: '管理ダッシュボード', 
      count: null, 
      page: 'admin-dashboard',
      permission: 'canViewAdminDashboard' as const
    },
    { 
      icon: ListChecks, 
      label: '案件一覧', 
      count: null, 
      page: 'admin-status',
      permission: 'canManageProjectStatus' as const
    },
    { 
      icon: FileEdit, 
      label: '修正依頼管理', 
      count: null, 
      page: 'admin-edit-requests',
      permission: 'canViewAdminDashboard' as const
    },
    { 
      icon: UserCog, 
      label: 'ユーザー管理', 
      count: null, 
      page: 'user-management',
      permission: 'canViewAdminDashboard' as const
    },
    { 
      icon: UserCheck, 
      label: 'ユーザー登録申請', 
      count: null, 
      page: 'user-approval',
      permission: 'canViewAdminDashboard' as const
    },
  ];

  // 権限のある管理メニューのみフィルタリング
  const visibleAdminMenuItems = adminMenuItems.filter(item => 
    hasPermission(item.permission)
  );

  return (
    <div 
      data-tour="sidebar"
      className={`bg-sidebar h-full border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2C7.5 2 5.5 4 5.5 6.5C5.5 10 10 16 10 16C10 16 14.5 10 14.5 6.5C14.5 4 12.5 2 10 2Z" fill="white" stroke="white" strokeWidth="1.5"/>
              <circle cx="10" cy="6.5" r="1.5" fill="#5b5fff"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-sidebar-foreground block">UNIVERSEGEO</span>
              <span className="text-sidebar-foreground/60 text-xs">案件管理システム</span>
            </div>
          )}
        </div>
      </div>



      {/* Menu Items */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-4">
          {/* メインメニュー */}
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <div 
                key={index} 
                onClick={() => !item.disabled && onPageChange?.(item.page)}
                className={`transition-all relative ${
                  isCollapsed 
                    ? 'h-11 rounded-lg flex items-center justify-center' 
                    : 'px-3 py-2.5 rounded-lg flex items-center gap-3'
                } ${
                  item.disabled
                    ? 'cursor-not-allowed opacity-40'
                    : 'cursor-pointer'
                } ${
                  currentPage === item.page && !item.disabled
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                    : item.disabled
                    ? 'text-sidebar-foreground/40 bg-sidebar-accent/30'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                
                {/* 折りたたみ時の通知ドット */}
                {isCollapsed && item.count && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sidebar" />
                )}

                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.disabled && (
                      <span className="px-2.5 py-1 bg-gray-500/30 text-gray-600 rounded-md text-xs font-medium">
                        Coming Soon
                      </span>
                    )}
                    {item.count && !item.disabled && (
                      <div className="px-2 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs font-bold">{item.count}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 管理機能セクション */}
          {visibleAdminMenuItems.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-2 text-xs text-sidebar-foreground/50 uppercase tracking-wider">
                  管理機能
                </div>
              )}
              {isCollapsed && (
                <div className="border-t border-sidebar-border my-2"></div>
              )}
              {visibleAdminMenuItems.map((item, index) => (
                <div 
                  key={index} 
                  onClick={() => onPageChange?.(item.page)}
                  className={`cursor-pointer transition-all ${
                    isCollapsed 
                      ? 'h-11 rounded-lg flex items-center justify-center' 
                      : 'px-3 py-2.5 rounded-lg flex items-center gap-3'
                  } ${
                    currentPage === item.page 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.count && (
                        <div className="px-2 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-xs">{item.count}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border mt-auto">
        {/* サイドバー折りたたみボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={`w-full ${isCollapsed ? 'justify-center' : 'justify-start'} text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="ml-2">サイドバーを閉じる</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
