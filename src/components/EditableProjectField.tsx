import { useState } from 'react';
import { Edit, Check, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { FieldEditRequestDialog } from './FieldEditRequestDialog';
import { isDirectEditField, isApprovalRequiredField } from '../utils/editRequest';

interface EditableProjectFieldProps {
  label: string;
  value: string;
  fieldName: string;
  onSave: (value: string) => void;
  onRequestEdit: (value: string, reason: string) => void;
  hasSegments: boolean;
  multiline?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function EditableProjectField({
  label,
  value,
  fieldName,
  onSave,
  onRequestEdit,
  hasSegments,
  multiline = false,
  readOnly = false,
  className = '',
}: EditableProjectFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  const canDirectEdit = isDirectEditField(fieldName);
  const requiresApproval = isApprovalRequiredField(fieldName) && hasSegments;

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    if (canDirectEdit || !hasSegments) {
      // 直接編集可能なフィールドまたはセグメントがない場合
      onSave(editValue);
      setIsEditing(false);
    } else if (requiresApproval) {
      // 承認が必要なフィールド - 理由入力ダイアログを表示
      setShowReasonDialog(true);
    }
  };

  const handleReasonSubmit = (reason: string) => {
    onRequestEdit(editValue, reason);
    setShowReasonDialog(false);
    setIsEditing(false);
  };

  if (readOnly) {
    return (
      <div className={className}>
        <p className="text-muted-foreground mb-1 text-sm">{label}</p>
        <p className="text-gray-900">{value || '-'}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {canDirectEdit && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                直接編集可
              </Badge>
            )}
            {requiresApproval && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                承認必要
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartEdit}
              className="h-6 px-2 text-[#5b5fff] hover:text-[#4949dd] hover:bg-[#5b5fff]/10"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
          )}
          
          {requiresApproval && (
            <div className="flex items-start gap-2 p-2 bg-orange-50 rounded text-xs text-orange-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                このフィールドの変更には管理部の承認が必要です。保存すると修正依頼が作成されます。
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-[#5b5fff] hover:bg-[#4949dd] text-white"
              disabled={editValue === value}
            >
              <Check className="w-4 h-4 mr-1" />
              {requiresApproval ? '修正依頼を送信' : '保存'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="border-gray-200"
            >
              <X className="w-4 h-4 mr-1" />
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-900 min-h-[24px]">{value || '-'}</p>
      )}

      {/* 修正理由入力ダイアログ */}
      <FieldEditRequestDialog
        open={showReasonDialog}
        onClose={() => {
          setShowReasonDialog(false);
          setIsEditing(false);
        }}
        onSubmit={handleReasonSubmit}
        fieldLabel={label}
        oldValue={value}
        newValue={editValue}
      />
    </div>
  );
}
