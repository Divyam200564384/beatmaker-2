// Euclidean rhythm: spread `hits` as evenly as possible over `steps`, rotated by `shift`.
export function euclid(hits, steps = 16, shift = 0) {
  return Array.from({ length: steps }, (_, i) => (((i - shift + steps) % steps) * hits) % steps < hits);
}
