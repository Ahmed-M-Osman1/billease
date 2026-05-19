import slugify from 'slugify'

export function makeSlug(name: string, used: Set<string>): string {
  let base = slugify(name, { lower: true, strict: true })
  if (!base) base = 'participant'
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let i = 2
  while (used.has(`${base}-${i}`)) i++
  const slug = `${base}-${i}`
  used.add(slug)
  return slug
}
