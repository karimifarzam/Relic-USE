import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Bookmark,
  MoreVertical,
  X,
  ArrowRight,
  ArrowUp,
  Clock,
  Database,
  LayoutGrid,
  Monitor,
  Target,
  MoveRight,
  ChevronsUpDown,
} from 'lucide-react';
import tasklist from '../../../../assets/icons/tasklist.svg';
import { useTheme } from '../../contexts/ThemeContext';

interface Task {
  id: number;
  title: string;
  description: string[];
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estEarnings: number;
  duration: string;
  type: string;
  completion?: number;
}

interface Filter {
  label: string;
  value: string;
}

function TaskList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchTasks = async () => {
      const taskList = await window.electron.ipcRenderer.invoke('get-tasks');
      setTasks(taskList);
    };
    fetchTasks();
  }, []);

  // Filter options
  const difficultyFilters: Filter[] = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
  ];

  const statusFilters: Filter[] = [
    { label: 'Available', value: 'available' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
  ];

  const categoryFilters: Filter[] = [
    { label: 'Computer Settings', value: 'computer-settings' },
    { label: 'Browser', value: 'browser' },
  ];

  // Dummy data
  const dummyTasks: Task[] = Array(40)
    .fill(null)
    .map((_, index) => ({
      id: index % 2 === 0 ? 42 : 14,
      title:
        index % 2 === 0
          ? 'Go into settings and turn off dark mode'
          : 'Open a new browser tab and...',
      category: index % 2 === 0 ? 'Computer Settings' : 'Browser',
      difficulty: index % 2 === 0 ? 'Hard' : 'Medium',
      estEarnings: index % 2 === 0 ? 450 : 250,
      duration: '4 min',
      type: 'Computer software',
      completion: 67,
      description: [
        'Click on the Apple menu (🍎) in the top-left corner of your screen',
        'Select "System Settings" (or "System Preferences" on older macOS versions)',
        'Click on "Appearance" (it usually has a blue icon with an A)',
        'Under "Appearance," you\'ll see three options:',
        '• Light',
        '• Dark',
        '• Auto',
        'Click on "Light" to disable Dark Mode',
        'Close System Settings - changes apply immediately',
      ],
    }));

  // Pagination logic
  const totalPages = Math.ceil(tasks.length / rowsPerPage);
  const currentTasks = tasks.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // Filter dropdown handler
  const handleDropdownClick = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Task selection handler
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleStartTask = async () => {
    if (selectedTask) {
      try {
        await window.electron.ipcRenderer.invoke('start-task', selectedTask.id);
      } catch (error) {
        console.error('Failed to start task:', error);
      }
    }
  };

  return (
    <main className={`min-h-screen ${isDark ? 'bg-industrial-black-primary' : 'bg-white'}`}>
      <div className="py-6">
        {/* Header with Title and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 sm:self-start sm:pt-1">
            <h1 className={`text-2xl font-mono font-light tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>TASK SELECTION</h1>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter tasks..."
                className={`w-[280px] px-4 py-2 rounded-lg text-[11px] font-mono transition-colors focus:outline-none ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white placeholder:text-industrial-white-tertiary focus:border-industrial-blue' : 'bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Filter Dropdowns */}
              {[
                { name: 'Difficulty', options: difficultyFilters },
                { name: 'Status', options: statusFilters },
                { name: 'Category', options: categoryFilters },
              ].map((filter) => (
                <div key={filter.name} className="relative">
                  <button
                    onClick={() => handleDropdownClick(filter.name)}
                    className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-industrial-wide font-mono font-bold flex items-center gap-2 hover-lift transition-all ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                  >
                    {filter.name}
                    <ChevronsUpDown className={`w-3.5 h-3.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                  </button>

                  {activeDropdown === filter.name && (
                    <div className={`absolute top-full mt-1 w-48 rounded-lg shadow-industrial-lg z-10 overflow-hidden ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-300'}`}>
                      {filter.options.map((option) => (
                        <button
                          key={option.value}
                          className={`w-full px-4 py-2 text-[11px] font-mono text-left transition-colors border-b last:border-b-0 ${isDark ? 'text-white hover:bg-industrial-black-tertiary border-industrial-border-subtle' : 'text-gray-900 hover:bg-gray-50 border-gray-200'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>

        <div className="flex items-start gap-6">
          <div className="flex-1">
            {/* Table */}
            <div className={`overflow-hidden rounded-lg ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'bg-industrial-black-tertiary border-industrial-border-subtle' : 'bg-gray-50 border-gray-200'}`}>
                    <th className={`py-3 px-4 text-left font-mono text-[9px] uppercase tracking-industrial-wide font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      ID
                    </th>
                    <th className={`py-3 px-4 text-left font-mono text-[9px] uppercase tracking-industrial-wide font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      Title
                    </th>
                    <th className={`py-3 px-4 text-left font-mono text-[9px] uppercase tracking-industrial-wide font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      <span className="flex items-center">
                        Category
                        <ChevronDown className="w-3 h-3 ml-1" strokeWidth={1.5} />
                      </span>
                    </th>
                    <th className={`py-3 px-4 text-left font-mono text-[9px] uppercase tracking-industrial-wide font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      <span className="flex items-center">
                        Difficulty
                        <ChevronDown className="w-3 h-3 ml-1" strokeWidth={1.5} />
                      </span>
                    </th>
                    <th className={`py-3 px-4 text-left font-mono text-[9px] uppercase tracking-industrial-wide font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      <span className="flex items-center">
                        Earnings
                        <ChevronDown className="w-3 h-3 ml-1" strokeWidth={1.5} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((task, index) => (
                    <tr
                      key={`${task.id}-${index}`}
                      className={`border-t cursor-pointer transition-colors ${
                        isDark
                          ? `border-industrial-border-subtle hover:bg-industrial-black-tertiary ${selectedTask?.id === task.id ? 'bg-industrial-black-tertiary' : ''}`
                          : `border-gray-200 hover:bg-gray-50 ${selectedTask?.id === task.id ? 'bg-gray-50' : ''}`
                      }`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className={`py-3 px-4 text-[11px] font-mono ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                        {task.id}
                      </td>
                      <td className={`py-3 px-4 text-[11px] font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-[9px] uppercase tracking-industrial font-mono rounded border ${
                            task.category === 'Computer Settings'
                              ? isDark
                                ? 'bg-industrial-black-tertiary text-industrial-blue border-industrial-border-subtle'
                                : 'bg-blue-50 text-blue-600 border-blue-200'
                              : isDark
                                ? 'bg-industrial-black-tertiary text-industrial-orange border-industrial-border-subtle'
                                : 'bg-orange-50 text-orange-600 border-orange-200'
                          }`}
                        >
                          {task.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center text-[11px] font-mono ${isDark ? 'text-industrial-white-secondary' : 'text-gray-600'}`}>
                          {task.difficulty === 'Hard' ? (
                            <ArrowUp className="w-3 mr-1 text-industrial-red" strokeWidth={1.5} />
                          ) : (
                            <ArrowRight className={`w-3 mr-1 ${isDark ? 'text-industrial-orange' : 'text-orange-500'}`} strokeWidth={1.5} />
                          )}
                          {task.difficulty}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-[11px] font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.estEarnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                  Rows per page
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className={`rounded px-3 py-1.5 text-[11px] font-mono transition-colors focus:outline-none ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white focus:border-industrial-blue' : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500'}`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white hover:bg-industrial-black-tertiary' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                  >
                    {'<<'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((curr) => Math.max(1, curr - 1))
                    }
                    disabled={currentPage === 1}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white hover:bg-industrial-black-tertiary' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                  >
                    {'<'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((curr) => Math.min(totalPages, curr + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white hover:bg-industrial-black-tertiary' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                  >
                    {'>'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-industrial-black-secondary border border-industrial-border text-white hover:bg-industrial-black-tertiary' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                  >
                    {'>>'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Task Detail Sidebar */}
          <div className={`w-[388px] shadow-industrial rounded-lg ${isDark ? 'bg-industrial-black-secondary border border-industrial-border' : 'bg-white border border-gray-200'}`}>
            {selectedTask ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked
                      className={`rounded ${isDark ? 'bg-industrial-black-tertiary border-industrial-border' : 'bg-gray-50 border-gray-300'}`}
                    />
                    <span className={`text-[10px] uppercase tracking-industrial font-mono font-semibold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                      {selectedTask.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}>
                      <Bookmark className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                    </button>
                    <button className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}>
                      <MoreVertical className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setSelectedTask(null)}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-industrial-black-tertiary' : 'hover:bg-gray-100'}`}
                    >
                      <X className={`w-4 h-4 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <h2 className={`text-lg font-mono font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTask.title}
                </h2>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary border-industrial-border-subtle text-industrial-white-secondary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                    <Database className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.estEarnings} pts
                  </span>

                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-orange border-industrial-border-subtle' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                    <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.duration}
                  </span>

                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-blue border-industrial-border-subtle' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    <Monitor className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.type}
                  </span>

                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-green border-industrial-border-subtle' : 'bg-green-50 text-green-600 border-green-200'}`}>
                    <LayoutGrid className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.category}
                  </span>

                  {selectedTask.completion && (
                    <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-red border-industrial-border-subtle' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      <Target className="w-3 h-3 mr-1" strokeWidth={1.5} />
                      {selectedTask.completion}%
                    </span>
                  )}

                  <span className={`flex items-center px-2 py-1 rounded border text-[9px] uppercase tracking-industrial font-mono ${isDark ? 'bg-industrial-black-tertiary text-industrial-orange border-industrial-border-subtle' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                    <MoveRight className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    {selectedTask.difficulty}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className={`text-[11px] uppercase tracking-industrial-wide font-mono font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Task Description
                  </h3>
                  <ol className="list-decimal pl-4 space-y-2">
                    {selectedTask.description?.map((step, index) => (
                      <li key={index} className={`text-[11px] font-mono ${isDark ? 'text-industrial-white-secondary' : 'text-gray-700'}`}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className={`flex gap-3 mt-auto pt-4 border-t ${isDark ? 'border-industrial-border-subtle' : 'border-gray-200'}`}>
                  <button className={`flex-1 px-4 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold border rounded-lg transition-colors ${isDark ? 'border-industrial-border text-white hover:bg-industrial-black-tertiary' : 'border-gray-300 text-gray-900 hover:bg-gray-50'}`}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTask}
                    className={`flex-1 px-4 py-2 text-[10px] uppercase tracking-industrial-wide font-mono font-bold shadow-industrial rounded-lg hover-lift hover:shadow-industrial-lg transition-all ${isDark ? 'bg-industrial-orange text-black border border-industrial-orange/20' : 'bg-blue-500 text-white border border-blue-600'}`}
                  >
                    Start Task
                  </button>
                </div>
              </div>
            ) : (
              <div className={`h-full flex items-center justify-center text-[10px] uppercase tracking-industrial font-mono p-6 min-h-[400px] ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
                Select a task to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default TaskList;
