import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Database, Download, Upload, Trash2, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { clearAllData, clearDataType, exportData, importData, getDataSize } from '../utils/clearData';
import { bigQueryService } from '../utils/bigquery';
import { Alert, AlertDescription } from './ui/alert';

export function DataManagement() {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'projects' | 'segments' | 'pois' | 'messages' | 'users'>('all');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dataSize, setDataSize] = useState(getDataSize());

  const handleClearData = () => {
    let clearResult;
    
    if (clearType === 'all') {
      clearResult = clearAllData();
    } else {
      clearResult = clearDataType(clearType);
    }

    if (clearResult.success) {
      setResult({
        success: true,
        message: `${clearResult.clearedKeys.length}件のデータを削除しました`,
      });
      // ページをリロードしてデータを反映
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setResult({
        success: false,
        message: `エラーが発生しました: ${clearResult.errors.join(', ')}`,
      });
    }

    setShowClearDialog(false);
  };

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universegeo_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setResult({
      success: true,
      message: 'データをエクスポートしました',
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importResult = importData(content);

        if (importResult.success) {
          setResult({
            success: true,
            message: `${importResult.clearedKeys.length}件のデータをインポートしました`,
          });
          // ページをリロードしてデータを反映
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setResult({
            success: false,
            message: `エラーが発生しました: ${importResult.errors.join(', ')}`,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message: `ファイルの読み込みに失敗しました: ${error}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const openClearDialog = (type: typeof clearType) => {
    setClearType(type);
    setShowClearDialog(true);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getClearTypeLabel = (type: typeof clearType): string => {
    const labels: Record<typeof clearType, string> = {
      all: 'すべてのデータ',
      projects: '案件データ',
      segments: 'セグメントデータ',
      pois: '地点データ',
      messages: 'メッセージデータ',
      users: 'ユーザーデータ',
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-[#5b5fff]" />
        <h2 className="text-2xl font-bold text-gray-900">データ管理</h2>
      </div>

      {/* 警告メッセージ */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>開発環境専用機能</strong><br />
          この機能は開発環境でのみ使用してください。本番環境では使用しないでください。
        </AlertDescription>
      </Alert>

      {/* 結果表示 */}
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* データサイズ表示 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ストレージ使用状況</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">総使用量</span>
            <span className="font-semibold">{formatBytes(dataSize.totalSize)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {Object.keys(dataSize.breakdown).length}件のキーが保存されています
          </div>
        </div>
      </Card>

      {/* データクリア */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          データクリア
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          localStorageに保存されたダミーデータを削除します。この操作は取り消せません。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => openClearDialog('projects')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            案件データを削除
          </Button>

          <Button
            variant="outline"
            onClick={() => openClearDialog('segments')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            セグメントデータを削除
          </Button>

          <Button
            variant="outline"
            onClick={() => openClearDialog('pois')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            地点データを削除
          </Button>

          <Button
            variant="outline"
            onClick={() => openClearDialog('messages')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            メッセージデータを削除
          </Button>

          <Button
            variant="outline"
            onClick={() => openClearDialog('users')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            ユーザーデータを削除
          </Button>

          <Button
            variant="destructive"
            onClick={() => openClearDialog('all')}
            className="justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            すべて削除
          </Button>
        </div>
      </Card>

      {/* デモデータの投入 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#5b5fff]" />
          デモデータの投入
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          開発・テスト用のサンプルデータを投入します。既存のデータは保持されます。
        </p>

        <Button
          variant="outline"
          onClick={() => {
            bigQueryService.seedDemoData();
            setResult({
              success: true,
              message: 'デモデータを投入しました。ページをリロードして確認してください。',
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          デモデータを投入
        </Button>
      </Card>

      {/* データバックアップ・復元 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">データバックアップ・復元</h3>
        <p className="text-sm text-muted-foreground mb-4">
          現在のデータをJSONファイルとしてエクスポート・インポートできます。
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportData}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            インポート
          </Button>

          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
          />
        </div>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              データを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{getClearTypeLabel(clearType)}</strong>を削除します。
              <br />
              この操作は取り消せません。
              {clearType === 'all' && (
                <>
                  <br /><br />
                  <span className="text-red-600 font-semibold">
                    すべてのデータが削除され、ログアウトされます。
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

