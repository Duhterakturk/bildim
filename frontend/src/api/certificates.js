import apiClient from "./client";

export async function fetchMyCertificates() {
  const { data } = await apiClient.get("/certificates/me");
  return data;
}

export async function fetchStudentCertificates(studentId) {
  const { data } = await apiClient.get(`/certificates/student/${studentId}`);
  return data;
}

export async function downloadCertificate(id) {
  const { data } = await apiClient.get(`/certificates/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bildim-sertifika.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
