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
import { DemoScreen } from './DemoScreen';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

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
        navigateToPage: 'projects', // 案件一覧ページに遷移
        action: async () => {
          // ボタンをクリックしてドロップダウンを開く
          const button = document.querySelector('[data-tour="new-project-button"]') as HTMLElement;
          if (button) {
            button.click();
            // ドロップダウンメニューが表示されるまで待機
            await new Promise(resolve => setTimeout(resolve, 300));
            // 「手動で登録」メニュー項目をクリック
            const menuItem = document.querySelector('.dropdown-menu-item-manual-register') as HTMLElement;
            if (menuItem) {
              menuItem.click();
            } else {
              // セレクタが見つからない場合は、テキストで検索
              const menuItems = document.querySelectorAll('[role="menuitem"]');
              for (const item of menuItems) {
                if (item.textContent?.includes('手動で登録')) {
                  (item as HTMLElement).click();
                  break;
                }
              }
            }
          }
        },
        waitBeforeAction: 500,
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
        navigateToPage: 'projects', // 案件一覧ページに遷移（フォームはモーダルで開く）
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
        action: async () => {
          // 案件一覧が表示されている場合は先頭案件をクリックして詳細画面へ遷移
          const firstRow = document.querySelector('[data-guide="project-row-first"]') as HTMLElement;
          if (firstRow) {
            firstRow.click();
          }
        },
        waitBeforeAction: 300,
      },
      {
        target: '[data-guide="new-segment-button"]',
        title: 'セグメント追加',
        content: '「セグメントを追加」ボタンをクリックして、セグメント登録フォームを開きます。',
        position: 'bottom',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
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
        action: async () => {
          // 案件一覧が表示されている場合は先頭案件をクリックして詳細画面へ遷移
          const firstRow = document.querySelector('[data-guide="project-row-first"]') as HTMLElement;
          if (firstRow) {
            firstRow.click();
          }
        },
        waitBeforeAction: 300,
      },
      {
        target: '[data-guide="new-poi-button"]',
        title: '地点追加',
        content: '「地点を追加」ボタンをクリックして、地点登録フォームを開きます。',
        position: 'bottom',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
      {
        target: '[data-guide="poi-type-select"]',
        title: '地点タイプの選択',
        content: '地点の登録方法を選択します。「地点コピペ」「都道府県・市区町村指定」「PKG指定」の3種類から選べます。',
        position: 'right',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
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
        navigateToPage: 'projects', // 案件一覧ページに遷移
        action: async () => {
          // ボタンをクリックしてドロップダウンを開く
          const button = document.querySelector('[data-tour="new-project-button"]') as HTMLElement;
          if (button) {
            button.click();
            // ドロップダウンメニューが表示されるまで待機
            await new Promise(resolve => setTimeout(resolve, 300));
            // 「一括登録」メニュー項目をクリック
            const menuItems = document.querySelectorAll('[role="menuitem"]');
            for (const item of menuItems) {
              if (item.textContent?.includes('一括登録')) {
                (item as HTMLElement).click();
                break;
              }
            }
          }
        },
        waitBeforeAction: 500,
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
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
        action: async () => {
          // 案件一覧が表示されている場合は先頭案件をクリックして詳細画面へ遷移
          const firstRow = document.querySelector('[data-guide="project-row-first"]') as HTMLElement;
          if (firstRow) {
            firstRow.click();
          }
        },
        waitBeforeAction: 300,
      },
      {
        target: '[data-guide="common-conditions-form"]',
        title: '条件の入力',
        content: '指定半径、抽出期間、属性、滞在時間などの条件を設定します。これらの条件は、このセグメントに追加する地点に自動適用されます。',
        position: 'right',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
      {
        target: '[data-guide="common-conditions-save"]',
        title: '条件の保存',
        content: '条件を設定してセグメントを登録すると、共通条件が保存されます。',
        position: 'top',
        navigateToPage: 'project-detail', // 案件詳細ページに遷移
      },
    ],
  },
];

interface OperationGuideProps {
  isOpen: boolean;
  onClose: () => void;
  guideId?: string; // 特定のガイドを直接開く場合
  onNavigate?: (page: string, projectId?: string) => void; // ページ遷移コールバック
  onOpenForm?: (formType: 'project-form' | 'bulk-import') => void; // フォームを開くコールバック
}

export function OperationGuide({ isOpen, onClose, guideId, onNavigate, onOpenForm }: OperationGuideProps) {
  const [selectedGuide, setSelectedGuide] = useState<OperationGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  // デフォルトはデモモード: 自動で画面を進め、ユーザーは「次へ」のみ操作
  const [useDemoMode, setUseDemoMode] = useState(true);
  const [demoHighlightedElement, setDemoHighlightedElement] = useState<string | undefined>(undefined);
  /** デモ用ポップアップの位置（null のときは中央表示） */
  const [demoPopupPosition, setDemoPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // selectedGuideの最新値を追跡するためのref（onOpenChangeのクロージャ問題を回避）
  const selectedGuideRef = useRef<OperationGuide | null>(null);
  // onNavigateをrefで保持し、effectの依存から外して重複実行を防ぐ
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  // 同一ステップでfindElementを複数回実行しないためのキー
  const completedStepKeyRef = useRef<string | null>(null);

  // selectedGuideのrefを更新
  useEffect(() => {
    selectedGuideRef.current = selectedGuide;
  }, [selectedGuide]);

  // ガイドを閉じたときにポップアップ位置をリセット
  useEffect(() => {
    if (!isOpen) setDemoPopupPosition(null);
  }, [isOpen]);

  // デバッグログ
  useEffect(() => {
    console.log('[OperationGuide] Props changed:', {
      isOpen,
      guideId,
      hasOnNavigate: !!onNavigate,
      hasOnOpenForm: !!onOpenForm,
      selectedGuide: selectedGuide?.id,
      currentStep
    });
  }, [isOpen, guideId, onNavigate, onOpenForm, selectedGuide, currentStep]);

  // 特定のガイドIDが指定されている場合は自動選択
  useEffect(() => {
    if (isOpen && guideId && onNavigate) {
      const guide = operationGuides.find(g => g.id === guideId);
      if (guide) {
        // 最初のステップのページに遷移（selectedGuideを設定する前に実行）
        const firstStep = guide.steps[0];
        if (firstStep?.navigateToPage) {
          console.log('[OperationGuide] Guide ID specified, navigating to:', firstStep.navigateToPage, 'projectId:', firstStep.navigateToProjectId);
          onNavigate(firstStep.navigateToPage, firstStep.navigateToProjectId);
        }
        setSelectedGuide(guide);
        setCurrentStep(0);
      }
    } else if (isOpen && !guideId) {
      // ガイドIDが指定されていない場合は選択画面を表示
      // 既にselectedGuideが設定されている場合はリセットしない（ガイド実行中の場合）
      if (!selectedGuide) {
        setSelectedGuide(null);
        setCurrentStep(0);
      }
    }
  }, [isOpen, guideId, onNavigate]);

  // ステップの実行（デモ画面モード）
  useEffect(() => {
    if (!isOpen || !selectedGuide || !useDemoMode) return;

    const step = selectedGuide.steps[currentStep];
    if (!step) {
      // ガイド完了
      handleComplete();
      return;
    }

    // デモ画面モードでは、要素を探す代わりにデモ画面内の要素をハイライト
    const executeDemoStep = async () => {
      console.log('[OperationGuide] Executing demo step:', step.title);
      
      // デモ画面内の要素IDを取得（targetから変換）
      let demoElementId: string | undefined;
      if (step.target === '[data-tour="new-project-button"]') {
        demoElementId = 'new-project-button';
      } else if (step.target === '[data-tour="summary-cards"]') {
        demoElementId = 'summary-cards';
      } else if (step.target === '[data-guide="project-form"]') {
        demoElementId = 'project-form';
      } else if (step.target === '[data-guide="project-submit"]') {
        demoElementId = 'project-submit';
      } else if (step.target.includes('manual-register')) {
        demoElementId = 'manual-register';
      } else if (step.target.includes('bulk-import')) {
        const dataGuideMatch = step.target.match(/data-guide="([^"]+)"/);
        demoElementId = dataGuideMatch ? dataGuideMatch[1] : 'bulk-import-form';
      } else {
        // data-guide="xxx" 形式はそのままIDとして使用（案件詳細デモ用）
        const dataGuideMatch = step.target.match(/data-guide="([^"]+)"/);
        if (dataGuideMatch) {
          demoElementId = dataGuideMatch[1];
        }
      }

      // デモ画面の要素をハイライト
      if (demoElementId) {
        setDemoHighlightedElement(demoElementId);
      }

      // 自動操作がある場合は実行（デモ画面内でシミュレート）
      // デモ画面モードでは、実際のDOM操作は行わず、デモ画面内の要素をクリックするだけ
      if (step.action && demoElementId) {
        setIsExecutingAction(true);
        try {
          if (step.waitBeforeAction) {
            await new Promise(resolve => setTimeout(resolve, step.waitBeforeAction));
          }
          console.log('[OperationGuide] Simulating demo action for step:', step.title);
          // デモ画面内の要素クリックをシミュレート（実際のDOM操作は行わない）
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('[OperationGuide] Demo action completed for step:', step.title);
        } catch (error) {
          console.error('[OperationGuide] Demo action execution error:', error);
        } finally {
          setIsExecutingAction(false);
        }
      }
    };

    const timer = setTimeout(executeDemoStep, 300);
    return () => clearTimeout(timer);
  }, [isOpen, selectedGuide, currentStep, useDemoMode]);

  // ステップの実行（通常モード - 実際の画面で動作）
  useEffect(() => {
    console.log('[OperationGuide] Step execution effect triggered:', {
      isOpen,
      hasSelectedGuide: !!selectedGuide,
      hasOnNavigate: !!onNavigate,
      currentStep,
      selectedGuideId: selectedGuide?.id,
      useDemoMode,
      selectedGuideSteps: selectedGuide?.steps.length
    });
    
    if (!isOpen || !selectedGuide || !onNavigateRef.current || useDemoMode) {
      if (useDemoMode) {
        console.log('[OperationGuide] Skipping real mode - using demo mode');
      } else {
        console.warn('[OperationGuide] Step execution skipped:', {
          isOpen,
          hasSelectedGuide: !!selectedGuide,
          hasOnNavigate: !!onNavigateRef.current,
          useDemoMode
        });
      }
      return;
    }

    const step = selectedGuide.steps[currentStep];
    if (!step) {
      console.log('[OperationGuide] No step found at index:', currentStep, 'total steps:', selectedGuide.steps.length);
      // ガイド完了
      if (currentStep >= selectedGuide.steps.length) {
        handleComplete();
      }
      return;
    }

    console.log('[OperationGuide] Starting step execution:', {
      stepTitle: step.title,
      stepTarget: step.target,
      currentStep,
      totalSteps: selectedGuide.steps.length
    });

    const findElement = async () => {
      // まず、ページ遷移が必要な場合は遷移する
      if (step.navigateToPage) {
        console.log('[OperationGuide] Navigating to page:', step.navigateToPage, 'projectId:', step.navigateToProjectId);
        onNavigateRef.current?.(step.navigateToPage, step.navigateToProjectId);
        // 初回ステップは描画待ちを長めに（案件一覧のヘッダーがDOMに出るまで）
        const waitMs = currentStep === 0 ? 3000 : 2000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      
      // SummaryCardsコンポーネントの初期化を待つ（data-tour="summary-cards"の場合）
      if (step.target === '[data-tour="summary-cards"]') {
        let checkCount = 0;
        const maxChecks = 30;
        while (checkCount < maxChecks) {
          const summaryCardsContainer = document.querySelector('[data-tour="summary-cards"]') as HTMLElement;
          if (summaryCardsContainer && !summaryCardsContainer.textContent?.includes('読み込み中')) {
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
          }
          checkCount++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // 要素を探す（複数回リトライ + フォールバック）
      const tryFind = (): HTMLElement | null => {
        let el = document.querySelector(step.target) as HTMLElement;
        if (el) return el;
        if (step.target.startsWith('#') && step.target.length > 1) {
          el = document.getElementById(step.target.substring(1)) as HTMLElement;
          if (el) return el;
        }
        if (step.target.includes('data-')) {
          const attributeMatch = step.target.match(/\[([^\]]+)\]/);
          if (attributeMatch) {
            const [attrName, attrValue] = attributeMatch[1].split('=');
            if (attrValue) {
              const value = attrValue.replace(/['"]/g, '');
              el = document.querySelector(`[${attrName}="${value}"]`) as HTMLElement;
            } else {
              el = document.querySelector(`[${attrName}]`) as HTMLElement;
            }
            if (el) return el;
          }
        }
        // よく使うターゲットのフォールバック（テキストやroleで検索）
        if (step.target.includes('new-project-button')) {
          el = document.querySelector('button[data-tour="new-project-button"]') as HTMLElement;
          if (el) return el;
          const buttons = Array.from(document.querySelectorAll('button'));
          el = (buttons.find(b => b.textContent?.includes('案件の新規依頼') || b.textContent?.includes('新規依頼')) as HTMLElement) ?? null;
          if (el) return el;
        }
        if (step.target.includes('project-form')) {
          el = document.querySelector('[data-guide="project-form"]') as HTMLElement;
          if (el) return el;
        }
        if (step.target.includes('project-submit')) {
          el = document.querySelector('[data-guide="project-submit"]') as HTMLElement;
          if (el) return el;
        }
        return null;
      };
      
      let element: HTMLElement | null = null;
      let retryCount = 0;
      const maxRetries = 50;
      
      while (!element && retryCount < maxRetries) {
        element = tryFind();
        if (!element) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (element) {
        // 要素が見つかった場合、スクロールして表示
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // スクロール完了を待つ
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setTargetElement(element);
        
        // 自動操作がある場合は実行
        if (step.action) {
          setIsExecutingAction(true);
          try {
            if (step.waitBeforeAction) {
              await new Promise(resolve => setTimeout(resolve, step.waitBeforeAction));
            }
            console.log('[OperationGuide] Executing action for step:', step.title);
            await step.action();
            console.log('[OperationGuide] Action completed for step:', step.title);
          } catch (error) {
            console.error('[OperationGuide] Action execution error:', error);
          } finally {
            setIsExecutingAction(false);
          }
        }
      } else {
        console.warn(`[OperationGuide] Guide target not found after ${maxRetries} retries: ${step.target}`);
        // 要素が見つからない場合でも、ツールチップを表示してユーザーに通知
        // 画面中央にツールチップを表示
        setTargetElement(null);
        setTooltipPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        
        // ユーザーが手動で次のステップに進めるように、少し待ってから次のステップに進むオプションを表示
        // ただし、自動的には進まない（ユーザーが「次へ」ボタンをクリックするまで待つ）
      }
    };

    // 同一ステップでfindElementを繰り返し実行しない（親の再レンダーでeffectが再実行されるのを防ぐ）
    const stepKey = `${selectedGuide.id}-${currentStep}`;
    const delay = currentStep === 0 ? 1000 : 500;
    const timer = setTimeout(() => {
      if (completedStepKeyRef.current === stepKey) {
        console.log('[OperationGuide] Skipping duplicate findElement for step:', stepKey);
        return;
      }
      completedStepKeyRef.current = stepKey;
      console.log('[OperationGuide] Starting findElement after delay:', delay);
      findElement();
    }, delay);
    return () => {
      console.log('[OperationGuide] Cleaning up step execution effect');
      clearTimeout(timer);
    };
  }, [isOpen, selectedGuide, currentStep, useDemoMode]);

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
    console.log('[OperationGuide] Guide completed');
    setSelectedGuide(null);
    setCurrentStep(0);
    setTargetElement(null);
    setTooltipPosition(null);
    selectedGuideRef.current = null;
    onClose();
  };

  const handleSelectGuide = async (guide: OperationGuide) => {
    console.log('[OperationGuide] Guide selected:', guide.id, 'hasOnNavigate:', !!onNavigate);
    // 最初のステップのページに遷移（selectedGuideを設定する前に実行）
    const firstStep = guide.steps[0];
    if (firstStep?.navigateToPage && onNavigate) {
      console.log('[OperationGuide] Selecting guide, navigating to:', firstStep.navigateToPage, 'projectId:', firstStep.navigateToProjectId);
      onNavigate(firstStep.navigateToPage, firstStep.navigateToProjectId);
      // ページ遷移が完了するまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.warn('[OperationGuide] Cannot navigate - firstStep:', firstStep, 'hasOnNavigate:', !!onNavigate);
    }
    // selectedGuideを設定（これによりDialogが閉じられ、ガイド実行画面に切り替わる）
    // refも同時に更新して、onOpenChangeが最新の値を参照できるようにする
    selectedGuideRef.current = guide;
    setSelectedGuide(guide);
    setCurrentStep(0);
    console.log('[OperationGuide] Guide set, selectedGuide:', guide.id, 'currentStep:', 0);
  };

  /** デモ用ポップアップをドラッグ */
  const handleDemoPopupMouseDown = (e: React.MouseEvent) => {
    if (!tooltipRef.current || e.button !== 0) return;
    e.preventDefault();
    const rect = tooltipRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = demoPopupPosition?.x ?? rect.left;
    const startTop = demoPopupPosition?.y ?? rect.top;
    const onMove = (e2: MouseEvent) => {
      setDemoPopupPosition({
        x: startLeft + e2.clientX - startX,
        y: startTop + e2.clientY - startY,
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (!isOpen) return null;

  // ガイド選択画面
  if (!selectedGuide) {
    return (
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          // ガイド選択中にDialogが閉じられようとした場合のみonCloseを呼ぶ
          // selectedGuideが設定されている場合は閉じない（ガイド実行画面に切り替わるため）
          // refを使用して最新の値を参照（クロージャ問題を回避）
          if (!open && !selectedGuideRef.current) {
            console.log('[OperationGuide] Dialog closing, calling onClose');
            onClose();
          } else if (!open && selectedGuideRef.current) {
            console.log('[OperationGuide] Dialog close prevented - guide is selected:', selectedGuideRef.current.id);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              操作ガイド
            </DialogTitle>
            <DialogDescription>
              各操作の手順をデモ画面で確認できます。ガイドを選択すると自動で画面が進み、「次へ」ボタンでステップを進めます。
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

  // デモモード: 次へ・前へはデモ画面のステップのみ更新（実画面は遷移しない）
  const handleDemoNext = () => {
    if (currentStep >= selectedGuide.steps.length - 1) {
      handleComplete();
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleDemoPrev = () => {
    if (currentStep <= 0) return;
    setCurrentStep(currentStep - 1);
  };

  // デモ画面モードの場合（全ガイドでステップの遷移先に応じたページを表示）
  if (useDemoMode) {
    // デモ画面タイプ: 必ず step.navigateToPage を優先し、同一ページ内のフォーム/一括は target で判定
    let demoScreenType: 'projects' | 'project-detail' | 'project-form' | 'bulk-import' = 'projects';
    if (step.navigateToPage === 'project-detail') {
      demoScreenType = 'project-detail';
    } else if (step.navigateToPage === 'projects') {
      if (step.target === '[data-guide="project-form"]' || step.target === '[data-guide="project-submit"]') {
        demoScreenType = 'project-form';
      } else if (step.target.includes('bulk-import')) {
        demoScreenType = 'bulk-import';
      } else {
        demoScreenType = 'projects';
      }
    } else {
      demoScreenType = 'projects';
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-white flex">
        {/* デモ用サイドバー（実画面と同じ構成でわかりやすく） */}
        <Sidebar
          isCollapsed={false}
          onToggle={() => {}}
          currentPage="projects"
          onPageChange={() => {}}
          unreadCount={0}
        />
        {/* デモ画面メイン（実画面と同じ：ヘッダー + コンテンツ余白） */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            currentPage="projects"
            editRequests={[]}
            onOpenHelp={undefined}
          />
          <div className="flex-1 overflow-auto">
            <DemoScreen 
              type={demoScreenType}
              highlightedElement={demoHighlightedElement}
              onElementClick={(elementId) => {
                console.log('[OperationGuide] Demo element clicked:', elementId);
                if (currentStep < selectedGuide.steps.length - 1) {
                  handleDemoNext();
                } else {
                  handleComplete();
                }
              }}
            />
          </div>
        </div>

        {/* ツールチップ（デモ画面モード・ドラッグ可能） */}
        <Card
          ref={tooltipRef}
          className="fixed z-[10000] w-80 p-4 shadow-2xl border border-primary select-none"
          style={
            demoPopupPosition !== null
              ? { left: demoPopupPosition.x, top: demoPopupPosition.y, margin: 0 }
              : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', margin: 0 }
          }
        >
          <div className="flex items-start justify-between mb-2">
            <div
              className="flex-1 cursor-move pr-2"
              onMouseDown={handleDemoPopupMouseDown}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}
              aria-label="ドラッグして位置を移動"
            >
              <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-gray-500">
              {currentStep + 1} / {selectedGuide.steps.length}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDemoPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  前へ
                </Button>
              )}
              {currentStep < selectedGuide.steps.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleDemoNext}
                >
                  次へ
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleComplete}
                >
                  完了
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 通常モード（実際の画面で動作）
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
          className="z-[10000] w-80 p-4 shadow-2xl border border-primary bg-white"
          style={{
            position: 'fixed',
            top: tooltipPosition ? `${tooltipPosition.top}px` : '50%',
            left: tooltipPosition ? `${tooltipPosition.left}px` : '50%',
            margin: 0,
            transform: tooltipPosition ? 'none' : 'translate(-50%, -50%)',
            opacity: 1,
            transition: 'opacity 0.2s',
            pointerEvents: 'auto',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
                {!targetElement && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ 対象の要素が見つかりませんでした。手動で操作してください。
                  </p>
                )}
              </div>
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
