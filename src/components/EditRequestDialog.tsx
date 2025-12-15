import { Calendar, AlertCircle } from 'lucide-react';
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
import { Segment } from '../types/schema';

interface EditRequestDialogProps {
  segment: Segment | null;
  onConfirm: (segment: Segment) => void;
  onCancel: () => void;
}

export function EditRequestDialog({ segment, onConfirm, onCancel }: EditRequestDialogProps) {
  if (!segment) return null;

  // 配信媒体名を取得
  const getMediaLabels = (mediaId: string | string[]) => {
    const mediaMap: { [key: string]: string } = {
      'universe': 'UNIVERSE',
      'tver_sp': 'TVer(SP)',
      'tver_ctv': 'TVer(CTV)',
    };
    const mediaIds = Array.isArray(mediaId) ? mediaId : [mediaId];
    return mediaIds.map(id => mediaMap[id] || id).join('、');
  };

  return (
    <AlertDialog open={segment !== null} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <AlertDialogTitle>セグメント編集依頼</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>以下のセグメントの編集依頼を送信します。</div>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">セグメントID:</span>
                  <span className="font-medium text-gray-900">{segment.segment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">配信媒体:</span>
                  <span className="font-medium text-gray-900">{getMediaLabels(segment.media_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">現在のステータス:</span>
                  <span className="font-medium text-gray-900">{segment.data_link_status}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-blue-900">依頼後の処理</div>
                  <div className="text-blue-700 text-xs mt-1">
                    ステータスが「依頼済」に変更され、データ連携依頼日と予定日が自動設定されます。
                    （通常3営業日後に連携予定）
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(segment)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            編集依頼を送信
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
