import { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import type { Project, ProjectMessage } from '../types/schema';
import { bigQueryService } from '../utils/bigquery';
import { toast } from 'sonner';

interface ProjectMessagesProps {
  project: Project;
  onMessageSent?: () => void;
  onUnreadCountUpdate?: () => void;
  onMessagesRead?: () => void;
}

export function ProjectMessages({ project, onMessageSent, onUnreadCountUpdate, onMessagesRead }: ProjectMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // メッセージのロード
  useEffect(() => {
    const initializeMessages = async () => {
      setIsLoading(true);
      try {
        const data = await bigQueryService.getProjectMessages(project.project_id);
        setMessages(data);

        // 既読更新は既に取得したデータを使って最小限のAPI呼び出しにする
        if (user) {
          const userRole = user.role === 'admin' ? 'admin' : 'sales';
          const unreadIds = data
            .filter(m => m.sender_role !== userRole && !m.is_read)
            .map(m => m.message_id)
            .filter(Boolean) as string[];

          if (unreadIds.length > 0) {
            await bigQueryService.markMessagesAsRead(project.project_id, userRole, unreadIds);
            setMessages(prev =>
              prev.map(m => (m.message_id && unreadIds.includes(m.message_id)) ? { ...m, is_read: true } : m)
            );
            onUnreadCountUpdate?.();
            onMessagesRead?.();
          }
        }
      } catch (error) {
        console.error('Failed to load messages', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMessages();
  }, [project.project_id, user, onUnreadCountUpdate, onMessagesRead]);

  const loadMessages = async () => {
    try {
      const data = await bigQueryService.getProjectMessages(project.project_id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      // ScrollAreaコンポーネントの内部構造に応じてスクロール
      const scrollContainer = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
      if (scrollContainer) {
        // 少し遅延させてスクロールを確実に実行
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const userRole = user.role === 'admin' ? 'admin' : 'sales';
      
      await bigQueryService.sendProjectMessage({
        project_id: project.project_id,
        sender_id: user.email,
        sender_name: user.name,
        sender_role: userRole,
        content: newMessage,
        message_type: userRole === 'admin' ? 'inquiry' : 'reply', // 管理者はデフォルトで「確認依頼」、営業は「返信」
      });

      setNewMessage('');
      await loadMessages();
      toast.success('メッセージを送信しました');
      
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('メッセージの送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('⚠️ formatTime() failed:', dateStr, e);
      return '-';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">連絡事項・確認依頼</h3>
            <p className="text-xs text-gray-500">管理部と営業担当者のコミュニケーション</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white border border-gray-200 text-gray-700">
          {messages.length}件のメッセージ
        </Badge>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>まだメッセージはありません。</p>
                <p className="text-sm mt-2">確認事項がある場合はここから連絡できます。</p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = user?.email === msg.sender_id;
              const isAdmin = msg.sender_role === 'admin';
              
              return (
                <div 
                  key={msg.message_id} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* アバター */}
                    <Avatar className="w-8 h-8 border border-gray-200">
                      <AvatarImage src="" />
                      <AvatarFallback className={isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                        {msg.sender_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* メッセージ内容 */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {msg.sender_name}
                          {isAdmin && <span className="ml-1 text-purple-600 text-[10px] bg-purple-50 px-1 rounded border border-purple-100">管理部</span>}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      
                      <div 
                        className={`p-3 rounded-lg text-sm whitespace-pre-wrap shadow-sm ${
                          isMe 
                            ? 'bg-[#5b5fff] text-white rounded-tr-none' 
                            : isAdmin 
                              ? 'bg-purple-50 text-gray-800 border border-purple-100 rounded-tl-none' 
                              : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      
                      {/* ステータス表示（自分が送信した場合） */}
                      {isMe && (
                        <div className="mt-1 text-[10px] text-gray-400 flex items-center">
                          {msg.is_read ? (
                            <span className="flex items-center text-blue-400">
                              <CheckCheck className="w-3 h-3 mr-0.5" />
                              既読
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Check className="w-3 h-3 mr-0.5" />
                              送信済み
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* 入力エリア */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="min-h-[60px] max-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSending}
            className="h-[60px] w-20 bg-[#5b5fff] hover:bg-[#4949dd] flex items-center justify-center px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-1">
          Shift + Enter で改行
        </p>
      </div>
    </div>
  );
}
