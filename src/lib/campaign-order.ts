export function campaignOrderRank(name: string, order: string[]): number {
  const key = name.trim().toLocaleLowerCase('vi-VN');
  const index = order.findIndex(value => value.trim().toLocaleLowerCase('vi-VN') === key);
  return index < 0 ? order.length : index;
}
