import { useState } from 'react';
import { Edit, Trash2, AlertCircle, Send, MapPin, Database, Calendar, Clock, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Segment, DATA_LINK_STATUS_OPTIONS, PoiInfo, LOCATION_REQUEST_STATUS_OPTIONS, Project } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { canEditProject } from '../utils/editRequest';
import { formatDateToMMDD } from '../utils/dataCoordinationDate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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

interface SegmentTableProps {
  segments: Segment[];
  pois?: PoiInfo[];
  project: Project;
  onEdit: (segment: Segment) => void;
  onDelete: (segmentId: string) => void;
  onManagePois?: (segment: Segment) => void;
  onDataLinkRequest?: (segment: Segment) => void;
}

export function SegmentTable({ segments, pois = [], project, onEdit, onDelete, onManagePois, onDataLinkRequest }: SegmentTableProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [linkRequestTarget, setLinkRequestTarget] = useState<Segment | null>(null);

  const getPoiCount = (segmentId: string) => {
    return pois.filter(poi => poi.segment_id === segmentId).length;
  };

  const getStatusLabel = (status: string) => {
    const option = DATA_LINK_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'linking':
        return 'bg-blue-100 text-blue-800';
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationStatusLabel = (status: string) => {
    const option = LOCATION_REQUEST_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getLocationStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'storing':
        return 'bg-blue-100 text-blue-700';
      case 'not_requested':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMediaLabel = (mediaId: string | string[]) => {
    const mediaMap: { [key: string]: string } = {
      'universe': 'UNIVERSE',
      'tver_sp': 'TVer(SP)',
      'tver_ctv': 'TVer(CTV)',
    };
    
    if (Array.isArray(mediaId)) {
      return mediaId.map(id => mediaMap[id] || id).join(', ');
    }
    
    return mediaMap[mediaId] || mediaId;
  };



  // 地点データ抽出状況を取得
  const getExtractionStatus = (segment: Segment, poiCount: number) => {
    if (poiCount === 0) {
      return {
        label: '地点未登録',
        color: 'bg-gray-100 text-gray-600',
        icon: '○',
        editable: true,
      };
    } else if (segment.location_request_status === 'not_requested') {
      return {
        label: '地点登録済み（編集可能）',
        color: 'bg-blue-100 text-blue-700',
        icon: '●',
        editable: true,
      };
    } else {
      return {
        label: 'データ抽出依頼（編集不可）',
        color: 'bg-purple-100 text-purple-700',
        icon: '■',
        editable: false,
      };
    }
  };

  // 連携依頼ステータスを取得
  const getLinkStatus = (segment: Segment, poiCount: number) => {
    // アカウントIDがあり、かつ地点データ抽出依頼が完了している場合
    const hasAccountId = !!segment.ads_account_id;
    const isExtractionRequested = segment.location_request_status !== 'not_requested';
    
    if (segment.data_link_status === 'linked') {
      return {
        label: 'データ連携済み',
        color: 'bg-green-100 text-green-700',
        icon: '✓',
      };
    } else if (hasAccountId && isExtractionRequested && segment.data_link_status === 'requested') {
      return {
        label: 'データ連携依頼済',
        color: 'bg-yellow-100 text-yellow-700',
        icon: '⟳',
      };
    } else {
      return {
        label: '-',
        color: 'bg-gray-50 text-gray-400',
        icon: '',
      };
    }
  };

  const handleDelete = (segmentId: string) => {
    onDelete(segmentId);
    setDeleteTarget(null);
  };

  const handleLinkRequest = (segment: Segment) => {
    if (onDataLinkRequest) {
      onDataLinkRequest(segment);
    }
    setLinkRequestTarget(null);
  };

  if (segments.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-900 mb-1">セグメントが登録されていません</p>
        <p className="text-muted-foreground">「新規セグメント追加」ボタンから登録してください</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#5b5fff]/5 to-[#7b7bff]/5 border-y border-[#5b5fff]/20">
            <tr>
              <th className="px-3 py-3 text-left text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="text-[10px]">ID</span>
                </div>
              </th>
              <th className="px-3 py-3 text-left text-muted-foreground text-[11px] whitespace-nowrap">セグメント名</th>
              <th className="px-3 py-3 text-left text-muted-foreground text-[11px] whitespace-nowrap">配信媒体</th>
              <th className="px-3 py-3 text-left text-muted-foreground text-[11px] whitespace-nowrap">登録地点数</th>
              <th className="px-3 py-3 text-left text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span className="text-[10px] whitespace-nowrap">地点データ抽出状況</span>
                </div>
              </th>
              <th className="px-3 py-3 text-left text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] whitespace-nowrap">データ連携目途</span>
                        <Info className="w-2.5 h-2.5 text-[#5b5fff]" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 bg-gray-900 text-white border border-gray-700">
                      <div className="space-y-2">
                        <p className="text-xs text-white font-medium">格納依頼日から自動計算されます</p>
                        <div className="text-xs text-gray-200 space-y-1">
                          <p>• 月・水・金: 当日扱い</p>
                          <p>• 火・木の依頼: +1営業日</p>
                          <p>• 20:00以降の依頼: 翌日扱い</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th className="px-3 py-3 text-left text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] whitespace-nowrap">連携依頼ステータス</span>
                </div>
              </th>
              <th className="px-3 py-3 text-center text-muted-foreground text-[11px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {segments.map((segment) => {
              const poiCount = getPoiCount(segment.segment_id);
              const extractionStatus = getExtractionStatus(segment, poiCount);
              const linkStatus = getLinkStatus(segment, poiCount);
              const canRequestStorage = poiCount > 0 && segment.location_request_status === 'not_requested';

              return (
                <tr key={segment.segment_id} className="hover:bg-[#5b5fff]/5 transition-colors">
                  {/* セグメントID */}
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 font-mono px-2.5 py-1 whitespace-nowrap text-xs">
                      {segment.segment_id}
                    </Badge>
                  </td>

                  {/* セグメント名 */}
                  <td className="px-3 py-3">
                    <div className="max-w-[180px]">
                      {segment.segment_name ? (
                        <span className="text-gray-900 text-xs line-clamp-1">{segment.segment_name}</span>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">未設定</span>
                      )}
                    </div>
                  </td>

                  {/* 配信媒体 */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      {(Array.isArray(segment.media_id) ? segment.media_id : [segment.media_id]).map((media, idx) => {
                        const mediaMap: { [key: string]: string } = {
                          'universe': 'UNIVERSE',
                          'tver_sp': 'TVer(SP)',
                          'tver_ctv': 'TVer(CTV)',
                        };
                        return (
                          <span 
                            key={idx}
                            className="text-xs text-gray-900"
                          >
                            {mediaMap[media] || media}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* 登録地点数 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">{poiCount}</span>
                      <span className="text-xs text-muted-foreground ml-0.5">件</span>
                    </div>
                  </td>

                  {/* 地点データ抽出状況 */}
                  <td className="px-3 py-3">
                    <Badge className={`${extractionStatus.color} border justify-start text-[10px] h-6 px-2`}>
                      <span className="mr-1">{extractionStatus.icon}</span>
                      <span className="whitespace-nowrap">{extractionStatus.label}</span>
                    </Badge>
                  </td>

                  {/* データ連携目途 */}
                  <td className="px-3 py-3">
                    {segment.data_coordination_date ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-900 whitespace-nowrap">{formatDateToMMDD(segment.data_coordination_date)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* 連携依頼ステータス */}
                  <td className="px-3 py-3">
                    <Badge className={`${linkStatus.color} border text-[10px] h-6 px-2`}>
                      {linkStatus.icon && <span className="mr-1">{linkStatus.icon}</span>}
                      <span className="whitespace-nowrap">{linkStatus.label}</span>
                    </Badge>
                  </td>

                  {/* 操作 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1 flex-nowrap">
                      {/* データ連携依頼ボタン */}
                      {canEditProject(user, project) && onDataLinkRequest && segment.data_link_status !== 'linked' && segment.data_link_status !== 'requested' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                onClick={() => setLinkRequestTarget(segment)}
                                disabled={
                                  segment.location_request_status === 'not_requested' ||
                                  !segment.ads_account_id ||
                                  !project.universe_service_id
                                }
                                  className="px-2 py-1 h-auto bg-[#5b5fff] text-white hover:bg-[#4949dd] disabled:bg-gray-200 disabled:text-gray-400 text-[10px] flex items-center gap-1 shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                                >
                                  <Send className="w-3 h-3" />
                                  連携依頼
                                </Button>
                              </span>
                            </TooltipTrigger>
                          {(segment.location_request_status === 'not_requested' || !segment.ads_account_id || !project.universe_service_id) && (
                              <TooltipContent side="top" className="text-xs max-w-[200px]">
                                {segment.location_request_status === 'not_requested' ? (
                                  <p>地点データの格納依頼が行われていないため、連携依頼できません。</p>
                                ) : !segment.ads_account_id ? (
                                <p>AdsアカウントIDが設定されていません。編集ボタンから設定してください。</p>
                              ) : (
                                <p>UNIVERSEサービスIDが未入力のため、連携依頼できません。</p>
                              )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* その他の操作ボタン */}
                      <div className="flex items-center gap-1">
                        {onManagePois && canEditProject(user, project) && (
                          <Button
                            onClick={() => onManagePois(segment)}
                            className="p-1.5 h-7 w-7 bg-[#5b5fff]/10 text-[#5b5fff] hover:bg-[#5b5fff]/20 rounded-lg"
                            title="地点管理"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canEditProject(user, project) && (
                          <Button
                            onClick={() => onEdit(segment)}
                            className="p-1.5 h-7 w-7 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                            title={extractionStatus.editable ? "編集" : "AdsアカウントID��の編集が可能"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canEditProject(user, project) && (() => {
                          // 営業ユーザーの場合、下書きのセグメントのみ削除可能
                          // 下書きの条件: 地点数が0、データ連携ステータスが「連携依頼前」、地点依頼ステータスが「未依頼」
                          const isDraft = poiCount === 0 && 
                                         segment.data_link_status === 'before_request' && 
                                         segment.location_request_status === 'not_requested';
                          const canDelete = isAdmin || isDraft;
                          
                          if (!canDelete) return null;
                          
                          return (
                            <Button
                              onClick={() => setDeleteTarget(segment.segment_id)}
                              className="p-1.5 h-7 w-7 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
                              title={isDraft ? "削除" : "下書きのセグメントのみ削除可能です"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>セグメントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。セグメントID: {deleteTarget} を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* データ連携依頼確認ダイアログ */}
      <AlertDialog open={linkRequestTarget !== null} onOpenChange={() => setLinkRequestTarget(null)}>
        <AlertDialogContent className="max-w-md bg-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#5b5fff]/10 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-[#5b5fff]" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg text-gray-900">データ連携依頼</AlertDialogTitle>
                <p className="text-xs text-gray-600 mt-0.5">Data Link Request</p>
              </div>
            </div>
            <AlertDialogDescription className="text-gray-900 bg-white">
              <div className="space-y-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">セグメントID</p>
                      <p className="font-medium text-gray-900 text-sm">{linkRequestTarget?.segment_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AdsアカウントID</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {linkRequestTarget?.ads_account_id || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="flex items-start gap-2 text-gray-900">
                    <span className="text-[#5b5fff] mt-0.5">•</span>
                    <span>管理部へデータ連携を依頼します</span>
                  </p>
                  <p className="flex items-start gap-2 text-gray-900">
                    <span className="text-[#5b5fff] mt-0.5">•</span>
                    <span>ステータスが「連携依頼済」に変更されます</span>
                  </p>
                  <p className="flex items-start gap-2 text-gray-900">
                    <span className="text-[#5b5fff] mt-0.5">•</span>
                    <span>依頼後はAdsアカウントID等の変更ができなくなります</span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => linkRequestTarget && handleLinkRequest(linkRequestTarget)}
              className="bg-[#5b5fff] hover:bg-[#4949dd]"
            >
              <Send className="w-4 h-4 mr-2" />
              依頼する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}