export interface CertificateGridAreaDef {
  id: 'header' | 'title' | 'body' | 'stamps' | 'signatures';
  nameAr: string;
  descAr: string;
  color: string;
  bgLight: string;
  borderLight: string;
  icon: string;
}

export const CERTIFICATE_GRID_AREAS: CertificateGridAreaDef[] = [
  {
    id: 'header',
    nameAr: 'الترويسة الرسمية',
    descAr: 'المملكة، الوزارة، الشعار، التاريخ ورقم الاعتماد',
    color: '#d97706', // amber-600
    bgLight: 'bg-amber-100/90 text-amber-900',
    borderLight: 'border-amber-300',
    icon: '🏛️'
  },
  {
    id: 'title',
    nameAr: 'عنوان الشهادة',
    descAr: 'شهادة شكر وتقدير / دبلوم التميز والمسمى الفرعي',
    color: '#0284c7', // sky-600
    bgLight: 'bg-sky-100/90 text-sky-900',
    borderLight: 'border-sky-300',
    icon: '✨'
  },
  {
    id: 'body',
    nameAr: 'متن التكريم والطالب',
    descAr: 'اسم الطالب/ـة، الصياغة، الصف والمادة ونصوص التقدير',
    color: '#059669', // emerald-600
    bgLight: 'bg-emerald-100/90 text-emerald-900',
    borderLight: 'border-emerald-300',
    icon: '🎓'
  },
  {
    id: 'stamps',
    nameAr: 'الأختام والتوثيق والـ QR',
    descAr: 'أوسمة الفخر، الختم المعتمد، باركود ورمز التوثيق الإلكتروني',
    color: '#7c3aed', // violet-600
    bgLight: 'bg-violet-100/90 text-violet-900',
    borderLight: 'border-violet-300',
    icon: '🛡️'
  },
  {
    id: 'signatures',
    nameAr: 'صندوق التواقيع المعتمدة',
    descAr: 'تواقيع المعلم، المدير، المشرف والعمداء المعتمدين',
    color: '#475569', // slate-600
    bgLight: 'bg-slate-200/90 text-slate-900',
    borderLight: 'border-slate-300',
    icon: '✍️'
  }
];

export interface CustomGridSnippet {
  id: string;
  name: string;
  desc: string;
  badge: string;
  areas: string;
  columns?: string;
  rows?: string;
}

export const CUSTOM_GRID_SNIPPETS: CustomGridSnippet[] = [
  {
    id: 'split-2col',
    name: 'تخطيط مدمج متوازن (عمودان)',
    desc: 'ترويسة وعنوان عريضان، ثم المتن والأختام جنباً إلى جنب مع التواقيع',
    badge: '2 أعمدة متوازنة',
    areas: '"header header"\n"title title"\n"body body"\n"stamps signatures"',
    columns: '1fr 1fr',
    rows: 'auto auto 1fr auto'
  },
  {
    id: 'sidebar-right-custom',
    name: 'عمود الأختام والتوثيق يميناً',
    desc: 'شريط جانبي متصل للأوسمة والـ QR على اليمين مع متن واسع يساراً',
    badge: 'عمود جانبي أيمن',
    areas: '"stamps header"\n"stamps title"\n"stamps body"\n"stamps signatures"',
    columns: '220px 1fr',
    rows: 'auto auto 1fr auto'
  },
  {
    id: 'sidebar-left-custom',
    name: 'عمود الأختام والتوثيق يساراً',
    desc: 'شريط جانبي متصل للأوسمة والأختام على اليسار ومحتوى رئيسي على اليمين',
    badge: 'عمود جانبي أيسر',
    areas: '"header stamps"\n"title stamps"\n"body stamps"\n"signatures stamps"',
    columns: '1fr 220px',
    rows: 'auto auto 1fr auto'
  },
  {
    id: 'three-columns-executive',
    name: 'تخطيط 3 أعمدة للمؤسسات الكبرى',
    desc: 'الأوسمة والتوثيق يميناً، المتن في المنتصف، والتواقيع يساراً',
    badge: '3 أعمدة فسيحة',
    areas: '"header header header"\n"title title title"\n"stamps body signatures"',
    columns: '190px 1fr 190px',
    rows: 'auto auto 1fr'
  },
  {
    id: 'diploma-grand-custom',
    name: 'تخطيط دبلوم التخرج الأكاديمي',
    desc: 'التواقيع تعلو الأختام وشريط التوثيق السفلي العريض',
    badge: 'دبلوم أكاديمي',
    areas: '"header"\n"title"\n"body"\n"signatures"\n"stamps"',
    columns: '100%',
    rows: 'auto auto 1fr auto auto'
  },
  {
    id: 'classic-custom',
    name: 'التخطيط الكلاسيكي الهرمي',
    desc: 'ترويسة ➔ عنوان ➔ متن ➔ أختام ➔ تواقيع',
    badge: 'هرمي قياسي',
    areas: '"header"\n"title"\n"body"\n"stamps"\n"signatures"',
    columns: '100%',
    rows: 'auto auto 1fr auto auto'
  }
];

export interface GridValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  rowCount: number;
  colCount: number;
  matrix: string[][];
  presentAreas: string[];
  missingAreas: string[];
  formattedCss: string;
}

const VALID_AREA_NAMES = new Set(['header', 'title', 'body', 'stamps', 'signatures', '.']);

/**
 * Validates a CSS grid-template-areas string according to CSS Grid specifications
 * and specific requirements for certificate elements.
 */
export function validateGridTemplateAreas(input: string | undefined): GridValidationResult {
  const result: GridValidationResult = {
    isValid: false,
    warnings: [],
    rowCount: 0,
    colCount: 0,
    matrix: [],
    presentAreas: [],
    missingAreas: [],
    formattedCss: ''
  };

  if (!input || !input.trim()) {
    result.error = 'يرجى كتابة أو اختيار بنية مناطق الشبكة (Grid Template Areas)';
    return result;
  }

  // Extract rows. Rows can be enclosed in quotes like "a b" 'c d' or split by newlines
  const trimmed = input.trim();
  let rowStrings: string[] = [];

  // Check if string contains quotes
  const quoteRegex = /["']([^"']+)["']/g;
  let match;
  while ((match = quoteRegex.exec(trimmed)) !== null) {
    if (match[1].trim()) {
      rowStrings.push(match[1].trim());
    }
  }

  // If no quotes found, try splitting by newline
  if (rowStrings.length === 0) {
    rowStrings = trimmed
      .split('\n')
      .map(r => r.replace(/["']/g, '').trim())
      .filter(Boolean);
  }

  if (rowStrings.length === 0) {
    result.error = 'لم يتم العثور على أي صفوف صالحة. يرجى إحاطة كل صف بعلامات تنصيص، مثل: "header header"';
    return result;
  }

  // Parse tokens for each row
  const matrix: string[][] = [];
  let colCount = 0;

  for (let rIndex = 0; rIndex < rowStrings.length; rIndex++) {
    const rowStr = rowStrings[rIndex];
    // Split by whitespace
    const tokens = rowStr.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      continue;
    }

    if (matrix.length === 0) {
      colCount = tokens.length;
    } else if (tokens.length !== colCount) {
      result.error = `عدم تطابق عدد الأعمدة: الصف رقم ${rIndex + 1} يحتوي على (${tokens.length}) أعمدة، بينما الصفوف السابقة تحتوي على (${colCount}) أعمدة. يجب أن تتساوى جميع الصفوف في عدد الأعمدة.`;
      result.matrix = matrix;
      result.rowCount = matrix.length;
      result.colCount = colCount;
      return result;
    }

    matrix.push(tokens);
  }

  if (matrix.length === 0 || colCount === 0) {
    result.error = 'بنية الشبكة فارغة. يرجى إدخال صف واحد على الأقل مع أسماء المناطق.';
    return result;
  }

  result.rowCount = matrix.length;
  result.colCount = colCount;
  result.matrix = matrix;

  // Validate token names & build area presence
  const areaPositions = new Map<string, { r: number; c: number }[]>();
  const unknownTokens = new Set<string>();

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const token = matrix[r][c];

      if (!VALID_AREA_NAMES.has(token)) {
        unknownTokens.add(token);
      }

      if (token !== '.') {
        if (!areaPositions.has(token)) {
          areaPositions.set(token, []);
        }
        areaPositions.get(token)!.push({ r, c });
      }
    }
  }

  if (unknownTokens.size > 0) {
    const list = Array.from(unknownTokens).map(t => `"${t}"`).join(', ');
    result.error = `تم العثور على مسميات مناطق غير مدعومة: ${list}. المسميات المعتمدة للشهادة هي فقط: header, title, body, stamps, signatures, أو . (للخلايا الفارغة)`;
    return result;
  }

  // Validate that each named area forms a contiguous rectangle (CSS Grid rule)
  for (const [areaName, positions] of areaPositions.entries()) {
    const rIndices = positions.map(p => p.r);
    const cIndices = positions.map(p => p.c);

    const minR = Math.min(...rIndices);
    const maxR = Math.max(...rIndices);
    const minC = Math.min(...cIndices);
    const maxC = Math.max(...cIndices);

    const expectedCellCount = (maxR - minR + 1) * (maxC - minC + 1);

    if (positions.length !== expectedCellCount) {
      result.error = `المنطقة "${areaName}" لا تشكل مستطيلاً هندسياً متصلاً في الشبكة. تنص قواعد CSS Grid على وجوب اتصال خلايا كل منطقة في مستطيل موحد (دون زوايا L أو تجزئة منفصلة).`;
      return result;
    }

    // Verify all cells in the bounding box actually belong to this area
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (matrix[r][c] !== areaName) {
          result.error = `المنطقة "${areaName}" مقطوعة أو تتداخل بشكل غير مستطيل عند الصف ${r + 1} والعمود ${c + 1}.`;
          return result;
        }
      }
    }
  }

  // Check for presence of key certificate areas
  const requiredAreas = ['header', 'title', 'body', 'stamps', 'signatures'];
  const presentAreas: string[] = [];
  const missingAreas: string[] = [];

  for (const req of requiredAreas) {
    if (areaPositions.has(req)) {
      presentAreas.push(req);
    } else {
      missingAreas.push(req);
    }
  }

  result.presentAreas = presentAreas;
  result.missingAreas = missingAreas;

  if (missingAreas.length > 0) {
    const missingArabicNames = missingAreas.map(id => {
      const def = CERTIFICATE_GRID_AREAS.find(a => a.id === id);
      return def ? `"${def.nameAr} (${id})"` : `"${id}"`;
    }).join('، ');

    result.warnings.push(`تنبيه: المناطق التالية غير مدرجة في الشبكة ولن تظهر على الشهادة: ${missingArabicNames}`);
  }

  // Format valid clean CSS
  result.formattedCss = matrix
    .map(row => `"${row.join(' ')}"`)
    .join('\n');

  result.isValid = true;
  return result;
}
