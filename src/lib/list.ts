export function toggleItem<Item>(items: readonly Item[], item: Item, isIncluded: boolean): Item[] {
  const others = items.filter((candidate) => candidate !== item);
  return isIncluded ? [...others, item] : others;
}
