import apiClient from "./client";

function dateRangeParams({ startDate, endDate } = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return params;
}

export async function fetchMyProgress(range) {
  const { data } = await apiClient.get("/progress/me", { params: dateRangeParams(range) });
  return data;
}

export async function fetchChildProgress(childId) {
  const { data } = await apiClient.get(`/progress/child/${childId}`);
  return data;
}

export async function fetchStudentsOverview(classroomId) {
  const { data } = await apiClient.get("/progress/students", {
    params: classroomId ? { classroom_id: classroomId } : {},
  });
  return data;
}

export async function downloadProgressPdf(range) {
  const response = await apiClient.get("/progress/export.pdf", {
    responseType: "blob",
    params: dateRangeParams(range),
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "bildim-ilerleme.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadProgressExport(range) {
  const response = await apiClient.get("/progress/export", {
    responseType: "blob",
    params: dateRangeParams(range),
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "bildim-ilerleme.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
