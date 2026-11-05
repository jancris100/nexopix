"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "run" | "ok" | "wait" | "fail";
type Step = { id: string; name: string; agent: string; kind: "Regla" | "IA" | "Persona"; state: State; note: string };

const accounts = ["@ticoexpresscr", "@intenexo.cr"];
const networks: Record<string, string[]> = {
  instagram: ["reel", "imagen", "carrusel"],
  facebook: ["video", "imagen"],
  tiktok: ["video"],
};

const blank = (network: string): Step[] => [
  { id: "portero", name: "Validar la petición", agent: "Portero", kind: "Regla", state: "idle", note: "" },
  { id: "enrutar", name: "Elegir el pipeline", agent: "Enrutador", kind: "IA", state: "idle", note: "" },
  { id: "guion", name: "Escribir el guion", agent: "Guionista", kind: "IA", state: "idle", note: "" },
  { id: "video", name: "Preparar la pieza", agent: "Editor", kind: "IA", state: "idle", note: "" },
  { id: "aprobar", name: "Aprobar", agent: "Persona", kind: "Persona", state: "idle", note: "" },
  {
    id: "publicar",
    name: network === "tiktok" ? "Crear tarea manual" : "Publicar por API",
    agent: network === "tiktok" ? "Persona" : "Publicador",
    kind: network === "tiktok" ? "Persona" : "Regla",
    state: "idle",
    note: "",
  },
];

const notes: Record<string, (r: Form) => string> = {
  enrutar: (r) => `Pipeline ${r.format} para ${r.account}`,
  guion: (r) => `Texto de ejemplo para "${r.goal}"`,
  video: (r) => `Pieza de ejemplo en formato ${r.format}`,
};

type Form = { account: string; network: string; format: string; goal: string };

export default function PipelineDemo() {
  const [form, setForm] = useState<Form>({ account: accounts[0], network: "instagram", format: "reel", goal: "Vender el exprimidor" });
  const [steps, setSteps] = useState<Step[]>(blank("instagram"));
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = (id: string, state: State, note = "") =>
    setSteps((all) => all.map((s) => (s.id === id ? { ...s, state, note } : s)));

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  function start(event: React.FormEvent) {
    event.preventDefault();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(blank(form.network));
    setRunning(true);

    const problem = !form.goal.trim()
      ? "Falta el objetivo de la publicación."
      : !networks[form.network].includes(form.format)
        ? `${form.network} no admite el formato ${form.format}.`
        : "";

    later(100, () => patch("portero", "run"));
    later(900, () => {
      if (problem) {
        patch("portero", "fail", problem);
        setRunning(false);
        return;
      }
      patch("portero", "ok", "Cuenta, red y formato válidos");
      ["enrutar", "guion", "video"].forEach((id, i) => {
        later(i * 1000, () => patch(id, "run"));
        later(i * 1000 + 900, () => patch(id, "ok", notes[id](form)));
      });
      later(3000, () => patch("aprobar", "wait", "Esperando tu decisión"));
    });
  }

  function decide(approved: boolean) {
    setRunning(false);
    if (!approved) {
      patch("aprobar", "fail", "Rechazado por la persona; no se publica");
      return;
    }
    patch("aprobar", "ok", "Aprobado");
    patch("publicar", "run");
    const manual = form.network === "tiktok";
    later(900, () => patch("publicar", "ok", manual ? "Tarea agregada a la semana (simulado)" : `Publicado en ${form.account} (simulado)`));
  }

  const waiting = steps.some((s) => s.id === "aprobar" && s.state === "wait");

  return (
    <div className="panel wrap">
      <form className="card" onSubmit={start}>
        <h2>Nueva petición</h2>
        <label>
          Cuenta
          <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            {accounts.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Red
          <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
            {Object.keys(networks).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Formato
          <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
            {["reel", "imagen", "carrusel", "video"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          Objetivo
          <input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
        </label>
        <button className="btn" type="submit" disabled={running}>
          Enviar petición
        </button>
        <p className="hint">Probá TikTok, o un formato que la red no admite, para ver cómo reacciona el pipeline.</p>
      </form>

      <section className="card" aria-live="polite">
        <h2>Pipeline</h2>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.id} className={`step is-${s.state}`}>
              <span className="dot" aria-hidden="true" />
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.agent} · {s.kind}
                  {s.note ? ` · ${s.note}` : ""}
                </small>
              </div>
            </li>
          ))}
        </ol>
        {waiting && (
          <div className="approve">
            <p>¿Aprobás esta publicación para {form.account}?</p>
            <button className="btn" type="button" onClick={() => decide(true)}>
              Aprobar
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => decide(false)}>
              Rechazar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
