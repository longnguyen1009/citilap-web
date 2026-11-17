export function variantSpecs(
  base: Array<{ key: string; value: string }>,
  options?: Record<string, string>,
) {
  const result = base.map(row => ({ ...row }));
  for (const [key, value] of Object.entries(options || {})) {
    if (!key.startsWith('spec:') || !key.slice(5).trim() || !value.trim()) continue;
    const label = key.slice(5).trim();
    const index = result.findIndex(row => row.key.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'));
    if (index < 0) result.push({ key: label, value: value.trim() });
    else result[index].value = value.trim();
  }
  return result;
}
