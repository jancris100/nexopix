/** Each agent's tone: a soft fill for its badge and a strong one for its symbol. */
export const AGENT_TONES: Record<string, { soft: string; strong: string }> = {
  router: { soft: "#E3F1EE", strong: "#0E7C66" },
  strategist: { soft: "#E8E9FB", strong: "#4C55C9" },
  writer: { soft: "#E4EEF8", strong: "#2F6CA8" },
  human: { soft: "#F6EEDD", strong: "#9A6412" },
  scheduler: { soft: "#F3E6EF", strong: "#8C3F78" },
  analyst: { soft: "#E6F0F2", strong: "#2D7286" },
};

const SYMBOLS: Record<string, React.ReactNode> = {
  router: <path d="M4 12h6m0 0 5-5h5m-10 5 5 5h5" />,
  strategist: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    </>
  ),
  writer: <path d="M5 19l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L9.6 17.8 5 19ZM13.5 7.2l3.3 3.3" />,
  human: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </>
  ),
  scheduler: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  analyst: <path d="M4 19h16M6.5 15.5l4-4 3 3 5-6.5" />,
};

/** An agent's badge: its symbol drawn with a fine stroke on its own tone. */
export function AgentMark({ agent, size = 48 }: { agent: string; size?: number }) {
  const tone = AGENT_TONES[agent] ?? AGENT_TONES.router;
  return (
    <span className="mark" style={{ width: size, height: size, background: tone.soft, color: tone.strong }} aria-hidden="true">
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {SYMBOLS[agent] ?? SYMBOLS.router}
      </svg>
    </span>
  );
}

const NAV: Record<string, React.ReactNode> = {
  team: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5m1.5-4.2c2.3-.4 4.6.8 5.5 4.2" />
    </>
  ),
  week: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </>
  ),
  networks: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.3 10.8 7.4-3.6m-7.4 6 7.4 3.6" />
    </>
  ),
  results: <path d="M4 20V10m6 10V4m6 16v-7m6 7H2" />,
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV[name]}
    </svg>
  );
}

/** The Nexopix mark: two nodes joined by one stroke, a request becoming a publication. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#14161A" />
      <path d="M22 42 42 22" stroke="#F4F5F2" strokeWidth="5" strokeLinecap="round" />
      <circle cx="20" cy="44" r="7" fill="#F4F5F2" />
      <circle cx="44" cy="20" r="7" fill="#3FBF9A" />
    </svg>
  );
}
