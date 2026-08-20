"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge, LoadingState, formatINR, formatDateTime } from "@/components/ui";
import { Send, CheckCircle2, Sparkles, X } from "lucide-react";

type QuoteVersion = { version_no: number; terms: Record<string, unknown>; proposed_by_role: string; created_at: string };
type Quote = {
  id: string; product_name: string; seller_name: string | null; buyer_id: string; seller_id: string;
  quantity: number; unit_price: number; delivery_terms: string | null; payment_terms: string | null;
  status: string; thread_id: string | null; versions: QuoteVersion[];
};
type ChatMsg = { id: string; sender_id: string; body: string; created_at: string };
type Suggestion = {
  current_quote: number; market_average: number; pct_above_market: number;
  suggested_counter: number; should_counter: boolean; reason: string;
};

export function NegotiationView({ role }: { role: "buyer" | "seller" }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.get(`/api/v1/quotes/${params.id}`).then((q) => {
      setQuote(q);
      setCounterPrice(String(q.unit_price));
      if (q.thread_id) {
        api.get(`/api/v1/chat/${q.thread_id}`).then((t) => setMessages(t.messages));
      }
    });
    if (role === "buyer") {
      api.get(`/api/v1/intelligence/quotes/${params.id}/suggestion`).then(setSuggestion).catch(() => setSuggestion(null));
    }
  }, [params.id, role]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (quote?.thread_id) {
        api.get(`/api/v1/chat/${quote.thread_id}`).then((t) => setMessages(t.messages)).catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [load, quote?.thread_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !quote?.thread_id) return;
    const body = draft;
    setDraft("");
    try {
      const msg = await api.post(`/api/v1/chat/${quote.thread_id}/messages`, { body });
      setMessages((m) => [...m, msg]);
    } catch {
      setError("Could not send message.");
    }
  }

  async function handleCounter() {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/v1/quotes/${quote.id}/counter`, { unit_price: Number(counterPrice) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit counter-offer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post(`/api/v1/quotes/${quote.id}/accept`);
      router.push(`/${role}/contracts/${result.contract_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept quote.");
      setBusy(false);
    }
  }

  function useSuggestedCounter() {
    if (!suggestion) return;
    setCounterPrice(String(suggestion.suggested_counter));
    setSuggestionDismissed(true);
  }

  if (!quote) return <LoadingState />;

  const latest = quote.versions[quote.versions.length - 1];
  const canAct = quote.status !== "ACCEPTED" && quote.status !== "REJECTED";

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cocoa-500">{quote.product_name}</h1>
          <p className="text-cocoa-400 mt-1">{role === "buyer" ? `with ${quote.seller_name}` : "Negotiation"}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card flex flex-col h-[520px]">
          <p className="text-sm font-semibold text-cocoa-500 mb-3">Chat</p>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-tan-600 text-white rounded-br-sm" : "bg-cream-200 text-cocoa-500 rounded-bl-sm"}`}>
                    <p>{m.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-tan-100" : "text-cocoa-400"}`}>{formatDateTime(m.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-sm text-cocoa-400 text-center mt-12">No messages yet. Start the conversation.</p>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 mt-3 pt-3 border-t border-tan-100">
            <input className="input-field flex-1" placeholder="Type a message..." value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" className="btn-primary px-3"><Send size={16} /></button>
          </form>
        </div>

        <div className="space-y-4">
          {role === "buyer" && suggestion && suggestion.should_counter && !suggestionDismissed && canAct && (
            <div className="card border-tan-400 bg-gradient-to-br from-tan-50 to-cream-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={16} className="text-tan-600" />
                  <p className="text-sm font-semibold text-cocoa-500">AI Suggestion</p>
                </div>
                <button onClick={() => setSuggestionDismissed(true)} className="text-cocoa-400 hover:text-cocoa-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between"><span className="text-cocoa-400">Current quote</span><span className="font-medium text-cocoa-500">{formatINR(suggestion.current_quote)}</span></div>
                <div className="flex justify-between"><span className="text-cocoa-400">Market average</span><span className="font-medium text-cocoa-500">{formatINR(suggestion.market_average)}</span></div>
                <div className="flex justify-between"><span className="text-cocoa-400">Suggested counter</span><span className="font-semibold text-tan-700">{formatINR(suggestion.suggested_counter)}</span></div>
              </div>
              <p className="text-xs text-cocoa-500 mb-3">{suggestion.reason}</p>
              <div className="flex gap-2">
                <button onClick={useSuggestedCounter} className="btn-primary flex-1 text-sm py-1.5">Use Suggested Counter</button>
                <button onClick={() => setSuggestionDismissed(true)} className="btn-secondary text-sm py-1.5">Ignore</button>
              </div>
            </div>
          )}

          <div className="card">
            <p className="text-sm font-semibold text-cocoa-500 mb-3">Current Terms</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-cocoa-400">Price</span><span className="font-medium text-cocoa-500">{formatINR(quote.unit_price)} / unit</span></div>
              <div className="flex justify-between"><span className="text-cocoa-400">Quantity</span><span className="font-medium text-cocoa-500">{quote.quantity.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-cocoa-400">Delivery</span><span className="font-medium text-cocoa-500 text-right">{quote.delivery_terms || "—"}</span></div>
              <div className="flex justify-between"><span className="text-cocoa-400">Payment</span><span className="font-medium text-cocoa-500 text-right">{quote.payment_terms || "—"}</span></div>
            </div>

            {canAct && (
              <div className="mt-4 pt-4 border-t border-tan-100 space-y-2">
                {error && <p className="text-xs text-red-600">{error}</p>}
                <label className="label-field">Counter Price (₹/unit)</label>
                <input type="number" step="0.01" className="input-field" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
                <button onClick={handleCounter} disabled={busy} className="btn-secondary w-full">Send Counter-Offer</button>
                <button onClick={handleAccept} disabled={busy} className="btn-primary w-full flex items-center justify-center gap-1">
                  <CheckCircle2 size={16} /> Accept & Create Contract
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <p className="text-sm font-semibold text-cocoa-500 mb-3">Negotiation History</p>
            <div className="space-y-3">
              {quote.versions.map((v) => (
                <div key={v.version_no} className="text-xs border-l-2 border-tan-300 pl-3">
                  <p className="font-medium text-cocoa-500">v{v.version_no} · {v.proposed_by_role} · ₹{String(v.terms.unit_price)}/unit</p>
                  <p className="text-cocoa-400">{formatDateTime(v.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
