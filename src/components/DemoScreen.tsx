import { useState, useEffect } from 'react';
import { Plus, ChevronDown, FileText, Upload } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Card } from './ui/card';

/**
 * デモ画面コンポーネント
 * 実際の画面と同じような構造を持つが、独立したコンポーネント
 * 操作ガイドで使用する
 */
export function DemoScreen({ 
  type, 
  highlightedElement, 
  onElementClick 
}: { 
  type: 'projects' | 'project-detail' | 'project-form' | 'bulk-import';
  highlightedElement?: string;
  onElementClick?: (elementId: string) => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'segment' | 'poi'>('segment');
  const [isSegmentFormOpen, setIsSegmentFormOpen] = useState(false);
  const [isPoiFormOpen, setIsPoiFormOpen] = useState(false);

  // ハイライト要素に応じてタブ・フォーム表示を切り替え（ガイドのステップに合わせる）
  useEffect(() => {
    if (type === 'project-detail') {
      if (highlightedElement === 'poi-tab' || highlightedElement === 'new-poi-button' || highlightedElement === 'poi-type-select' || highlightedElement === 'poi-form' || highlightedElement === 'poi-submit') {
        setActiveTab('poi');
        if (highlightedElement === 'new-poi-button' || highlightedElement === 'poi-type-select' || highlightedElement === 'poi-form' || highlightedElement === 'poi-submit') {
          setIsPoiFormOpen(true);
        }
      } else if (highlightedElement === 'segment-tab' || highlightedElement === 'new-segment-button' || highlightedElement === 'segment-form' || highlightedElement === 'segment-submit' || highlightedElement?.startsWith('common-conditions')) {
        setActiveTab('segment');
        if (highlightedElement === 'new-segment-button' || highlightedElement === 'segment-form' || highlightedElement === 'segment-submit') {
          setIsSegmentFormOpen(true);
        }
      }
    }
  }, [type, highlightedElement]);

  // 案件詳細デモ（セグメント・地点のガイド用）
  if (type === 'project-detail') {
    return (
      <div className="w-full h-full bg-[#f5f5ff] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <button type="button" className="text-sm text-gray-600 hover:text-gray-900">← 案件一覧へ</button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">サンプル案件（デモ）</h2>
          {/* タブ */}
          <div className="flex gap-2 border-b border-gray-200 mb-4">
            <button
              type="button"
              id="demo-segment-tab"
              data-guide="segment-tab"
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'segment'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              } ${highlightedElement === 'segment-tab' ? 'ring-2 ring-blue-400 ring-offset-2 rounded-t' : ''}`}
              onClick={() => { setActiveTab('segment'); onElementClick?.('segment-tab'); }}
            >
              セグメント管理
            </button>
            <button
              type="button"
              id="demo-poi-tab"
              data-guide="poi-tab"
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'poi'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              } ${highlightedElement === 'poi-tab' ? 'ring-2 ring-blue-400 ring-offset-2 rounded-t' : ''}`}
              onClick={() => { setActiveTab('poi'); onElementClick?.('poi-tab'); }}
            >
              地点情報
            </button>
          </div>
          {activeTab === 'segment' && (
            <div className="space-y-4">
              <Button
                id="demo-new-segment-button"
                data-guide="new-segment-button"
                className={highlightedElement === 'new-segment-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                onClick={() => { setIsSegmentFormOpen(true); onElementClick?.('new-segment-button'); }}
              >
                セグメントを追加
              </Button>
              {isSegmentFormOpen && (
                <Card className="p-4 space-y-4">
                  <div data-guide="segment-form" className={highlightedElement === 'segment-form' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                    <p className="text-sm text-gray-600">セグメント名・配信媒体・期間などを設定（デモ）</p>
                  </div>
                  <Button data-guide="segment-submit" className={highlightedElement === 'segment-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''} onClick={() => setIsSegmentFormOpen(false)}>登録</Button>
                </Card>
              )}
              <div data-guide="segment-common-conditions" className={`p-2 rounded border border-gray-200 ${highlightedElement === 'segment-common-conditions' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                セグメント共通条件を設定する（デモ）
              </div>
              <div data-guide="common-conditions-form" className={`p-2 rounded border border-gray-200 mt-2 ${highlightedElement === 'common-conditions-form' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                指定半径・抽出期間・属性など（デモ）
              </div>
              <Button data-guide="common-conditions-save" className={highlightedElement === 'common-conditions-save' ? 'ring-4 ring-blue-400 ring-offset-2 mt-2' : 'mt-2'}>条件を保存</Button>
            </div>
          )}
          {activeTab === 'poi' && (
            <div className="space-y-4">
              <Button
                id="demo-new-poi-button"
                data-guide="new-poi-button"
                className={highlightedElement === 'new-poi-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                onClick={() => { setIsPoiFormOpen(true); onElementClick?.('new-poi-button'); }}
              >
                地点を追加
              </Button>
              {isPoiFormOpen && (
                <Card className="p-4 space-y-4">
                  <div data-guide="poi-type-select" className={highlightedElement === 'poi-type-select' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                    地点タイプ選択（デモ）
                  </div>
                  <div data-guide="poi-form" className={highlightedElement === 'poi-form' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                    地点情報入力（デモ）
                  </div>
                  <Button data-guide="poi-submit" className={highlightedElement === 'poi-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''} onClick={() => setIsPoiFormOpen(false)}>登録</Button>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'projects') {
    return (
      <div className="w-full h-full bg-[#f5f5ff] p-6">
        <div className="max-w-7xl mx-auto">
          {/* ページヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full"></div>
              <h2 className="text-sm text-gray-700">案件サマリ</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  id="demo-new-project-button"
                  data-tour="new-project-button"
                  className={`bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    highlightedElement === 'new-project-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''
                  }`}
                  onClick={() => onElementClick?.('new-project-button')}
                >
                  <Plus className="w-4 h-4" />
                  案件の新規依頼
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-gray-200">
                <DropdownMenuItem
                  id="demo-manual-register"
                  className="dropdown-menu-item-manual-register cursor-pointer"
                  onClick={() => {
                    setIsFormOpen(true);
                    onElementClick?.('manual-register');
                  }}
                >
                  手動で登録
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  id="demo-bulk-import"
                  className="cursor-pointer"
                  onClick={() => {
                    setIsBulkImportOpen(true);
                    onElementClick?.('bulk-import');
                  }}
                >
                  案件・セグメント・地点を一括登録
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* デモ用のフォーム（表示のみ） */}
            {isFormOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-2xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">案件の新規登録（デモ）</h3>
                    <Button variant="ghost" onClick={() => setIsFormOpen(false)}>×</Button>
                  </div>
                  <div 
                    id="demo-project-form"
                    data-guide="project-form"
                    className={`space-y-4 ${
                      highlightedElement === 'project-form' ? 'ring-4 ring-blue-400 ring-offset-2 p-4 rounded-lg' : ''
                    }`}
                  >
                    <div>
                      <label className="text-sm font-medium">広告主法人名 *</label>
                      <input type="text" className="w-full border rounded px-3 py-2 mt-1" placeholder="例：株式会社サンプル" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">訴求内容 *</label>
                      <textarea className="w-full border rounded px-3 py-2 mt-1" rows={3} placeholder="訴求内容を入力" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">配信開始日 *</label>
                        <input type="date" className="w-full border rounded px-3 py-2 mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">配信終了日 *</label>
                        <input type="date" className="w-full border rounded px-3 py-2 mt-1" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsFormOpen(false)}>キャンセル</Button>
                      <Button 
                        id="demo-project-submit"
                        data-guide="project-submit"
                        className={`${
                          highlightedElement === 'project-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''
                        }`}
                        onClick={() => {
                          onElementClick?.('project-submit');
                          setIsFormOpen(false);
                        }}
                      >
                        登録
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* デモ用の一括登録（表示のみ） */}
            {isBulkImportOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-4xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">一括登録（デモ）</h3>
                    <Button variant="ghost" onClick={() => setIsBulkImportOpen(false)}>×</Button>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Excelファイルをアップロードして、案件・セグメント・地点を一括登録できます。
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600">ファイルをドラッグ＆ドロップ</p>
                      <p className="text-xs text-gray-500 mt-2">または</p>
                      <Button variant="outline" className="mt-4">ファイルを選択</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* サマリーカード（デモ） */}
          <div 
            id="demo-summary-cards"
            data-tour="summary-cards"
            className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 ${
              highlightedElement === 'summary-cards' ? 'ring-4 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''
            }`}
          >
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">総案件数</div>
              <div className="text-2xl font-semibold text-blue-600">12</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">進行中</div>
              <div className="text-2xl font-semibold text-green-600">8</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">完了</div>
              <div className="text-2xl font-semibold text-gray-600">3</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">保留</div>
              <div className="text-2xl font-semibold text-orange-600">1</div>
            </Card>
          </div>

          {/* 案件テーブル（デモ） */}
          <Card className="p-4">
            <div className="text-sm text-gray-600">案件一覧（デモ）</div>
            <div className="mt-4 space-y-2">
              <div className="border-b pb-2">
                <div className="font-medium">サンプル案件1</div>
                <div className="text-xs text-gray-500">2024/01/01 - 2024/12/31</div>
              </div>
              <div className="border-b pb-2">
                <div className="font-medium">サンプル案件2</div>
                <div className="text-xs text-gray-500">2024/02/01 - 2024/11/30</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
