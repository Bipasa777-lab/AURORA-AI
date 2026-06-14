import { useState, useRef, useEffect } from "react";
import { useListOpenaiConversations, useCreateOpenaiConversation, useGetOpenaiConversation, getListOpenaiConversationsQueryKey, getGetOpenaiConversationQueryKey, useDeleteOpenaiConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Send, Plus, Mic, MicOff, Volume2, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";

export default function AuroraAIPage() {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<"openai" | "gemini">("openai");
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id?: number }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: conversations, isLoading: convsLoading } = useListOpenaiConversations();

  const { data: convData, isLoading: convLoading } = useGetOpenaiConversation(
    activeConvId ?? 0,
    { query: { enabled: activeConvId != null, queryKey: getGetOpenaiConversationQueryKey(activeConvId ?? 0) } }
  );

  const deleteConv = useDeleteOpenaiConversation({
    mutation: {
      onSuccess: (_, variables) => {
        qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeConvId === variables.id) {
          setActiveConvId(null);
          setMessages([]);
        }
        toast({ title: "Conversation deleted", description: "Successfully deleted the chat history." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete conversation", variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    if (convData?.messages) {
      setMessages(convData.messages.map((m: any) => ({ role: m.role, content: m.content, id: m.id })));
    }
  }, [convData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const createConv = useCreateOpenaiConversation({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveConvId(data.id);
        setMessages([]);
      },
    },
  });

  const handleSend = async () => {
    if (!message.trim() || !activeConvId || isStreaming) return;
    const content = message.trim();
    setMessage("");
    setMessages(prev => [...prev, { role: "user", content }]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, model: selectedModel }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processLine(buffer);
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          processLine(line);
        }
      }

      function processLine(line: string) {
        if (!line.startsWith("data: ")) return;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            acc += data.content;
            setStreamingContent(acc);
          }
          if (data.done) {
            setMessages(prev => [...prev, { role: "assistant", content: acc }]);
            setStreamingContent("");
            qc.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeConvId ?? 0) });
          }
        } catch {}
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!activeConvId) {
      toast({ title: "Start a conversation first", description: "Create a new chat to use voice" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setIsProcessingVoice(true);
          try {
            const response = await fetch(`/api/openai/conversations/${activeConvId}/voice-messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64, model: selectedModel }),
            });
            const r = response.body!.getReader();
            const dec = new TextDecoder();
            let userText = "";
            let assistantText = "";
            let audioBase64 = "";
            let buffer = "";

            while (true) {
              const { done, value } = await r.read();
              if (done) {
                if (buffer.trim()) {
                  processLine(buffer);
                }
                break;
              }
              buffer += dec.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                processLine(line);
              }
            }

            function processLine(line: string) {
              if (!line.startsWith("data: ")) return;
              try {
                const d = JSON.parse(line.slice(6));
                if (d.type === "user_transcript") userText = d.data;
                if (d.type === "transcript") assistantText = d.data;
                if (d.type === "audio") audioBase64 = d.data;
                if (d.done) {
                  setMessages(prev => [...prev,
                    { role: "user", content: userText || "[voice message]" },
                    { role: "assistant", content: assistantText },
                  ]);
                  if (audioBase64) {
                    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                    audio.play();
                  }
                  qc.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeConvId ?? 0) });
                }
              } catch {}
            }
          } finally {
            setIsProcessingVoice(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const startNewConversation = () => {
    createConv.mutate({ data: { title: `Chat ${new Date().toLocaleDateString()}` } });
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />Aurora AI
            </h1>
            <p className="text-muted-foreground mt-1">Your personal AI health companion</p>
          </div>
          <Button onClick={startNewConversation} disabled={createConv.isPending} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />New Chat
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
          {/* Sidebar: conversation list */}
          <Card className="lg:col-span-1 overflow-hidden">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-muted-foreground">Conversations</p>
            </div>
            <div className="overflow-y-auto h-full pb-16">
              {convsLoading ? (
                <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : Array.isArray(conversations) && conversations.length > 0 ? (
                conversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center justify-between w-full px-3 py-3 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0 cursor-pointer",
                      activeConvId === conv.id && "bg-primary/10 text-primary hover:bg-primary/10"
                    )}
                    onClick={() => setActiveConvId(conv.id)}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-sm truncate font-medium">{conv.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 pl-5.5">
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm(`Are you sure you want to delete "${conv.title}"?`)) {
                          deleteConv.mutate({ id: conv.id });
                        }
                      }}
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col overflow-hidden">
            {activeConvId ? (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Companion AI Active</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/60">
                    <button
                      onClick={() => setSelectedModel("openai")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                        selectedModel === "openai"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      GPT-4o-mini
                    </button>
                    <button
                      onClick={() => setSelectedModel("gemini")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                        selectedModel === "gemini"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Gemini 2.5 Flash
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {convLoading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-3/4" />)}</div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                      <div>
                        <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary opacity-60" />
                        <p className="font-medium">Hey! I'm Aurora.</p>
                        <p className="text-sm mt-1">Ask me anything about your health, or just say hi!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "assistant" && (
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                        )}
                        <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm")}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {streamingContent && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted">
                        {streamingContent}
                        <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Ask Aurora anything..."
                    disabled={isStreaming || isProcessingVoice}
                    className="flex-1"
                  />
                  <Button onClick={handleVoiceToggle} variant={isRecording ? "destructive" : "outline"} size="icon" disabled={isProcessingVoice} title={isRecording ? "Stop recording" : "Voice message"}>
                    {isProcessingVoice ? <Volume2 className="w-4 h-4 animate-pulse" /> : isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button onClick={handleSend} disabled={!message.trim() || isStreaming} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <Sparkles className="w-14 h-14 mx-auto mb-4 text-primary opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
                  <p className="text-muted-foreground mb-6 max-w-xs">Aurora has full context about your health data and is ready to help you.</p>
                  <Button onClick={startNewConversation} className="gap-2">
                    <Plus className="w-4 h-4" />New Conversation
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
