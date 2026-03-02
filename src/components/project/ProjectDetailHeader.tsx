import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusLabel } from '@/utils/projectStatus';
import type { Project } from '@/types/schema';

interface ProjectDetailHeaderProps {
  project: Project;
  onBack: () => void;
  statusColor: { badge: string };
  statusLabel: string;
  formatDateTime: (dateTimeStr?: string) => string;
}

export function ProjectDetailHeader({
  project,
  onBack,
  statusColor,
  statusLabel,
  formatDateTime,
}: ProjectDetailHeaderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <Button
        variant="outline"
        size="default"
        onClick={onBack}
        className="mb-4 border-[#5b5fff]/60 text-[#5b5fff] hover:bg-[#5b5fff]/90 hover:text-white hover:border-[#5b5fff]/90 font-semibold shadow-sm"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        案件一覧に戻る
      </Button>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-gray-900">{project.advertiser_name}</h1>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{project.project_id}</Badge>
          <Badge className={`inline-flex items-center gap-1 text-xs border ${statusColor.badge}`}>
            <span>{statusLabel}</span>
          </Badge>
        </div>
        <p className="text-muted-foreground">登録日: {formatDateTime(project._register_datetime)}</p>
      </div>
    </div>
  );
}
