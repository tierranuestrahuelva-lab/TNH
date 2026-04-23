import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Wand2, User, Bot, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const SUGGESTIONS = [
    "Un cliente me pide un Rueda Verdejo que no tengo. ¿Qué le ofrezco de nuestro catálogo?",
    "Dame 3 argumentos de venta para un Ribera del Duero Reserva.",
    "Recomiéndame un maridaje con jamón ibérico entre nuestros generosos.",
    "Cliente restaurante andaluz: haz una selección corta (tinto, blanco, generoso) con precios HORECA.",
    "No tengo Champagne Dom Pérignon. ¿Qué espumosos nuestros puedo proponer?",
];

export default function AIChat() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "¡Hola! Soy el **Sumiller IA** de Tierra Nuestra Huelva. Te ayudo a potenciar ventas: dime qué vino te piden y te propongo alternativas de nuestro catálogo, o pídeme argumentos de venta para cualquier referencia. 🍷",
        },
    ]);
    const [input, setInput] = useState("");
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const send = async (text) => {
        const content = (text ?? input).trim();
        if (!content || loading) return;
        setInput("");
        setMessages((m) => [...m, { role: "user", content }]);
        setLoading(true);
        try {
            const { data } = await api.post("/ai/chat", {
                session_id: sessionId,
                message: content,
            });
            setSessionId(data.session_id);
            setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        } catch (e) {
            toast.error(
                "Error al contactar con el Sumiller IA: " + (e?.response?.data?.detail || e.message)
            );
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSessionId(null);
        setMessages([
            {
                role: "assistant",
                content:
                    "Nueva conversación. Dime qué necesitas: alternativas para un vino, argumentos, maridajes…",
            },
        ]);
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col" data-testid="ai-chat-page">
            {/* Header */}
            <div className="px-5 sm:px-8 py-6 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/10">
                <div className="flex items-start justify-between gap-4 max-w-4xl mx-auto">
                    <div>
                        <div className="overline flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-accent" />
                            Claude Sonnet 4.5 · Asistente comercial
                        </div>
                        <h1 className="font-display text-4xl tracking-tight mt-1">
                            Sumiller <span className="gold-underline">IA</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                            Tu copiloto de ventas. Conectado al catálogo TNH. Propone
                            alternativas, maridajes y argumentos de venta en tiempo real.
                        </p>
                    </div>
                    <button
                        data-testid="ai-new-session"
                        onClick={reset}
                        className="btn-pill !py-2"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Nueva conversación
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto p-5 sm:p-8 space-y-5" data-testid="ai-messages">
                    {messages.map((m, i) => (
                        <Message key={i} role={m.role} content={m.content} />
                    ))}
                    {loading && (
                        <Message role="assistant" loading />
                    )}
                    <div ref={endRef} />
                </div>
            </div>

            {/* Suggestions + input */}
            <div className="border-t border-border bg-background">
                {messages.length <= 2 && !loading && (
                    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                data-testid={`ai-suggest-${i}`}
                                onClick={() => send(s)}
                                className="shrink-0 btn-pill !text-xs !py-2 max-w-xs truncate"
                            >
                                <Wand2 className="h-3 w-3 text-accent" />
                                {s}
                            </button>
                        ))}
                    </div>
                )}
                <div className="max-w-3xl mx-auto p-4 sm:p-6">
                    <div className="flex gap-2 items-end">
                        <textarea
                            data-testid="ai-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            rows={1}
                            placeholder="Pregunta al Sumiller (Enter para enviar, Shift+Enter salto de línea)"
                            className="flex-1 resize-none px-4 py-3 rounded-xl bg-card border border-input text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            data-testid="ai-send-btn"
                            onClick={() => send()}
                            disabled={loading || !input.trim()}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Message({ role, content = "", loading = false }) {
    const isUser = role === "user";
    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`ai-msg-${role}`}>
            <div
                className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center ${
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/20 text-accent-foreground border border-accent/30"
                }`}
            >
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-accent" />}
            </div>
            <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                }`}
            >
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Pensando con Claude Sonnet 4.5…
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap prose-sm">
                        <RenderContent content={content} />
                    </div>
                )}
            </div>
        </div>
    );
}

function RenderContent({ content }) {
    // very small markdown-ish render: **bold**, bullets
    const parts = content.split("\n").map((line, i) => {
        const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return (
            <div
                key={i}
                dangerouslySetInnerHTML={{ __html: bold }}
                className={line.trim().startsWith("-") || line.trim().startsWith("•") ? "pl-3" : ""}
            />
        );
    });
    return <div className="space-y-0.5">{parts}</div>;
}
