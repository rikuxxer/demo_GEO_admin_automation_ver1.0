import { useState, useEffect } from 'react';
import { X, FileEdit, History, AlertCircle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EditRequestList } from './EditRequestList';
import { isDirectEditField } from '../utils/editRequest';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Project, EditRequest } from '../types/schema';

interface ProjectEditRequestDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  onSubmit: (request: EditRequest) => void;
  onDirectUpdate?: (projectId: string, updates: Partial<Project>) => void;
  editRequests: EditRequest[];
  onEditRequestApprove?: (requestId: string, comment: string) => void;
  onEditRequestReject?: (requestId: string, comment: string) => void;
  onEditRequestWithdraw?: (requestId: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function ProjectEditRequestDialog({
  project,
  open,
  onClose,
  onSubmit,
  onDirectUpdate,
  editRequests,
  onEditRequestApprove,
  onEditRequestReject,
  onEditRequestWithdraw,
  currentUserId,
  isAdmin
}: ProjectEditRequestDialogProps) {
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [editReason, setEditReason] = useState('');

  // ダイアログが開かれたときに初期値を設定
  useEffect(() => {
    if (open) {
      setEditedProject({
        advertiser_name: project.advertiser_name,
        agency_name: project.agency_name || '',
        appeal_point: project.appeal_point,
        universe_service_id: project.universe_service_id || '',
        universe_service_name: project.universe_service_name || '',
        person_in_charge: project.person_in_charge,
        sub_person_in_charge: project.sub_person_in_charge || '',
        delivery_start_date: project.delivery_start_date,
        delivery_end_date: project.delivery_end_date,
        remarks: project.remarks || ''
      });
      setEditReason('');
    }
  }, [open, project]);

  if (!open) return null;

  const projectEditRequests = editRequests.filter(r => r.target_id === project.project_id);
  const pendingRequests = projectEditRequests.filter(r => r.status === 'pending');

  const handleSubmit = () => {
    // UNIVERSEサービスIDのバリデーション（入力がある場合のみ）
    if (editedProject.universe_service_id && !/^\d{5,}$/.test(editedProject.universe_service_id)) {
      alert('UNIVERSEサービスIDは半角数字のみ5桁以上で入力してください');
      return;
    }

    // 配信期間の整合性チェック（変更した場合のみ）
    if (editedProject.delivery_start_date && editedProject.delivery_end_date) {
      const start = new Date(editedProject.delivery_start_date);
      const end = new Date(editedProject.delivery_end_date);
      if (start.getTime() > end.getTime()) {
        alert('配信終了日は配信開始日以降の日付を指定してください');
        return;
      }
    }

    // 変更内容を計算し、承認必要/不要に分ける
    const approvalRequiredChanges: Record<string, { before: any; after: any }> = {};
    const directEditChanges: Record<string, any> = {};
    
    Object.keys(editedProject).forEach(key => {
      const typedKey = key as keyof Project;
      if (editedProject[typedKey] !== undefined && editedProject[typedKey] !== project[typedKey]) {
        if (isDirectEditField(key)) {
          // 承認不要フィールド
          directEditChanges[key] = editedProject[typedKey];
        } else {
          // 承認必要フィールド
          approvalRequiredChanges[key] = {
            before: project[typedKey],
            after: editedProject[typedKey]
          };
        }
      }
    });

    // 変更がない場合
    if (Object.keys(approvalRequiredChanges).length === 0 && Object.keys(directEditChanges).length === 0) {
      alert('変更する項目を入力してください');
      return;
    }

    // 承認必要なフィールドがある場合、修正理由が必須
    if (Object.keys(approvalRequiredChanges).length > 0 && !editReason.trim()) {
      alert('承認が必要な項目を変更する場合、修正理由を入力してください');
      return;
    }

    // 直接編集可能なフィールドの変更を適用
    if (Object.keys(directEditChanges).length > 0 && onDirectUpdate) {
      onDirectUpdate(project.project_id, directEditChanges);
    }

    // 承認が必要なフィールドの修正依頼を作成
    if (Object.keys(approvalRequiredChanges).length > 0) {
      const request: EditRequest = {
        request_id: `REQ_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Date.now().toString().slice(-5)}`,
        request_type: 'project',
        target_id: project.project_id,
        project_id: project.project_id,
        requested_by: currentUserId,
        requested_at: new Date().toISOString(),
        request_reason: editReason,
        status: 'pending',
        changes: approvalRequiredChanges
      };
      onSubmit(request);
    }

    handleClose();
  };

  const handleClose = () => {
    setEditedProject({});
    setEditReason('');
    setActiveTab('request');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl">案件情報の修正依頼</h2>
                </div>
              </div>
              <div className="ml-13">
                <p className="text-white/90 text-sm">
                  案件ID: <span className="font-medium">{project.project_id}</span>
                </p>
                <p className="text-white/90 text-sm">
                  広告主: <span className="font-medium">{project.advertiser_name}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white hover:bg-white/20 -mt-2 -mr-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'request' | 'history')} className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 border-b border-gray-200 px-6 pt-4 pb-4">
              <TabsList className="w-full h-auto p-1 bg-[#f5f5ff] flex gap-1">
                <TabsTrigger 
                  value="request" 
                  className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4" />
                    <span className="text-sm">新規修正依頼</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span className="text-sm">修正履歴</span>
                    {projectEditRequests.length > 0 && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                        {projectEditRequests.length}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="request" className="flex-1 overflow-y-auto p-6 mt-0 min-h-0">
              {pendingRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    ⚠️ この案件には承認待ちの修正依頼が{pendingRequests.length}件あります。
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    前の依頼が処理されるまで、新しい修正依頼を控えることをお勧めします。
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {/* 承認が必要なフィールド */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm text-gray-900">承認が必要な項目（管理部承認後に反映）</h3>
                  </div>
                  <div className="bg-gray-50/50 border border-gray-200 border-l-4 border-l-orange-400 rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <Label>広告主法人名</Label>
                      <Input
                        value={editedProject.advertiser_name || ''}
                        onChange={(e) => setEditedProject(prev => ({ ...prev, advertiser_name: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>代理店名（任意）</Label>
                      <Input
                        value={editedProject.agency_name || ''}
                        onChange={(e) => setEditedProject(prev => ({ ...prev, agency_name: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>訴求内容</Label>
                      <Textarea
                        value={editedProject.appeal_point || ''}
                        onChange={(e) => setEditedProject(prev => ({ ...prev, appeal_point: e.target.value }))}
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>配信開始日</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 border-gray-200"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editedProject.delivery_start_date ? (
                                format(new Date(editedProject.delivery_start_date), 'yyyy年MM月dd日', { locale: ja })
                              ) : (
                                <span className="text-muted-foreground">開始日を選択</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editedProject.delivery_start_date ? new Date(editedProject.delivery_start_date) : undefined}
                              onSelect={(date) => setEditedProject(prev => ({ ...prev, delivery_start_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                              locale={ja}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>配信終了日</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className="w-full justify-start text-left font-normal bg-white hover:bg-gray-50 border-gray-200"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editedProject.delivery_end_date ? (
                                format(new Date(editedProject.delivery_end_date), 'yyyy年MM月dd日', { locale: ja })
                              ) : (
                                <span className="text-muted-foreground">終了日を選択</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editedProject.delivery_end_date ? new Date(editedProject.delivery_end_date) : undefined}
                              onSelect={(date) => setEditedProject(prev => ({ ...prev, delivery_end_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                              locale={ja}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>主担当者</Label>
                        <Input
                          value={editedProject.person_in_charge || ''}
                          onChange={(e) => setEditedProject(prev => ({ ...prev, person_in_charge: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>副担当者（任意）</Label>
                        <Input
                          value={editedProject.sub_person_in_charge || ''}
                          onChange={(e) => setEditedProject(prev => ({ ...prev, sub_person_in_charge: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 直接編集可能なフィールド */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="text-sm text-gray-900">即時反映される項目（承認不要）</h3>
                  </div>
                  <div className="bg-gray-50/50 border border-gray-200 border-l-4 border-l-green-400 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>UNIVERSEサービスID（任意）</Label>
                        <Input
                          value={editedProject.universe_service_id || ''}
                          onChange={(e) => setEditedProject(prev => ({ ...prev, universe_service_id: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UNIVERSEサービス名（任意）</Label>
                        <Input
                          value={editedProject.universe_service_name || ''}
                          onChange={(e) => setEditedProject(prev => ({ ...prev, universe_service_name: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>備考（任意）</Label>
                      <Textarea
                        value={editedProject.remarks || ''}
                        onChange={(e) => setEditedProject(prev => ({ ...prev, remarks: e.target.value }))}
                        rows={3}
                        placeholder="その他の補足情報を入力してください"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 修正理由（承認が必要な項目を変更する場合のみ必須） */}
                <div className="space-y-2">
                  <Label>
                    修正理由 <span className="text-orange-500 text-xs">（承認が必要な項目を変更する場合は必須）</span>
                  </Label>
                  <Textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="承認が必要な項目を変更する場合、修正が必要な理由を入力してください"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={handleClose} className="border-gray-200">
                    キャンセル
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="bg-[#5b5fff] hover:bg-[#4a4aef] text-white"
                  >
                    保存・送信
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0 min-h-0">
              {projectEditRequests.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">修正依頼の履歴はありません</p>
                </div>
              ) : (
                <EditRequestList
                  requests={projectEditRequests}
                  onApprove={onEditRequestApprove || (() => {})}
                  onReject={onEditRequestReject || (() => {})}
                  onWithdraw={onEditRequestWithdraw}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
