import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronLeft, ChevronRight, FileText, Upload, Package, MapPin, ArrowLeft, Download, Info, FileEdit, AlertTriangle, AlertCircle, CheckCircle2, Send, Search, User, X, Building2, Calendar, Edit, List, Map, Database, Clock, MessageSquare } from 'lucide-react';
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
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Checkbox } from './ui/checkbox';
import { MEDIA_OPTIONS } from '../types/schema';

/**
 * デモ画面コンポーネント
 * 実際の画面と同じような構造を持つが、独立したコンポーネント
 * 操作ガイドで使用する
 */
export function DemoScreen({ 
  type, 
  highlightedElement, 
  onElementClick,
  selectedStatus 
}: { 
  type: 'projects' | 'project-detail' | 'project-form' | 'bulk-import';
  highlightedElement?: string;
  onElementClick?: (elementId: string) => void;
  /** 案件サマリのカード選択状態（実物のSummaryCardsと同様の見た目用） */
  selectedStatus?: string | null;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'pois' | 'messages'>('overview');
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

  // デモ画面タイプが project-form のときは案件登録フォームを開いた状態で表示
  useEffect(() => {
    if (type === 'project-form') {
      setIsFormOpen(true);
    } else if (type === 'projects') {
      setIsFormOpen(false);
      setIsBulkImportOpen(false);
    } else if (type === 'bulk-import') {
      setIsBulkImportOpen(false);
    }
  }, [type]);

  // 一括登録デモ（実物のBulkImportに合わせたレイアウト・拡大崩れ防止）
  if (type === 'bulk-import') {
    return (
      <div className="w-full min-w-0 h-full bg-[#f5f5ff] p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
        <div className="max-w-4xl mx-auto min-w-0 space-y-6">
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
                  <li><strong>②案件情報</strong>: 案件の基本情報（<span className="text-red-600 font-bold">1案件のみ登録可能</span>）</li>
                  <li><strong>③セグメント・TG地点設定</strong>: セグメント＋TG地点（複数件可）</li>
                  <li><strong>④来店計測地点リスト</strong>: 来店計測地点（複数件可）</li>
                </ul>
                <p className="text-red-600 font-semibold mt-3 border-t border-red-200 pt-2">
                  ⚠️ 複数案件を登録する場合は、案件ごとにExcelファイルを分けてください
                </p>
                <p className="text-blue-700 mt-2">
                  ※ プルダウンで簡単入力。広告主や代理店の方も入力しやすい形式です
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

  // 案件詳細デモ（実物のProjectDetailと同一レイアウト）
  if (type === 'project-detail') {
    // 地点情報タブでは実物同様にTG/来店計測タブ＋セグメントアコーディオンを表示（1件ある想定）
    const showPoiAccordion = activeTab === 'pois';

    return (
      <div className="w-full h-full bg-[#f5f5ff] p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* ヘッダー（実物のProjectDetailと同じ：戻るボタン＋案件名・ID・ステータス・登録日） */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <Button
              variant="outline"
              size="default"
              type="button"
              className="mb-4 border-[#5b5fff]/60 text-[#5b5fff] hover:bg-[#5b5fff]/90 hover:text-white hover:border-[#5b5fff]/90 font-semibold shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              案件一覧に戻る
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-gray-900">サンプル株式会社</h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary">PRJ-0001</Badge>
                <Badge className="inline-flex items-center gap-1 text-xs border bg-blue-50 text-blue-700 border-blue-200">連携依頼待ち</Badge>
              </div>
              <p className="text-muted-foreground">登録日: 2024/10/08 12:00:00</p>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'segments' | 'pois' | 'messages')} className="w-full">
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
                <TabsTrigger
                  value="messages"
                  className="flex-1 py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-[#5b5fff] data-[state=active]:border-2 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">連絡事項</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">0</Badge>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* 案件概要タブ（実物と同じセクション構成） */}
              <TabsContent value="overview" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 mb-1">案件概要</h3>
                        <p className="text-sm text-gray-500">基本情報と配信設定を確認できます</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="space-y-5">
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-[#5b5fff]" />
                        </div>
                        <h4 className="text-gray-900">基本情報</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><p className="text-muted-foreground mb-1 text-sm">広告主法人名</p><p className="text-gray-900">サンプル株式会社</p></div>
                        <div><p className="text-muted-foreground mb-1 text-sm">代理店名</p><p className="text-gray-900">-</p></div>
                        <div><p className="text-muted-foreground mb-1 text-sm">主担当者</p><p className="text-gray-900">-</p></div>
                        <div><p className="text-muted-foreground mb-1 text-sm">副担当者</p><p className="text-gray-900">-</p></div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#5b5fff]" />
                        </div>
                        <h4 className="text-gray-900">訴求内容</h4>
                      </div>
                      <div><p className="text-muted-foreground mb-1 text-sm">訴求ポイント</p><p className="text-gray-900">-</p></div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#5b5fff]" />
                        </div>
                        <h4 className="text-gray-900">UNIVERSEサービス情報</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><p className="text-muted-foreground mb-1 text-sm">サービスID</p><p className="text-gray-900">-</p></div>
                        <div><p className="text-muted-foreground mb-1 text-sm">サービス名</p><p className="text-gray-900">-</p></div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-[#5b5fff]" />
                        </div>
                        <h4 className="text-gray-900">配信情報</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p className="text-muted-foreground mb-1 text-sm">配信開始日</p><p className="text-gray-900">-</p></div>
                        <div><p className="text-muted-foreground mb-1 text-sm">配信終了日</p><p className="text-gray-900">-</p></div>
                      </div>
                    </div>
                    {/* 備考セクション（実物と同じ） */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#5b5fff]/20">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#5b5fff]/15 to-[#5b5fff]/5 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#5b5fff]" />
                        </div>
                        <h4 className="text-gray-900">備考</h4>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1 text-sm">備考・メモ</p>
                        <p className="text-gray-900 whitespace-pre-wrap">-</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* セグメントタブ（実物と同じヘッダー＋SegmentTable空状態／テーブル風） */}
              <TabsContent value="segments" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 mb-1">セグメント一覧</h3>
                        <p className="text-sm text-gray-500">この案件に登録されているセグメントを管理します</p>
                      </div>
                    </div>
                    <Button
                      id="demo-new-segment-button"
                      data-guide="new-segment-button"
                      onClick={() => { setIsSegmentFormOpen(true); onElementClick?.('new-segment-button'); }}
                      className={`bg-[#5b5fff] text-white hover:bg-[#4949dd] h-10 px-6 gap-2 shadow-sm hover:shadow-md transition-all ${highlightedElement === 'new-segment-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                    >
                      <Plus className="w-4 h-4" />
                      新規セグメント追加
                    </Button>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  {/* セグメント登録モーダル（実物のSegmentFormと同じUI） */}
                  {isSegmentFormOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                        data-guide="segment-form"
                      >
                        <div className="flex items-center justify-between p-6 border-b">
                          <h2 className="text-xl">新規セグメント登録</h2>
                          <button
                            type="button"
                            onClick={() => setIsSegmentFormOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className={`p-6 space-y-6 ${highlightedElement === 'segment-form' ? 'ring-2 ring-blue-400 ring-offset-2 rounded-b-lg' : ''}`}>
                          <div>
                            <Label htmlFor="demo_segment_name" className="block mb-2">セグメント名</Label>
                            <Input
                              id="demo_segment_name"
                              type="text"
                              placeholder="例: 東京都内店舗訪問者"
                              className="w-full bg-white"
                              readOnly
                            />
                            <p className="mt-1 text-xs text-gray-500">※ 任意入力。セグメントを識別しやすい名前を付けてください</p>
                          </div>
                          <div>
                            <Label className="block mb-3">配信媒体 <span className="text-red-500">*</span></Label>
                            <div className="space-y-3">
                              {MEDIA_OPTIONS.map((option) => (
                                <div key={option.value} className="flex items-start">
                                  <div className="flex items-center h-5">
                                    <Checkbox id={`demo_media_${option.value}`} className="pointer-events-none" />
                                  </div>
                                  <div className="ml-3">
                                    <label htmlFor={`demo_media_${option.value}`} className="text-sm text-gray-700">
                                      {option.label}
                                    </label>
                                    {option.value === 'tver_ctv' && (
                                      <p className="text-xs text-gray-500 mt-0.5">※ CTV専用セグメントを作成してください</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-sm text-gray-500">少なくとも1つの配信媒体を選択してください</p>
                          </div>
                          <div>
                            <Label htmlFor="demo_ads_account_id" className="block mb-2">AdsアカウントID</Label>
                            <Input
                              id="demo_ads_account_id"
                              type="text"
                              placeholder="例: 17890"
                              className="w-full bg-white"
                              readOnly
                            />
                            <p className="mt-1 text-xs text-gray-500">※ 後から入力することも可能です</p>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start gap-3">
                              <Checkbox id="demo_request_confirmed" className="pointer-events-none mt-0.5" />
                              <div className="flex-1">
                                <label htmlFor="demo_request_confirmed" className="cursor-pointer block">
                                  <span className="text-sm">連携依頼を確定する</span>
                                  <p className="text-xs text-gray-600 mt-1">
                                    チェックすると、管理部に連携依頼が送信されます。地点情報の入力が完了したら、このチェックを入れてください。
                                  </p>
                                </label>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                              <div className="flex items-center gap-2 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-red-600">地点が登録されていません</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-red-600">AdsアカウントIDが未入力です</span>
                              </div>
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                連携依頼を確定するには、上記の条件を満たす必要があります
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsSegmentFormOpen(false)}
                              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              キャンセル
                            </Button>
                            <Button
                              id="demo-segment-submit"
                              data-guide="segment-submit"
                              type="button"
                              className={`flex-1 bg-blue-600 text-white hover:bg-blue-700 ${highlightedElement === 'segment-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                              onClick={() => { setIsSegmentFormOpen(false); onElementClick?.('segment-submit'); }}
                            >
                              登録する
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-900 mb-1">セグメントが登録されていません</p>
                    <p className="text-muted-foreground">「新規セグメント追加」ボタンから登録してください</p>
                  </div>
                </div>
              </TabsContent>

              {/* 地点情報タブ（実物と同じヘッダー＋空状態 or TG/来店計測＋アコーディオン） */}
              <TabsContent value="pois" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#5b5fff] to-[#4949dd] rounded-xl flex items-center justify-center shadow-md">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 mb-1">地点情報一覧</h3>
                        <p className="text-sm text-gray-500">登録されている地点を確認・編集できます</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  {!showPoiAccordion ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-900 font-medium mb-2">セグメントが作成されていません</p>
                      <p className="text-sm text-muted-foreground mb-6">地点を登録するには、まずセグメントを作成する必要があります。</p>
                      <Button onClick={() => setActiveTab('segments')}>セグメントを作成する</Button>
                    </div>
                  ) : (
                    <Tabs defaultValue="tg" className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="justify-start rounded-lg border border-gray-200 bg-white shadow-sm h-auto p-1 gap-1">
                          <TabsTrigger value="tg" className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] font-medium">TG地点 (0)</TabsTrigger>
                          <TabsTrigger value="visit_measurement" className="px-6 py-3 rounded-md border-2 border-transparent data-[state=active]:border-[#5b5fff] data-[state=active]:bg-[#5b5fff]/10 data-[state=active]:text-[#5b5fff] font-medium">来店計測地点 (0)</TabsTrigger>
                        </TabsList>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                          <button className="px-4 py-2 rounded-md text-sm bg-white text-[#5b5fff] shadow-sm flex items-center gap-2"><List className="w-4 h-4" />リスト</button>
                          <button className="px-4 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-2"><Map className="w-4 h-4" />地図</button>
                        </div>
                      </div>
                      <TabsContent value="tg" className="mt-0">
                        <Accordion type="single" collapsible className="space-y-4" defaultValue="demo-seg-1">
                          <AccordionItem value="demo-seg-1" className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#5b5fff]/10">
                                    <Package className="w-5 h-5 text-[#5b5fff]" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="text-base font-medium text-gray-900">サンプルセグメント</h4>
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                      <Badge variant="outline" className="text-[10px] font-mono">SEG-001</Badge>
                                      <Badge className="text-[10px] bg-gray-100 text-gray-600">地点未登録</Badge>
                                      <span className="text-[10px] text-muted-foreground">媒体: UNIVERSE</span>
                                      <span className="text-[10px] text-muted-foreground">TG地点: <span className="font-medium text-gray-900">0件</span></span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 py-6 bg-gray-50/50">
                              <div className="flex items-center justify-end gap-3">
                                <Button
                                  id="demo-new-poi-button"
                                  data-guide="new-poi-button"
                                  size="sm"
                                  onClick={() => { setIsPoiFormOpen(true); onElementClick?.('new-poi-button'); }}
                                  className={`bg-[#5b5fff] text-white hover:bg-[#4949dd] ${highlightedElement === 'new-poi-button' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  地点を追加
                                </Button>
                              </div>
                              {isPoiFormOpen && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                                  <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー（実物のPoiFormと同じグラデーション・タイトル・セグメントID・ステップ） */}
                                    <div className="bg-gradient-to-r from-[#5b5fff] to-[#7b7bff] p-6 text-white">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h2 className="text-2xl mb-2">新規地点登録</h2>
                                          <div className="flex items-center gap-2 text-white/90 text-sm">
                                            <span>セグメントID: SEG-001</span>
                                            <span>(サンプルセグメント)</span>
                                          </div>
                                        </div>
                                        <Button variant="ghost" size="sm" type="button" onClick={() => setIsPoiFormOpen(false)} className="text-white hover:bg-white/20 -mt-2 -mr-2">
                                          <X className="w-5 h-5" />
                                        </Button>
                                      </div>
                                      {/* ステップインジケーター（実物と同じ） */}
                                      <div className="flex items-center gap-4 mt-6">
                                        <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#5b5fff]">
                                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-[#5b5fff] text-white">1</span>
                                          <span>地点情報</span>
                                        </span>
                                        <div className="h-0.5 flex-1 bg-white/30" />
                                        <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white">
                                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-white/30">2</span>
                                          <span>抽出条件</span>
                                        </span>
                                      </div>
                                    </div>
                                    {/* コンテンツ（実物と同じ：登録モード切替＋フォーム） */}
                                    <div className="flex-1 overflow-y-auto">
                                      <div className="p-6 space-y-6">
                                        {/* 登録モード切替（実物と同じ3ボタン） */}
                                        <div data-guide="poi-type-select" className={`grid grid-cols-2 md:grid-cols-3 gap-2 mb-2 ${highlightedElement === 'poi-type-select' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''}`}>
                                          <button type="button" className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md bg-white text-[#5b5fff] shadow-sm border border-[#5b5fff]">
                                            <FileText className="w-4 h-4" />
                                            <span className="hidden sm:inline">表形式コピペ</span>
                                            <span className="sm:hidden">コピペ</span>
                                          </button>
                                          <button type="button" className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                                            <Building2 className="w-4 h-4" />
                                            <span className="hidden sm:inline">都道府県指定</span>
                                            <span className="sm:hidden">都道府県</span>
                                          </button>
                                          <button type="button" className="flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                                            <MapPin className="w-4 h-4" />
                                            <span className="hidden sm:inline">ポリゴン選択</span>
                                            <span className="sm:hidden">ポリゴン</span>
                                          </button>
                                        </div>
                                        <div data-guide="poi-form" className={`space-y-4 ${highlightedElement === 'poi-form' ? 'ring-2 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''}`}>
                                          <div className="space-y-2">
                                            <Label className="text-sm">地点名</Label>
                                            <Input placeholder="例: 〇〇店" className="bg-white" readOnly />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm">住所</Label>
                                            <Input placeholder="住所を入力" className="bg-white" readOnly />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm">指定半径（m）</Label>
                                            <Input placeholder="例: 1000" className="bg-white" readOnly />
                                          </div>
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                          <Button type="button" variant="outline" onClick={() => setIsPoiFormOpen(false)} className="flex-1 border-gray-200">キャンセル</Button>
                                          <Button data-guide="poi-submit" type="button" className={`flex-1 bg-[#5b5fff] text-white hover:bg-[#4949dd] ${highlightedElement === 'poi-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`} onClick={() => { setIsPoiFormOpen(false); onElementClick?.('poi-submit'); }}>登録する</Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </TabsContent>

              {/* 連絡事項タブ（実物と同じタブを追加） */}
              <TabsContent value="messages" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    案件に関する連絡事項はここに表示されます
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  // projects と project-form は同じレイアウト（project-form のときはフォームを開いた状態）
  if (type === 'projects' || type === 'project-form') {
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

            {/* デモ用のフォーム（実物のProjectFormに合わせたレイアウト）※ project-form ステップでは常に表示 */}
            {(type === 'project-form' || isFormOpen) && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200" data-guide="project-form">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div>
                      <h2 className="text-gray-900">新規案件登録</h2>
                      <p className="text-muted-foreground mt-0.5">案件の基本情報を入力してください</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { if (type !== 'project-form') setIsFormOpen(false); }} className="hover:bg-gray-200">
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
                        <Textarea placeholder="広告で訴求する内容を入力してください" rows={3} className="bg-white resize-none" readOnly />
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
                        <Textarea placeholder="特記事項、注意点、連絡事項などを記載してください" rows={4} className="bg-white resize-none" readOnly />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button type="button" variant="outline" onClick={() => { if (type !== 'project-form') setIsFormOpen(false); }} className="min-w-[100px] border-gray-200">キャンセル</Button>
                    <Button 
                      id="demo-project-submit"
                      data-guide="project-submit"
                      className={`bg-primary hover:bg-primary/90 min-w-[120px] ${highlightedElement === 'project-submit' ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
                      onClick={() => { onElementClick?.('project-submit'); setIsFormOpen(false); }}
                    >
                      登録する
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* デモ用の一括登録（実物のBulkImportモーダルに合わせたレイアウト・拡大崩れ防止） */}
            {isBulkImportOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 box-border">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] min-h-0 overflow-hidden flex flex-col border border-gray-200">
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl truncate pr-2">案件・セグメント・地点の一括登録</h2>
                    <button type="button" onClick={() => setIsBulkImportOpen(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6">
                    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 text-sm">
                          <p className="font-medium text-blue-900">Excelファイルの構成</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-800">
                            <li><strong>①入力ガイド</strong>: 使い方の説明</li>
                            <li><strong>②案件情報</strong>: 案件の基本情報（<span className="text-red-600 font-bold">1案件のみ登録可能</span>）</li>
                            <li><strong>③セグメント・TG地点設定</strong>: セグメント＋TG地点（複数件可）</li>
                            <li><strong>④来店計測地点リスト</strong>: 来店計測地点（複数件可）</li>
                          </ul>
                          <p className="text-red-600 font-semibold mt-3 border-t border-red-200 pt-2">⚠️ 複数案件を登録する場合は、案件ごとにExcelファイルを分けてください</p>
                          <p className="text-blue-700 mt-2">※ プルダウンで簡単入力。広告主や代理店の方も入力しやすい形式です</p>
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

          {/* サマリーカード（実物と同じ7枚・文言・スタイル・選択状態・ツールチップ） */}
          <div 
            id="demo-summary-cards"
            data-tour="summary-cards"
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5 ${
              highlightedElement === 'summary-cards' ? 'ring-4 ring-blue-400 ring-offset-2 p-2 rounded-lg' : ''
            }`}
          >
            {[
              { status: 'total' as const, icon: FileText, title: '担当案件数', value: '6', subtitle: '担当', bg: 'bg-[#5b5fff]/10', iconColor: 'text-[#5b5fff]', tooltip: null as string | null },
              { status: 'draft' as const, icon: FileEdit, title: '下書き', value: '1', subtitle: 'セグメント未登録', bg: 'bg-gray-100', iconColor: 'text-gray-600', tooltip: '【下書き】\n・配下のセグメントが未登録（0件）' },
              { status: 'waiting_input' as const, icon: AlertTriangle, title: '入力不備あり', value: '2', subtitle: '地点・ID・S-ID未入力', bg: 'bg-orange-50', iconColor: 'text-orange-600', tooltip: '【入力不備あり】\n・地点未登録\n・アカウントID未入力\n・サービスID未入力\nのいずれかに該当する案件です' },
              { status: 'in_progress' as const, icon: CheckCircle2, title: '連携依頼待ち', value: '2', subtitle: '入力完了・依頼待ち', bg: 'bg-blue-50', iconColor: 'text-blue-600', tooltip: '【進行中（連携依頼待ち）】\n・すべての必須項目が入力されています\n・データ連携の依頼が可能です' },
              { status: 'link_requested' as const, icon: Send, title: '連携依頼済', value: '0', subtitle: 'データ連携依頼中', bg: 'bg-purple-50', iconColor: 'text-purple-600', tooltip: '【データ連携依頼済】\n・データ連携を依頼済み\n・管理部の対応待ちです' },
              { status: 'linked' as const, icon: CheckCircle2, title: '連携完了', value: '1', subtitle: 'データ連携完了', bg: 'bg-sky-50', iconColor: 'text-sky-600', tooltip: '【連携完了】\n・すべてのセグメントのデータ連携が完了しています' },
              { status: 'expiring_soon' as const, icon: AlertTriangle, title: '期限切れ間近', value: '0', subtitle: '有効期限まで1ヶ月以内', bg: 'bg-red-50', iconColor: 'text-red-600', tooltip: '【期限切れ間近】\n・データ連携済みですが、有効期限（連携から6ヶ月）が30日以内に迫っています' },
            ].map((card, index) => {
              const isSelected = selectedStatus === card.status;
              const isAnySelected = selectedStatus && selectedStatus !== 'total';
              const isDimmed = isAnySelected && !isSelected;
              return (
                <div
                  key={index}
                  className={`
                    bg-white p-4 rounded-lg border shadow-sm group relative flex flex-col justify-between min-h-[140px] transition-all duration-200 border-gray-200
                    ${isSelected ? 'ring-2 ring-[#5b5fff] ring-offset-2 border-[#5b5fff] shadow-md transform -translate-y-1' : ''}
                    ${isDimmed ? 'opacity-60' : ''}
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center transition-colors`}>
                        <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-[#5b5fff] text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                      {card.tooltip && !isSelected && (
                        <div className="relative group/tooltip">
                          <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" onClick={(e) => e.stopPropagation()} />
                          <div className="absolute right-0 top-6 hidden group-hover/tooltip:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-pre-line">
                            {card.tooltip}
                            <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs mb-1 transition-colors ${isSelected ? 'text-[#5b5fff] font-medium' : 'text-gray-600'}`}>{card.title}</p>
                    <p className={`text-3xl transition-colors ${isSelected ? 'text-[#5b5fff] font-bold' : 'text-gray-900 font-semibold'}`}>{card.value}</p>
                  </div>
                  <p className={`text-xs truncate transition-colors ${isSelected ? 'text-[#5b5fff]/80' : 'text-gray-500'}`}>{card.subtitle}</p>
                </div>
              );
            })}
          </div>

          {/* 案件テーブル（実物と同じ：Checkbox列・ソート風ヘッダー・自分の案件のみボタン） */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-tour="project-table">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <h3 className="text-sm text-gray-700">案件一覧</h3>
                </div>
                <span className="text-xs text-gray-500">（6件）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="案件ID、広告主名で検索" className="pl-9 pr-3 w-56 h-8 bg-white border-gray-200 text-sm rounded-md" readOnly />
                </div>
                <Button variant="default" size="sm" className="h-8 text-xs px-3 bg-[#5b5fff] hover:bg-[#5b5fff]/90">
                  <User className="w-3 h-3 mr-1" />
                  自分の案件のみ
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left">
                    <th className="px-4 py-2 w-12">
                      <Checkbox className="w-4 h-4" />
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        案件ID
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        登録日
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        広告主の法人名
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        訴求内容
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        担当者
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-gray-600">
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                        Status
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { id: '0001', date: '2024/10/08', name: '広告主1株式会社', appeal: 'サンプル訴求内容 1...', person: '営業A', status: '下書き' },
                    { id: '0002', date: '2024/10/07', name: '広告主2株式会社', appeal: 'サンプル訴求内容 2...', person: '営業B', status: '連携依頼待ち' },
                    { id: '0003', date: '2024/10/06', name: '広告主3株式会社', appeal: 'サンプル訴求内容 3...', person: '営業A', status: '連携完了' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
                        <Checkbox className="w-4 h-4" />
                      </td>
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
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 bg-white" readOnly>
                    <option>10</option>
                    <option>20</option>
                    <option>50</option>
                  </select>
                  <span className="text-xs text-gray-600">Items per page</span>
                </div>
                <div className="text-xs text-gray-600">1-6 of 6 items</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 mr-2">1 of 1 pages</span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-200" disabled><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-200" disabled><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
