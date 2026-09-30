import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkPuzzle } from "../../api/games";

export default function TournamentQuestion() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "tr";
  const [attempt,setAttempt]=useState(null),[choice,setChoice]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const active=useRef(null);
  useEffect(()=>{
    const handle=e=>{active.current=e.detail?.id;setAttempt(e.detail);setChoice(null);setResult(null);setBusy(false);setError(false);};
    window.addEventListener("mindarena:attempt",handle);return()=>window.removeEventListener("mindarena:attempt",handle);
  },[]);
  const q=attempt?.tournament;
  if(!q)return null;
  async function submit(){
    const id=attempt.id;setBusy(true);setError(false);
    try {
      const response=await checkPuzzle(id,{option:choice},true);
      if(active.current===id)setResult(response);
    }catch {if(active.current===id)setError(true);}
    finally {if(active.current===id)setBusy(false);}
  }
  const marked=new Set(q.cells.map(([r,c])=>`${r}-${c}`));
  return <section className="mb-6 rounded-xl border border-slate-300 bg-white p-4 text-slate-900" aria-label={t("tournament.title")}>
    <h2 className="font-bold text-lg">{t("tournament.title")}</h2>
    <p className="my-2">{q.text[lang]}</p>
    <p className="text-sm mb-3">{t("tournament.help")}</p>
    <div className="flex flex-wrap items-start gap-5">
      <div role="img" aria-label={q.cells.map(([r,c])=>`${r+1},${c+1}`).join("; ")} className="grid border border-slate-400" style={{gridTemplateColumns:`repeat(${q.cols}, 18px)`}}>
        {Array.from({length:q.rows*q.cols},(_,i)=>{const r=Math.floor(i/q.cols),c=i%q.cols;return <span key={i} className={`h-[18px] border border-slate-300 text-center text-xs ${marked.has(`${r}-${c}`)?"bg-sky-200":"bg-white"}`}>{marked.has(`${r}-${c}`)?"?":""}</span>;})}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("tournament.options")}>
        {q.options.map((option,i)=><button key={i} type="button" aria-pressed={choice===i} disabled={busy||!!result} onClick={()=>setChoice(i)} className={`min-h-[44px] rounded-lg border px-3 py-2 ${choice===i?"bg-slate-800 text-white":"bg-white text-slate-900"}`}>{String.fromCharCode(65+i)}) {option[lang]}</button>)}
      </div>
    </div>
    <button type="button" className="mt-3 min-h-[44px] rounded-lg bg-slate-800 px-4 py-2 text-white disabled:opacity-50" disabled={choice===null||busy||!!result} onClick={submit}>{t("tournament.submit")}</button>
    {result&&<p role="status" className="mt-2 font-semibold">{result.correct?t("tournament.correct"):t("tournament.wrong")} {t("tournament.answer")}: {q.options[result.correct_option]?.[lang]}</p>}
    {error&&<p role="alert">{t("tournament.error")}</p>}
  </section>;
}
