import { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, MapPin, Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PoiInfo } from '../types/schema';
import { 
  parseAndValidateExcel, 
  downloadExcelTemplate, 
  downloadErrorReportCSV,
  CSVValidationError 
} from '../utils/csvParser';

interface PoiBulkUploadProps {
  projectId: string;
  segmentId: string;
  onUploadComplete: (pois: Partial<PoiInfo>[]) => void;
  onCancel: () => void;
}

type UploadStep = 'upload' | 'preview';

export function PoiBulkUpload({ projectId, segmentId, onUploadComplete, onCancel }: PoiBulkUploadProps) {
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedPois, setParsedPois] = useState<Partial<PoiInfo>[]>([]);
  const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      // Excelとして処理
      const result = await parseAndValidateExcel(selectedFile, projectId, segmentId, false);
      
      setParsedPois(result.success);
      setValidationErrors(result.errors);
      setTotalRows(result.total);
      
      // データがない場合はエラーメッセージを表示
      if (result.total === 0) {
        alert('ファイルにデータ行が含まれていません。ヘッダー行のみのファイルではないか確認してください。');
        handleReset();
        return;
      }
      
      setStep('preview');
    } catch (error) {
      console.error('File parse error:', error);
      alert(`ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      handleReset();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpload = () => {
    // ジオコーディングは格納依頼時に実行するため、ここでは直接登録
    onUploadComplete(parsedPois);
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParsedPois([]);
    setValidationErrors([]);
    setTotalRows(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-gray-900">地点一括登録</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Excelファイルから複数の地点を一括登録します
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm text-blue-900 mb-2">Excelテンプレート</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      以下のテンプレートをダウンロードして、地点情報を入力してください
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadExcelTemplate('basic')}
                        className="text-blue-600 border border-gray-300 hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4 mr-2 text-blue-600" />
                        基本版テンプレート
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadExcelTemplate('full')}
                        className="text-blue-600 border border-gray-300 hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4 mr-2 text-blue-600" />
                        完全版テンプレート
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 mb-1">Excelファイルをアップロード</p>
                  <p className="text-sm text-muted-foreground">
                    クリックしてファイルを選択 (.xlsx, .xls)
                  </p>
                </label>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">処理中...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-900">総データ数</span>
                  </div>
                  <p className="text-2xl text-blue-700">{totalRows}件</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-900">正常データ</span>
                  </div>
                  <p className="text-2xl text-green-700">{parsedPois.length}件</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-900">エラー</span>
                  </div>
                  <p className="text-2xl text-red-700">{validationErrors.length}件</p>
                </div>
              </div>

              {/* Geocoding Info */}
              {parsedPois.some(poi => 
                (poi.latitude === undefined || poi.longitude === undefined || 
                 poi.latitude === null || poi.longitude === null) && 
                poi.address && poi.address.trim() !== ''
              ) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-900">ジオコーディングについて</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {parsedPois.filter(poi => 
                      (poi.latitude === undefined || poi.longitude === undefined || 
                       poi.latitude === null || poi.longitude === null) && 
                      poi.address && poi.address.trim() !== ''
                    ).length}件の地点で緯度経度が未設定です。格納依頼時に住所から自動取得されます。
                  </p>
                </div>
              )}

              {/* Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm text-red-900">エラー詳細</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadErrorReportCSV(validationErrors)}
                      className="text-red-600 border-red-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      エラーレポート
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-white rounded px-2 py-1">
                        <span className="font-medium">{error.row}行目:</span> [{error.field}] {error.message}
                        {error.value && <span className="text-xs text-red-600 ml-2">(値: {error.value})</span>}
                      </div>
                    ))}
                    {validationErrors.length > 10 && (
                      <div className="text-sm text-red-600 text-center py-2">
                        他 {validationErrors.length - 10} 件のエラーがあります
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {parsedPois.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-900 mb-3">プレビュー（最初の5件）</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs text-gray-500">地点ID</th>
                          <th className="px-4 py-2 text-left text-xs text-gray-500">地点名</th>
                          <th className="px-4 py-2 text-left text-xs text-gray-500">住所</th>
                          <th className="px-4 py-2 text-left text-xs text-gray-500">緯度</th>
                          <th className="px-4 py-2 text-left text-xs text-gray-500">経度</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedPois.slice(0, 5).map((poi, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-600 text-xs font-mono">{poi.location_id || '-'}</td>
                            <td className="px-4 py-2">{poi.poi_name}</td>
                            <td className="px-4 py-2 text-gray-600 text-xs">{poi.address || '-'}</td>
                            <td className="px-4 py-2 text-gray-600 text-xs">
                              {poi.latitude !== undefined && poi.latitude !== null ? poi.latitude : <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">要取得</Badge>}
                            </td>
                            <td className="px-4 py-2 text-gray-600 text-xs">
                              {poi.longitude !== undefined && poi.longitude !== null ? poi.longitude : <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">要取得</Badge>}
                            </td>
                          </tr>
                        ))}
                        {parsedPois.length > 5 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-2 text-center text-xs text-gray-500">
                              他 {parsedPois.length - 5} 件のデータ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  別のファイルを選択
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onCancel}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleConfirmUpload}
                    disabled={parsedPois.length === 0}
                    className="bg-primary text-primary-foreground"
                  >
                    登録する
                  </Button>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}