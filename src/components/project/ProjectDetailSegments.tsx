import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { SegmentTable } from '@/components/SegmentTable';
import { canEditProject } from '@/utils/editRequest';
import type { Project, Segment, PoiInfo } from '@/types/schema';
import type { User } from '@/types/auth';

interface ProjectDetailSegmentsProps {
  project: Project;
  segments: Segment[];
  pois: PoiInfo[];
  user: User | null;
  onEditSegment: (segment: Segment) => void;
  onSegmentDelete: (segmentId: string) => void;
  onManagePois: (segment: Segment) => void;
  onDataLinkRequest: (segment: Segment) => void;
  onNewSegment: () => void;
}

export function ProjectDetailSegments({
  project,
  segments,
  pois,
  user,
  onEditSegment,
  onSegmentDelete,
  onManagePois,
  onDataLinkRequest,
  onNewSegment,
}: ProjectDetailSegmentsProps) {
  return (
    <TabsContent value="segments" className="p-6 bg-gradient-to-br from-[#eeeeff] via-[#f5f5ff] to-[#fafaff]">
      {/* ヘッダーセクション */}
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
          {canEditProject(user, project) && (
            <Button
              onClick={onNewSegment}
              data-guide="new-segment-button"
              className="bg-[#5b5fff] text-white hover:bg-[#4949dd] h-10 px-6 gap-2 shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              新規セグメント追加
            </Button>
          )}
        </div>
      </div>

      {/* コンテンツセクション */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <SegmentTable
          segments={segments}
          pois={pois}
          project={project}
          onEdit={onEditSegment}
          onDelete={onSegmentDelete}
          onManagePois={onManagePois}
          onDataLinkRequest={onDataLinkRequest}
        />
      </div>
    </TabsContent>
  );
}
