import React, { useState, useMemo } from 'react';
import {
  School,
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
  Calendar,
  ExternalLink,
  ShieldCheck,
  Building,
  Users
} from 'lucide-react';
import { CertificateData } from '../../types';
import { groupCertificatesBySchool, SchoolGroupArchive } from '../../utils/archiveManager';

interface SchoolClassificationViewProps {
  certificates: any[];
  selectedIds?: Set<string>;
  onToggleSelectCert?: (id: string) => void;
  onSelectAllInGroup?: (certIds: string[]) => void;
  onInspectCert?: (cert: any) => void;
  onLoadCert?: (cert: CertificateData) => void;
  onExportSchoolPdf?: (certs: any[], schoolName: string) => void;
  onUploadSchoolToDrive?: (certs: any[]) => void;
}

export const SchoolClassificationView: React.FC<SchoolClassificationViewProps> = ({
  certificates,
  selectedIds = new Set(),
  onToggleSelectCert = (_id: string) => {},
  onSelectAllInGroup = (_certIds: string[]) => {},
  onInspectCert = (_cert: any) => {},
  onLoadCert = (_cert: CertificateData) => {},
  onExportSchoolPdf = (_certs: any[], _schoolName: string) => {},
  onUploadSchoolToDrive
}) => {
  const [searchSchool, setSearchSchool] = useState('');
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  // Group certificates by school
  const schoolGroups = useMemo(() => {
    const groups = groupCertificatesBySchool(certificates);
    if (!searchSchool.trim()) return groups;
    const q = searchSchool.toLowerCase().trim();
    return groups.filter(g => g.schoolName.toLowerCase().includes(q));
  }, [certificates, searchSchool]);

  // Overall metrics
  const totalSchools = schoolGroups.length;
  const totalCertificates = certificates.length;
  const topSchool = schoolGroups.length > 0 ? schoolGroups[0] : null;

  // Toggle expand / collapse school folder
  const toggleExpand = (schoolName: string) => {
    const next = new Set(expandedSchools);
    if (next.has(schoolName)) {
      next.delete(schoolName);
    } else {
      next.add(schoolName);
    }
    setExpandedSchools(next);
  };

  const expandAll = () => {
    const next = new Set<string>();
    schoolGroups.forEach(g => next.add(g.schoolName));
    setExpandedSchools(next);
  };

  const collapseAll = () => {
    setExpandedSchools(new Set());
  };

  return (
    <div className="space-y-5 text-right font-sans">
      
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">إجمالي المدارس والمؤسسات</span>
            <span className="text-2xl font-black text-white">{totalSchools}</span>
            <span className="text-[11px] text-slate-500 block">مصنفة ومؤرشفة سحابياً</span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Building className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">إجمالي الشهادات المكتملة</span>
            <span className="text-2xl font-black text-amber-400">{totalCertificates}</span>
            <span className="text-[11px] text-slate-500 block">شهادة شكر وتقدير</span>
          </div>
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
            <GraduationCap className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-bold block">المدرسة الأكثر نشاطاً</span>
            <span className="text-base font-black text-emerald-300 truncate max-w-[180px] block" title={topSchool?.schoolName || '—'}>
              {topSchool ? topSchool.schoolName : 'لا توجد بيانات'}
            </span>
            <span className="text-[11px] text-emerald-400/80 block">
              {topSchool ? `${topSchool.totalCertificates} شهادة مصدرة` : '—'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <School className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* 2. CONTROLS & SEARCH */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchSchool}
            onChange={(e) => setSearchSchool(e.target.value)}
            placeholder="ابحث باسم المدرسة أو المعهد..."
            className="w-full pl-3 pr-9 py-2 bg-slate-800/90 border border-slate-700 text-xs rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
          />
          {searchSchool && (
            <button
              onClick={() => setSearchSchool('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            توسيع كافة المدارس
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* 3. SCHOOL LIST ACCORDION */}
      {schoolGroups.length === 0 ? (
        <div className="bg-slate-900 p-10 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <School className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold">لا توجد مدارس مطابقة لخيارات البحث الحالية</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schoolGroups.map((group) => {
            const isExpanded = expandedSchools.has(group.schoolName);
            const groupCertIds = group.certificates.map(c => c.id);
            const isAllGroupSelected = groupCertIds.every(id => selectedIds.has(id));
            const someGroupSelected = groupCertIds.some(id => selectedIds.has(id));
            const driveVerifiedCount = group.certificates.filter(c => !!(c.driveFileWebViewLink || c.driveFileUrl || c.driveFileId)).length;

            return (
              <div
                key={group.schoolName}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                {/* School Header Row */}
                <div
                  onClick={() => toggleExpand(group.schoolName)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-slate-900 to-slate-900/60 hover:bg-slate-850"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl shrink-0">
                      <School className="w-6 h-6 text-amber-400" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-white">{group.schoolName}</h3>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">
                          {group.totalCertificates} شهادة
                        </span>
                        {driveVerifiedCount > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{driveVerifiedCount} موثقة سحابياً</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        {group.grades.length > 0 && (
                          <span className="text-slate-300">
                            الفصول: <strong className="text-slate-200">{group.grades.slice(0, 3).join(' • ')}{group.grades.length > 3 ? ` +${group.grades.length - 3}` : ''}</strong>
                          </span>
                        )}
                        {group.latestArchivedAt && (
                          <span className="text-slate-500">
                            • آخر تحديث: {new Date(group.latestArchivedAt).toLocaleDateString('ar-SA')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* School Action Buttons */}
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
                      title="تحديد أو إلغاء تحديد شهادات المدرسة"
                    >
                      {isAllGroupSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span>تحديد المدرسة</span>
                    </button>

                    <button
                      onClick={() => onExportSchoolPdf(group.certificates, group.schoolName)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                      title="تصدير ملف PDF مجمع لكافة شهادات هذه المدرسة"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>تصدير PDF المجمع</span>
                    </button>

                    {onUploadSchoolToDrive && (
                      <button
                        onClick={() => onUploadSchoolToDrive(group.certificates)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl transition cursor-pointer"
                        title="توثيق شهادات المدرسة على Google Drive"
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
                      {group.certificates.map((cert, certIdx) => {
                        const isSelected = selectedIds.has(cert.id);
                        const vCode = cert.verificationCode || `TQ-${(cert.id ? String(cert.id).slice(-6) : '000000').toUpperCase()}`;
                        const driveLink = cert.driveFileWebViewLink || cert.driveFileUrl;

                        return (
                          <div
                            key={`school-${group.schoolName}-${cert.id}-${certIdx}`}
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

                              <span className="text-[10px] text-slate-500">
                                {cert.grade || 'عام'}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-black text-sm text-white">{cert.studentName}</h4>
                              <p className="text-xs text-amber-400/90 font-medium">{cert.title || 'شهادة شكر وتقدير'}</p>
                              {cert.subject && (
                                <p className="text-[11px] text-slate-400 mt-0.5">المادة: {cert.subject}</p>
                              )}
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
