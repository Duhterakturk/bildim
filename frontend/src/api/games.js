import apiClient, { withWake } from "./client";

export async function fetchGames() {
  return withWake(async () => {
    const { data } = await apiClient.get("/games");
    return data;
  });
}

export async function fetchGame(slug) {
  const { data } = await apiClient.get(`/games/${slug}`);
  return data;
}

export const BADGES_EARNED_EVENT = "mindarena:badges-earned";
export const STARS_EVENT = "mindarena:stars";

export async function openPuzzle(slug, difficulty = "easy") {
  return withWake(async () => {
    const { data } = await apiClient.post("/puzzles", { slug, difficulty, mode: new URLSearchParams(window.location.search).get("mode") === "turnuva" ? "tournament" : undefined });
    return data;
  });
}

function publishHintBalance(data) {
  if (typeof data?.hint_balance === "number") {
    window.dispatchEvent(new CustomEvent("mindarena:hints", { detail: { balance: data.hint_balance } }));
  }
}

export async function checkPuzzle(attemptId, answer, fullResponse = false) {
  const { data } = await apiClient.post(`/puzzles/${attemptId}/check`, { answer });
  publishHintBalance(data);
  if (data?.stars) window.dispatchEvent(new CustomEvent(STARS_EVENT, { detail: data.stars }));
  return fullResponse ? data : data.correct;
}

export async function openCellHint(attemptId, round) {
  const body = Number.isInteger(round) ? { round } : {};
  const { data } = await apiClient.post(`/puzzles/${attemptId}/cell`, body);
  return data;
}

export async function submitScore(payload) {
  const { data } = await apiClient.post("/scores", payload);
  if (data.new_badges && data.new_badges.length > 0) {
    window.dispatchEvent(new CustomEvent(BADGES_EARNED_EVENT, { detail: data.new_badges }));
  }
  window.dispatchEvent(new CustomEvent("mindarena:score-saved"));
  if (data?.stars) window.dispatchEvent(new CustomEvent(STARS_EVENT, { detail: data.stars }));
  publishHintBalance(data);
  return data;
}
