import { useState, useEffect } from 'react';
import { Plus, ChevronDown, FileText, Upload, Package, MapPin, ArrowLeft, Download, Info, FileEdit, AlertTriangle, CheckCircle2, Send, Search, User, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'pois'>('overview');
  const [isSegmentFormOpen, setIsSegmentFormOpen] = useState(false);
  const [isPoiFormOpen, setIsPoiFormOpen] = useState(false);

  // ハイライト要素に応じてタブ・フォーム表示を切り替え（ガイドのステップに合わせる）
  useEffect(() => {
    if (type === 'project-detail') {
      if (highlightedElement === 'poi-tab' || highlightedElement === 'new-poi-button' || highlightedElement === 'poi-type-select' || highlightedElement === 'poi-form' || highlightedElement === 'poi-submit') {
        setActiveTab('pois');
        if (highlightedElement === 'new-poi-button' || highlightedElement === 'poi-type-select' || highlightedElement === 'poi-form' || highlightedElement === 'poi-submit') {
          setIsPoiFormOpen(true);
        }
      } else if (highlightedElement === 'segment-tab' || highlightedElement === 'new-segment-button' || highlightedElement === 'segment-form' || highlightedElement === 'segment-submit' || highlightedElement?.startsWith('common-conditions')) {
        setActiveTab('segments');
        if (highlightedElement === 'new-segment-button' || highlightedElement === 'segment-form' || highlightedElement === 'segment-submit') {
          setIsSegmentFormOpen(true);
        }
      }
    }
  }, [type, highlightedElement]);

  // 一括登録デモ（実物のBulkImportに合わせたレイアウト）
  if (type === 'bulk-import') {
    return (
      <div className="w-full h-full bg-[#f5f5ff] p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-sm text-gray-700">案件・セグメント・地点の一括登録</h2>
          </div>
          {/* 説明カード（実物と同じ） */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900">Excelファイルの構成</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li><strong>①入力ガイド</strong>: 使い方の説明</li>
                  <li><strong>②案件情報</strong>: 案件の基本情報（1案件のみ登録可能）</li>
                  <li><strong>③セグメント・TG地点設定</strong>: セグメント＋TG地点（複数件可）</li>
                  <li><strong>④来店計測地点リスト</strong>: 来店計測地点（複数件可）</li>
                </ul>
                <p className="text-red-600 font-semibold mt-3 border-t border-red-200 pt-2">
                  複数案件を登録する場合は、案件ごとにExcelファイルを分けてください
                </p>
              </div>
            </div>
          </Card>
          {/* テンプレートダウンロード（実物と同じ） */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#5b5fff]" />
                <h3 className="font-medium">テンプレートをダウンロード</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                まずはテンプレートをダウンロードして、必要な情報を入力してください
              </p>
              <Button variant="outline" className="flex items-center gap-2 border border-gray-300 text-blue-600 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Excelテンプレートをダウンロード
              </Button>
            </div>
          </Card>
          {/* ファイルアップロード（実物と同じ） */}
          <Card className="p-6" data-guide="bulk-import-form">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#5b5fff]" />
                <h3 className="font-medium">Excelファイルをアップロード</h3>
              </div>
              <div
                className={`space-y-3 ${highlightedElement === 'bulk-import-form' ? 'ring-4 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''}`}
              >
                <Label htmlFor="demo-excel-file">Excelファイルを選択</Label>
                <input
                  id="demo-excel-file"
                  type="file"
                  accept=".xlsx"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-[#5b5fff] file:text-white"
                  readOnly
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] text-white hover:from-[#5b5fff]/90 hover:to-[#7b7bff]/90"
                onClick={() => onElementClick?.('bulk-import-form')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Excelを読み込み
              </Button>
            </div>
          </Card>
          {/* 読み込み結果・プレビュー（実物に近い） */}
          <Card className="p-6" data-guide="bulk-import-preview">
            <div className={`space-y-4 ${highlightedElement === 'bulk-import-preview' ? 'ring-4 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''}`}>
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-600">読み込み成功</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">案件</p>
                  <p className="text-2xl">1</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">セグメント</p>
                  <p className="text-2xl">2</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">地点</p>
                  <p className="text-2xl">5</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">読み込み内容を確認してから一括登録を実行してください</p>
            </div>
          </Card>
          <Button
            data-guide="bulk-import-submit"
            className={`w-full bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] text-white ${highlightedElement === 'bulk-import-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
            onClick={() => onElementClick?.('bulk-import-submit')}
          >
            一括登録を実行
          </Button>
        </div>
      </div>
    );
  }

  // 案件詳細デモ（セグメント・地点のガイド用）- 実物のProjectDetailに合わせたタブ・レイアウト
  if (type === 'project-detail') {
    return (
      <div className="w-full h-full bg-[#f5f5ff] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <button type="button" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> 案件一覧へ
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">サンプル案件</h2>
            <p className="text-sm text-gray-500 mt-1">基本情報と配信設定を確認できます</p>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'segments' | 'pois')} className="w-full">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <TabsList className="w-full h-auto p-1.5 bg-[#f5f5ff] border-b border-gray-200 flex gap-1.5 rounded-none">
                <TabsTrigger value="overview" className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">案件概要</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  id="demo-segment-tab"
                  value="segments"
                  data-guide="segment-tab"
                  className={`flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all ${highlightedElement === 'segment-tab' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
                  onClick={() => onElementClick?.('segment-tab')}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">セグメント管理</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">0</Badge>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  id="demo-poi-tab"
                  value="pois"
                  data-guide="poi-tab"
                  className={`flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all ${highlightedElement === 'poi-tab' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
                  onClick={() => onElementClick?.('poi-tab')}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">地点情報</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">0</Badge>
                  </div>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                  <h3 className="text-gray-900 mb-2">案件概要</h3>
                  <p className="text-sm text-gray-500">広告主・訴求内容・配信期間などの基本情報（デモ）</p>
                </div>
              </TabsContent>
              <TabsContent value="segments" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-gray-900 mb-1">セグメント一覧</h3>
                  <p className="text-sm text-gray-500 mb-4">この案件に登録されているセグメントを管理します</p>
                  <Button
                    id="demo-new-segment-button"
                    data-guide="new-segment-button"
                    className={`bg-[#5b5fff] hover:bg-[#4949dd] ${highlightedElement === 'new-segment-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                    onClick={() => { setIsSegmentFormOpen(true); onElementClick?.('new-segment-button'); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新規セグメント追加
                  </Button>
                  {isSegmentFormOpen && (
                    <Card className="p-4 space-y-4 border border-gray-200">
                      <div data-guide="segment-form" className={highlightedElement === 'segment-form' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                        <p className="text-sm text-gray-600">セグメント名・配信媒体・抽出期間などを設定</p>
                      </div>
                      <Button data-guide="segment-submit" className={highlightedElement === 'segment-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''} onClick={() => setIsSegmentFormOpen(false)}>登録</Button>
                    </Card>
                  )}
                  <div data-guide="segment-common-conditions" className={`p-3 rounded-lg border border-gray-200 bg-gray-50 ${highlightedElement === 'segment-common-conditions' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                    セグメント共通条件を設定する
                  </div>
                  <div data-guide="common-conditions-form" className={`p-3 rounded-lg border border-gray-200 bg-gray-50 ${highlightedElement === 'common-conditions-form' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                    指定半径・抽出期間・属性など
                  </div>
                  <Button data-guide="common-conditions-save" variant="outline">条件を保存</Button>
                </div>
              </TabsContent>
              <TabsContent value="pois" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-gray-900 mb-1">地点情報一覧</h3>
                  <p className="text-sm text-gray-500 mb-4">登録されている地点を確認・編集できます</p>
                  <Button
                    id="demo-new-poi-button"
                    data-guide="new-poi-button"
                    className={`bg-[#5b5fff] hover:bg-[#4949dd] ${highlightedElement === 'new-poi-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                    onClick={() => { setIsPoiFormOpen(true); onElementClick?.('new-poi-button'); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    地点を追加
                  </Button>
                  {isPoiFormOpen && (
                    <Card className="p-4 space-y-4 border border-gray-200">
                      <div data-guide="poi-type-select" className={highlightedElement === 'poi-type-select' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                        地点タイプ（TG地点 / 来店計測地点）を選択
                      </div>
                      <div data-guide="poi-form" className={highlightedElement === 'poi-form' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded' : ''}>
                        地点名・住所・指定半径などを入力
                      </div>
                      <Button data-guide="poi-submit" className={highlightedElement === 'poi-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''} onClick={() => setIsPoiFormOpen(false)}>登録</Button>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
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

            {/* デモ用のフォーム（実物のProjectFormに合わせたレイアウト） */}
            {isFormOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200" data-guide="project-form">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div>
                      <h2 className="text-gray-900">新規案件登録</h2>
                      <p className="text-muted-foreground mt-0.5">案件の基本情報を入力してください</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="hover:bg-gray-200">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div 
                    id="demo-project-form"
                    className={`flex-1 overflow-y-auto p-6 space-y-6 ${
                      highlightedElement === 'project-form' ? 'ring-4 ring-blue-400 ring-offset-2 rounded-lg' : ''
                    }`}
                  >
                    <div className="space-y-4">
                      <h3 className="text-gray-900 pb-2 border-b border-gray-200">基本情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>広告主法人名 <span className="text-red-500">*</span></Label>
                          <Input placeholder="株式会社〇〇" className="bg-white" readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>代理店名</Label>
                          <Input placeholder="代理店名" className="bg-white" readOnly />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>訴求内容 <span className="text-red-500">*</span></Label>
                        <Input placeholder="広告で訴求する内容を入力してください" className="bg-white" readOnly />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-gray-900 pb-2 border-b border-gray-200">UNIVERSEサービス情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>UNIVERSEサービスID</Label>
                          <Input placeholder="サービスID" className="bg-white" readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>UNIVERSEサービス名</Label>
                          <Input placeholder="サービス名" className="bg-white" readOnly />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-gray-900 pb-2 border-b border-gray-200">配信情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>配信開始日 <span className="text-red-500">*</span></Label>
                          <Input placeholder="開始日を選択" className="bg-white" readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>配信終了日 <span className="text-red-500">*</span></Label>
                          <Input placeholder="終了日を選択" className="bg-white" readOnly />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-gray-900 pb-2 border-b border-gray-200">その他情報</h3>
                      <div className="space-y-2">
                        <Label>副担当者</Label>
                        <Input placeholder="副担当者名を入力" className="bg-white" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>備考</Label>
                        <Input placeholder="特記事項、注意点など" className="bg-white" readOnly />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="min-w-[100px] border-gray-200">キャンセル</Button>
                    <Button 
                      id="demo-project-submit"
                      data-guide="project-submit"
                      className={`bg-primary hover:bg-primary/90 min-w-[120px] ${highlightedElement === 'project-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                      onClick={() => { onElementClick?.('project-submit'); setIsFormOpen(false); }}
                    >
                      登録
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* デモ用の一括登録（実物のBulkImportモーダルに合わせたレイアウト） */}
            {isBulkImportOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl">案件・セグメント・地点の一括登録</h2>
                    <button type="button" onClick={() => setIsBulkImportOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Excelファイルの構成</p>
                          <p className="text-blue-800 mt-1">①入力ガイド ②案件情報 ③セグメント・TG地点 ④来店計測地点</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-[#5b5fff]" />
                        <h3 className="font-medium">テンプレートをダウンロード</h3>
                      </div>
                      <Button variant="outline" className="flex items-center gap-2 border border-gray-300 text-blue-600">
                        <Download className="w-4 h-4" />
                        Excelテンプレートをダウンロード
                      </Button>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="w-5 h-5 text-[#5b5fff]" />
                        <h3 className="font-medium">Excelファイルをアップロード</h3>
                      </div>
                      <input type="file" accept=".xlsx" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#5b5fff] file:text-white" readOnly />
                      <Button className="mt-3 w-full bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] text-white">Excelを読み込み</Button>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* サマリーカード（実物と同じ7枚・文言・スタイル） */}
          <div 
            id="demo-summary-cards"
            data-tour="summary-cards"
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5 ${
              highlightedElement === 'summary-cards' ? 'ring-4 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''
            }`}
          >
            {[
              { icon: FileText, title: '担当案件数', value: '6', subtitle: '全案件', bg: 'bg-[#5b5fff]/10', iconColor: 'text-[#5b5fff]' },
              { icon: FileEdit, title: '下書き', value: '1', subtitle: 'セグメント未登録', bg: 'bg-gray-100', iconColor: 'text-gray-600' },
              { icon: AlertTriangle, title: '入力不備あり', value: '2', subtitle: '地点・ID・S-ID未入力', bg: 'bg-orange-50', iconColor: 'text-orange-600' },
              { icon: CheckCircle2, title: '連携依頼待ち', value: '2', subtitle: '入力完了・依頼待ち', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
              { icon: Send, title: '連携依頼済', value: '0', subtitle: 'データ連携依頼中', bg: 'bg-purple-50', iconColor: 'text-purple-600' },
              { icon: CheckCircle2, title: '連携完了', value: '1', subtitle: 'データ連携完了', bg: 'bg-sky-50', iconColor: 'text-sky-600' },
              { icon: AlertTriangle, title: '期限切れ間近', value: '0', subtitle: '有効期限まで1ヶ月以内', bg: 'bg-red-50', iconColor: 'text-red-600' },
            ].map((card, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl text-gray-900 font-semibold">{card.value}</p>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">{card.subtitle}</p>
              </div>
            ))}
          </div>

          {/* 案件テーブル（実物に近いテーブルレイアウト） */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-tour="project-table">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h3 className="text-sm text-gray-700">案件一覧</h3>
                <span className="text-xs text-gray-500">（6件）</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="案件ID、広告主名で検索" className="pl-9 pr-3 w-56 h-8 bg-white border-gray-200 text-sm rounded-md" readOnly />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left">
                    <th className="px-4 py-2 w-12" />
                    <th className="px-4 py-2 text-xs text-gray-600">案件ID</th>
                    <th className="px-4 py-2 text-xs text-gray-600">登録日</th>
                    <th className="px-4 py-2 text-xs text-gray-600">広告主の法人名</th>
                    <th className="px-4 py-2 text-xs text-gray-600">訴求内容</th>
                    <th className="px-4 py-2 text-xs text-gray-600">担当者</th>
                    <th className="px-4 py-2 text-xs text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { id: '0001', date: '2024/10/08', name: '広告主1株式会社', appeal: 'サンプル訴求内容 1...', person: '営業A', status: '下書き' },
                    { id: '0002', date: '2024/10/07', name: '広告主2株式会社', appeal: 'サンプル訴求内容 2...', person: '営業B', status: '連携依頼待ち' },
                    { id: '0003', date: '2024/10/06', name: '広告主3株式会社', appeal: 'サンプル訴求内容 3...', person: '営業A', status: '連携完了' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 w-12" />
                      <td className="px-4 py-3 text-sm text-gray-700">{row.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.appeal}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#5b5fff]/10 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-[#5b5fff]" />
                          </div>
                          <span className="text-sm text-gray-700">{row.person}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border bg-gray-100 text-gray-700">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span>10件表示</span>
              <span>1-6 of 6 items</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
