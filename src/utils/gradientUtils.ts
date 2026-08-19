import { GradientConfig, GradientType } from '../types';

export interface GradientPresetItem {
  id: GradientType;
  name: string;
  description: string;
  config: GradientConfig;
  previewCss: string;
}

export const GRADIENT_PRESETS: GradientPresetItem[] = [
  {
    id: 'diagonal-gold',
    name: 'الذهبي الملكي (Royal Gold)',
    description: 'تدرج ملكي ذهبي ناعم يضفي فخامة استثنائية على وثيقة التكريم',
    config: {
      enabled: true,
      type: 'diagonal-gold',
      color1: '#fffbeb',
      color2: '#fef3c7',
      color3: '#fde68a',
      angle: 135
    },
    previewCss: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)'
  },
  {
    id: 'luxury-sunset',
    name: 'العنبر اللؤلؤي (Amber Pearl)',
    description: 'تدرج دافئ بين العاجي المضيء وعنبر الذهبي الهادئ',
    config: {
      enabled: true,
      type: 'luxury-sunset',
      color1: '#fff7ed',
      color2: '#ffedd5',
      color3: '#fef3c7',
      angle: 120
    },
    previewCss: 'linear-gradient(120deg, #fff7ed 0%, #ffedd5 50%, #fef3c7 100%)'
  },
  {
    id: 'emerald-glow',
    name: 'الزمردي الراقي (Luxury Emerald)',
    description: 'وهج زمردي عاجي ناعم يناسب الشهادات الرسمية والبيئية والافتخار',
    config: {
      enabled: true,
      type: 'emerald-glow',
      color1: '#f0fdf4',
      color2: '#dcfce7',
      color3: '#fef3c7',
      angle: 135
    },
    previewCss: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #fef3c7 100%)'
  },
  {
    id: 'sapphire-glow',
    name: 'الياقوتي الملكي (Royal Sapphire)',
    description: 'تدرج ياقوتي سماوي ناصع يعكس الأناقة والعمق الأكاديمي',
    config: {
      enabled: true,
      type: 'sapphire-glow',
      color1: '#f0f9ff',
      color2: '#e0f2fe',
      color3: '#fffbeb',
      angle: 135
    },
    previewCss: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #fffbeb 100%)'
  },
  {
    id: 'radial-center',
    name: 'الهالة المركزية (Radial Center Glow)',
    description: 'تدرج شعاعي يركّز الضوء في منتصف الشهادة لإبراز اسم المكرم',
    config: {
      enabled: true,
      type: 'radial-center',
      color1: '#ffffff',
      color2: '#fef3c7',
      color3: '#fde68a'
    },
    previewCss: 'radial-gradient(circle at center, #ffffff 30%, #fef3c7 75%, #fde68a 100%)'
  },
  {
    id: 'royal-mesh',
    name: 'الشبكي الملكي (Royal Mesh)',
    description: 'إضاءة دائرية متعددة الأطراف بأسلوب الميش العصري والفاخر',
    config: {
      enabled: true,
      type: 'royal-mesh',
      color1: '#fef9c3',
      color2: '#fed7aa',
      color3: '#fffbeb'
    },
    previewCss: 'radial-gradient(at 0% 0%, #fef9c3 0px, transparent 50%), radial-gradient(at 100% 100%, #fed7aa 0px, transparent 50%), #fffbeb'
  },
  {
    id: 'linear-to-bottom',
    name: 'تدرج رأسي ناعم (Vertical Soft)',
    description: 'انتقال لوني من الأعلى إلى الأسفل بسلاسة',
    config: {
      enabled: true,
      type: 'linear-to-bottom',
      color1: '#ffffff',
      color2: '#fef3c7',
      angle: 180
    },
    previewCss: 'linear-gradient(to bottom, #ffffff 0%, #fef3c7 100%)'
  },
  {
    id: 'linear-to-right',
    name: 'تدرج أفقي ناعم (Horizontal Soft)',
    description: 'انتقال لوني من اليمين إلى اليسار',
    config: {
      enabled: true,
      type: 'linear-to-right',
      color1: '#fffbeb',
      color2: '#fde68a',
      angle: 90
    },
    previewCss: 'linear-gradient(to right, #fffbeb 0%, #fde68a 100%)'
  },
  {
    id: 'custom',
    name: 'تدرج مخصص (Custom Gradient)',
    description: 'صمم التدرج الخاص بك بالزاوية والألوان المقترحة بحرية تامّة',
    config: {
      enabled: true,
      type: 'custom',
      color1: '#fefce8',
      color2: '#fde68a',
      color3: '#f59e0b',
      angle: 135
    },
    previewCss: 'linear-gradient(135deg, #fefce8 0%, #fde68a 50%, #f59e0b 100%)'
  }
];

export const GRADIENT_COLOR_SWATCHES = [
  { name: 'عاجي ناصع', hex: '#ffffff' },
  { name: 'ذهب عاجي', hex: '#fffbeb' },
  { name: 'أصفر لؤلؤي', hex: '#fef3c7' },
  { name: 'عنبر دافئ', hex: '#fde68a' },
  { name: 'ذهب ملكي', hex: '#f59e0b' },
  { name: 'زمردي فاتح', hex: '#f0fdf4' },
  { name: 'نعناعي راقي', hex: '#dcfce7' },
  { name: 'ياقوتي سماوي', hex: '#f0f9ff' },
  { name: 'سماوي ملكي', hex: '#e0f2fe' },
  { name: 'زهري لؤلؤي', hex: '#fff1f2' },
  { name: 'بنفسجي ملكي ناعم', hex: '#faf5ff' },
  { name: 'رمادي فضي راقي', hex: '#f8fafc' },
];

export function getGradientCss(config?: GradientConfig, fallbackBgColor: string = '#ffffff'): string {
  if (!config || !config.enabled || config.type === 'none') {
    return fallbackBgColor;
  }

  const { type, color1, color2, color3, angle = 135 } = config;

  switch (type) {
    case 'diagonal-gold':
      return `linear-gradient(${angle}deg, ${color1 || '#fffbeb'} 0%, ${color2 || '#fef3c7'} 50%, ${color3 || '#fde68a'} 100%)`;

    case 'luxury-sunset':
      return `linear-gradient(${angle}deg, ${color1 || '#fff7ed'} 0%, ${color2 || '#ffedd5'} 50%, ${color3 || '#fef3c7'} 100%)`;

    case 'emerald-glow':
      return `linear-gradient(${angle}deg, ${color1 || '#f0fdf4'} 0%, ${color2 || '#dcfce7'} 60%, ${color3 || '#fef3c7'} 100%)`;

    case 'sapphire-glow':
      return `linear-gradient(${angle}deg, ${color1 || '#f0f9ff'} 0%, ${color2 || '#e0f2fe'} 60%, ${color3 || '#fffbeb'} 100%)`;

    case 'radial-center':
      return `radial-gradient(circle at center, ${color1 || '#ffffff'} 25%, ${color2 || '#fef3c7'} 70%${color3 ? `, ${color3} 100%` : ''})`;

    case 'royal-mesh':
      return `radial-gradient(at 0% 0%, ${color1 || '#fef9c3'} 0px, transparent 55%), radial-gradient(at 100% 100%, ${color2 || '#fed7aa'} 0px, transparent 55%), ${color3 || '#fffbeb'}`;

    case 'linear-to-bottom':
      return `linear-gradient(to bottom, ${color1 || '#ffffff'} 0%, ${color2 || '#fef3c7'} 100%${color3 ? `, ${color3} 100%` : ''})`;

    case 'linear-to-right':
      return `linear-gradient(to right, ${color1 || '#fffbeb'} 0%, ${color2 || '#fde68a'} 100%${color3 ? `, ${color3} 100%` : ''})`;

    case 'custom':
    default:
      if (color3) {
        return `linear-gradient(${angle}deg, ${color1 || '#ffffff'} 0%, ${color2 || '#fef3c7'} 50%, ${color3} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${color1 || '#ffffff'} 0%, ${color2 || '#fef3c7'} 100%)`;
  }
}
