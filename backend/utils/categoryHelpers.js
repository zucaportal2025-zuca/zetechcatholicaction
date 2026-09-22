// utils/categoryHelpers.js
// ============================================================
// Shared helpers for the dynamic check-in category feature.
// SAFE: read-only utilities. Do not touch DB. Do not throw.
// ============================================================

/**
 * Validate a category coming from the sheet creator.
 * Called ONLY when admin creates/updates a sheet with a category.
 * If sheet has no category → returns nulls, doesn't error.
 */
function cleanCategoryInput({ categoryName, categoryOptions, categoryRequired }) {
  // No name → category is disabled on this sheet (backwards compatible)
  if (!categoryName || !String(categoryName).trim()) {
    return {
      categoryName: null,
      categoryOptions: [],
      categoryRequired: true,
    };
  }

  const name = String(categoryName).trim();
  if (name.length > 60) {
    return { error: 'Category name is too long (max 60 characters)' };
  }

  let rawOptions = [];
  if (Array.isArray(categoryOptions)) {
    rawOptions = categoryOptions;
  } else if (typeof categoryOptions === 'string') {
    rawOptions = categoryOptions.split(',');
  }

  const seen = new Set();
  const cleaned = [];
  for (const opt of rawOptions) {
    const v = String(opt || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    if (v.length > 40) {
      return { error: `Option "${v}" is too long (max 40 characters)` };
    }
    seen.add(key);
    cleaned.push(v);
  }

  if (cleaned.length < 2) {
    return { error: 'A category needs at least 2 options' };
  }
  if (cleaned.length > 30) {
    return { error: 'Too many options (max 30)' };
  }

  return {
    categoryName: name,
    categoryOptions: cleaned,
    categoryRequired: categoryRequired !== false,
  };
}

/**
 * Validate a member's picked value against the sheet's category.
 * Called during check-in. If sheet has no category → returns null silently.
 */
function cleanCategoryValue(sheet, rawValue) {
  // If sheet has no category → always return null, never error
  if (!sheet?.categoryName || !Array.isArray(sheet.categoryOptions) || sheet.categoryOptions.length === 0) {
    return { value: null };
  }

  const trimmed = rawValue == null ? '' : String(rawValue).trim();

  if (!trimmed) {
    if (sheet.categoryRequired) {
      return { error: `${sheet.categoryName} is required` };
    }
    return { value: null };
  }

  const match = sheet.categoryOptions.find(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  );

  if (!match) {
    return { error: `Invalid ${sheet.categoryName} value: "${trimmed}"` };
  }

  return { value: match };
}

/**
 * Build a per-option count breakdown. Only used for display.
 * Never errors. Returns null if options are empty.
 */
function buildCategoryBreakdown(entries, options) {
  if (!Array.isArray(options) || options.length === 0) return null;

  const counts = {};
  for (const opt of options) counts[opt] = 0;
  counts.Unassigned = 0;

  for (const entry of entries || []) {
    const val = entry?.categoryValue;
    if (val && Object.prototype.hasOwnProperty.call(counts, val)) {
      counts[val] += 1;
    } else {
      counts.Unassigned += 1;
    }
  }

  return counts;
}

module.exports = {
  cleanCategoryInput,
  cleanCategoryValue,
  buildCategoryBreakdown,
};