// ユーザーロールの定義
export type UserRole = 'admin' | 'sales';

// ユーザー情報
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

// ロール権限の定義
export const ROLE_PERMISSIONS = {
  admin: {
    canViewAdminDashboard: true,
    canManageProjectStatus: true,
    canManageSegmentStatus: true,
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canCreateSegment: true,
    canEditSegment: true,
    canDeleteSegment: true,
    canViewAllProjects: true,
    canManageUsers: true,
  },
  sales: {
    canViewAdminDashboard: false,
    canManageProjectStatus: false,
    canManageSegmentStatus: false,
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canCreateSegment: true,
    canEditSegment: true,
    canDeleteSegment: false,
    canViewAllProjects: true,
    canManageUsers: false,
  },
} as const;

// ロールラベルの定義
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理',
  sales: '営業',
};

// デモユーザー（開発用）
export const DEMO_USERS: User[] = [
  {
    id: 'user-admin',
    name: '管理太郎',
    email: 'admin@example.com',
    role: 'admin',
    department: '管理部',
  },
  {
    id: 'user-sales',
    name: '営業花子',
    email: 'sales@example.com',
    role: 'sales',
    department: '営業部',
  },
];
