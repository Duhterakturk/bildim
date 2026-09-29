import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { fetchMyClassrooms, createClassroom, setStudentPassword } from "../api/classrooms";
import { ClassHomework } from "../components/classroom/ClassHomework";
import { fetchStudentsOverview } from "../api/progress";
import Owl from "../components/owl/Owl";
import { stageFor } from "../components/owl/stages";
import { downloadCertificate, fetchStudentCertificates } from "../api/certificates";
import { btnPrimary, btnSecondary } from "../components/common/buttons";
import { copyText } from "../components/common/copyText";
import { apiErrorText, apiFailure } from "../i18n/apiError";

function StudentPassword({ classroomId, student }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [passwordCopy, setPasswordCopy] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const chosen = password;
    try {
      await setStudentPassword(classroomId, student.id, chosen);
      setPassword("");
      setOpen(false);
      setShown(chosen);
      setPasswordCopy(null);
    } catch (err) {
      setError(apiFailure(err, "account.teacher.passwordError"));
    } finally {
      setBusy(false);
    }
  }

  if (shown) {
    return (
      <div className="text-left">
        <p className="text-slate-700">
          <Trans i18nKey="account.teacher.newPasswordValue" values={{ password: shown }} components={{ code: <span className="font-mono font-bold" /> }} />
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            type="button"
            onClick={async () => setPasswordCopy((await copyText(shown)) ? "ok" : "fail")}
            className="min-h-[44px] font-semibold text-brand-700"
          >
            {t("account.teacher.copyPassword")}
          </button>
          {passwordCopy === "ok" && <p role="status" className="text-sm text-emerald-700">{t("account.teacher.copied")}</p>}
          {passwordCopy === "fail" && <p role="alert" className="text-sm text-red-700">{t("account.teacher.copyError")}</p>}
          <button type="button" onClick={() => setShown(null)} className="text-slate-600 min-h-[44px]">
            {t("account.teacher.close")}
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-slate-700 font-semibold min-h-[44px]">
        {t("account.teacher.password")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2 items-stretch sm:items-end">
      <p className="text-xs text-slate-500">{t("account.teacher.passwordHelp")}</p>
      <label className="text-xs text-slate-600" htmlFor={`pw-${student.id}`}>{t("account.teacher.newPassword")}</label>
      <input
        id={`pw-${student.id}`}
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-2 text-sm w-full sm:w-40 min-h-[44px]"
      />
      {error && <p role="alert" className="text-red-700 text-xs">{apiErrorText(error, t, i18n)}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnSecondary}>{t("account.teacher.passwordSave")}</button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={btnSecondary}
        >
          {t("account.cancel")}
        </button>
      </div>
    </form>
  );
}

export default function TeacherPanel({ embedded = false }) {
  const { t, i18n } = useTranslation();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(false);
  const [studentsReload, setStudentsReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [codeCopy, setCodeCopy] = useState(null);
  const [inviteCopy, setInviteCopy] = useState(null);
  const [certs, setCerts] = useState({});

  const registerUrl = `${window.location.origin}/register`;
  const inviteText = [
    t("account.teacher.inviteGreeting"),
    "",
    t("account.teacher.inviteBody"),
    "",
    t("account.teacher.inviteStepsTitle"),
    "",
    `1. ${t("account.teacher.inviteStep1", { url: registerUrl })}`,
    `2. ${t("account.teacher.inviteStep2")}`,
    `3. ${t("account.teacher.inviteStep3")}`,
    `4. ${t("account.teacher.inviteStep4")}`,
    "",
    t("account.teacher.inviteClose"),
  ].join("\n");

  function loadClassrooms() {
    setLoading(true);
    setLoadError(false);
    fetchMyClassrooms()
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setClassrooms(rows);
        if (rows.length > 0) setSelectedId((prev) => (rows.some((row) => row.id === prev) ? prev : rows[0].id));
        else setSelectedId(null);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(loadClassrooms, []);

  useEffect(() => {
    if (!selectedId) {
      setStudents([]);
      return undefined;
    }
    let cancelled = false;
    setStudents([]);
    setStudentsLoading(true);
    setStudentsError(false);
    setCodeCopy(null);
    fetchStudentsOverview(selectedId)
      .then((data) => {
        if (!cancelled) setStudents([...(Array.isArray(data) ? data : [])].sort((a, b) => b.total_points - a.total_points));
      })
      .catch(() => {
        if (!cancelled) setStudentsError(true);
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, studentsReload]);

  async function handleCreateClassroom(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const classroom = await createClassroom(name);
      setName("");
      setCreating(false);
      setClassrooms((prev) => [...prev, classroom]);
      setSelectedId(classroom.id);
    } catch (err) {
      setError(apiFailure(err, "account.teacher.createError"));
    } finally {
      setBusy(false);
    }
  }

  const locale = i18n.language?.startsWith("en") ? "en" : "tr";
  const formatCount = (value) => new Intl.NumberFormat(locale).format(value ?? 0);

  if (loading) return <p className={embedded ? "text-slate-600" : "max-w-4xl mx-auto px-4 py-10 text-slate-600"} role="status">{t("account.teacher.loading")}</p>;

  if (loadError) {
    return (
      <div className={embedded ? "" : "max-w-4xl mx-auto px-4 py-10"}>
        <p role="alert" className="text-sm text-slate-700">{t("account.teacher.loadError")}</p>
        <button type="button" className={`${btnSecondary} mt-3`} onClick={loadClassrooms}>{t("account.retry")}</button>
      </div>
    );
  }

  const selectedClassroom = classrooms.find((c) => c.id === selectedId);

  return (
    <div className={embedded ? "" : "max-w-4xl mx-auto px-4 py-10"}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3">
          <h2 className="text-lg font-semibold">{t("account.section.siniflar")}</h2>
          <Link to="/games" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-slate-600 underline">
            {t("account.play")}
          </Link>
        </div>
        {classrooms.length > 0 && !creating && (
          <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
            {t("account.teacher.create")}
          </button>
        )}
      </header>

      {classrooms.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-slate-700">{t("account.teacher.empty")}</p>
          {!creating ? (
            <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>{t("account.teacher.first")}</button>
          ) : (
            <CreateForm
              name={name}
              setName={setName}
              busy={busy}
              error={error}
              onSubmit={handleCreateClassroom}
              onCancel={() => { setCreating(false); setError(null); }}
            />
          )}
        </div>
      ) : (
        <>
          {creating && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <CreateForm
                name={name}
                setName={setName}
                busy={busy}
                error={error}
                onSubmit={handleCreateClassroom}
                onCancel={() => { setCreating(false); setError(null); }}
              />
            </div>
          )}

          <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3" aria-label={t("account.section.siniflar")}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("account.section.siniflar")}>
              {classrooms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    "max-w-full whitespace-normal break-words rounded-lg border px-4 py-2 text-left text-sm font-semibold min-h-[44px]",
                    selectedId === c.id
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-brand-50",
                  ].join(" ")}
                >
                  {c.name} ({c.student_count})
                </button>
              ))}
            </div>

            {selectedClassroom && (
              <div className="mt-3 min-w-0 border-t border-slate-100 pt-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="min-w-0 max-w-full break-words font-semibold">{selectedClassroom.name}</p>
                  <p className="break-all font-mono text-base font-bold text-brand-700">{selectedClassroom.join_code}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={`${btnSecondary} shrink-0`}
                      onClick={async () => setCodeCopy((await copyText(selectedClassroom.join_code)) ? "ok" : "fail")}
                    >
                      {t("account.teacher.copyCode")}
                    </button>
                    {codeCopy === "ok" && <p role="status" className="text-sm text-emerald-700">{t("account.teacher.copied")}</p>}
                    {codeCopy === "fail" && <p role="alert" className="text-sm text-red-700">{t("account.teacher.copyError")}</p>}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-600">{t("account.teacher.codeHelp")}</p>
              </div>
            )}
          </section>

          {selectedClassroom && (
            <ClassHomework classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} />
          )}

          <section className="mb-4">
            <h3 className="mb-2 text-base font-semibold">{t("account.teacher.students")}</h3>
            {studentsLoading ? (
              <p className="text-sm text-slate-600" role="status">{t("account.teacher.loading")}</p>
            ) : studentsError ? (
              <div>
                <p role="alert" className="text-sm text-slate-700">{t("account.teacher.studentsError")}</p>
                <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setStudentsReload((n) => n + 1)}>{t("account.retry")}</button>
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-600">{t("account.teacher.studentsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2 whitespace-nowrap">{t("account.teacher.student")}</th>
                      <th className="px-4 py-2 whitespace-nowrap">{t("account.teacher.grade")}</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">{t("account.teacher.completed")}</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">{t("account.teacher.distinctGames")}</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">{t("account.teacher.points")}</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">{t("account.teacher.certificate")}</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">{t("account.teacher.passwordColumn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((row) => (
                      <tr key={row.student.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-2 font-medium text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Owl stage={stageFor(row.total_completed)} caption={false} className="w-8 h-8 shrink-0" />
                            <span className="break-words">
                              {row.student.full_name}
                              {row.student.active_title && (
                                <span className="block text-xs text-slate-500">{t(`titles.${row.student.active_title.split(":")[1]}`)}</span>
                              )}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{row.student.grade_level == null ? "-" : formatCount(row.student.grade_level)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{formatCount(row.total_completed)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{formatCount(row.distinct_games_completed)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-700 whitespace-nowrap">{formatCount(row.total_points)}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            className="text-slate-700 font-semibold min-h-[44px]"
                            onClick={() => fetchStudentCertificates(row.student.id).then((list) => setCerts((prev) => ({ ...prev, [row.student.id]: list }))).catch(() => {})}
                          >
                            {t("account.teacher.certificates")}
                          </button>
                          {(certs[row.student.id] || []).filter((item) => item.earned).map((item) => (
                            <button key={item.id} type="button" className="block ml-auto text-xs text-slate-600 min-h-[44px]" onClick={() => downloadCertificate(item.id)}>
                              {t(`certs.${item.kind}`, { defaultValue: item.kind })}
                            </button>
                          ))}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <StudentPassword classroomId={selectedId} student={row.student} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <details className="rounded-xl border border-slate-200 bg-white px-4 py-2">
        <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">{t("account.teacher.invite")}</summary>
        <p className="text-sm text-slate-600 mt-3 mb-3">{t("account.teacher.inviteNote")}</p>
        <div className="text-sm mb-3 space-y-3">
          <p>{t("account.teacher.inviteGreeting")}</p>
          <p>{t("account.teacher.inviteBody")}</p>
          <p>{t("account.teacher.inviteStepsTitle")}</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><Trans i18nKey="account.teacher.inviteStep1Html" values={{ url: registerUrl }} components={{ b: <strong />, url: <span className="break-all" /> }} /></li>
            <li><Trans i18nKey="account.teacher.inviteStep2Html" components={{ b: <strong /> }} /></li>
            <li><Trans i18nKey="account.teacher.inviteStep3Html" components={{ b: <strong /> }} /></li>
            <li><Trans i18nKey="account.teacher.inviteStep4Html" components={{ b: <strong /> }} /></li>
          </ol>
          <p>{t("account.teacher.inviteClose")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={async () => setInviteCopy((await copyText(inviteText)) ? "ok" : "fail")} className={btnSecondary}>
            {t("account.teacher.copyInvite")}
          </button>
          {inviteCopy === "ok" && <p role="status" className="text-sm text-emerald-700">{t("account.teacher.copied")}</p>}
          {inviteCopy === "fail" && <p role="alert" className="text-sm text-red-700">{t("account.teacher.copyError")}</p>}
        </div>
      </details>
    </div>
  );
}

function CreateForm({ name, setName, busy, error, onSubmit, onCancel }) {
  const { t, i18n } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="class-name" className="block text-sm font-medium">{t("account.teacher.name")}</label>
      <input
        id="class-name"
        type="text"
        required
        placeholder={t("account.teacher.namePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
      />
      {error && <p role="alert" className="text-red-700 text-sm">{apiErrorText(error, t, i18n)}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? t("account.teacher.saving") : t("account.teacher.save")}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={btnSecondary}>{t("account.cancel")}</button>
      </div>
    </form>
  );
}
