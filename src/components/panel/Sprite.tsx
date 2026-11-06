const BODY = [
  "...kkkkkkkkkk...",
  "..kcccccccccck..",
  "..kcllllllllck..",
  "..kclwwllwwlck..",
  "..kclwkllwklck..",
  "..kcllllllllck..",
  "..kcllkkkkllck..",
  "..kccccccccddk..",
  "...kkkkkkkkkk...",
  ".....kcddck.....",
  "....kkkkkkkk....",
];

const TOPS: Record<string, string[]> = {
  enrutador: ["...a........a...", "...a........a...", "...aaaaaaaaaa...", ".......aa.......", ".......kk......."],
  estratega: ["......aaaa......", ".....aaaaaa.....", ".....aaaaaa.....", "......aaaa......", ".......kk......."],
  guionista: ["...........aa...", "..........aaa...", ".........aaa....", "........aaa.....", ".......kk......."],
  programador: [".....aaaaaa.....", ".....a.kk.a.....", ".....a..k.a.....", ".....aaaaaa.....", ".......kk......."],
  analista: ["..........a.....", ".......a..a.....", "....a..a..a.....", "....a..a..a.....", ".......kk......."],
};

const PERSON = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...kssessessk...",
  "...kssssssssk...",
  "...ksssmmsssk...",
  "....kssssssk....",
  ".....kkkkkk.....",
  "....kaaaaaak....",
  "...kaaaaaaaak...",
  "...kaaaaaaaak...",
  "...kaaaaaaaak...",
  "...kkkkkkkkkk...",
  "................",
];

export const AGENT_COLORS: Record<string, { main: string; dark: string; light: string; accent: string }> = {
  enrutador: { main: "#20C997", dark: "#127A5E", light: "#BFF5E4", accent: "#63E6BE" },
  estratega: { main: "#9B7BFF", dark: "#5C42C2", light: "#E2D8FF", accent: "#FFE27A" },
  guionista: { main: "#4FB4FF", dark: "#2169B8", light: "#D3ECFF", accent: "#FF9D7A" },
  programador: { main: "#FF7FA8", dark: "#B83E69", light: "#FFDCE7", accent: "#9FD8FF" },
  analista: { main: "#7FD6D6", dark: "#3A8C8F", light: "#DCF7F5", accent: "#FFC857" },
};

const PERSON_COLORS: Record<string, string> = { k: "#0A1224", h: "#5B3A24", s: "#F2C9A1", e: "#0A1224", m: "#B8754F", a: "#FFC857" };

/** A 16 by 16 character drawn one pixel at a time: it stays sharp at any whole-number size. */
export function Sprite({ agent, size = 96 }: { agent: string; size?: number }) {
  const human = agent === "persona";
  const rows = human ? PERSON : [...(TOPS[agent] ?? TOPS.enrutador), ...BODY];
  const colors = AGENT_COLORS[agent] ?? AGENT_COLORS.enrutador;
  const fills: Record<string, string> = human
    ? PERSON_COLORS
    : { k: "#0A1224", c: colors.main, d: colors.dark, l: colors.light, w: "#FFFFFF", a: colors.accent };
  return (
    <svg className="sprite" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fills[cell]} className={cell === "w" || cell === "e" ? "sprite__eye" : undefined} />
          ),
        ),
      )}
    </svg>
  );
}
