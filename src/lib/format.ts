export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (part) => part[0].toUpperCase() + part.slice(1).toLowerCase());
}
