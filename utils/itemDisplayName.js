function cleanPart(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function startsWithFullWord(value, prefix) {
  const normalizedValue = cleanPart(value).toLowerCase();
  const normalizedPrefix = cleanPart(prefix).toLowerCase();

  if (!normalizedValue || !normalizedPrefix) return false;
  if (!normalizedValue.startsWith(normalizedPrefix)) return false;
  if (normalizedValue.length === normalizedPrefix.length) return true;

  return /[\s\-_/]/.test(normalizedValue.charAt(normalizedPrefix.length));
}

function getItemDisplayName(item = {}) {
  const brand = cleanPart(item.brand);
  const model = cleanPart(item.model);
  const fallback = cleanPart(item.itemId) || "Unnamed asset";

  if (brand && model) {
    return startsWithFullWord(model, brand) ? model : `${brand} ${model}`;
  }

  return brand || model || fallback;
}

module.exports = {
  getItemDisplayName,
};
