<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { env } from '$env/dynamic/public';

  const API_BASE = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

  let message = "";
  let messages: { sender: string, text: string }[] = [];
  let sessionId: string | null = null;
  let isLoading = false;
  let chatContainer: HTMLElement;

  const scrollToBottom = () => {
    setTimeout(() => { if (chatContainer) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }); }, 50);
  };

  onMount(async () => {
    const savedId = localStorage.getItem('spur_session_id');
    if (savedId) {
      sessionId = savedId;
      try {
        const res = await fetch(`${API_BASE}/chat/history/${sessionId}`);
        if (res.ok) { messages = await res.json(); scrollToBottom(); }
      } catch (e) { console.error("History sync failed"); }
    }
  });

  async function sendMessage() {
    if (!message.trim() || isLoading) return;
    
    const userText = message;
    messages = [...messages, { sender: 'user', text: userText }];
    message = "";
    isLoading = true; // Typing indicator [cite: 37]
    scrollToBottom();

    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.reply) {
        messages = [...messages, { sender: 'ai', text: data.reply }];
        sessionId = data.sessionId;
        localStorage.setItem('spur_session_id', sessionId as string);
      }
    } catch (err: any) {
      // surface clean errors [cite: 87]
      messages = [...messages, { sender: 'ai', text: `⚠️ ${err.message}. Try clearing the chat.` }];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  function resetChat() {
    localStorage.removeItem('spur_session_id');
    location.reload();
  }
</script>

<div class="container">
  <div class="card" in:scale>
    <header class="header">
      <div class="brand">
        <div class="dot"></div>
        <span>Spur Intelligence</span>
      </div>
      <button on:click={resetChat} class="btn-reset">New Chat</button>
    </header>

    <div bind:this={chatContainer} class="chat-box">
      {#each messages as msg}
        <div class="row {msg.sender === 'user' ? 'right' : 'left'}">
          <div class="bubble" in:fade>{msg.text}</div>
        </div>
      {/each}
      {#if isLoading} <div class="typing">Agent is processing...</div> {/if}
    </div>

    <form on:submit|preventDefault={sendMessage} class="footer">
      <input bind:value={message} placeholder="Ask about shipping..." disabled={isLoading} />
      <button type="submit" disabled={!message.trim() || isLoading}>Send</button>
    </form>
  </div>
</div>

<style>
  :global(body) { background: #0a0c10; margin: 0; font-family: sans-serif; }
  .container { height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(#1e293b, #0a0c10); }
  .card { width: 450px; height: 85vh; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
  .header { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; color: white; }
  .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 8px; }
  .btn-reset { background: none; border: 1px solid #334155; color: #94a3b8; font-size: 11px; padding: 4px 8px; cursor: pointer; border-radius: 4px; }
  .chat-box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
  .row { display: flex; }
  .right { justify-content: flex-end; }
  .bubble { max-width: 80%; padding: 10px 15px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
  .right .bubble { background: #3b82f6; color: white; border-bottom-right-radius: 2px; }
  .left .bubble { background: #1e293b; color: #e2e8f0; border-bottom-left-radius: 2px; border: 1px solid #334155; }
  .typing { font-size: 11px; color: #64748b; font-style: italic; }
  .footer { padding: 20px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
  input { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; color: white; outline: none; }
  button[type="submit"] { background: #3b82f6; border: none; color: white; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
  button:disabled { opacity: 0.5; }
</style>