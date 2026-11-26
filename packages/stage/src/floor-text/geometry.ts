/** Stamp points along a smear, at most radius/2 apart, including both ends. World x/z on the floor. */
export function smearStamps(fromX: number, fromZ: number, toX: number, toZ: number, radius: number): Array<[number, number]> {
  const dist = Math.hypot(toX - fromX, toZ - fromZ)
  if (dist === 0) return [[fromX, fromZ]]
  const steps = Math.max(1, Math.ceil(dist / (radius / 2)))
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push(i === steps ? [toX, toZ] : [fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t])
  }
  return pts
}

/** Centres of each non-space glyph in a line laid along x, centred on origin x, at origin z. */
export function letterHomes(text: string, widths: number[], spacing: number, origin: [number, number]): Array<[number, number]> {
  const chars = [...text]
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1)
  let x = origin[0] - total / 2
  const homes: Array<[number, number]> = []
  chars.forEach((ch, i) => {
    if (ch !== ' ') homes.push([x + widths[i] / 2, origin[1]])
    x += widths[i] + spacing
  })
  return homes
}
