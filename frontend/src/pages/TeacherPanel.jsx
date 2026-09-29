import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMyClassrooms, createClassroom, setStudentPassword } from "../api/classrooms";
import { ClassHomework } from "../components/classroom/ClassHomework";
import { fetchStudentsOverview } from "../api/progress";
import Owl from "../components/owl/Owl";
import { stageFor } from "../components/owl/stages";
import { downloadCertificate, fetchStudentCertificates } from "../api/certificates";
import { btnPrimary, btnSecondary } from "../components/common/buttons";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function StudentPassword({ classroomId, student }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
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
      setCopiedPassword(false);
    } catch (err) {
      setError(err.response?.data?.error || t("account.teacher.passwordError"));
    } finally {
      setBusy(false);
    }
  }

  if (shown) {
    return (
      <div className="text-left">
        <p className="text-slate-700">
          Yeni şifre: <span className="font-mono font-bold">{shown}</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <button type="button" onClick={async () => { await copyText(shown); setCopiedPassword(true); }} className="text-brand-700 font-semibold min-h-[44px]">
            {copiedPassword ? t("account.teacher.copied") : "Şifreyi Kopyalayın"}
          </button>
          <button type="button" onClick={() => setShown(null)} className="text-slate-600 min-h-[44px]">
            Kapatın
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
      <label className="text-xs text-slate-600" htmlFor={`pw-${student.id}`}>Yeni şifre</label>
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
      {error && <p role="alert" className="text-red-700 text-xs">{error}</p>}
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
  const { t } = useTranslation();
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [certs, setCerts] = useState({});

  const registerUrl = `${window.location.origin}/register`;
  const inviteText = `Sayın Velilerim,

MindArena, çocuklarımızın diledikleri zaman kullanabilecekleri, bulmaca ve düşünme etkinlikleri içeren bir uygulamadır. Ayrıca uygulama üzerinden zaman zaman deneme çalışmaları da paylaşabilirim.

Katılmak isterseniz aşağıdaki adımları takip edebilirsiniz:

1. Paylaşacağım adres üzerinden öğrenci olarak kayıt olabilirsiniz: ${registerUrl}
2. Kayıt sırasında bir şifre belirlemeniz yeterlidir.
3. Şifrenin unutulması durumunda, belirlediğiniz hatırlatma kelimesini kullanarak yeni bir şifre oluşturabilirsiniz.
4. Kayıt işlemi tamamlandıktan sonra, paylaşacağım sınıf kodunu “Hesabım” sayfasına girerek sınıfa katılabilirsiniz.

Uygulamayı kullanmak isteyen öğrencilerimiz bu şekilde sınıfımıza dahil olabilirler.`;

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
    setStudentsLoading(true);
    setStudentsError(false);
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
      setError(err.response?.data?.error || t("account.teacher.createError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={embedded ? "text-slate-600" : "max-w-4xl mx-auto px-4 py-10 text-slate-600"} role="status">Yükleniyor...</p>;

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="rounded-xl bg-white/95 px-4 py-3">
          <h2 className="text-lg font-semibold">{t("account.section.siniflar")}</h2>
          <p className="text-sm text-slate-700 mt-1">{t("account.teacher.lead")}</p>
        </div>
        <Link to="/games" className={btnSecondary}>{t("account.play")}</Link>
      </div>

      {classrooms.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
          <p className="text-slate-700 mb-4">{t("account.teacher.empty")}</p>
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
          <div className="mb-4">
            {!creating ? (
              <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>{t("account.teacher.create")}</button>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
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
          </div>

          <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label={t("account.section.siniflar")}>
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={selectedId === c.id}
                onClick={() => { setSelectedId(c.id); setCopiedCode(false); }}
                className={[
                  "max-w-full break-words px-4 py-2 rounded-lg text-sm font-semibold border min-h-[44px] text-left",
                  selectedId === c.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-brand-50",
                ].join(" ")}
              >
                {c.name} ({c.student_count})
              </button>
            ))}
          </div>

          {selectedClassroom && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
              <h3 className="text-lg font-semibold break-words">{selectedClassroom.name}</h3>
              <p className="text-sm text-slate-600 mt-2">{t("account.teacher.code")}</p>
              <p className="font-mono font-bold text-brand-700 bg-brand-50 inline-block px-2 py-1 rounded mt-1 break-all">
                {selectedClassroom.join_code}
              </p>
              <p className="text-sm text-slate-600 mt-2">{t("account.teacher.codeHelp")}</p>
              <button
                type="button"
                className={`${btnSecondary} mt-3`}
                onClick={async () => { await copyText(selectedClassroom.join_code); setCopiedCode(true); }}
              >
                {copiedCode ? t("account.teacher.copied") : t("account.teacher.copyCode")}
              </button>
            </div>
          )}

          {selectedClassroom && (
            <ClassHomework classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} />
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <h3 className="px-6 pt-6 text-lg font-semibold">Öğrenciler</h3>
            {studentsLoading ? (
              <p className="text-slate-600 text-sm p-6" role="status">Yükleniyor...</p>
            ) : studentsError ? (
              <div className="p-6">
                <p role="alert" className="text-sm text-slate-700">{t("account.teacher.studentsError")}</p>
                <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setStudentsReload((n) => n + 1)}>{t("account.retry")}</button>
              </div>
            ) : students.length === 0 ? (
              <p className="text-slate-600 text-sm p-6">{t("account.teacher.studentsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2 whitespace-nowrap">Öğrenci</th>
                      <th className="px-4 py-2 whitespace-nowrap">Sınıf Seviyesi</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Tamamlanan</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Farklı Oyun</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Toplam Puan</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Sertifika</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Şifre</th>
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
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{row.student.grade_level ?? "-"}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{row.total_completed}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{row.distinct_games_completed}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-700 whitespace-nowrap">{row.total_points}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            className="text-slate-700 font-semibold min-h-[44px]"
                            onClick={() => fetchStudentCertificates(row.student.id).then((list) => setCerts((prev) => ({ ...prev, [row.student.id]: list }))).catch(() => {})}
                          >
                            Sertifikalar
                          </button>
                          {(certs[row.student.id] || []).filter((item) => item.earned).map((item) => (
                            <button key={item.id} type="button" className="block ml-auto text-xs text-slate-600 min-h-[44px]" onClick={() => downloadCertificate(item.id)}>
                              {item.kind}
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
          </div>
        </>
      )}

      <details className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">{t("account.teacher.invite")}</summary>
        <p className="text-sm text-slate-600 mt-3 mb-3">Bu not ailelere bir kez bırakılabilir. Kayıt ve şifre ailede kalır.</p>
        <div className="text-sm whitespace-pre-wrap mb-3 space-y-3">
          <p>Sayın Velilerim,</p>
          <p>
            MindArena, çocuklarımızın diledikleri zaman kullanabilecekleri, bulmaca ve düşünme etkinlikleri içeren bir uygulamadır. Ayrıca uygulama üzerinden zaman zaman deneme çalışmaları da paylaşabilirim.
          </p>
          <p>Katılmak isterseniz aşağıdaki adımları takip edebilirsiniz:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Paylaşacağım adres üzerinden <strong>öğrenci olarak kayıt</strong> olabilirsiniz: {registerUrl}</li>
            <li>Kayıt sırasında bir <strong>şifre belirlemeniz</strong> yeterlidir.</li>
            <li>Şifrenin unutulması durumunda, belirlediğiniz <strong>hatırlatma kelimesini</strong> kullanarak yeni bir şifre oluşturabilirsiniz.</li>
            <li>Kayıt işlemi tamamlandıktan sonra, paylaşacağım <strong>sınıf kodunu “Hesabım” sayfasına</strong> girerek sınıfa katılabilirsiniz.</li>
          </ol>
          <p>Uygulamayı kullanmak isteyen öğrencilerimiz bu şekilde sınıfımıza dahil olabilirler.</p>
        </div>
        <button type="button" onClick={async () => { await copyText(inviteText); setCopied(true); }} className={btnSecondary}>
          {copied ? t("account.teacher.copied") : t("account.teacher.copyInvite")}
        </button>
      </details>
    </div>
  );
}

function CreateForm({ name, setName, busy, error, onSubmit, onCancel }) {
  const { t } = useTranslation();
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
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? t("account.teacher.saving") : t("account.teacher.save")}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={btnSecondary}>{t("account.cancel")}</button>
      </div>
    </form>
  );
}
