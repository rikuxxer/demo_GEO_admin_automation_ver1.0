import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { postQaChat, postQaFeedback, type QaMessage } from '../utils/qaApi';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  logId?: string;
}

interface ChatBotProps {
  userId?: string;
}

const INITIAL_MESSAGE =
  '案件の状況・配信設定・アプリの使い方・GEOプロダクトについて何でも聞いてください。\n\n【案件・データ】\n・今月配信中の案件は？\n・○○社のデータ連携日はいつ？\n\n【アプリ操作】\n・地点の一括登録方法は？\n・TG地点と来店計測地点の違いは？\n\n【GEOプロダクト】\n・UNIVERSE GEOと他社のジオターゲティングの違いは？\n・来店計測のレギュレーションを教えて\n\n---\n情報が不足している場合は、Google Chat の「GEO相談部屋」で事業部メンションにてご相談ください。';

export function ChatBot({ userId }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: INITIAL_MESSAGE, timestamp: new Date() },
  ]);
  const [history, setHistory] = useState<QaMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleReset = () => {
    setMessages([{ id: '1', role: 'bot', content: INITIAL_MESSAGE, timestamp: new Date() }]);
    setHistory([]);
    setFeedbackSent({});
    sessionIdRef.current = crypto.randomUUID();
  };

  const handleClose = () => {
    setIsOpen(false);
    handleReset();
  };

  const handleFeedback = async (logId: string, feedback: 'good' | 'bad') => {
    if (feedbackSent[logId]) return;
    setFeedbackSent((prev) => ({ ...prev, [logId]: feedback }));
    try {
      await postQaFeedback(logId, feedback);
    } catch {
      // ベストエフォート
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const text = inputValue.trim();
    const newUserMsg: QaMessage = { role: 'user', content: text };
    const nextHistory = [...history, newUserMsg];

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() },
    ]);
    setInputValue('');
    setIsTyping(true);

    try {
      const { reply, log_id } = await postQaChat(nextHistory, sessionIdRef.current, userId || '');
      setHistory([...nextHistory, { role: 'model', content: reply }]);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: reply,
          timestamp: new Date(),
          logId: log_id,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: `エラーが発生しました: ${err?.message || '不明なエラー'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#5b5fff] hover:bg-[#4949dd] text-white z-50"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col border border-gray-200">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#5b5fff] text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold">AIGEO アシスタント</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8 text-white hover:bg-white/20"
                title="会話をリセット"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* メッセージエリア */}
          <div ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'bot' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5b5fff] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-[#5b5fff] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</p>
                    </div>

                    {/* フィードバックボタン（bot メッセージのみ） */}
                    {message.role === 'bot' && message.logId && (
                      <div className="flex items-center gap-1 pl-1">
                        <span className="text-xs text-gray-400">役に立ちましたか？</span>
                        <button
                          onClick={() => handleFeedback(message.logId!, 'good')}
                          disabled={!!feedbackSent[message.logId]}
                          title="役に立った"
                          className={`p-1 rounded transition-colors ${
                            feedbackSent[message.logId] === 'good'
                              ? 'text-green-600'
                              : feedbackSent[message.logId] === 'bad'
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.logId!, 'bad')}
                          disabled={!!feedbackSent[message.logId]}
                          title="役に立たなかった"
                          className={`p-1 rounded transition-colors ${
                            feedbackSent[message.logId] === 'bad'
                              ? 'text-red-500'
                              : feedbackSent[message.logId] === 'good'
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5b5fff] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 入力エリア */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="質問を入力してください..."
                disabled={isTyping}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="bg-[#5b5fff] hover:bg-[#4949dd]"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
