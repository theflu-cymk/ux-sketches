/** Centre of slot `index` in a grid `cols` wide, centred on the origin, `spacing` apart. Returns [x, z]. */
export function slotPosition(index: number, cols: number, spacing: number, count = cols * cols): [number, number] {
  const rows = Math.ceil(count / cols)
  const col = index % cols
  const row = Math.floor(index / cols)
  return [(col - (cols - 1) / 2) * spacing, (row - (rows - 1) / 2) * spacing]
}

/** The layout after moving card `id` to `index`: everything else closes up around it, in order. */
export function reflowOrder(order: number[], id: number, index: number): number[] {
  if (!order.includes(id)) return order
  const rest = order.filter((x) => x !== id)
  const at = Math.max(0, Math.min(rest.length, index))
  return [...rest.slice(0, at), id, ...rest.slice(at)]
}

/** The slot nearest to (x, z) among the first `count` slots. */
export function nearestIndex(x: number, z: number, count: number, cols: number, spacing: number, total = cols * cols): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < count; i++) {
    const [sx, sz] = slotPosition(i, cols, spacing, total)
    const d = (sx - x) ** 2 + (sz - z) ** 2
    if (d < bestD) (bestD = d), (best = i)
  }
  return best
}

/** How hard a card bobs when another lands `distance` metres away: strongest close by, gone by 1.2 m. */
export function rippleKick(distance: number): number {
  const reach = 1.2
  return distance >= reach ? 0 : 0.06 * (1 - distance / reach) ** 2
}
