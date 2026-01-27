import { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

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

    // 初回実行（少し遅延させて確実に位置を取得）
    const initialTimer = setTimeout(updatePosition, 50);
    
    // リサイズとスクロールの監視
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    // MutationObserverで要素の位置変更を監視（親要素のみ）
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

interface TourStep {
  target: string; // 要素のセレクタまたはID
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface UserGuideTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="new-project-button"]',
    title: '案件の新規登録',
    content: 'ここから新しい案件を登録できます。「手動で登録」ではフォームから1件ずつ登録し、「一括登録」ではExcelファイルで案件・セグメント・地点を一度に登録できます。',
    position: 'bottom', // ボタンの下に表示（ボタンを押す前に説明を見せる）
  },
  {
    target: '[data-tour="summary-cards"]',
    title: '案件サマリー',
    content: '案件のステータス別の件数が一目で確認できます。カードをクリックすると、該当するステータスの案件のみを表示できます。',
    position: 'bottom', // カードの下に表示（カードを見ながら説明を読める）
  },
  {
    target: '[data-tour="project-table"]',
    title: '案件一覧',
    content: '登録されている案件の一覧を確認できます。案件をクリックすると詳細画面が開き、セグメントや地点の管理ができます。検索やフィルター機能も利用できます。',
    position: 'right', // テーブルの右側に表示（テーブルを見ながら説明を読める）
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'サイドバー',
    content: '各種機能にアクセスできます。「案件管理」で案件一覧を表示し、「お知らせ」で管理部からの連絡事項を確認できます。',
    position: 'right', // サイドバーの右側に表示（サイドバーを見ながら説明を読める）
  },
];

export function UserGuideTour({ isOpen, onClose, onComplete }: UserGuideTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const step = tourSteps[currentStep];
    if (!step) {
      onComplete();
      return;
    }

    // 要素を探す（少し待ってから探す）
    const findElement = async () => {
      // SummaryCardsコンポーネントの初期化を待つ（data-tour="summary-cards"の場合）
      if (step.target === '[data-tour="summary-cards"]') {
        // SummaryCardsが完全にレンダリングされるまで待つ
        let checkCount = 0;
        const maxChecks = 20;
        while (checkCount < maxChecks) {
          const summaryCardsContainer = document.querySelector('[data-tour="summary-cards"]') as HTMLElement;
          // SummaryCardsがレンダリングされ、かつ「読み込み中...」が表示されていないことを確認
          if (summaryCardsContainer && !summaryCardsContainer.textContent?.includes('読み込み中')) {
            // さらに少し待機してモジュールの初期化を確実にする
            await new Promise(resolve => setTimeout(resolve, 300));
            break;
          }
          checkCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        // スクロールして要素を表示
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // スクロール完了後に要素を設定（位置更新を確実にする）
        setTimeout(() => {
          setTargetElement(element);
        }, 500); // scrollIntoViewのアニメーション完了を待つ
      } else {
        // 要素が見つからない場合は次のステップへ
        console.warn(`Tour target not found: ${step.target}`);
        if (currentStep < tourSteps.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 500);
        } else {
          onComplete();
        }
      }
    };

    const timer = setTimeout(() => {
      findElement();
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, onComplete]);

  useEffect(() => {
    if (!targetElement) {
      setTooltipPosition(null);
      return;
    }
    
    // tooltipRefが設定されるまで待つ
    let checkCount = 0;
    const maxChecks = 20; // 最大20回（約1秒）
    
    const checkAndUpdate = () => {
      if (tooltipRef.current) {
        // tooltipRefが設定されたら位置更新を開始
        if (import.meta.env.DEV) {
          console.log('📍 Position update effect triggered:', {
            hasTargetElement: !!targetElement,
            hasTooltipRef: !!tooltipRef.current,
            currentStep,
            targetSelector: tourSteps[currentStep]?.target,
          });
        }
        // 位置更新を強制的に実行
        setTimeout(() => {
          if (tooltipRef.current) {
            // 位置更新処理を直接実行
            const rect = targetElement.getBoundingClientRect();
            const tooltip = tooltipRef.current;
            if (tooltip) {
              const tooltipRect = tooltip.getBoundingClientRect();
              const tooltipWidth = tooltipRect.width > 0 ? tooltipRect.width : 256;
              const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 200;
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const padding = 16;
              const gap = 12;
              
              const elementBottom = rect.bottom;
              const elementCenterX = rect.left + rect.width / 2;
              
              let top = elementBottom + gap;
              let left = Math.max(padding, Math.min(
                elementCenterX - tooltipWidth / 2,
                viewportWidth - tooltipWidth - padding
              ));
              
              top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
              left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
              
              setTooltipPosition({ top, left });
              
              if (import.meta.env.DEV) {
                console.log('✅ Initial position set:', { top, left });
              }
            }
          }
        }, 100);
        return;
      }
      
      checkCount++;
      if (checkCount < maxChecks) {
        setTimeout(checkAndUpdate, 50);
      } else {
        if (import.meta.env.DEV) {
          console.warn('⚠️ tooltipRef was not set after 1 second');
        }
      }
    };
    
    checkAndUpdate();
  }, [targetElement, currentStep]);
  
  useEffect(() => {
    if (!targetElement || !tooltipRef.current) {
      return;
    }

    const updateTooltipPosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!tooltip) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Tooltip ref is not available');
        }
        return;
      }
      
      if (import.meta.env.DEV) {
        console.log('🔄 Updating tooltip position...', {
          targetElement: !!targetElement,
          tooltip: !!tooltip,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      }

      // ツールチップの実際のサイズを取得（レンダリング後に再計算）
      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width > 0 ? tooltipRect.width : 256; // フォールバック値
      const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 200; // フォールバック値
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const gap = 12; // 要素とポップアップの間隔
      
      // 要素の位置を正確に取得（スクロール位置を考慮）
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const elementLeft = rect.left;
      const elementRight = rect.right;
      const elementCenterX = rect.left + rect.width / 2;
      const elementCenterY = rect.top + rect.height / 2;

      let top = 0;
      let left = 0;

      // ステップの指定位置を優先し、スペースがない場合は代替位置を選択
      const step = tourSteps[currentStep];
      const preferredPosition = step.position || 'bottom';
      const minSpace = 120; // 最小限のスペース（ツールチップの高さを考慮）
      const spaceBelow = viewportHeight - elementBottom - padding;
      const spaceRight = viewportWidth - elementRight - padding;
      const spaceLeft = elementLeft - padding;
      const spaceAbove = elementTop - padding;

      // 指定された位置に十分なスペースがあるか確認
      const canPlaceAtPreferred = 
        (preferredPosition === 'bottom' && spaceBelow >= tooltipHeight + gap) ||
        (preferredPosition === 'right' && spaceRight >= tooltipWidth + gap) ||
        (preferredPosition === 'left' && spaceLeft >= tooltipWidth + gap) ||
        (preferredPosition === 'top' && spaceAbove >= tooltipHeight + gap);

      if (canPlaceAtPreferred) {
        // 指定位置に配置
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
      } else {
        // 指定位置にスペースがない場合は代替位置を選択（優先順位: 下 > 右 > 左 > 上）
        if (spaceBelow >= tooltipHeight + gap) {
          top = elementBottom + gap;
          left = Math.max(padding, Math.min(
            elementCenterX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - padding
          ));
        } else if (spaceRight >= tooltipWidth + gap) {
          left = elementRight + gap;
          top = Math.max(padding, Math.min(
            elementCenterY - tooltipHeight / 2,
            viewportHeight - tooltipHeight - padding
          ));
        } else if (spaceLeft >= tooltipWidth + gap) {
          left = elementLeft - tooltipWidth - gap;
          top = Math.max(padding, Math.min(
            elementCenterY - tooltipHeight / 2,
            viewportHeight - tooltipHeight - padding
          ));
        } else if (spaceAbove >= tooltipHeight + gap) {
          top = elementTop - tooltipHeight - gap;
          left = Math.max(padding, Math.min(
            elementCenterX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - padding
          ));
        } else {
          // どの方向にもスペースがない場合は要素の直下に強制的に配置
          top = Math.max(padding, Math.min(elementBottom + gap, viewportHeight - tooltipHeight - padding));
          left = Math.max(padding, Math.min(
            elementCenterX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - padding
          ));
        }
      }

      // 画面外にはみ出さないように最終調整
      top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
      left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

      // 位置をstateに設定（Reactのレンダリングで確実に適用）
      setTooltipPosition({ top, left });
      
      // デバッグ用（開発環境のみ）
      if (import.meta.env.DEV) {
        console.log('✅ Tooltip position set:', { top, left });
      }
      
      // デバッグ用（開発環境のみ）
      if (import.meta.env.DEV) {
        console.log('🔧 Tooltip position updated:', {
          top,
          left,
          tooltipWidth,
          tooltipHeight,
          elementRect: {
            top: elementTop,
            bottom: elementBottom,
            left: elementLeft,
            right: elementRight,
          },
          preferredPosition: step.position,
          currentStep,
        });
      }
    };

    // 初回実行（ツールチップのサイズが確定するまで待つ）
    // 複数のタイミングで位置を更新して確実に反映させる
    const timers: number[] = [];
    
    // 即座に実行（少し遅延させてDOMが確実にレンダリングされるように）
    const immediateUpdate = () => {
      if (import.meta.env.DEV) {
        console.log('🚀 Immediate position update');
      }
      // 少し遅延させてから実行
      setTimeout(() => {
        updateTooltipPosition();
      }, 10);
    };
    immediateUpdate();
    
    // レンダリング後に実行（二重RAFで確実に）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (import.meta.env.DEV) {
          console.log('🎨 RAF position update');
        }
        updateTooltipPosition();
      });
    });
    
    // サイズが確定するまで数回更新
    timers.push(
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 50ms position update');
        updateTooltipPosition();
      }, 50),
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 100ms position update');
        updateTooltipPosition();
      }, 100),
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 200ms position update');
        updateTooltipPosition();
      }, 200),
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 400ms position update');
        updateTooltipPosition();
      }, 400),
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 600ms position update (scroll complete)');
        updateTooltipPosition();
      }, 600), // scrollIntoView完了後にも更新
      setTimeout(() => {
        if (import.meta.env.DEV) console.log('⏰ 1000ms position update (final)');
        updateTooltipPosition();
      }, 1000) // 最終的な位置確認
    );
    
    // リサイズとスクロールの監視
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);
    
    // MutationObserverでツールチップのサイズ変更を監視
    const observer = new MutationObserver(() => {
      updateTooltipPosition();
    });
    
    if (tooltipRef.current) {
      observer.observe(tooltipRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
      observer.disconnect();
    };
  }, [targetElement, currentStep]);

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  if (!step) return null;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTargetElement(null);
      setTooltipPosition(null); // 位置をリセット
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTargetElement(null);
      setTooltipPosition(null); // 位置をリセット
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/20 z-[9998]"
        onClick={handleSkip}
      />

      {/* ハイライト用のマスク */}
      {targetElement && (
        <HighlightMask targetElement={targetElement} />
      )}

      {/* ツールチップ */}
      {targetElement && (
        <Card
          ref={tooltipRef}
          className="z-[10000] w-64 p-4 shadow-2xl border border-primary"
          style={{
            position: 'fixed',
            top: tooltipPosition ? `${tooltipPosition.top}px` : '0px',
            left: tooltipPosition ? `${tooltipPosition.left}px` : '0px',
            margin: 0,
            transform: 'none',
            opacity: 1, // 常に完全に表示
            transition: 'opacity 0.2s',
            pointerEvents: 'auto', // 常にクリック可能
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
              onClick={handleSkip}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentStep + 1} / {tourSteps.length}
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
              >
                {currentStep < tourSteps.length - 1 ? (
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

