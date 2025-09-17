import { TASK_CATEGORIES, type TaskCategory } from "../types/task";

export const CATEGORY_COLORS: Record<
  TaskCategory,
  { bg: string; text: string; border: string; light: string }
> = {
  [TASK_CATEGORIES.ToDo]: {
    bg: "bg-gradient-to-r from-blue-500 to-blue-600",
    text: "text-blue-700",
    border: "border-blue-300",
    light: "bg-blue-50",
  },
  [TASK_CATEGORIES.InProgress]: {
    bg: "bg-gradient-to-r from-orange-500 to-orange-600",
    text: "text-orange-700",
    border: "border-orange-300",
    light: "bg-orange-50",
  },
  [TASK_CATEGORIES.Review]: {
    bg: "bg-gradient-to-r from-purple-500 to-purple-600",
    text: "text-purple-700",
    border: "border-purple-300",
    light: "bg-purple-50",
  },
  [TASK_CATEGORIES.Completed]: {
    bg: "bg-gradient-to-r from-green-500 to-green-600",
    text: "text-green-700",
    border: "border-green-300",
    light: "bg-green-50",
  },
};
