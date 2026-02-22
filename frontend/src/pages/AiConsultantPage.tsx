import { useEffect, useState } from "react";
import { Send, Lightbulb, ArrowRight, AlertCircle } from "lucide-react";
import api from "../api/client";
import { PageHeader, MonthNavigator } from "../components/shared";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Suggestion {
  query: string;
  hint: string;
}

interface ConsultantResponse {
  query: string;
  response: string;
  period: string;
  context: string;
  related_insights: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  suggestions: string[];
  status: "success" | "error";
}

const today = new Date();
const [year, month] = [today.getFullYear(), today.getMonth() + 1];

export default function AiConsultantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [querySuggestions, setQuerySuggestions] = useState<Suggestion[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);

  const today2 = new Date();
  const isCurrentMonth = selectedYear === today2.getFullYear() && selectedMonth === today2.getMonth() + 1;

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }

  function nextMonth() {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  // Load suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await api.get(`/ai-consultant/suggestions?year=${selectedYear}&month=${selectedMonth}`);
        setQuerySuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      }
    };

    loadSuggestions();

    // Add welcome message
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          type: "assistant",
          content: `Привіт! 👋 Я AI-консультант вашої медпрактики. Я можу допомогти вам з:

📊 **Уточненням аналітики** - розкажу детальніше про будь-які аспекти вашого бізнесу
💡 **Запитаннями про дані** - пояснюю, чому змінилися показники
🎯 **Рекомендаціями** - дам конкретний план дій для зростання
📈 **Аналізом динаміки** - покажу тренди та причини змін

Виберіть одне з пропонованих запитань нижче або напишіть своє запитання.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [selectedYear, selectedMonth]);

  const handleSendMessage = async (messageText?: string) => {
    const query = messageText || input;
    if (!query.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post<ConsultantResponse>(
        `/ai-consultant/ask?query=${encodeURIComponent(query)}&year=${selectedYear}&month=${selectedMonth}`
      );

      if (response.data && response.data.status === "success") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error calling consultant:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз або виберіть одне з пропонованих запитань.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <PageHeader
        title="AI-Консультант"
        subtitle="Детальна фінансова аналітика вашої медпрактики"
      />

      <MonthNavigator
        year={selectedYear}
        month={selectedMonth - 1}
        onPrev={prevMonth}
        onNext={nextMonth}
        disableNext={isCurrentMonth}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Chat messages */}
        <div className="card-neo p-6 mb-6 h-[500px] overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.type === "user"
                    ? "bg-blue-600/20 border border-blue-500/30"
                    : "bg-gray-800/50 border border-gray-700/30"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.type === "user" ? "text-blue-300" : "text-gray-400"}`}>
                  {msg.timestamp.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 border border-gray-700/30 px-4 py-3 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="card-neo p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
              placeholder="Напишіть запитання про фінанси вашої клініки..."
              className="flex-1 bg-dark-800/50 border border-dark-500/30 rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Надіслати</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Натисніть Enter для надсилання або виберіть одне з пропонованих запитань</p>
        </div>

        {/* Suggestions */}
        {querySuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Lightbulb size={16} />
              <span className="text-sm font-medium">Пропоновані запитання:</span>
            </div>

            <div className="grid gap-3">
              {querySuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion.query)}
                  disabled={isLoading}
                  className="card-neo p-4 hover:bg-dark-700/50 border border-dark-500/20 hover:border-blue-500/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{suggestion.query}</p>
                      <p className="text-xs text-gray-400 mt-1">{suggestion.hint}</p>
                    </div>
                    <ArrowRight size={16} className="text-blue-400 shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 card-neo p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex gap-3">
            <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1">💡 Порада:</p>
              <p>Консультант має доступ до всіх даних періоду і може дати детальну аналітику. Чим більш конкретне ваше запитання, тим кращою буде відповідь.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
