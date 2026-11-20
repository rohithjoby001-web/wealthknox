export const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: 'food' },
  { id: 'groceries', name: 'Groceries', icon: 'cart' },
  { id: 'transport', name: 'Transport', icon: 'car' },
  { id: 'housing', name: 'Housing & Rent', icon: 'home' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'bolt' },
  { id: 'shopping', name: 'Shopping', icon: 'bag' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film' },
  { id: 'health', name: 'Health', icon: 'heart' },
  { id: 'education', name: 'Education', icon: 'book' },
  { id: 'travel', name: 'Travel', icon: 'plane' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat' },
  { id: 'other', name: 'Other', icon: 'dots' },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

export const SOURCE_ICONS = ['briefcase', 'laptop', 'store', 'gift', 'trendingUp', 'wallet'];
export const GOAL_ICONS = ['target', 'plane', 'laptop', 'home', 'car', 'gift', 'heart', 'book', 'shield'];
