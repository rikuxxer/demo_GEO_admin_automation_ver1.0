import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle, Play, BookOpen, FileText, MapPin, Package, Upload, Settings, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// ハイライトマスクコンポーネント
function HighlightMask({ targetElement }: { targetElement: HTMLElement }) {
  const maskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!maskRef.current) return;
      
      const rect = targetElement.getBoundingClientRect();
      maskRef.current.style.top = `${rect.top - 4}px`;
      maskRef.current.style.left = `${rect.left - 4}px`;
      maskRef.current.style.width = `${rect.width + 8}px`;
      maskRef.current.style.height = `${rect.height + 8}px`;
    };

    const initialTimer = setTimeout(updatePosition, 50);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    const parentElement = targetElement.parentElement;
    let observer: MutationObserver | null = null;
    
    if (parentElement) {
      observer = new MutationObserver(updatePosition);
      observer.observe(parentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [targetElement]);

  return (
    <div
      ref={maskRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.15), 0 0 0 3px #5b5fff',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
      }}
    />
  );
}

export interface GuideStep {
  target: string; // 要素のセレクタまたはID
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void | Promise<void>; // 自動操作（オプション）
  waitBeforeAction?: number; // アクション実行前の待機時間（ms）
  navigateToPage?: string; // 要素があるページ（例: 'projects', 'project-detail'）
  navigateToProjectId?: string; // 案件詳細画面に遷移する場合の案件ID
}

export interface OperationGuide {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: GuideStep[];
}

// 操作ガイドの定義
export const operationGuides: OperationGuide[] = [
  {
    id: 'project-registration',
    title: '案件の新規登録',
    description: '案件を手動で登録する方法を説明します',
    icon: FileText,
    steps: [
      {
        target: '[data-tour="new-project-button"]',
        title: '案件登録ボタン',
        content: '「新規案件登録」ボタンをクリックして、案件登録フォームを開きます。',
        position: 'bottom',
      },
      {
        target: '[data-guide="project-form"]',
        title: '案件情報の入力',
        content: '必須項目（広告主法人名、訴求内容、配信開始日・終了日）を入力します。代理店名やUNIVERSEサービスIDは任意です。',
        position: 'right',
        navigateToPage: 'projects', // 案件一覧ページに遷移（フォームはモーダルで開く）
      },
      {
        target: '[data-guide="project-submit"]',
        title: '案件の登録',
        content: '入力内容を確認して「登録」ボタンをクリックします。登録後、案件詳細画面でセグメントや地点を追加できます。',
        position: 'top',
      },
    ],
  },
  {
    id: 'segment-registration',
    title: 'セグメントの登録',
    description: 'セグメントを作成して配信設定を行う方法を説明します',
    icon: Target,
    steps: [
      {
        target: '[data-guide="segment-tab"]',
        title: 'セグメント管理タブ',
        content: '案件詳細画面の「セグメント管理」タブを開きます。',
        position: 'bottom',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移（最初の案件を選択）
      },
      {
        target: '[data-guide="new-segment-button"]',
        title: 'セグメント追加',
        content: '「セグメントを追加」ボタンをクリックして、セグメント登録フォームを開きます。',
        position: 'bottom',
      },
      {
        target: '[data-guide="segment-form"]',
        title: 'セグメント情報の入力',
        content: 'セグメント名、配信媒体、期間、属性、検知条件などを設定します。セグメント共通条件を設定すると、後から追加する地点に自動適用されます。',
        position: 'right',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
      {
        target: '[data-guide="segment-submit"]',
        title: 'セグメントの登録',
        content: '入力内容を確認して「登録」ボタンをクリックします。',
        position: 'top',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
    ],
  },
  {
    id: 'poi-registration',
    title: '地点の登録',
    description: '地点情報を登録する方法を説明します（地点コピペ、都道府県市区町村、PKG）',
    icon: MapPin,
    steps: [
      {
        target: '[data-guide="poi-tab"]',
        title: '地点情報タブ',
        content: '案件詳細画面の「地点情報」タブを開きます。',
        position: 'bottom',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移（最初の案件を選択）
      },
      {
        target: '[data-guide="new-poi-button"]',
        title: '地点追加',
        content: '「地点を追加」ボタンをクリックして、地点登録フォームを開きます。',
        position: 'bottom',
      },
      {
        target: '[data-guide="poi-type-select"]',
        title: '地点タイプの選択',
        content: '地点の登録方法を選択します。「地点コピペ」「都道府県・市区町村指定」「PKG指定」の3種類から選べます。',
        position: 'right',
      },
      {
        target: '[data-guide="poi-form"]',
        title: '地点情報の入力',
        content: '選択したタイプに応じて、住所や都道府県・市区町村、PKG情報を入力します。セグメント共通条件が設定されている場合は自動適用されます。',
        position: 'right',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
      {
        target: '[data-guide="poi-submit"]',
        title: '地点の登録',
        content: '入力内容を確認して「登録」ボタンをクリックします。営業ユーザーの場合、TG地点は自動的にGoogleスプレッドシートに出力されます。',
        position: 'top',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
    ],
  },
  {
    id: 'bulk-import',
    title: 'Excel一括登録',
    description: 'Excelファイルで案件・セグメント・地点を一括登録する方法を説明します',
    icon: Upload,
    steps: [
      {
        target: '[data-tour="new-project-button"]',
        title: '一括登録の開始',
        content: '「新規案件登録」ボタンをクリックし、「一括登録」を選択します。',
        position: 'bottom',
      },
      {
        target: '[data-guide="bulk-import-form"]',
        title: 'Excelファイルのアップロード',
        content: 'テンプレートをダウンロードして、案件・セグメント・地点の情報を入力したExcelファイルをアップロードします。',
        position: 'right',
        navigateToPage: 'projects', // 案件一覧ページに遷移（フォームはモーダルで開く）
      },
      {
        target: '[data-guide="bulk-import-preview"]',
        title: 'データの確認',
        content: 'アップロードしたデータのプレビューを確認し、エラーがないか確認します。エラーがある場合は修正して再アップロードします。',
        position: 'right',
        navigateToPage: 'projects', // 案件一覧ページに遷移（フォームはモーダルで開く）
      },
      {
        target: '[data-guide="bulk-import-submit"]',
        title: '一括登録の実行',
        content: 'データを確認して「一括登録」ボタンをクリックします。登録が完了すると、案件一覧に反映されます。',
        position: 'top',
        navigateToPage: 'projects', // 案件一覧ページに遷移（フォームはモーダルで開く）
      },
    ],
  },
  {
    id: 'segment-common-conditions',
    title: 'セグメント共通条件の設定',
    description: 'セグメント共通条件を設定して、地点に自動適用する方法を説明します',
    icon: Settings,
    steps: [
      {
        target: '[data-guide="segment-common-conditions"]',
        title: '共通条件の設定',
        content: 'セグメント登録フォームで「セグメント共通条件を設定する」にチェックを入れます。',
        position: 'right',
      },
      {
        target: '[data-guide="common-conditions-form"]',
        title: '条件の入力',
        content: '指定半径、抽出期間、属性、滞在時間などの条件を設定します。これらの条件は、このセグメントに追加する地点に自動適用されます。',
        position: 'right',
      },
      {
        target: '[data-guide="common-conditions-save"]',
        title: '条件の保存',
        content: '条件を設定してセグメントを登録すると、共通条件が保存されます。',
        position: 'top',
      },
    ],
  },
];

interface OperationGuideProps {
  isOpen: boolean;
  onClose: () => void;
  guideId?: string; // 特定のガイドを直接開く場合
  onNavigate?: (page: string, projectId?: string) => void; // ページ遷移コールバック
}

export function OperationGuide({ isOpen, onClose, guideId, onNavigate }: OperationGuideProps) {
  const [selectedGuide, setSelectedGuide] = useState<OperationGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 特定のガイドIDが指定されている場合は自動選択
  useEffect(() => {
    if (isOpen && guideId) {
      const guide = operationGuides.find(g => g.id === guideId);
      if (guide) {
        setSelectedGuide(guide);
        setCurrentStep(0);
      }
    } else if (isOpen && !guideId) {
      // ガイドIDが指定されていない場合は選択画面を表示
      setSelectedGuide(null);
      setCurrentStep(0);
    }
  }, [isOpen, guideId]);

  // ステップの実行
  useEffect(() => {
    if (!isOpen || !selectedGuide) return;

    const step = selectedGuide.steps[currentStep];
    if (!step) {
      // ガイド完了
      return;
    }

    const findElement = async () => {
      // まず、ページ遷移が必要な場合は遷移する
      if (step.navigateToPage && onNavigate) {
        onNavigate(step.navigateToPage, step.navigateToProjectId);
        // ページ遷移後に要素が表示されるまで待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 要素を探す（複数回リトライ）
      let element: HTMLElement | null = null;
      let retryCount = 0;
      const maxRetries = 20; // ページ遷移後は少し多めにリトライ
      
      while (!element && retryCount < maxRetries) {
        element = document.querySelector(step.target) as HTMLElement;
        if (!element) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(async () => {
          setTargetElement(element);
          
          // 自動操作がある場合は実行
          if (step.action) {
            setIsExecutingAction(true);
            try {
              if (step.waitBeforeAction) {
                await new Promise(resolve => setTimeout(resolve, step.waitBeforeAction));
              }
              await step.action();
            } catch (error) {
              console.error('Action execution error:', error);
            } finally {
              setIsExecutingAction(false);
            }
          }
        }, 500);
      } else {
        console.warn(`Guide target not found after ${maxRetries} retries: ${step.target}`);
        // 要素が見つからない場合でも、ツールチップを表示してユーザーに通知
        setTargetElement(null);
        // 次のステップに進むか、ガイドを終了
        if (currentStep < selectedGuide.steps.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 1000);
        } else {
          handleComplete();
        }
      }
    };

    const timer = setTimeout(findElement, 300);
    return () => clearTimeout(timer);
  }, [isOpen, selectedGuide, currentStep, onNavigate]);

  // ツールチップの位置更新
  useEffect(() => {
    if (!targetElement || !tooltipRef.current || !selectedGuide) return;

    const updateTooltipPosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      
      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width > 0 ? tooltipRect.width : 320;
      const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const gap = 12;
      
      const step = selectedGuide.steps[currentStep];
      const preferredPosition = step.position || 'bottom';
      
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const elementLeft = rect.left;
      const elementRight = rect.right;
      const elementCenterX = rect.left + rect.width / 2;
      const elementCenterY = rect.top + rect.height / 2;

      let top = 0;
      let left = 0;

      const spaceBelow = viewportHeight - elementBottom - padding;
      const spaceRight = viewportWidth - elementRight - padding;
      const spaceLeft = elementLeft - padding;
      const spaceAbove = elementTop - padding;

      switch (preferredPosition) {
        case 'bottom':
          top = elementBottom + gap;
          left = Math.max(padding, Math.min(
            elementCenterX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - padding
          ));
          break;
        case 'right':
          left = elementRight + gap;
          top = Math.max(padding, Math.min(
            elementCenterY - tooltipHeight / 2,
            viewportHeight - tooltipHeight - padding
          ));
          break;
        case 'left':
          left = elementLeft - tooltipWidth - gap;
          top = Math.max(padding, Math.min(
            elementCenterY - tooltipHeight / 2,
            viewportHeight - tooltipHeight - padding
          ));
          break;
        case 'top':
          top = elementTop - tooltipHeight - gap;
          left = Math.max(padding, Math.min(
            elementCenterX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - padding
          ));
          break;
      }

      top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
      left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

      setTooltipPosition({ top, left });
    };

    const timers: number[] = [];
    timers.push(
      setTimeout(updateTooltipPosition, 10),
      setTimeout(updateTooltipPosition, 50),
      setTimeout(updateTooltipPosition, 100),
      setTimeout(updateTooltipPosition, 200),
      setTimeout(updateTooltipPosition, 500)
    );

    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [targetElement, currentStep, selectedGuide]);

  const handleNext = () => {
    if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTargetElement(null);
      setTooltipPosition(null);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTargetElement(null);
      setTooltipPosition(null);
    }
  };

  const handleComplete = () => {
    setSelectedGuide(null);
    setCurrentStep(0);
    setTargetElement(null);
    setTooltipPosition(null);
    onClose();
  };

  const handleSelectGuide = (guide: OperationGuide) => {
    setSelectedGuide(guide);
    setCurrentStep(0);
    // Dialogを閉じるために少し遅延させる
    setTimeout(() => {
      // Dialogは自動的に閉じられる（selectedGuideが設定されると条件分岐でDialogが表示されなくなる）
    }, 100);
  };

  if (!isOpen) return null;

  // ガイド選択画面
  if (!selectedGuide) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              操作ガイド
            </DialogTitle>
            <DialogDescription>
              各操作の手順を確認できます。ガイドを選択すると、画面の自動操作で説明します。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {operationGuides.map((guide) => {
              const IconComponent = guide.icon;
              return (
                <Card
                  key={guide.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectGuide(guide)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <IconComponent className="w-5 h-5" />
                    </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{guide.title}</h3>
                    <p className="text-xs text-gray-600">{guide.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {guide.steps.length}ステップ
                    </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ガイド実行中
  const step = selectedGuide.steps[currentStep];
  if (!step) {
    handleComplete();
    return null;
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/20 z-[9998]"
        onClick={handleComplete}
      />

      {/* ハイライト用のマスク */}
      {targetElement && (
        <HighlightMask targetElement={targetElement} />
      )}

      {/* ツールチップ */}
      {selectedGuide && (
        <Card
          ref={tooltipRef}
          className="z-[10000] w-80 p-4 shadow-2xl border border-primary"
          style={{
            position: 'fixed',
            top: tooltipPosition ? `${tooltipPosition.top}px` : '50%',
            left: tooltipPosition ? `${tooltipPosition.left}px` : '50%',
            margin: 0,
            transform: tooltipPosition ? 'none' : 'translate(-50%, -50%)',
            opacity: 1,
            transition: 'opacity 0.2s',
            pointerEvents: 'auto',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleComplete}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {!targetElement && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ 対象の要素が見つかりませんでした。ページを確認してください。
            </div>
          )}
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            {step.content}
          </p>

          {isExecutingAction && (
            <div className="mb-3 text-xs text-primary flex items-center gap-2">
              <Play className="w-3 h-3 animate-pulse" />
              自動操作を実行中...
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentStep + 1} / {selectedGuide.steps.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="flex items-center gap-1 h-7 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  前へ
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1 h-7 px-2 text-xs"
                disabled={isExecutingAction}
              >
                {currentStep < selectedGuide.steps.length - 1 ? (
                  <>
                    次へ
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  '完了'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
