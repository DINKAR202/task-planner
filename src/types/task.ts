export const TASK_CATEGORIES = {
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Review: 'Review',
  Completed: 'Completed',
} as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[keyof typeof TASK_CATEGORIES];

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  startDate: Date;
  endDate: Date;
}

export interface DateSelection {
  startDate: Date | null;
  endDate: Date | null;
  isSelecting: boolean;
}

export interface Filters {
  categories: TaskCategory[];
  timeframe: "1week" | "2weeks" | "3weeks" | "all";
  searchTerm: string;
}
