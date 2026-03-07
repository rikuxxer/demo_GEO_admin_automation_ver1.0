import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { bigQueryService } from '@/utils/bigquery';
import {
  REPORT_TYPE_OPTIONS,
  AGGREGATION_LEVEL_OPTIONS,
  type Project,
  type ReportRequest,
  type Segment,
  type VisitMeasurementGroup,
  type PoiInfo,
} from '@/types/schema';

interface ReportRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ReportRequest, 'request_id' | 'requested_at' | 'status'>) => void;
  projectId?: string;
  projects: Project[];
  currentUserId: string;
  currentUserName: string;
}

type Step = 1 | 2 | 3;

export function ReportRequestForm({
  open,
  onClose,
  onSubmit,
  projectId: initialProjectId,
  projects,
  currentUserId,
  currentUserName,
}: ReportRequestFormProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [reportType, setReportType] = useState<string>('');

  // Step 2 - common
  const [reportTitle, setReportTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2 - visit_measurement
  const [aggregationLevel, setAggregationLevel] = useState<string>('campaign');
  const [structNumber, setStructNumber] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Step 2 - location_detail
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  // Data
  const [groups, setGroups] = useState<VisitMeasurementGroup[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pois, setPois] = useState<PoiInfo[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedProjectId(initialProjectId || '');
      setReportType('');
      setReportTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setAggregationLevel('campaign');
      setStructNumber('');
      setSelectedGroupIds([]);
      setExpandedGroups(new Set());
      setSelectedSegmentIds([]);
      setGroups([]);
      setSegments([]);
      setPois([]);
      setErrors({});
    }
  }, [open, initialProjectId]);

  // Step 2 に進む際にデータを取得
  useEffect(() => {
    if (step !== 2 || !selectedProjectId) return;
    let cancelled = false;
    setIsLoadingData(true);

    const load = async () => {
      try {
        if (reportType === 'visit_measurement') {
          const [g, p] = await Promise.all([
            bigQueryService.getVisitMeasurementGroups(selectedProjectId),
            bigQueryService.getPoisByProject(selectedProjectId),
          ]);
          if (!cancelled) {
            setGroups(g);
            setPois(p.filter((poi) => poi.poi_category === 'visit_measurement'));
          }
        } else if (reportType === 'location_detail') {
          const s = await bigQueryService.getSegmentsByProject(selectedProjectId);
          if (!cancelled) setSegments(s);
        }
      } catch {
        toast.error('データの取得に失敗しました');
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [step, selectedProjectId, reportType]);

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!reportTitle.trim()) newErrors.reportTitle = 'レポートタイトルは必須です';
    if (!startDate) newErrors.startDate = '集計開始日は必須です';
    if (!endDate) newErrors.endDate = '集計終了日は必須です';
    if (startDate && endDate && endDate < startDate) {
      newErrors.endDate = '集計終了日は開始日以降にしてください';
    }
    if (reportType === 'visit_measurement') {
      if (selectedGroupIds.length === 0) newErrors.groups = '計測グループを1つ以上選択してください';
      if (aggregationLevel === 'struct' && !structNumber.trim()) {
        newErrors.structNumber = 'ストラクト番号は必須です';
      }
    }
    if (reportType === 'location_detail') {
      if (selectedSegmentIds.length === 0) newErrors.segments = 'セグメントを1つ以上選択してください';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedProjectId || !reportType) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = () => {
    const request: Omit<ReportRequest, 'request_id' | 'requested_at' | 'status'> = {
      requested_by: currentUserId,
      requested_by_name: currentUserName,
      project_id: selectedProjectId,
      report_type: reportType as ReportRequest['report_type'],
      report_title: reportTitle.trim(),
      description: description.trim() || undefined,
      start_date: startDate,
      end_date: endDate,
      segment_ids: reportType === 'location_detail' ? selectedSegmentIds : undefined,
      aggregation_level: reportType === 'visit_measurement' ? (aggregationLevel as 'campaign' | 'struct') : undefined,
      measurement_group_ids: reportType === 'visit_measurement' ? selectedGroupIds : undefined,
      struct_number: reportType === 'visit_measurement' && aggregationLevel === 'struct' ? structNumber.trim() : undefined,
    };
    onSubmit(request);
    onClose();
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegmentIds((prev) =>
      prev.includes(segmentId) ? prev.filter((id) => id !== segmentId) : [...prev, segmentId]
    );
  };

  const getGroupPois = (groupId: string) =>
    pois.filter((p) => p.visit_measurement_group_id === groupId);

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);
  const reportTypeLabel = REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label || '';
  const aggregationLabel = AGGREGATION_LEVEL_OPTIONS.find((o) => o.value === aggregationLevel)?.label || '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規レポート依頼</DialogTitle>
          <DialogDescription>
            ステップ {step} / 3
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: レポート種別 + プロジェクト選択 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">プロジェクト選択</Label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
              >
                <option value="">選択してください</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name} ({p.project_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-semibold">レポート種別</Label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
              >
                <option value="">選択してください</option>
                {REPORT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={!selectedProjectId || !reportType}
                className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
              >
                次へ
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 詳細入力 */}
        {step === 2 && (
          <div className="space-y-4">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">データを読み込み中...</span>
              </div>
            ) : (
              <>
                {/* 来訪計測レポート */}
                {reportType === 'visit_measurement' && (
                  <>
                    <div>
                      <Label className="text-sm font-semibold">集計粒度</Label>
                      <select
                        value={aggregationLevel}
                        onChange={(e) => setAggregationLevel(e.target.value)}
                        className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                      >
                        {AGGREGATION_LEVEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {aggregationLevel === 'struct' && (
                      <div>
                        <Label className="text-sm font-semibold">ストラクト番号</Label>
                        <Input
                          type="number"
                          value={structNumber}
                          onChange={(e) => setStructNumber(e.target.value)}
                          placeholder="ストラクト番号を入力"
                          className="mt-1"
                        />
                        {errors.structNumber && (
                          <p className="text-xs text-red-500 mt-1">{errors.structNumber}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-semibold">計測グループ選択</Label>
                      {errors.groups && (
                        <p className="text-xs text-red-500 mt-1">{errors.groups}</p>
                      )}
                      {groups.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-2">計測グループがありません</p>
                      ) : (
                        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
                          {groups.map((g) => {
                            const groupPois = getGroupPois(g.group_id);
                            const isExpanded = expandedGroups.has(g.group_id);
                            return (
                              <Collapsible key={g.group_id} open={isExpanded} onOpenChange={() => toggleExpanded(g.group_id)}>
                                <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded">
                                  <Checkbox
                                    checked={selectedGroupIds.includes(g.group_id)}
                                    onCheckedChange={() => toggleGroup(g.group_id)}
                                  />
                                  <CollapsibleTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 text-sm text-gray-800 hover:text-gray-900 flex-1 text-left"
                                    >
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      <span>{g.group_name}</span>
                                      <span className="text-xs text-gray-400 ml-1">({groupPois.length}地点)</span>
                                    </button>
                                  </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent>
                                  <div className="ml-10 mb-2 space-y-1">
                                    {groupPois.map((poi) => (
                                      <div key={poi.poi_id} className="text-xs text-gray-600 flex justify-between py-0.5">
                                        <span>{poi.poi_name}</span>
                                      </div>
                                    ))}
                                    {g.extraction_period && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        抽出期間: {g.extraction_period}
                                      </div>
                                    )}
                                    {g.extraction_start_date && g.extraction_end_date && (
                                      <div className="text-xs text-gray-400">
                                        {g.extraction_start_date} 〜 {g.extraction_end_date}
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 地点別レポート */}
                {reportType === 'location_detail' && (
                  <div>
                    <Label className="text-sm font-semibold">セグメント選択</Label>
                    {errors.segments && (
                      <p className="text-xs text-red-500 mt-1">{errors.segments}</p>
                    )}
                    {segments.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-2">セグメントがありません</p>
                    ) : (
                      <div className="mt-2 space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
                        {segments.map((s) => (
                          <div key={s.segment_id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              checked={selectedSegmentIds.includes(s.segment_id)}
                              onCheckedChange={() => toggleSegment(s.segment_id)}
                            />
                            <span className="text-sm text-gray-800">{s.segment_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 集計期間 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">集計開始日</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`mt-1 w-full justify-start text-left font-normal ${!startDate ? 'text-muted-foreground' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate
                            ? format(new Date(startDate), 'yyyy年MM月dd日', { locale: ja })
                            : '日付を選択'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate ? new Date(startDate) : undefined}
                          onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.startDate && (
                      <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">集計終了日</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`mt-1 w-full justify-start text-left font-normal ${!endDate ? 'text-muted-foreground' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate
                            ? format(new Date(endDate), 'yyyy年MM月dd日', { locale: ja })
                            : '日付を選択'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate ? new Date(endDate) : undefined}
                          onSelect={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.endDate && (
                      <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* レポートタイトル */}
                <div>
                  <Label className="text-sm font-semibold">レポートタイトル</Label>
                  <Input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="レポートタイトルを入力"
                    className="mt-1"
                    maxLength={100}
                  />
                  {errors.reportTitle && (
                    <p className="text-xs text-red-500 mt-1">{errors.reportTitle}</p>
                  )}
                </div>

                {/* 備考 */}
                <div>
                  <Label className="text-sm font-semibold">備考（任意）</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="レポートに関する補足事項があれば入力してください"
                    rows={3}
                    className="mt-1"
                    maxLength={2000}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    戻る
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
                  >
                    確認する
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: 確認サマリ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <SummaryRow label="プロジェクト" value={selectedProject?.project_name || selectedProjectId} />
              <SummaryRow label="レポート種別" value={reportTypeLabel} />
              {reportType === 'visit_measurement' && (
                <>
                  <SummaryRow label="集計粒度" value={aggregationLabel} />
                  {aggregationLevel === 'struct' && (
                    <SummaryRow label="ストラクト番号" value={structNumber} />
                  )}
                  <SummaryRow
                    label="計測グループ"
                    value={groups
                      .filter((g) => selectedGroupIds.includes(g.group_id))
                      .map((g) => g.group_name)
                      .join('、') || '-'}
                  />
                </>
              )}
              {reportType === 'location_detail' && (
                <SummaryRow
                  label="セグメント"
                  value={segments
                    .filter((s) => selectedSegmentIds.includes(s.segment_id))
                    .map((s) => s.segment_name)
                    .join('、') || '-'}
                />
              )}
              <SummaryRow
                label="集計期間"
                value={`${startDate ? format(new Date(startDate), 'yyyy年MM月dd日', { locale: ja }) : '-'} 〜 ${endDate ? format(new Date(endDate), 'yyyy年MM月dd日', { locale: ja }) : '-'}`}
              />
              <SummaryRow label="タイトル" value={reportTitle} />
              {description && <SummaryRow label="備考" value={description} />}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                戻る
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
              >
                送信する
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-sm font-semibold text-gray-700 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
