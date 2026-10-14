'use strict';
// Staging-only sync reconciliation. Not loaded by the production app.
function planSyncV2(local, remote) {
  if (!Array.isArray(local) || !Array.isArray(remote)) throw Error('Expected arrays');
  const index = items => {
    const result = new Map();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !item.id) throw Error('Invalid ID');
      if (result.has(item.id)) throw Error('Duplicate ID: ' + item.id);
      result.set(item.id, item);
    }
    return result;
  };
  const a = index(local), b = index(remote);
  const downloads = [], uploads = [], conflicts = [];
  for (const [id, value] of a) {
    if (!b.has(id)) uploads.push(value);
    else if (JSON.stringify(value) !== JSON.stringify(b.get(id)))
      conflicts.push({ id, local: value, remote: b.get(id) });
  }
  for (const [id, value] of b) if (!a.has(id)) downloads.push(value);
  return { downloads, uploads, conflicts };
}
if (typeof module !== 'undefined') module.exports = { planSyncV2 };
