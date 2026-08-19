import React, { useState } from 'react';
import { ReminderTask, StudentRecognitionRecord } from '../types';
import {
  LayoutDashboard,
  Award,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Bell,
  Trash2,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Calendar
} from 'lucide-react';

export const DashboardAnalytics: React.FC = () => {
  const [tasks, setTasks] = useState<ReminderTask[]>([
    {
      id: 't1',
      title: 'طباعة شهادات تفوق الصف الأول الثانوي',
      dueDate: 'اليوم، 04:00 م',
      priority: 'عالية',
      completed: false,
      category: 'تسليم شهادات',
    },
    {
      id: 't2',
      title: 'مراجعة درجات اختبار الرياضيات والتكريم',
      dueDate: 'غداً، 10:00 ص',
      priority: 'متوسطة',
      completed: true,
      category: 'مراجعة درجات',
    },
    {
      id: 't3',
      title: 'إعداد شهادات مسابقة تحفيظ القرآن الكريم',
      dueDate: 'الأحد القادم',
      priority: 'عالية',
      completed: false,
      category: 'إعداد قوالب',
    },
    {
      id: 't4',
      title: 'حفل تكريم المتفوقين في طابور الصباح',
      dueDate: 'الإثنين القادم',
      priority: 'عادية',
      completed: false,
      category: 'حفل تكريم',
    },
  ]);

  const [records, setRecords] = useState<StudentRecognitionRecord[]>([
    { id: '1', studentName: 'أحمد بن محمد العتيبي', grade: 'الأول الثانوي', subject: 'الرياضيات', awardTitle: 'وسام التميز الأول', date: '2026/08/05', status: 'تمت الطباعة' },
    { id: '2', studentName: 'سارة بنت خالد الغامدي', grade: 'الثالث المتوسط', subject: 'الانضباط والسلوك', awardTitle: 'شرف الأخلاق', date: '2026/08/04', status: 'تمت المشاركة' },
    { id: '3', studentName: 'عمر بن فيصل الشمري', grade: 'الثاني الثانوي', subject: 'النشاط الرياضي', awardTitle: 'قائد الفريق', date: '2026/08/03', status: 'تمت الطباعة' },
    { id: '4', studentName: 'عبد الرحمن بن يوسف القحطاني', grade: 'القرآن الكريم', subject: 'حفظ 5 أجزاء', awardTitle: 'خادم كتاب الله', date: '2026/08/02', status: 'معلق' },
    { id: '5', studentName: 'ريما بنت خالد الزهراني', grade: 'الروضة الثانية', subject: 'الإبداع الفني', awardTitle: 'نجمة الفصل', date: '2026/08/01', status: 'تمت الطباعة' },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<ReminderTask['category']>('تسليم شهادات');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: ReminderTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      dueDate: 'اليوم',
      priority: 'متوسطة',
      completed: false,
      category: newTaskCategory,
    };
    setTasks([task, ...tasks]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-right">
      
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">إجمالي الشهادات المطبوعة</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">148 شهادة</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +18% هذا الشهر
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">إجمالي الطلاب المكرمين</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">124 طالب</span>
            <span className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
              <Users className="w-3 h-3" /> 8 فصول دراسية
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">المهام اليومية والتنبيهات</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {tasks.filter(t => !t.completed).length} مهام معلقة
            </span>
            <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
              <Bell className="w-3 h-3" /> نظام المتابعة الذكية
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">أكثر المواد تكريماً</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">الرياضيات والقرآن</span>
            <span className="text-[11px] text-slate-500 font-bold mt-1 block">
              نسبة التفاعل 96%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Task Reminders & Achievements Control */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              تنبيهات المواعيد وتتبع الإنجازات
            </h3>
            <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              تذكير ذكي
            </span>
          </div>

          {/* New Task Input */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="إضافة موعد/مهمة تكريم جديدة..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            />
            <div className="flex items-center gap-2">
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as any)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="تسليم شهادات">تسليم شهادات</option>
                <option value="مراجعة درجات">مراجعة درجات</option>
                <option value="حفل تكريم">حفل تكريم</option>
                <option value="إعداد قوالب">إعداد قوالب</option>
              </select>
              <button
                onClick={handleAddTask}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> إضافة
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  task.completed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                  />
                  <div>
                    <h5 className={`text-xs font-bold ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.dueDate}
                      </span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                        {task.category}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Productivity Tools Integration */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-700 block mb-2">التكامل مع تطبيقات إدارة المهام:</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg font-bold border border-blue-200 flex items-center gap-1">
                Google Tasks ✓
              </span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold border border-slate-200 flex items-center gap-1">
                Notion Sync ✓
              </span>
              <span className="px-2.5 py-1 bg-cyan-50 text-cyan-800 rounded-lg font-bold border border-cyan-200 flex items-center gap-1">
                Trello ✓
              </span>
            </div>
          </div>

        </div>

        {/* Student Recognition Log Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              سجل الطلاب المكرمين وتاريخ الإصدارات
            </h3>
            <span className="text-xs text-slate-500 font-medium">تحديث لحظي متزامن</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-bold">اسم الطالب</th>
                  <th className="p-3 font-bold">الصف / المادة</th>
                  <th className="p-3 font-bold">عنوان الوسام</th>
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-amber-50/20 transition">
                    <td className="p-3 font-bold text-slate-900">{rec.studentName}</td>
                    <td className="p-3 text-slate-600">{rec.grade} - {rec.subject}</td>
                    <td className="p-3 font-semibold text-amber-800">{rec.awardTitle}</td>
                    <td className="p-3 text-slate-500 font-mono">{rec.date}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        rec.status === 'تمت الطباعة'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'تمت المشاركة'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
