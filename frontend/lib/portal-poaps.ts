export function slugLegacyPoapId(title: string, slug: string): string | null {
  const badgeNumber = title.match(/#(\d+)(?:\s|$)/)?.[1];
  const slugNumbers = slug.match(/-(\d+)-(\d+)$/);
  if (!badgeNumber || !slugNumbers) return null;
  const [, slugBadgeNumber, eventId] = slugNumbers;
  return slugBadgeNumber === badgeNumber && eventId !== badgeNumber ? eventId : null;
}
