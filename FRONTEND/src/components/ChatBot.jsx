import { useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import styles from './ChatBot.module.css';

const AVATAR = '/images/clark-chatbot.webp';
const MESSAGE_MAX = 500; // matches MESSAGE_MAX in the portfolio-chat Edge Function
const OFFLINE = 'The assistant is offline right now. You can reach Clark at gemongalaclark.official@gmail.com.';

const SUGGESTIONS = [
  'What services does Clark offer?',
  'What projects has Clark built?',
  'How much does a website cost?',
];

const LINK_RE = /(https?:\/\/[^\s)]*[^\s).,!?]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

async function askAssistant(messages) {
  if (!supabase) throw new Error(OFFLINE);
  const { data, error } = await supabase.functions.invoke('portfolio-chat', { body: { messages } });
  if (error) {
    /* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message. */
    let msg = OFFLINE;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data.reply;
}

/* Makes emails and URLs in a reply clickable. split() puts the captured links at the odd indexes. */
function LinkedText({ text }) {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const isUrl = part.startsWith('http');
    return (
      <a key={i} href={isUrl ? part : `mailto:${part}`} {...(isUrl && { target: '_blank', rel: 'noopener noreferrer' })}>
        {part}
      </a>
    );
  });
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user' | 'model', text }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, sending, error, open]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;
    const previous = messages;
    const next = [...previous, { role: 'user', text: question }];
    setMessages(next);
    setInput('');
    setError('');
    setSending(true);
    try {
      const reply = await askAssistant(next);
      setMessages([...next, { role: 'model', text: reply }]);
    } catch (err) {
      /* Put the question back so the visitor can retry without retyping it. */
      setMessages(previous);
      setInput(question);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <section
          id="chatbot-panel"
          className={styles.panel}
          role="dialog"
          aria-label="Chat with Clark's AI assistant"
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <header className={styles.header}>
            <img src={AVATAR} alt="" className={styles.headerAvatar} width="32" height="44" />
            <div className={styles.headerText}>
              <h2 className={styles.title}>Clark&apos;s AI Assistant</h2>
              <p className={styles.subtitle}>AI, not Clark. May make mistakes.</p>
            </div>
            <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close chat">
              <X size={18} />
            </button>
          </header>

          <div ref={logRef} className={styles.log} role="log" aria-live="polite">
            <p className={`${styles.bubble} ${styles.model}`}>
              Hi! I&apos;m Clark&apos;s AI assistant. Ask me about Clark&apos;s skills, projects or services.
            </p>

            {messages.length === 0 && !sending && (
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" className={styles.suggestion} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <p key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.user : styles.model}`}>
                <LinkedText text={m.text} />
              </p>
            ))}

            {sending && (
              <p className={`${styles.bubble} ${styles.model} ${styles.typing}`} aria-label="The assistant is typing">
                <span /><span /><span />
              </p>
            )}

            {error && <p className={styles.error} role="alert"><LinkedText text={error} /></p>}
          </div>

          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              ref={inputRef}
              id="chatbot-input"
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Clark..."
              aria-label="Your question"
              maxLength={MESSAGE_MAX}
              autoComplete="off"
            />
            <button type="submit" className={styles.sendBtn} disabled={sending || !input.trim()} aria-label="Send">
              <ArrowUp size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        id="chatbot-launcher"
        type="button"
        className={styles.launcher}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="chatbot-panel"
        aria-label={open ? 'Close chat' : "Chat with Clark's AI assistant"}
      >
        <img src={AVATAR} alt="" className={styles.launcherAvatar} width="66" height="90" />
        <span className={styles.aiBadge} aria-hidden="true">AI</span>
      </button>
    </>
  );
}
