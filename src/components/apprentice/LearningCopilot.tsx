import React, { useEffect, useRef, useState } from 'react';
import { Globe, Info, MessageSquare, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import type { ApprenticeBundle } from './ApprenticeDashboard.tsx';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  isError?: boolean;
  retryPrompt?: string;
}

const SUGGESTED_QUESTIONS = [
  'Explain the difference between a Type B and Type C MCB with a practical example.',
  'Why is Test-Prove-Test mandatory before touching isolated conductors?',
  'How does high earth fault loop impedance (Zs) affect breaker tripping time?',
  'Generate 2 quick revision questions on 500V DC insulation resistance testing.',
];

function renderInlineFormatting(line: string): React.ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono-tech text-[12px]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function FormattedCopilotText({ text }: { text: string }) {
  const displayText = text.replace(/\n+(?:---\s*\n+)?FOLLOW_UPS:[\s\S]*$/i, '').trim();
  const blocks = displayText.split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        const allBullets = lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l.trim()));
        const allNumbered = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));

        if (allBullets) {
          return (
            <ul key={bIdx} className="list-disc pl-5 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>{renderInlineFormatting(l.trim().replace(/^[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (allNumbered) {
          return (
            <ol key={bIdx} className="list-decimal pl-5 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>{renderInlineFormatting(l.trim().replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((l, i) => {
              const trimmed = l.trim();
              if (/^#{1,3}\s+/.test(trimmed)) {
                return (
                  <p key={i} className="font-display font-bold text-[15px] pt-1">
                    {renderInlineFormatting(trimmed.replace(/^#{1,3}\s+/, ''))}
                  </p>
                );
              }
              return <p key={i}>{renderInlineFormatting(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export const LearningCopilot: React.FC<{ data: ApprenticeBundle }> = ({ data }) => {
  const { user, token, apiFetch, addToast } = useApp();
  const activeTrade = data.trades.find((t) => t.id === user?.tradeId) || data.trades[0];
  const [selectedLessonId, setSelectedLessonId] = useState<string>(data.lessons[2]?.id || data.lessons[0]?.id || '');
  const [language, setLanguage] = useState('English');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggested, setSuggested] = useState<string[]>(SUGGESTED_QUESTIONS);

  const initialGreeting = (): ChatMessage => ({
    id: 'msg_welcome',
    role: 'assistant',
    text: `Hello ${user?.name || 'Apprentice'}. I am your contextual Learning Copilot for ${activeTrade.name}. Ask me to simplify technical standards, walk through fault diagnostics, or generate practice questions for your active lesson.`,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting()]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const activeLesson = data.lessons.find((l) => l.id === selectedLessonId) || data.lessons[0];
  const activeModule = data.modules.find((m) => m.id === activeLesson?.moduleId);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const priorHistory = messages
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    const userMsgId = `msg_u_${Date.now()}`;
    const assistantMsgId = `msg_a_${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: trimmed },
      { id: assistantMsgId, role: 'assistant', text: '' },
    ]);
    setInput('');
    setSending(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const streamRes = await fetch('/api/copilot/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          lessonId: selectedLessonId,
          language,
          history: priorHistory,
        }),
      });

      const contentType = streamRes.headers.get('content-type') || '';
      if (streamRes.ok && contentType.includes('text/event-stream') && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            let eventName = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (!dataStr) continue;
            const payload = JSON.parse(dataStr);

            if (eventName === 'chunk' && typeof payload.text === 'string') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text + payload.text } : m)),
              );
            } else if (eventName === 'done') {
              completed = true;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: payload.reply || m.text, model: payload.model }
                    : m,
                ),
              );
              if (Array.isArray(payload.suggestedFollowUps) && payload.suggestedFollowUps.length > 0) {
                setSuggested(payload.suggestedFollowUps);
              }
            } else if (eventName === 'error') {
              throw new Error(payload.error || 'Unable to generate AI Copilot response.');
            }
          }
        }

        if (!completed) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId && !m.text.trim()
                ? {
                    ...m,
                    text: 'The AI Copilot stream closed unexpectedly before completing the answer.',
                    isError: true,
                    retryPrompt: trimmed,
                  }
                : m,
            ),
          );
        }
        return;
      }

      // Non-streaming fallback endpoint
      const res = await apiFetch<{ reply: string; suggestedFollowUps: string[]; model: string }>('/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          lessonId: selectedLessonId,
          language,
          history: priorHistory,
        }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, text: res.reply, model: res.model } : m,
        ),
      );
      if (res.suggestedFollowUps?.length) {
        setSuggested(res.suggestedFollowUps);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to reach Gemini AI';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: errorMsg,
                isError: true,
                retryPrompt: trimmed,
              }
            : m,
        ),
      );
      addToast({
        title: 'Copilot Unavailable',
        message: errorMsg,
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Contextual Sidebar Panel */}
      <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Active Context</p>
          <h2 className="mt-1 font-display text-lg font-bold">Contextual Learning Copilot</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-[#96A4BA] mb-1 font-medium">Focus Lesson</label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 text-xs font-medium"
            >
              {data.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-500 dark:text-[#96A4BA] mb-1 font-medium">
              <Globe className="h-3.5 w-3.5" />
              <span>Response Language</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 text-xs font-medium"
            >
              <option value="English">English</option>
              <option value="Spanish">Español (Spanish)</option>
              <option value="Hindi">हिन्दी (Hindi)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="French">Français (French)</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-4 space-y-1.5 text-xs">
          <p className="font-semibold">Trade: {activeTrade.name}</p>
          <p className="text-slate-600 dark:text-[#96A4BA]">Module: {activeModule?.title || 'Core Curriculum'}</p>
          <p className="text-slate-600 dark:text-[#96A4BA]">Lesson: {activeLesson?.title}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#96A4BA]">Suggested Questions</p>
          {suggested.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={sending}
              onClick={() => sendMessage(q)}
              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0284C7] dark:hover:border-[#39D9FF] disabled:opacity-50 p-2.5 text-xs text-slate-700 dark:text-[#F4F7FC] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-start gap-2 text-[11px] text-slate-500 dark:text-[#96A4BA]">
          <Info className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#39D9FF] shrink-0 mt-0.5" />
          <span>
            AI Copilot provides educational guidance only. It does not grant competency verification or official assessment credit.
          </span>
        </div>
      </div>

      {/* Chat Conversation Pane */}
      <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] flex flex-col h-[640px]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#0284C7] dark:text-[#39D9FF]" />
            <span className="font-display text-sm font-bold">Study Session · {language}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-[#96A4BA]">Powered by Gemini</span>
            {messages.length > 1 && (
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setMessages([initialGreeting()]);
                  setSuggested(SUGGESTED_QUESTIONS);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-[#96A4BA] dark:hover:text-[#F4F7FC] disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] font-medium text-sm leading-relaxed'
                    : m.isError
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm space-y-2'
                    : 'bg-slate-100 dark:bg-[#131F35] text-slate-900 dark:text-[#F4F7FC]'
                }`}
              >
                {m.role === 'assistant' && !m.text && sending ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#96A4BA]">
                    <Sparkles className="h-3.5 w-3.5 text-[#39D9FF]" />
                    <span>Thinking and writing answer...</span>
                  </div>
                ) : m.role === 'assistant' ? (
                  <FormattedCopilotText text={m.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}

                {m.isError && m.retryPrompt && (
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => sendMessage(m.retryPrompt!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry Question</span>
                  </button>
                )}

                {m.model && (
                  <p className="mt-2 text-[10px] font-mono-tech opacity-65">Model: {m.model} · Study Guidance</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${activeLesson?.title || 'electrical standards'}...`}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-4 py-2.5 text-sm focus:outline-none focus:border-[#39D9FF]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{sending ? 'Answering...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
