import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";
import type { DateSelection, Filters, Task, TaskCategory } from "../types/task";
import { CATEGORY_COLORS } from "../constants/categoryColors";

// Load tasks from localStorage
const loadTasksFromStorage = (): Task[] => {
  try {
    const stored = localStorage.getItem("taskPlannerTasks");
    if (stored) {
      const parsedTasks = JSON.parse(stored);
      return parsedTasks.map((task: any) => ({
        ...task,
        startDate: new Date(task.startDate),
        endDate: new Date(task.endDate),
      }));
    }
  } catch (error) {
    console.error("Error loading tasks from localStorage:", error);
  }
  return [];
};

// Save tasks to localStorage
const saveTasksToStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem("taskPlannerTasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
  }
};

export default function TaskPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>(loadTasksFromStorage());
  const [dateSelection, setDateSelection] = useState<DateSelection>({
    startDate: null,
    endDate: null,
    isSelecting: false,
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalDateSelection, setModalDateSelection] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [_draggedTaskElement, setDraggedTaskElement] =
    useState<HTMLElement | null>(null);
  const [resizeTask, setResizeTask] = useState<{
    task: Task;
    edge: "start" | "end";
  } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    categories: ["To Do", "In Progress", "Review", "Completed"],
    timeframe: "all",
    searchTerm: "",
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);

  // Save to localStorage, whenever tasks update
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUpGlobal);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [draggedTask, resizeTask]);

  // Get month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const calendarDays: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  // Utility functions
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getDaysBetween = (startDate: Date, endDate: Date): Date[] => {
    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter((task) => {
    if (!filters.categories.includes(task.category)) return false;

    if (
      filters.searchTerm &&
      !task.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (filters.timeframe !== "all") {
      const today = new Date();
      const daysAhead =
        filters.timeframe === "1week"
          ? 7
          : filters.timeframe === "2weeks"
          ? 14
          : 21;
      const cutoffDate = new Date(
        today.getTime() + daysAhead * 24 * 60 * 60 * 1000
      );

      if (task.startDate > cutoffDate) return false;
    }

    return true;
  });

  // Get tasks that span across multiple days for each row
  const getTasksForWeek = (
    weekDates: (Date | null)[]
  ): Array<{ task: Task; startCol: number; endCol: number; level: number }> => {
    const weekTasks: Array<{
      task: Task;
      startCol: number;
      endCol: number;
      level: number;
    }> = [];
    const usedLevels: boolean[][] = Array(7)
      .fill(null)
      .map(() => []);

    filteredTasks.forEach((task) => {
      const taskDays = getDaysBetween(task.startDate, task.endDate);
      const taskInWeek = taskDays.filter((day) =>
        weekDates.some((weekDate) => weekDate && isSameDay(day, weekDate))
      );

      if (taskInWeek.length === 0) return;

      const startCol = weekDates.findIndex(
        (date) => date && isSameDay(date, taskInWeek[0])
      );
      const endCol = weekDates.findIndex(
        (date) => date && isSameDay(date, taskInWeek[taskInWeek.length - 1])
      );

      if (startCol !== -1 && endCol !== -1) {
        // Find available level
        let level = 0;
        while (true) {
          let canPlace = true;
          for (let col = startCol; col <= endCol; col++) {
            if (usedLevels[col][level]) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) {
            // Mark levels as used
            for (let col = startCol; col <= endCol; col++) {
              usedLevels[col][level] = true;
            }
            break;
          }
          level++;
        }

        weekTasks.push({ task, startCol, endCol, level });
      }
    });

    return weekTasks;
  };

  // Handle date selection for new tasks
  const handleMouseDown = (date: Date) => {
    if (draggedTask || resizeTask) return;

    setDateSelection({
      startDate: date,
      endDate: date,
      isSelecting: true,
    });
  };

  const handleMouseEnter = (date: Date) => {
    if (dateSelection.isSelecting && dateSelection.startDate) {
      setDateSelection((prev) => ({
        ...prev,
        endDate: date,
      }));
    }
  };

  const handleMouseUp = () => {
    if (
      dateSelection.isSelecting &&
      dateSelection.startDate &&
      dateSelection.endDate
    ) {
      setModalDateSelection({
        startDate: dateSelection.startDate,
        endDate: dateSelection.endDate,
      });
      setShowTaskModal(true);
      setDateSelection({ startDate: null, endDate: null, isSelecting: false });
    } else {
      setDateSelection({ startDate: null, endDate: null, isSelecting: false });
    }
  };

  // Task creation
  const createTask = (name: string, category: TaskCategory) => {
    if (!modalDateSelection.startDate || !modalDateSelection.endDate) {
      return;
    }

    const startDate =
      modalDateSelection.startDate <= modalDateSelection.endDate
        ? modalDateSelection.startDate
        : modalDateSelection.endDate;
    const endDate =
      modalDateSelection.startDate <= modalDateSelection.endDate
        ? modalDateSelection.endDate
        : modalDateSelection.startDate;

    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      category,
      startDate: new Date(startDate.getTime()),
      endDate: new Date(endDate.getTime()),
    };

    setTasks((prev) => [...prev, newTask]);
    setShowTaskModal(false);
    setModalDateSelection({ startDate: null, endDate: null });
    setDateSelection({ startDate: null, endDate: null, isSelecting: false });
  };

  // Task editing
  const editTask = (name: string, category: TaskCategory) => {
    if (!selectedTask) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === selectedTask.id ? { ...task, name, category } : task
      )
    );
    setShowEditModal(false);
    setSelectedTask(null);
  };

  // Task deletion
  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setSelectedTask(null);
    setShowEditModal(false);
  };

  // Task dragging
  const handleTaskMouseDown = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftEdge = clickX < 10;
    const isRightEdge = clickX > rect.width - 10;

    if (isLeftEdge) {
      setResizeTask({ task, edge: "start" });
      return;
    } else if (isRightEdge) {
      setResizeTask({ task, edge: "end" });
      return;
    }

    setDraggedTask(task);
    setDraggedTaskElement(target);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizeTask && calendarRef.current) {
      const calendar = calendarRef.current;
      const calendarRect = calendar.getBoundingClientRect();
      const cellWidth = calendarRect.width / 7;
      const cellHeight = 120;

      const x = e.clientX - calendarRect.left;
      const y = e.clientY - calendarRect.top - 40;

      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      const dayIndex = row * 7 + col;

      if (
        dayIndex >= 0 &&
        dayIndex < calendarDays.length &&
        calendarDays[dayIndex]
      ) {
        const targetDate = calendarDays[dayIndex]!;

        setTasks((prev) =>
          prev.map((task) => {
            if (task.id === resizeTask.task.id) {
              if (resizeTask.edge === "start" && targetDate <= task.endDate) {
                return { ...task, startDate: targetDate };
              } else if (
                resizeTask.edge === "end" &&
                targetDate >= task.startDate
              ) {
                return { ...task, endDate: targetDate };
              }
            }
            return task;
          })
        );
      }
    }
  };

  const handleMouseUpGlobal = (e: MouseEvent) => {
    if (draggedTask && calendarRef.current) {
      const calendar = calendarRef.current;
      const calendarRect = calendar.getBoundingClientRect();
      const cellWidth = calendarRect.width / 7;
      const cellHeight = 120;

      const x = e.clientX - calendarRect.left;
      const y = e.clientY - calendarRect.top - 40;

      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      const dayIndex = row * 7 + col;

      if (
        dayIndex >= 0 &&
        dayIndex < calendarDays.length &&
        calendarDays[dayIndex]
      ) {
        const targetDate = calendarDays[dayIndex]!;
        const taskDuration = Math.ceil(
          (draggedTask.endDate.getTime() - draggedTask.startDate.getTime()) /
            (24 * 60 * 60 * 1000)
        );
        const newEndDate = new Date(
          targetDate.getTime() + taskDuration * 24 * 60 * 60 * 1000
        );

        setTasks((prev) =>
          prev.map((task) =>
            task.id === draggedTask.id
              ? { ...task, startDate: targetDate, endDate: newEndDate }
              : task
          )
        );
      }
    }

    setDraggedTask(null);
    setDraggedTaskElement(null);
    setResizeTask(null);
    setDateSelection({ startDate: null, endDate: null, isSelecting: false });
  };

  // Navigation
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  // Check if day is in selection range
  const isInSelectionRange = (date: Date) => {
    if (!dateSelection.startDate || !dateSelection.endDate) return false;
    const start =
      dateSelection.startDate <= dateSelection.endDate
        ? dateSelection.startDate
        : dateSelection.endDate;
    const end =
      dateSelection.startDate <= dateSelection.endDate
        ? dateSelection.endDate
        : dateSelection.startDate;
    return date >= start && date <= end;
  };

  // Check if today
  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  // Group calendar days by weeks
  const calendarWeeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Task Planner
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {filteredTasks.length}
              </div>
              <div className="text-sm text-gray-500">Total Tasks</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sticky top-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Filter className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Filters</h3>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    value={filters.searchTerm}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchTerm: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Categories
                </h4>
                <div className="space-y-3">
                  {(
                    [
                      "To Do",
                      "In Progress",
                      "Review",
                      "Completed",
                    ] as TaskCategory[]
                  ).map((category) => (
                    <label
                      key={category}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters((prev) => ({
                                ...prev,
                                categories: [...prev.categories, category],
                              }));
                            } else {
                              setFilters((prev) => ({
                                ...prev,
                                categories: prev.categories.filter(
                                  (c) => c !== category
                                ),
                              }));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[category].bg} shadow-sm`}
                      ></div>
                      <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                        {category}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {
                          filteredTasks.filter((t) => t.category === category)
                            .length
                        }
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Filters */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Time Range
                </h4>
                <div className="space-y-3">
                  {[
                    { value: "all", label: "All tasks" },
                    { value: "1week", label: "Next 1 week" },
                    { value: "2weeks", label: "Next 2 weeks" },
                    { value: "3weeks", label: "Next 3 weeks" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="timeframe"
                        value={option.value}
                        checked={filters.timeframe === option.value}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            timeframe: e.target.value as any,
                          }))
                        }
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {filteredTasks.length} task
                    {filteredTasks.length !== 1 ? "s" : ""} this month
                  </p>
                </div>
                <button
                  onClick={() => navigateMonth("next")}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-200">
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day) => (
                  <div key={day} className="p-4 text-center">
                    <div className="font-semibold text-gray-700 text-sm">
                      {day.slice(0, 3)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {day.slice(3)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div
                ref={calendarRef}
                className="bg-white"
                onMouseUp={handleMouseUp}
              >
                {calendarWeeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="relative">
                    {/* Date cells */}
                    <div className="grid grid-cols-7">
                      {week.map((date, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`
                            h-32 border-r border-b border-gray-200 last:border-r-0 p-2 relative cursor-pointer transition-all duration-200
                            ${date ? "hover:bg-blue-50/50" : "bg-gray-50/30"}
                            ${
                              date && isInSelectionRange(date)
                                ? "bg-blue-100/70 ring-2 ring-blue-300"
                                : ""
                            }
                            ${
                              date && isToday(date)
                                ? "bg-gradient-to-br from-blue-100 to-purple-100 ring-2 ring-blue-400"
                                : ""
                            }
                          `}
                          onMouseDown={() => date && handleMouseDown(date)}
                          onMouseEnter={() => date && handleMouseEnter(date)}
                        >
                          {date && (
                            <div
                              className={`
                              text-sm font-medium
                              ${
                                isToday(date)
                                  ? "text-blue-700"
                                  : "text-gray-700"
                              }
                            `}
                            >
                              {date.getDate()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Task bars for this week */}
                    <div className="absolute inset-0 pointer-events-none">
                      {getTasksForWeek(week).map(
                        ({ task, startCol, endCol, level }) => {
                          const width = ((endCol - startCol + 1) / 7) * 100;
                          const left = (startCol / 7) * 100;
                          const top = 32 + level * 28 + 4;

                          return (
                            <div
                              key={`${task.id}-${weekIndex}`}
                              className={`
                              absolute pointer-events-auto cursor-move
                              ${CATEGORY_COLORS[task.category].bg}
                              rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] hover:z-10
                              border-l-4 ${
                                CATEGORY_COLORS[task.category].border
                              }
                              ${
                                draggedTask?.id === task.id
                                  ? "opacity-50 scale-95"
                                  : ""
                              }
                            `}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                top: `${top}px`,
                                height: "24px",
                              }}
                              onMouseDown={(e) => handleTaskMouseDown(e, task)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setShowEditModal(true);
                              }}
                              title={`${task.name} (${task.category})`}
                            >
                              {/* Resize handles */}
                              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-20 rounded-l-lg" />
                              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-20 rounded-r-lg" />

                              {/* Task content */}
                              <div className="px-3 py-1 flex items-center justify-between h-full">
                                <span className="text-white text-xs font-medium truncate">
                                  {task.name}
                                </span>
                                {width > 20 && (
                                  <span className="text-white/80 text-xs ml-2">
                                    {Math.ceil(
                                      (task.endDate.getTime() -
                                        task.startDate.getTime()) /
                                        (24 * 60 * 60 * 1000)
                                    ) + 1}
                                    d
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Task Creation Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 p-4">
            <div className="absolute top-0 right-0 h-full max-w-md w-full bg-white rounded-l-2xl shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0">
              <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  Create New Task
                </h3>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Task Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter task name..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    autoFocus
                    id="task-name-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    id="task-category-select"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {modalDateSelection.startDate && modalDateSelection.endDate && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-1">
                      Selected Duration
                    </div>
                    <div className="text-blue-600">
                      {modalDateSelection.startDate.toLocaleDateString()} -{" "}
                      {modalDateSelection.endDate.toLocaleDateString()}
                      <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded-full">
                        {Math.ceil(
                          (modalDateSelection.endDate.getTime() -
                            modalDateSelection.startDate.getTime()) /
                            (24 * 60 * 60 * 1000)
                        ) + 1}{" "}
                        days
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setModalDateSelection({ startDate: null, endDate: null });
                    setDateSelection({
                      startDate: null,
                      endDate: null,
                      isSelecting: false,
                    });
                  }}
                  className="flex-1 px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById(
                      "task-name-input"
                    ) as HTMLInputElement;
                    const categorySelect = document.getElementById(
                      "task-category-select"
                    ) as HTMLSelectElement;

                    if (!nameInput || !categorySelect) return;

                    const name = nameInput.value.trim();
                    const category = categorySelect.value as TaskCategory;

                    if (name) {
                      createTask(name, category);
                      nameInput.value = "";
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Edit Modal */}
        {showEditModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Edit3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Edit Task
                    </h3>
                  </div>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Task Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedTask.name}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    id="edit-task-name-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    defaultValue={selectedTask.category}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    id="edit-task-category-select"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </div>
                  <div className="text-gray-600">
                    {selectedTask.startDate.toLocaleDateString()} -{" "}
                    {selectedTask.endDate.toLocaleDateString()}
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                      {Math.ceil(
                        (selectedTask.endDate.getTime() -
                          selectedTask.startDate.getTime()) /
                          (24 * 60 * 60 * 1000)
                      ) + 1}{" "}
                      days
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById(
                      "edit-task-name-input"
                    ) as HTMLInputElement;
                    const categorySelect = document.getElementById(
                      "edit-task-category-select"
                    ) as HTMLSelectElement;

                    if (!nameInput || !categorySelect) return;

                    const name = nameInput.value.trim();
                    const category = categorySelect.value as TaskCategory;

                    if (name) {
                      editTask(name, category);
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  Update Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
