export function apiFailure(err, fallback) {
  const data = err?.response?.data;
  const count = Number(data?.count);
  return {
    code: typeof data?.code === "string" ? data.code : null,
    count: Number.isFinite(count) ? count : undefined,
    fallback,
  };
}

export function apiErrorText(error, t, i18n) {
  if (!error) return "";
  if (error.code && i18n.exists(`errors.${error.code}`)) {
    return t(`errors.${error.code}`, { count: error.count });
  }
  return t(error.fallback);
}
