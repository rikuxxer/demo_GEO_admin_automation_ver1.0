import { useState, useEffect, useMemo } from "react";
import { Plus, ChevronDown, HelpCircle } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Login } from "./components/Login";
import { PasswordReset } from "./components/PasswordReset";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { SummaryCards } from "./components/SummaryCards";
import { ProjectTable } from "./components/ProjectTable";
import { ProjectForm } from "./components/ProjectForm";
import { BulkImport } from "./components/BulkImport";
import { ProjectDetail } from "./components/ProjectDetail";
import { AdminDashboard } from "./components/AdminDashboard";
import { StatusManager } from "./components/StatusManager";
import { Notifications } from "./components/Notifications";
import { EditRequestList } from "./components/EditRequestList";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UserGuideTour } from "./components/UserGuideTour";
import { OperationGuide } from "./components/OperationGuide";
import { ChatBot } from "./components/ChatBot";
import { FeatureRequestList } from "./components/FeatureRequestList";
import { UserManagement } from "./components/UserManagement";
import { UserApprovalManagement } from "./components/UserApprovalManagement";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Toaster } from "./components/ui/sonner";
import type { Project, PoiInfo, Segment, EditRequest } from "./types/schema";
import { AutoProjectStatus } from "./utils/projectStatus";
import { useProjectSystem } from "./hooks/useProjectSystem";
import { bigQueryService } from "./utils/bigquery";

// 開発環境でのみGoogle Sheetsテストユーティリティを読み込む
if (import.meta.env.DEV) {
  import("./utils/testSheets");
  import("./utils/testSpreadsheetExport");
}

// Trigger deploy workflow update
function AppContent() {
  const { isAuthenticated, hasPermission, user, isFirstLogin, markManualAsSeen } = useAuth();
  
  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("projects");
  const [statusFilter, setStatusFilter] = useState<AutoProjectStatus | 'total' | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isOperationGuideOpen, setIsOperationGuideOpen] = useState(false);
  const [operationGuideId, setOperationGuideId] = useState<string | undefined>(undefined);
  const [pendingProjectNavigation, setPendingProjectNavigation] = useState<{ projectId?: string } | null>(null);

  // 初回ログイン時（営業のみ）にツアーを表示
  useEffect(() => {
    if (isAuthenticated && user?.role === 'sales' && isFirstLogin) {
      // 少し遅延させて画面が完全に読み込まれてから表示
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isFirstLogin]);

  // 案件一覧の読み込み後に、保留中の案件詳細遷移を実行
  useEffect(() => {
    if (!pendingProjectNavigation || projects.length === 0) return;
    // segmentsとpoisが読み込まれるまで待つ
    if (!allSegments || !allPois) return;
    
    const { projectId } = pendingProjectNavigation;
    if (projectId) {
      const project = projects.find(p => p.project_id === projectId);
      if (project) {
        selectProject(project);
      }
    } else {
      selectProject(projects[0]);
    }
    setPendingProjectNavigation(null);
  }, [pendingProjectNavigation, projects, allSegments, allPois, selectProject]);

  const handleTourComplete = () => {
    setIsTourOpen(false);
    markManualAsSeen();
  };

  const handleTourOpen = () => {
    setIsTourOpen(true);
  };

  const handleOperationGuideOpen = (guideId?: string) => {
    setOperationGuideId(guideId);
    setIsOperationGuideOpen(true);
  };

  // Data & Logic from Custom Hook
  const {
    // Data
    projects,
    segments,
    allSegments,
    pois,
    allPois,
    editRequests,
    selectedProject,
    unreadNotificationsCount,
    
    // Data Refreshers
    refreshProjects,
    refreshSegments,
    
    // Actions
    createProject,
    selectProject,
    clearSelectedProject,
    updateProject,
    updateProjectStatus,
    createSegment,
    updateSegment,
    deleteSegment,
    requestSegmentEdit,
    updateSegmentStatus,
    confirmSegmentLink,
    createPoi,
    createPoisBulk,
    updatePoi,
    deletePoi,
    createEditRequest,
    approveEditRequest,
    rejectEditRequest,
    withdrawEditRequest,
    loadUnreadNotifications
  } = useProjectSystem();

  // 修正依頼（pending）件数をお知らせ通知に反映
  const pendingEditRequestsCount = useMemo(() => {
    return editRequests.filter(r => r.status === 'pending').length;
  }, [editRequests]);

  const notificationCount = useMemo(() => {
    const baseCount = unreadNotificationsCount;
    const editRequestCount = hasPermission('canViewAdminDashboard') ? pendingEditRequestsCount : 0;
    const total = baseCount + editRequestCount;
    
    // デバッグ用ログ（開発環境のみ）
    if (import.meta.env.MODE === 'development') {
      console.log('📢 通知数計算:', {
        unreadNotifications: baseCount,
        pendingEditRequests: editRequestCount,
        total: total,
        isAdmin: hasPermission('canViewAdminDashboard')
      });
    }
    
    return total;
  }, [unreadNotificationsCount, pendingEditRequestsCount, hasPermission]);

  // ユーザー管理
  const [users, setUsers] = useState<any[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const userData = await bigQueryService.getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
    }
  };

  const loadUserRequests = async () => {
    try {
      const requestData = await bigQueryService.getUserRequests();
      setUserRequests(requestData);
    } catch (error) {
      console.error('ユーザー申請読み込みエラー:', error);
    }
  };

  useEffect(() => {
    if (hasPermission('canViewAdminDashboard')) {
      loadUsers();
      loadUserRequests();
    }
  }, [hasPermission]);

  const handleUserCreate = async (userData: any) => {
    try {
      await bigQueryService.createUser(userData);
      await loadUsers();
      alert('ユーザーを登録しました');
    } catch (error: any) {
      alert(error.message || 'ユーザー登録に失敗しました');
      throw error;
    }
  };

  const handleUserUpdate = async (userId: string, updates: any) => {
    try {
      await bigQueryService.updateUser(userId, updates);
      await loadUsers();
    } catch (error: any) {
      alert(error.message || 'ユーザー更新に失敗しました');
      throw error;
    }
  };

  const handleUserDelete = async (userId: string) => {
    try {
      await bigQueryService.deleteUser(userId);
      await loadUsers();
      alert('ユーザーを削除しました');
    } catch (error: any) {
      alert(error.message || 'ユーザー削除に失敗しました');
      throw error;
    }
  };

  const handleUserRequestApprove = async (requestId: string, comment?: string) => {
    try {
      await bigQueryService.approveUserRequest(requestId, user?.id || 'admin', comment);
      await loadUsers();
      await loadUserRequests();
      alert('ユーザー登録申請を承認しました');
    } catch (error: any) {
      alert(error.message || '承認処理に失敗しました');
      throw error;
    }
  };

  const handleUserRequestReject = async (requestId: string, comment: string) => {
    try {
      await bigQueryService.rejectUserRequest(requestId, user?.id || 'admin', comment);
      await loadUserRequests();
      alert('ユーザー登録申請を却下しました');
    } catch (error: any) {
      alert(error.message || '却下処理に失敗しました');
      throw error;
    }
  };

  // UI Event Handlers (Wrapping hook actions)

  const handleProjectSubmit = async (
    projectData: Omit<Project, "project_id" | "_register_datetime" | "person_in_charge">
  ) => {
    try {
      await createProject(projectData);
      setIsProjectFormOpen(false);
    } catch (error) {
      // Error handling is done in the hook (toast)
    }
  };

  const handleProjectClick = async (project: Project) => {
    const success = await selectProject(project);
    if (!success) {
      // Error handled in hook
    }
  };

  // URLパラメータからトークンを取得（パスワードリセット用）
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (resetToken && resetToken.startsWith('RESET-')) {
    return <PasswordReset token={resetToken} onBack={() => {
      // URLパラメータをクリアしてログイン画面に戻る
      window.history.replaceState({}, '', '/');
      window.location.reload();
    }} />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        unreadCount={notificationCount}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          currentPage={currentPage} 
          editRequests={editRequests}
          onNavigateToEditRequests={() => {
            if (hasPermission('canViewAdminDashboard')) {
              setCurrentPage('admin-dashboard');
            }
          }}
          onOpenHelp={user?.role === 'sales' ? () => handleOperationGuideOpen() : undefined}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentPage === "projects" && (
            <>
              {selectedProject ? (
                // 案件詳細画面
                <ProjectDetail
                  project={selectedProject}
                  segments={segments}
                  pois={pois}
                  onBack={clearSelectedProject}
                  onProjectUpdate={updateProject}
                  onSegmentCreate={createSegment}
                  onSegmentUpdate={updateSegment}
                  onSegmentDelete={deleteSegment}
                  onPoiCreate={createPoi}
                  onPoiCreateBulk={createPoisBulk}
                  onPoiUpdate={updatePoi}
                  onPoiDelete={deletePoi}
                  editRequests={editRequests}
                  onEditRequestCreate={createEditRequest}
                  onEditRequestApprove={approveEditRequest}
                  onEditRequestReject={rejectEditRequest}
                  onEditRequestWithdraw={withdrawEditRequest}
                  onUnreadCountUpdate={loadUnreadNotifications}
                />
              ) : (
                // 案件一覧画面
                <>
                  {/* Page Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-primary rounded-full"></div>
                      <h2 className="text-sm text-gray-700">
                        案件サマリ
                      </h2>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          data-tour="new-project-button"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          案件の新規依頼
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 border-gray-200">
                        <DropdownMenuItem
                          onClick={() => setIsProjectFormOpen(true)}
                          className="cursor-pointer dropdown-menu-item-manual-register"
                        >
                          手動で登録
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setIsBulkImportOpen(true)}
                          className="cursor-pointer"
                        >
                          案件・セグメント・地点を一括登録
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {projects.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">テスト画面</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        まだ案件が登録されていません。テスト用に新規登録または一括登録を試せます。
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          onClick={() => setIsProjectFormOpen(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          手動で登録
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsBulkImportOpen(true)}
                          className="border-gray-300"
                        >
                          一括登録
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary Cards */}
                      <div data-tour="summary-cards">
                        <SummaryCards 
                          projects={projects}
                          segments={allSegments}
                          pois={allPois}
                          selectedStatus={statusFilter}
                          onCardClick={setStatusFilter}
                        />
                      </div>

                      {/* Project Table */}
                      <div data-tour="project-table">
                        <ProjectTable
                          projects={projects}
                          segments={allSegments}
                          pois={allPois}
                          onProjectClick={handleProjectClick}
                          statusFilter={statusFilter}
                          onClearStatusFilter={() => setStatusFilter('total')}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {currentPage === "dashboard" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium text-gray-900">
                ダッシュボード
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="font-medium text-gray-900 mb-2">
                    総案件数
                  </h3>
                  <p className="text-3xl font-semibold text-blue-600">
                    {projects.length + 5}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="font-medium text-gray-900 mb-2">
                    今月の新規案件
                  </h3>
                  <p className="text-3xl font-semibold text-green-600">
                    {projects.length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="font-medium text-gray-900 mb-2">
                    進行中案件
                  </h3>
                  <p className="text-3xl font-semibold text-purple-600">
                    3
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentPage === "proposals" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium text-gray-900">
                提案管理
              </h1>
              <div className="bg-white p-8 rounded-xl border">
                <p className="text-gray-600 text-center">
                  提案管理機能は準備中です
                </p>
              </div>
            </div>
          )}

          {currentPage === "notifications" && (
            <div className="space-y-6">
              <Notifications 
                projects={projects}
                onProjectClick={(project) => {
                  handleProjectClick(project);
                  setCurrentPage("projects");
                }}
                onUnreadCountUpdate={loadUnreadNotifications}
              />
            </div>
          )}

          {currentPage === "feature-requests" && (
            <div className="space-y-6">
              {hasPermission('canViewAdminDashboard') ? (
                <FeatureRequestList isAdmin={true} />
              ) : (
                <FeatureRequestList isAdmin={false} showFormOnly={true} />
              )}
            </div>
          )}

          {currentPage === "user-management" && hasPermission('canViewAdminDashboard') && (
            <UserManagement
              users={users}
              onUserCreate={handleUserCreate}
              onUserUpdate={handleUserUpdate}
              onUserDelete={handleUserDelete}
            />
          )}

          {currentPage === "user-approval" && hasPermission('canViewAdminDashboard') && (
            <UserApprovalManagement
              requests={userRequests}
              onApprove={handleUserRequestApprove}
              onReject={handleUserRequestReject}
            />
          )}

          {currentPage === "data-sync" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium text-gray-900">
                データ連携
              </h1>
              <div className="bg-white p-8 rounded-xl border">
                <p className="text-gray-600 text-center">
                  データ連携機能は準備中です
                </p>
              </div>
            </div>
          )}

          {currentPage === "project-list" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-medium text-gray-900">
                案件一覧
              </h1>
              <ProjectTable
                projects={projects}
                onProjectClick={handleProjectClick}
              />
            </div>
          )}

          {/* 管理画面 */}
          {currentPage === "admin-dashboard" &&
            hasPermission("canViewAdminDashboard") && (
              <AdminDashboard
                projects={projects}
                segments={allSegments}
                editRequests={editRequests}
                onEditRequestApprove={approveEditRequest}
                onEditRequestReject={rejectEditRequest}
                onEditRequestWithdraw={withdrawEditRequest}
                currentUserId={user?.email || ''}
                onRefresh={refreshProjects}
              />
            )}

          {currentPage === "admin-status" &&
            hasPermission("canManageProjectStatus") && (
              <StatusManager
                projects={projects}
                segments={allSegments}
                pois={allPois}
                onProjectClick={async (projectId) => {
                  const project = projects.find(p => p.project_id === projectId);
                  if (project) {
                    const success = await selectProject(project);
                    if (success) {
                      setCurrentPage('projects');
                    }
                  }
                }}
              />
            )}

          {currentPage === "admin-edit-requests" &&
            hasPermission("canViewAdminDashboard") && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-gray-900 mb-2">修正依頼管理</h1>
                  <p className="text-muted-foreground">営業からの修正依頼を確認・承認・却下できます</p>
                </div>
                <EditRequestList
                  requests={editRequests}
                  onApprove={approveEditRequest}
                  onReject={rejectEditRequest}
                  onWithdraw={withdrawEditRequest}
                  currentUserId={user?.email || ''}
                  isAdmin={true}
                />
              </div>
            )}

          {/* 権限がない場合のメッセージ */}
          {currentPage.startsWith("admin-") &&
            ((currentPage === "admin-dashboard" &&
              !hasPermission("canViewAdminDashboard")) ||
              (currentPage === "admin-status" &&
                !hasPermission("canManageProjectStatus")) ||
              (currentPage === "admin-edit-requests" &&
                !hasPermission("canViewAdminDashboard"))) && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-gray-900 mb-2">
                    アクセス権限がありません
                  </h2>
                  <p className="text-muted-foreground">
                    この機能にアクセスする権限がありません。
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSubmit={handleProjectSubmit}
      />

      {/* Complete Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl">案件・セグメント・地点の一括登録</h2>
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BulkImport
                onImportComplete={() => {
                  refreshProjects();
                  refreshSegments();
                  setIsBulkImportOpen(false);
                  toast.success("一括登録が完了しました");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />

      {/* User Guide Tour (営業のみ) */}
      {user?.role === 'sales' && (
        <UserGuideTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          onComplete={handleTourComplete}
        />
      )}

      {/* Operation Guide (営業のみ) */}
      {user?.role === 'sales' && (
        <OperationGuide
          isOpen={isOperationGuideOpen}
          onClose={() => {
            setIsOperationGuideOpen(false);
            setOperationGuideId(undefined);
          }}
          guideId={operationGuideId}
          onNavigate={(page, projectId) => {
            if (page === 'projects') {
              setCurrentPage('projects');
              clearSelectedProject();
              return;
            }

            if (page === 'project-detail') {
              // 案件詳細は「projects」画面内で表示されるため、
              // 必ず projects へ遷移してから案件を選択する
              setCurrentPage('projects');
              if (projects.length === 0) {
                setPendingProjectNavigation({ projectId });
                return;
              }
              if (projectId) {
                const project = projects.find(p => p.project_id === projectId);
                if (project) {
                  selectProject(project);
                  return;
                }
              }
              selectProject(projects[0]);
            }
          }}
          onOpenForm={(formType) => {
            if (formType === 'project-form') {
              setIsProjectFormOpen(true);
            } else if (formType === 'bulk-import') {
              setIsBulkImportOpen(true);
            }
          }}
        />
      )}

      {/* ChatBot (全ユーザー) */}
      {isAuthenticated && (
        <ChatBot
          currentPage={currentPage}
          currentContext={{
            userRole: user?.role,
            hasPermission: hasPermission,
          }}
          onNavigate={(action, params) => {
            if (action === 'page' && params?.page) {
              setCurrentPage(params.page);
            }
          }}
          onOpenForm={(formType) => {
            if (formType === 'project-form') {
              setIsProjectFormOpen(true);
            } else if (formType === 'bulk-import') {
              setIsBulkImportOpen(true);
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
