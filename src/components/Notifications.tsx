import { useState, useEffect, useMemo } from 'react';
import { Bell, Clock, ChevronRight, MessageSquare } from 'lucide-react';
import type { Project, ProjectMessage } from '../types/schema';
import { bigQueryService } from '../utils/bigquery';
import { useAuth } from '../contexts/AuthContext';

interface NotificationsProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export function Notifications({ projects, onProjectClick }: NotificationsProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [sortMode, setSortMode] = useState<'unreadFirst' | 'latest' | 'oldest'>('unreadFirst');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;
    
    try {
      const allMessages = await bigQueryService.getAllMessages();
      const userRole = user.role === 'admin' ? 'admin' : 'sales';
      
      // 自分が関与する案件IDのリストを取得
      const myProjectIds = projects
        .filter(p => {
          // 管理者は全案件対象
          if (userRole === 'admin') return true;
          // 営業は自分が主担当または副担当の案件のみ
          return p.person_in_charge === user.name || p.sub_person_in_charge === user.name;
        })
        .map(p => p.project_id);

      // 自分宛てのメッセージ（自分が送信者ではないもの、かつ自分の案件に関するもの）
      const myMessages = allMessages
        .filter(m => m.sender_role !== userRole)
        .filter(m => myProjectIds.includes(m.project_id));

      setMessages(myMessages);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (message: ProjectMessage) => {
    const project = projects.find(p => p.project_id === message.project_id);
    if (project) {
      onProjectClick(project);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric' });
    }
  };

  const filteredSortedMessages = useMemo(() => {
    let list = messages;

    if (showUnreadOnly) {
      list = list.filter((m) => !m.is_read);
    }

    return [...list].sort((a, b) => {
      const dateDiff =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

      if (sortMode === 'latest') return dateDiff;
      if (sortMode === 'oldest') return -dateDiff;

      // unreadFirst
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      return dateDiff;
    });
  }, [messages, sortMode, showUnreadOnly]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">お知らせ</h1>
          <p className="text-gray-500">案件に関する連絡事項や確認依頼</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">並び替え</label>
            <select
              value={sortMode}
              onChange={(e) =>
                setSortMode(e.target.value as 'unreadFirst' | 'latest' | 'oldest')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="unreadFirst">未確認優先（新しい順）</option>
              <option value="latest">最新順</option>
              <option value="oldest">古い順</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            未確認のみ表示
          </label>
        </div>
        {filteredSortedMessages.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">お知らせはありません</h3>
            <p className="text-gray-500 mt-1">新しいメッセージが届くとここに表示されます</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSortedMessages.map((message) => {
              const project = projects.find(p => p.project_id === message.project_id);
              
              return (
                <div 
                  key={message.message_id}
                  onClick={() => handleNotificationClick(message)}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${
                    !message.is_read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    !message.is_read ? 'bg-blue-500' : 'bg-transparent'
                  }`} />
                  
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    {message.sender_role === 'admin' ? '管' : '営'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{message.sender_name}</span>
                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                          {project?.advertiser_name || '不明な案件'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {message.content}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                       <span className="flex items-center gap-1">
                         <MessageSquare className="w-3 h-3" />
                         {message.message_type === 'inquiry' ? '確認依頼' : '返信'}
                       </span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-300 self-center" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
