export function toReadableError(err: any) {
  const data = err?.response?.data;

  if (data?.message) {
    return String(data.message);
  }

  if (Array.isArray(data?.errors)) {
    const msgs = data.errors
      .map((e: any) => e?.message ?? e)
      .filter(Boolean)
      .map(String);
    if (msgs.length) return msgs.join('\n');
  }

  if (data && typeof data !== 'string') {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      // ignore
    }
  }

  if (err?.message) {
    return String(err.message);
  }

  return 'Something went wrong.';
}

