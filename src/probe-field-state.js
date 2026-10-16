// Publish a complete probe generation; captures never mix rooms from different passes.
export function writeProbeField(field, regions, values) {
 if (regions.length > field.bounds.value.length || values.length !== regions.length)
  throw Error('Incomplete probe generation');
 field.count.value = regions.length;
 regions.forEach((r, i) => {
  field.bounds.value[i].set(...r.rect);
  field.positions.value[i].set(...r.position);
  field.heights.value[i].set(r.minZ, r.maxZ);
  if (values[i].length !== 9) throw Error('Expected nine SH coefficients');
  values[i].forEach((c, j) => field.coefficients.value[i * 9 + j].copy(c));
 });
}
// GPU draws are synchronous submissions. Restore the published field before yielding
// to gameplay, including on render failure; transient first-bounce data never leaks.
export function withProbeField(field, regions, values, draw) {
 const arrays = ['bounds', 'positions', 'heights', 'coefficients'];
 const old = arrays.map(k => field[k].value.map(v => v.clone()));
 const count = field.count.value;
 try { writeProbeField(field, regions, values); return draw(); }
 finally {
  field.count.value = count;
  arrays.forEach((k, i) => field[k].value.forEach((v, j) => v.copy(old[i][j])));
 }
}
