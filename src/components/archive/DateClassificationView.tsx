import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  GraduationCap,
  Download,
  Cloud,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Eye,
  ShieldCheck,
  Clock,
  Building
} from 'lucide-react';
import { CertificateData } from '../../types';
import { groupCertificatesByDate, DateGroupArchive } from '../../utils/archiveManager';

interface DateClassificationViewProps {
  certificates: any[];
  selectedIds?: Set<string>;
  onToggleSelectCert?: (id: string) => void;
  onSelectAllInGroup?: (certIds: string[]) => void;
  onInspectCert?: (cert: any) => void;
  onLoadCert?: (cert: CertificateData) => void;
  onExportDateGroupPdf?: (certs: any[], periodLabel: string) => void;
  onUploadDateGroupToDrive?: (certs: any[]) => void;
}

export const DateClassificationView: React.FC<DateClassificationViewProps> = ({
  certificates,
  selectedIds = new Set(),
  onToggleSelectCert = (_id: string) => {},
  onSelectAllInGroup = (_certIds: string[]) => {},
  onInspectCert = (_cert: any) => {},
  onLoadCert = (_cert: CertificateData) => {},
  onExportDateGroupPdf = (_certs: any[], _periodLabel: string) => {},
  onUploadDateGroupToDrive
}) => {
  const [granularity, setGranularity] = useState<'month' | 'year' | 'day'>('month');
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  // Group certificates by chosen date granularity
  const dateGroups = useMemo(() => {
    return groupCertificatesByDate(certificates, granularity);
  }, [certificates, granularity]);

  const totalCertificates = certificates.length;
  const totalPeriods = dateGroups.length;

  const toggleExpand = (key: string) => {
    const next = new Set(expandedPeriods);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedPeriods(next);
  };

  const expandAll = () => {
    const next = new Set<string>();
    dateGroups.forEach(g => next.add(g.periodKey));
    setExpandedPeriods(next);
  };

  const collapseAll = () => {
    setExpandedPeriods(new Set());
  };

  return (
    <div className="space-y-5 text-right font-sans">
      
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">الفترات الزمنية المؤرشفة</span>
            <span className="text-2xl font-black text-white">{totalPeriods}</span>
            <span className="text-[11px] text-slate-500 block">
              {granularity === 'month' ? 'أشهر دراسية' : granularity === 'year' ? 'سنوات ميلادية' : 'أيام إصدار'}
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">إجمالي الشهادات المكتملة</span>
            <span className="text-2xl font-black text-amber-400">{totalCertificates}</span>
            <span className="text-[11px] text-slate-500 block">شهادة مؤرخة ومعتمدة</span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <GraduationCap className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">أحدث تاريخ إصدار</span>
            <span className="text-sm font-black text-emerald-300 block">
              {dateGroups.length > 0 && dateGroups[0].latestDate
                ? new Date(dateGroups[0].latestDate).toLocaleDateString('ar-SA')
                : 'لا توجد بيانات'}
            </span>
            <span className="text-[11px] text-emerald-400/80 block">
              {dateGroups.length > 0 ? dateGroups[0].periodLabel : '—'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Clock className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* 2. CONTROLS & GRANULARITY SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">تجميع السجلات:</span>
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setGranularity('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                granularity === 'month'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              شهرياً (أشهر السنة)
            </button>
            <button
              onClick={() => setGranularity('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                granularity === 'year'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              سنوياً
            </button>
            <button
              onClick={() => setGranularity('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                granularity === 'day'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              يومياً (حسب اليوم)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            توسيع كافة الفترات
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* 3. PERIOD GROUPS ACCORDION */}
      {dateGroups.length === 0 ? (
        <div className="bg-slate-900 p-10 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold">لا توجد سجلات مصنفة زمنياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map((group) => {
            const isExpanded = expandedPeriods.has(group.periodKey);
            const groupCertIds = group.certificates.map(c => c.id);
            const isAllGroupSelected = groupCertIds.every(id => selectedIds.has(id));
            const someGroupSelected = groupCertIds.some(id => selectedIds.has(id));
            const driveVerifiedCount = group.certificates.filter(c => !!(c.driveFileWebViewLink || c.driveFileUrl || c.driveFileId)).length;

            return (
              <div
                key={group.periodKey}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                {/* Period Header */}
                <div
                  onClick={() => toggleExpand(group.periodKey)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-slate-900 to-slate-900/60 hover:bg-slate-850"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl shrink-0">
                      <Calendar className="w-6 h-6 text-indigo-400" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-white">{group.periodLabel}</h3>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">
                          {group.totalCertificates} شهادة
                        </span>
                        {group.academicYear && (
                          <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            العام: {group.academicYear}
                          </span>
                        )}
                        {driveVerifiedCount > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{driveVerifiedCount} موثقة</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>المؤسسات المشمولة: <strong>{group.schoolsCount} مدرسة</strong></span>
                        {group.latestDate && (
                          <span className="text-slate-500">
                            • آخر تسجيل: {new Date(group.latestDate).toLocaleDateString('ar-SA')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Period Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectAllInGroup(groupCertIds)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                        isAllGroupSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : someGroupSelected
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                      title="تحديد شهادات هذه الفترة"
                    >
                      {isAllGroupSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span>تحديد الفترة</span>
                    </button>

                    <button
                      onClick={() => onExportDateGroupPdf(group.certificates, group.periodLabel)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                      title="تصدير ملف PDF مجمع لكافة شهادات هذه الفترة"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>تصدير PDF المجمع</span>
                    </button>

                    {onUploadDateGroupToDrive && (
                      <button
                        onClick={() => onUploadDateGroupToDrive(group.certificates)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl transition cursor-pointer"
                        title="توثيق شهادات الفترة على Google Drive"
                      >
                        <Cloud className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-1 text-slate-400 hover:text-white transition">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Certificates Grid */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 sm:p-5 bg-slate-950/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.certificates.map((cert) => {
                        const isSelected = selectedIds.has(cert.id);
                        const vCode = cert.verificationCode || `TQ-${cert.id.slice(-6).toUpperCase()}`;
                        const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl;

                        return (
                          <div
                            key={cert.id}
                            className={`bg-slate-900/90 p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                              isSelected
                                ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onToggleSelectCert(cert.id)}
                                  className="text-amber-400 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                                  )}
                                </button>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {vCode}
                                </span>
                              </div>

                              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                {cert.schoolName || 'مدرسة عامة'}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-black text-sm text-white">{cert.studentName}</h4>
                              <p className="text-xs text-amber-400/90 font-medium">{cert.title || 'شهادة شكر وتقدير'}</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                <span>الفصل: {cert.grade || '—'}</span>
                                <span>•</span>
                                <span>التاريخ: {cert.issueDateHijri || cert.issueDate || '—'}</span>
                              </div>
                            </div>

                            {/* Card footer actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                              <div className="flex items-center gap-1.5">
                                {driveLink ? (
                                  <a
                                    href={driveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition"
                                    title="فتح في Google Drive"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-500">غير مرفوع</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onInspectCert(cert)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-sky-400" />
                                  <span>فحص</span>
                                </button>

                                <button
                                  onClick={() => onLoadCert(cert)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition cursor-pointer"
                                >
                                  تعديل
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
