import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMyClassrooms, createClassroom, setStudentPassword } from "../api/classrooms";
import { ClassHomework } from "../components/classroom/ClassHomework";
import { fetchStudentsOverview } from "../api/progress";
import Owl from "../components/owl/Owl";
import { stageFor } from "../components/owl/stages";
import { downloadCertificate, fetchStudentCertificates } from "../api/certificates";

function StudentPassword({ classroomId, student }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const chosen = password;
    try {
      await setStudentPassword(classroomId, student.id, chosen);
      setPassword("");
      setOpen(false);
      setShown(chosen);
      setCopiedPassword(false);
    } catch (err) {
      setError(err.response?.data?.error || "Şifre kaydedilemedi. Yeniden deneyebilirsiniz.");
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(shown);
    } catch {
      const area = document.createElement("textarea");
      area.value = shown;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedPassword(true);
  }

  if (shown) {
    return (
      <div className="text-left">
        <p className="text-slate-700">
          Yeni şifre: <span className="font-mono font-bold">{shown}</span>
        </p>
        <div className="flex gap-2 mt-1">
          <button type="button" onClick={copyPassword} className="text-brand-600 font-semibold">
            {copiedPassword ? "Kopyalandı" : "Şifreyi Kopyalayın"}
          </button>
          <button type="button" onClick={() => setShown(null)} className="text-slate-500">
            Kapatın
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-brand-600 font-semibold">
        Şifre Belirleyin
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-1 items-end">
      <input
        type="text"
        required
        minLength={8}
        autoComplete="off"
        placeholder="En az 8 karakter"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-36"
      />
      <div className="flex gap-2">
        <button type="submit" className="text-brand-600 font-semibold">
          Kaydedin
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
          className="text-slate-500"
        >
          Vazgeç
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </form>
  );
}

export default function TeacherPanel() {
  const { t } = useTranslation();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [certs, setCerts] = useState({});

  const registerUrl = `${window.location.origin}/register`;
  const inviteText = `Sayın Velilerim,

MindArena, çocuklarımızın diledikleri zaman kullanabilecekleri, bulmaca ve düşünme etkinlikleri içeren bir uygulamadır. Ayrıca uygulama üzerinden zaman zaman deneme çalışmaları da paylaşabilirim.

Katılmak isterseniz aşağıdaki adımları takip edebilirsiniz:

1. Paylaşacağım adres üzerinden öğrenci olarak kayıt olabilirsiniz: ${registerUrl}
2. Kayıt sırasında bir şifre belirlemeniz yeterlidir.
3. Şifrenin unutulması durumunda, belirlediğiniz hatırlatma kelimesini kullanarak yeni bir şifre oluşturabilirsiniz.
4. Kayıt işlemi tamamlandıktan sonra, paylaşacağım sınıf kodunu “Panelim” sayfasına girerek sınıfa katılabilirsiniz.

Uygulamayı kullanmak isteyen öğrencilerimiz bu şekilde sınıfımıza dahil olabilirler.`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteText);
    } catch {
      const area = document.createElement("textarea");
      area.value = inviteText;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
  }

  function loadClassrooms() {
    fetchMyClassrooms()
      .then((data) => {
        setClassrooms(data);
        if (data.length > 0) setSelectedId((prev) => prev || data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(loadClassrooms, []);

  useEffect(() => {
    if (!selectedId) return;
    setStudentsLoading(true);
    fetchStudentsOverview(selectedId)
      .then((data) => setStudents([...data].sort((a, b) => b.total_points - a.total_points)))
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, [selectedId]);

  async function handleCreateClassroom(e) {
    e.preventDefault();
    setError(null);
    try {
      const classroom = await createClassroom(name);
      setName("");
      setClassrooms((prev) => [...prev, classroom]);
      setSelectedId(classroom.id);
    } catch (err) {
      setError(err.response?.data?.error || "Sınıf oluşturulamadı. Yeniden deneyebilirsiniz.");
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500">Yükleniyor...</div>;

  const selectedClassroom = classrooms.find((c) => c.id === selectedId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Öğretmen Paneli</h1>
      <p className="text-slate-600 mb-8">
        Sınıflarınız burada listelenir. Katılım kodunu paylaştığınızda öğrenciler kendiliğinden görünür.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold mb-2">Sınıf grubuna not</h2>
        <p className="text-sm text-slate-600 mb-3">
          Bu not sınıf grubuna bir kez bırakılabilir. Kayıt ve şifre ailede kalır.
        </p>
        <div className="text-sm whitespace-pre-wrap mb-3 space-y-3">
          <p>Sayın Velilerim,</p>
          <p>
            MindArena, çocuklarımızın diledikleri zaman kullanabilecekleri, bulmaca ve düşünme etkinlikleri içeren bir uygulamadır. Ayrıca uygulama üzerinden zaman zaman deneme çalışmaları da paylaşabilirim.
          </p>
          <p>Katılmak isterseniz aşağıdaki adımları takip edebilirsiniz:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Paylaşacağım adres üzerinden <strong>öğrenci olarak kayıt</strong> olabilirsiniz: {registerUrl}
            </li>
            <li>
              Kayıt sırasında bir <strong>şifre belirlemeniz</strong> yeterlidir.
            </li>
            <li>
              Şifrenin unutulması durumunda, belirlediğiniz <strong>hatırlatma kelimesini</strong> kullanarak yeni bir şifre oluşturabilirsiniz.
            </li>
            <li>
              Kayıt işlemi tamamlandıktan sonra, paylaşacağım <strong>sınıf kodunu “Panelim” sayfasına</strong> girerek sınıfa katılabilirsiniz.
            </li>
          </ol>
          <p>Uygulamayı kullanmak isteyen öğrencilerimiz bu şekilde sınıfımıza dahil olabilirler.</p>
        </div>
        <button
          type="button"
          onClick={copyInvite}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600"
        >
          {copied ? "Kopyalandı" : "Notu Kopyalayın"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold mb-3">Yeni Sınıf Oluştur</h2>
        <form onSubmit={handleCreateClassroom} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Örn. 3-A Sınıfı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 text-sm"
          >
            Sınıfı Oluşturun
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {classrooms.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Henüz bir sınıf yok. Bir ad yazmanız yeterli. Kod, sınıf oluşunca görünür.
        </p>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {classrooms.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold border",
                  selectedId === c.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-brand-50",
                ].join(" ")}
              >
                {c.name} ({c.student_count})
              </button>
            ))}
          </div>

          {selectedClassroom && (
            <ClassHomework classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} />
          )}

          {selectedClassroom && (
            <p className="text-sm text-slate-600 mb-4">
              Sınıf kodu:{" "}
              <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                {selectedClassroom.join_code}
              </span>{" "}
              — öğrenciler bu kodu Panelim sayfasından girebilir.
            </p>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {studentsLoading ? (
              <p className="text-slate-500 text-sm p-6">Yükleniyor...</p>
            ) : students.length === 0 ? (
              <p className="text-slate-500 text-sm p-6">Bu sınıfta henüz öğrenci yok.</p>
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
                      <th className="px-4 py-2 text-right whitespace-nowrap">Şifre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((row) => (
                      <tr key={row.student.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <Owl stage={stageFor(row.total_completed)} caption={false} className="w-8 h-8 shrink-0" />
                            <span>
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
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="text-brand-600 font-semibold"
                            onClick={() => fetchStudentCertificates(row.student.id).then((list) => setCerts((prev) => ({ ...prev, [row.student.id]: list })))}
                          >
                            Sertifikalar
                          </button>
                          {(certs[row.student.id] || []).filter((item) => item.earned).map((item) => (
                            <button key={item.id} type="button" className="block ml-auto text-xs text-slate-600" onClick={() => downloadCertificate(item.id)}>
                              {item.kind}
                            </button>
                          ))}
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
    </div>
  );
}
