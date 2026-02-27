import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ExternalLink, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { searchFAQ, type FAQLink } from '../utils/faqDatabase';
import { postQaChat, postQaFeedback, type QaMessage } from '../utils/qaApi';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  links?: FAQLink[];
  // AI Q&A モード専用: model メッセージの BQ log_id（フィードバック送信に使用）
  logId?: string;
}

type Mode = 'faq' | 'ai';

interface ChatBotProps {
  currentPage?: string;
  currentContext?: Record<string, any>;
  userId?: string;
  onNavigate?: (path: string, params?: any) => void;
  onOpenForm?: (formType: string) => void;
}

const FAQ_INITIAL_MESSAGE = 'こんにちは！アプリの使い方について何かご質問はありますか？';
const AI_INITIAL_MESSAGE =
  '案件の状況や配信設定について何でも聞いてください。例：「今月配信中の案件は？」';

export function ChatBot({ currentPage, currentContext, userId, onNavigate, onOpenForm }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('faq');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: FAQ_INITIAL_MESSAGE, timestamp: new Date() },
  ]);
  const [aiHistory, setAiHistory] = useState<QaMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // フィードバック送信済みの log_id を管理（重複送信防止）
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'good' | 'bad'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const resetFaq = () => {
    setMessages([{ id: '1', role: 'bot', content: FAQ_INITIAL_MESSAGE, timestamp: new Date() }]);
  };

  const resetAi = () => {
    setAiHistory([]);
    setFeedbackSent({});
    sessionIdRef.current = crypto.randomUUID();
    setMessages([{ id: '1', role: 'bot', content: AI_INITIAL_MESSAGE, timestamp: new Date() }]);
  };

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setInputValue('');
    if (newMode === 'faq') {
      resetFaq();
    } else {
      resetAi();
    }
  };

  const handleReset = () => {
    if (mode === 'faq') {
      resetFaq();
    } else {
      resetAi();
    }
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
      // フィードバック送信失敗は UI に反映しない（ベストエフォート）
    }
  };

  const handleSendFaq = async (text: string) => {
    try {
      const result = await searchFAQ(text, currentPage, currentContext);
      const answer = typeof result === 'string' ? result : result.answer;
      const links = typeof result === 'string' ? [] : (result.links || []);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: answer,
            timestamp: new Date(),
            links,
          },
        ]);
        setIsTyping(false);
      }, 500);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: '申し訳ございません。エラーが発生しました。もう一度お試しください。',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }
  };

  const handleSendAi = async (text: string) => {
    const newUserMsg: QaMessage = { role: 'user', content: text };
    const nextHistory = [...aiHistory, newUserMsg];

    try {
      const { reply, log_id } = await postQaChat(nextHistory, sessionIdRef.current, userId || '');
      const modelMsg: QaMessage = { role: 'model', content: reply };
      setAiHistory([...nextHistory, modelMsg]);
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

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const text = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() },
    ]);
    setInputValue('');
    setIsTyping(true);

    if (mode === 'faq') {
      await handleSendFaq(text);
    } else {
      await handleSendAi(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: Date) => {
    if (!timestamp) return '-';
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
              <h3 className="font-semibold">ヘルプアシスタント</h3>
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

          {/* モード切替タブ */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleModeChange('faq')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'faq'
                  ? 'text-[#5b5fff] border-b-2 border-[#5b5fff]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => handleModeChange('ai')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'ai'
                  ? 'text-[#5b5fff] border-b-2 border-[#5b5fff]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              AI Q&A
            </button>
          </div>

          {/* メッセージエリア */}
          <ScrollArea className="flex-1 p-4">
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
                      {message.links && message.links.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.links.map((link, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (link.action.startsWith('navigate:')) {
                                  const [, ...parts] = link.action.split(':');
                                  onNavigate?.(parts.join(':'), link.params);
                                } else if (link.action.startsWith('open:')) {
                                  const [, formType] = link.action.split(':');
                                  onOpenForm?.(formType);
                                }
                              }}
                              className={`text-xs px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                message.role === 'user'
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-[#5b5fff] hover:bg-[#4949dd] text-white'
                              }`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {link.text}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</p>
                    </div>

                    {/* AI Q&A モードの bot メッセージにフィードバックボタンを表示 */}
                    {mode === 'ai' && message.role === 'bot' && message.logId && (
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
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* 入力エリア */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={mode === 'faq' ? '質問を入力してください...' : '案件について質問してください...'}
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
