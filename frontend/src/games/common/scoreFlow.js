export function initialScore() {
  return {
    phase: "idle",
    attemptId: null,
    answer: null,
    generation: 0,
    busy: false,
    code: null,
    finishedId: null,
  };
}

function copyAnswer(answer) {
  if (answer == null || typeof answer !== "object") return answer;
  return JSON.parse(JSON.stringify(answer));
}

/** Yeni bulmaca eski isteğin sonucunu düşürür. Aynı deneme açıkken durum korunur. */
export function openAttempt(state, attemptId) {
  const nextId = attemptId ?? null;
  if (state.attemptId === nextId) return state;
  return {
    phase: "idle",
    attemptId: nextId,
    answer: null,
    generation: state.generation + 1,
    busy: false,
    code: null,
    finishedId: null,
  };
}

/**
 * Kayıt sürerken ikinci gönderim yok. Bitmiş deneme yeniden ödül almaz.
 * İstek, o andaki deneme ve cevabı taşır.
 */
export function startScore(state, { attemptId, answer }) {
  if (!attemptId || state.busy || answer == null) return { state, request: null };
  if (state.finishedId === attemptId) return { state, request: null };
  const stored = copyAnswer(answer);
  return {
    state: {
      ...state,
      phase: "saving",
      attemptId,
      answer: stored,
      busy: true,
      code: null,
    },
    request: { attemptId, answer: stored, generation: state.generation },
  };
}

export function applyScoreResult(state, { generation, phase, code = null }) {
  if (generation !== state.generation || !state.busy) return state;
  if (phase === "saved" || phase === "already") {
    return {
      ...state,
      phase,
      busy: false,
      code: null,
      answer: phase === "already" ? null : state.answer,
      finishedId: state.attemptId,
    };
  }
  if (phase === "session") {
    return { ...state, phase: "session", busy: false, code: null };
  }
  return { ...state, phase, busy: false, code };
}

/** Kaydetmeden devam tahtayı silmez. Geç gelen sonuç artık bu kuşağa yazılmaz. */
export function releaseScore(state) {
  if (state.busy) return state;
  if (state.phase !== "offline" && state.phase !== "rejected" && state.phase !== "missing") return state;
  return {
    ...state,
    phase: "released",
    generation: state.generation + 1,
    busy: false,
    code: null,
  };
}
