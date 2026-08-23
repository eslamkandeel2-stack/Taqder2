import React, { useState, useEffect } from 'react';
import { Bot, Send, Sparkles, User, RefreshCw, HelpCircle, Settings2, Cpu, Lightbulb } from 'lucide-react';
import { getSavedAISettings, getAIRequestHeaders, AISettings, SUPPORTED_AI_MODELS } from '../utils/aiConfig';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  modelUsed?: string;
}

export const AIAssistantChat: React.FC = () => {
  const [aiSettings, setAiSettings] = useState<AISettings>(() => getSavedAISettings());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'مرحباً بك! أنا مستشارك الذكي لتصاميم وصياغة شهادات التقدير والتحفيز الطلابي. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تطلب مني صياغة بيت شعر، أو اقتراح أفكار تكريم لمادة معينة، أو تحسين عبارات التكريم الحالية.',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AISettings>;
      if (customEvent.detail) {
        setAiSettings(customEvent.detail);
      } else {
        setAiSettings(getSavedAISettings());
      }
    };
    window.addEventListener('taqdeer_ai_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('taqdeer_ai_settings_changed', handleSettingsChanged);
  }, []);

  const currentModelOption = SUPPORTED_AI_MODELS.find(m => m.id === aiSettings.model) || SUPPORTED_AI_MODELS[0];

  const samplePrompts = [
    'اقترح عليّ 3 أبيات شعرية راقية عن العلم والاجتهاد تناسب شهادة تفوق',
    'كيف أصيغ شهادة تقدير لطالب ممتاز في الحساب الذهني بأسلوب ملكي فخم؟',
    'أفكار لمسميات جوائز تحفيزية للأطفال في المرحلة الابتدائية',
    'عبارات شكر قصيرة ومؤثرة للمواظبة والانضباط المدرسي مسجوعة وبليغة',
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const endpoint = (aiSettings.customApiUrl?.trim() || '') + '/api/ai-assistant';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAIRequestHeaders(aiSettings),
        body: JSON.stringify({
          prompt: query,
          apiKey: aiSettings.apiKey?.trim() || undefined,
          model: aiSettings.model || 'gemini-3.7-flash',
          temperature: aiSettings.temperature,
          systemInstruction: aiSettings.systemInstruction,
        }),
      });

      const data = await response.json();
      const aiReply = data.text || 'عذراً، لم أستطع معالجة طلبك حالياً.';

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || currentModelOption.name,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'حدث خطأ في الاتصال بالمساعد الذكي. يرجى مراجعة إعدادات الـ API في تبويب الإعدادات أو المحاولة لاحقاً.',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-right">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-5 rounded-2xl shadow-lg border border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-base">المستشار التربوي واللغوي الذكي (Gemini AI)</h3>
            <p className="text-xs text-amber-200/80 mt-0.5">استشارات بلا حدود في الصياغة، الشعر، والتحفيز الطلابي</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-bold text-amber-200 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>النموذج النشط: {currentModelOption.name}</span>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-black shadow-2xs">
            🟢 جاهز
          </span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          <span>نماذج مقترحة للاستشارة السريعة:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-950 border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 text-right flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-[420px] overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 max-w-[85%] ${
              m.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-amber-500 text-slate-950 font-black'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-tl-none whitespace-pre-wrap'
              }`}
            >
              {m.text}
              <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-slate-200/50">
                <span className={`text-[9px] ${m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                  {m.time}
                </span>
                {m.modelUsed && (
                  <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/80">
                    ⚡ {m.modelUsed}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-slate-700 text-xs p-3 bg-amber-50 rounded-xl border border-amber-200 w-fit font-bold">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span>جاري معالجة الطلب وصياغة الاستشارة الذكية...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-amber-500">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب سؤالك أو اطلب صياغة خاصة للشهادة هنا..."
          className="flex-1 px-4 py-2.5 text-xs font-medium focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>إرسال</span>
        </button>
      </div>

    </div>
  );
};
