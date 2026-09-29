import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../components/common/Modal";
import Owl from "../components/owl/Owl";
import ThemePreview from "../components/shop/ThemePreview";
import { buyItem, equipItem, fetchProfile, fetchShop } from "../api/shop";
import { startTrial } from "../components/shop/themeTrial";
import { apiErrorText, apiFailure } from "../i18n/apiError";

const TABS = ["theme", "collection", "background"];

function Preview({ item, large = false }) {
  return <ThemePreview item={item} className={large ? "w-full h-64" : "w-full h-28"} />;
}

function OwlPhoto({ item, owned, large = false }) {
  const legendary = item.rarity === "legendary";
  return (
    <div className={`relative overflow-hidden rounded-xl ${large ? "" : ""}`} data-testid="preview">
      <img
        src={`/owls/${item.photo}`}
        alt=""
        loading="lazy"
        data-owned={owned ? "1" : "0"}
        className={`w-full object-cover ${large ? "h-64" : "h-40"} ${owned ? "" : "grayscale blur-sm"} ${legendary ? "owl-photo" : ""}`}
      />
      {legendary && <span className="owl-shimmer" aria-hidden="true" />}
    </div>
  );
}

export default function Shop() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("theme");
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  const lang = i18n.language?.startsWith("en") ? "en" : "tr";

  useEffect(() => {
    fetchShop()
      .then((data) => {
        setState(data);
        window.dispatchEvent(new CustomEvent("mindarena:stars", { detail: { star_balance: data.star_balance } }));
      })
      .catch(() => setError({ fallback: "shop.loadError" }));
    fetchProfile().then(setProfile).catch(() => {});
  }, [t]);

  function show(item, node) {
    opener.current = node;
    setOpen(item);
  }

  async function buy(id) {
    setError(null);
    try {
      const next = await buyItem(id);
      setState(next);
      window.dispatchEvent(new CustomEvent("mindarena:stars", { detail: { star_balance: next.star_balance } }));
      setOpen((current) => next.items.find((item) => item.id === current?.id) || null);
      fetchProfile().then(setProfile).catch(() => {});
    } catch (err) {
      setError(apiFailure(err, "shop.fail"));
    }
  }

  async function wear(id) {
    setError(null);
    try {
      const next = await equipItem(id);
      setState(next);
      setOpen((current) => next.items.find((item) => item.id === current?.id) || null);
    } catch (err) {
      setError(apiFailure(err, "shop.fail"));
    }
  }

  function tryOn(item) {
    startTrial(item);
    setOpen(null);
  }

  if (!state) return <p className="px-4 py-10 text-slate-400">{t("shop.loading")}</p>;

  const stage = profile?.stage || "egg";
  const items = state.items.filter((item) => (tab === "collection" ? item.type === "owl" : item.type === tab));
  const short = open && !open.owned ? Math.max(0, open.price - state.star_balance) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="scene-label text-2xl font-bold mb-1">{t("shop.title")}</h1>
      <p className="scene-label mb-4" data-testid="shop-balance">⭐ {state.star_balance}</p>
      <div className="mb-4 flex justify-center">
        <Owl stage={stage} className="w-28" data-shop-owl="1" />
      </div>
      {error && <p role="alert" className="mb-4 text-red-400">{apiErrorText(error, t, i18n)}</p>}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "scene-tab-on" : "scene-chip"}`}
          >
            {t(`shop.tab.${key}`)}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const need = Math.max(0, item.price - state.star_balance);
          const legendary = item.rarity === "legendary";
          return (
            <li key={item.id}>
              <article
                className={`bg-white text-slate-900 rounded-2xl p-4 cursor-pointer ${legendary ? "owl-legendary" : ""}`}
                data-testid={`card-${item.id}`}
                data-rarity={item.rarity || ""}
                tabIndex={0}
                aria-haspopup="dialog"
                onClick={(event) => {
                  if (event.target.closest("button")) return;
                  show(item, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  show(item, event.currentTarget);
                }}
              >
                {item.type === "owl" ? <OwlPhoto item={item} owned={item.owned} /> : <Preview item={item} />}
                {item.type === "owl" ? (
                  <>
                    <p className="font-semibold mt-2">{lang === "en" ? item.name_en : item.name_tr}</p>
                    <p className="text-sm mt-1">{lang === "en" ? item.fact_en : item.fact_tr}</p>
                    <p className="text-sm font-semibold mt-1">{t(`shop.rarity.${item.rarity}`)}</p>
                  </>
                ) : (
                  <p className="font-semibold mt-2">{lang === "en" ? item.name_en : item.name_tr}</p>
                )}
                <p className="text-sm text-slate-500">⭐ {item.price}</p>
                {item.owned ? (
                  <p className="text-sm mt-2">
                    {t("shop.owned")}{" "}
                    {item.type !== "owl" && (
                      <button
                        type="button"
                        className="font-semibold text-brand-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          wear(item.id);
                        }}
                      >
                        {item.equipped ? t("shop.inUse") : t("shop.use")}
                      </button>
                    )}
                  </p>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      data-testid={`buy-${item.id}`}
                      disabled={need > 0}
                      className={`text-sm font-semibold ${need > 0 ? "text-slate-600 cursor-not-allowed" : "text-brand-700"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (need === 0) buy(item.id);
                      }}
                    >
                      {t("shop.buy")}
                    </button>
                    {need > 0 && <p className="text-xs text-slate-600">{t("shop.short", { count: need })}</p>}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {open && (
        <Modal
          onClose={() => setOpen(null)}
          labelledBy={titleId}
          describedBy={bodyId}
          returnTo={opener}
          testId="preview-dialog"
          overlayClassName="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          panelClassName="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900"
          footer={(
            <button
              type="button"
              data-dialog-close
              className="mx-auto mt-3 block min-h-[44px] shrink-0 bg-white px-3 text-sm text-slate-500"
              onClick={() => setOpen(null)}
            >
              {t("shop.close")}
            </button>
          )}
        >
          {open.type === "owl" ? <OwlPhoto item={open} owned={open.owned} large /> : <Preview item={open} large />}
          {open.type === "owl" ? (
            <>
              <h2 id={titleId} className="mt-3 text-center text-lg font-bold">{lang === "en" ? open.name_en : open.name_tr}</h2>
              <p id={bodyId} className="mt-2 text-center text-sm">{lang === "en" ? open.fact_en : open.fact_tr}</p>
              <p className="mt-1 text-center text-sm font-semibold">{t(`shop.rarity.${open.rarity}`)}</p>
            </>
          ) : (
            <h2 id={titleId} className="mt-3 text-center text-lg font-bold">{lang === "en" ? open.name_en : open.name_tr}</h2>
          )}
          <p id={open.type === "owl" ? undefined : bodyId} className="mt-1 text-center text-sm text-slate-500">⭐ {open.price}</p>
          <div className="mt-4 flex justify-center gap-3">
            {open.type !== "owl" && (
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={() => tryOn(open)}>
                {t("shop.try")}
              </button>
            )}
            {open.owned ? (
              open.type !== "owl" && (
                <button type="button" className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white" onClick={() => wear(open.id)}>
                  {open.equipped ? t("shop.inUse") : t("shop.use")}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={short > 0}
                className={`rounded-lg px-4 py-2 font-semibold ${short > 0 ? "bg-slate-200 text-slate-600" : "bg-brand-500 text-white"}`}
                onClick={() => short === 0 && buy(open.id)}
              >
                {t("shop.buy")}
              </button>
            )}
          </div>
          {short > 0 && <p className="mt-2 text-center text-sm text-slate-500">{t("shop.short", { count: short })}</p>}
        </Modal>
      )}
    </div>
  );
}
