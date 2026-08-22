import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CertificateData } from '../types';
import { generateCertificatePrintHtml } from './printUtils';
import { autoArchiveCertificate, autoArchiveBatchCertificates } from './archiveManager';

export interface CertificateDimensionConfig {
  baseWidth: number;
  baseHeight: number;
  widthMm: number;
  heightMm: number;
  aspectRatioValue: number; // width / height
  widthClass: string;
  label: string;
  orientation: 'landscape' | 'portrait';
  pdfFormat: string | [number, number];
}

/**
 * Mathematical Proportion Engine: Single source of truth for certificate dimensions,
 * aspect ratios, pixel bases, and print millimetre equations.
 */
export function getCertificateDimensions(aspectRatio?: string): CertificateDimensionConfig {
  switch (aspectRatio) {
    case 'A4-portrait':
      return {
        baseWidth: 794,
        baseHeight: 1123,
        widthMm: 210,
        heightMm: 297,
        aspectRatioValue: 794 / 1123, // ~0.707034 (ISO A4 Portrait)
        widthClass: 'w-[794px] h-[1123px]',
        label: 'ورقة A4 عمودية (210 × 297 مم)',
        orientation: 'portrait',
        pdfFormat: 'a4',
      };
    case 'square':
      return {
        baseWidth: 800,
        baseHeight: 800,
        widthMm: 210,
        heightMm: 210,
        aspectRatioValue: 1.0, // 1:1 Square
        widthClass: 'w-[800px] h-[800px]',
        label: 'مربع قياسي (1 : 1 - 210 × 210 مم)',
        orientation: 'portrait',
        pdfFormat: [210, 210],
      };
    case 'A4-landscape':
    default:
      return {
        baseWidth: 1050,
        baseHeight: 742,
        widthMm: 297,
        heightMm: 210,
        aspectRatioValue: 1050 / 742, // ~1.415094 (ISO A4 Landscape)
        widthClass: 'w-[1050px] h-[742px]',
        label: 'ورقة A4 أفقية (297 × 210 مم)',
        orientation: 'landscape',
        pdfFormat: 'a4',
      };
  }
}

export async function waitForImagesToLoad(container?: HTMLElement | null): Promise<void> {
  if (!container || typeof container.querySelectorAll !== 'function') return;
  const images = Array.from(container.querySelectorAll('img'));
  const promises = images.map((img) => {
    if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 1500);
    });
  });
  await Promise.all(promises);
}

// Helper to convert OKLCH, OKLAB, and modern color strings to RGB/RGBA strings for html2canvas compatibility

export function oklabToRgbStr(oklabStr: string): string {
  try {
    const clean = oklabStr.replace(/var\([^,)]*,\s*([^)]+)\)/gi, '$1').replace(/var\([^)]+\)/gi, '1');
    const match = clean.match(/oklab\(\s*([-\+\d.e%]+|none)[\s,]+([-\+\d.e%]+|none)[\s,]+([-\+\d.e%]+|none)(?:\s*[\/\,]\s*([-\+\d.e%]+|none))?\s*\)/i);
    if (!match) return 'rgb(0, 0, 0)';

    let l = match[1] === 'none' ? 0 : parseFloat(match[1]);
    if (match[1].endsWith('%')) l = l / 100;
    if (l > 1) l = l / 100;

    let a_val = match[2] === 'none' ? 0 : parseFloat(match[2]);
    if (match[2].endsWith('%')) a_val = (parseFloat(match[2]) / 100) * 0.4;

    let b_val = match[3] === 'none' ? 0 : parseFloat(match[3]);
    if (match[3].endsWith('%')) b_val = (parseFloat(match[3]) / 100) * 0.4;

    let alpha = 1;
    if (match[4] && match[4] !== 'none') {
      alpha = parseFloat(match[4]);
      if (match[4].endsWith('%')) alpha = alpha / 100;
      if (isNaN(alpha)) alpha = 1;
    }

    const l_ = l + 0.3963377774 * a_val + 0.2158037573 * b_val;
    const m_ = l - 0.1055613458 * a_val - 0.0638541728 * b_val;
    const s_ = l - 0.0894841775 * a_val - 1.2914855480 * b_val;

    const l3 = l_ ** 3;
    const m3 = m_ ** 3;
    const s3 = s_ ** 3;

    let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSrgb = (x: number) => {
      x = Math.max(0, Math.min(1, x));
      return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    };

    const r255 = Math.round(toSrgb(r) * 255);
    const g255 = Math.round(toSrgb(g) * 255);
    const b255 = Math.round(toSrgb(b) * 255);

    if (alpha < 1) {
      return `rgba(${r255}, ${g255}, ${b255}, ${alpha.toFixed(3)})`;
    }
    return `rgb(${r255}, ${g255}, ${b255})`;
  } catch (e) {
    return 'rgb(0, 0, 0)';
  }
}

export function oklchToRgbStr(oklchStr: string): string {
  try {
    const clean = oklchStr.replace(/var\([^,)]*,\s*([^)]+)\)/gi, '$1').replace(/var\([^)]+\)/gi, '1');
    const match = clean.match(/oklch\(\s*([-\+\d.e%]+|none)[\s,]+([-\+\d.e%]+|none)[\s,]+([-\+\d.e%a-z]+|none)(?:\s*[\/\,]\s*([-\+\d.e%]+|none))?\s*\)/i);
    if (!match) return 'rgb(0, 0, 0)';

    let l = match[1] === 'none' ? 0 : parseFloat(match[1]);
    if (match[1].endsWith('%')) l = l / 100;
    if (l > 1) l = l / 100;

    let c = match[2] === 'none' ? 0 : parseFloat(match[2]);
    if (match[2].endsWith('%')) c = (parseFloat(match[2]) / 100) * 0.4;

    let hStr = match[3] === 'none' ? '0' : match[3];
    let h = parseFloat(hStr);
    if (isNaN(h)) h = 0;
    if (hStr.endsWith('rad')) h = h * (180 / Math.PI);
    else if (hStr.endsWith('turn')) h = h * 360;
    else if (hStr.endsWith('grad')) h = h * 0.9;

    let alpha = 1;
    if (match[4] && match[4] !== 'none') {
      alpha = parseFloat(match[4]);
      if (match[4].endsWith('%')) alpha = alpha / 100;
      if (isNaN(alpha)) alpha = 1;
    }

    const hRad = (h * Math.PI) / 180;
    const a_lab = c * Math.cos(hRad);
    const b_lab = c * Math.sin(hRad);

    const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
    const m_ = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
    const s_ = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

    const l3 = l_ ** 3;
    const m3 = m_ ** 3;
    const s3 = s_ ** 3;

    let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSrgb = (x: number) => {
      x = Math.max(0, Math.min(1, x));
      return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    };

    const r255 = Math.round(toSrgb(r) * 255);
    const g255 = Math.round(toSrgb(g) * 255);
    const b255 = Math.round(toSrgb(b) * 255);

    if (alpha < 1) {
      return `rgba(${r255}, ${g255}, ${b255}, ${alpha.toFixed(3)})`;
    }
    return `rgb(${r255}, ${g255}, ${b255})`;
  } catch (e) {
    return 'rgb(0, 0, 0)';
  }
}

let colorCanvasCtx: CanvasRenderingContext2D | null = null;
let colorTestDiv: HTMLDivElement | null = null;

export function resolveCssColorNative(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  const trimmed = colorStr.trim();
  if (!trimmed) return colorStr;

  const lower = trimmed.toLowerCase();

  if (lower.startsWith('oklch')) {
    const res = oklchToRgbStr(trimmed);
    if (res && res !== 'rgb(0, 0, 0)') return res;
  }
  if (lower.startsWith('oklab') || lower.startsWith('lab') || lower.startsWith('lch')) {
    const res = oklabToRgbStr(trimmed.replace(/^(lab|lch)/i, 'oklab'));
    if (res && res !== 'rgb(0, 0, 0)') return res;
  }

  try {
    if (typeof document !== 'undefined') {
      if (!colorCanvasCtx) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        colorCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
      }
      if (colorCanvasCtx) {
        colorCanvasCtx.fillStyle = 'rgba(1, 2, 3, 0.5)';
        colorCanvasCtx.fillStyle = trimmed;
        const resolved = colorCanvasCtx.fillStyle;
        if (
          resolved &&
          resolved !== 'rgba(1, 2, 3, 0.5)' &&
          resolved !== 'rgba(1,2,3,0.5)' &&
          resolved !== 'rgba(1, 2, 3, 0.500)' &&
          !/(?:oklch|oklab|lch|lab)\(/i.test(resolved)
        ) {
          return resolved;
        }
      }
    }
  } catch (e) {}

  try {
    if (typeof document !== 'undefined') {
      if (!colorTestDiv) {
        colorTestDiv = document.createElement('div');
        colorTestDiv.style.position = 'fixed';
        colorTestDiv.style.left = '-9999px';
        colorTestDiv.style.top = '-9999px';
        colorTestDiv.style.visibility = 'hidden';
        document.body.appendChild(colorTestDiv);
      }
      colorTestDiv.style.color = '';
      colorTestDiv.style.color = trimmed;
      const computed = window.getComputedStyle(colorTestDiv).color;
      if (computed && computed !== '' && !/(?:oklch|oklab|lch|lab)\(/i.test(computed)) {
        return computed;
      }
    }
  } catch (e) {}

  if (lower.includes('oklch')) return oklchToRgbStr(trimmed);
  if (lower.includes('oklab')) return oklabToRgbStr(trimmed);

  return 'rgb(0, 0, 0)';
}

export function convertColorString(colorStr: string): string {
  return resolveCssColorNative(colorStr);
}

export function replaceAllColorFunctions(input: string): string {
  if (!input || typeof input !== 'string') return input;
  if (!/(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(input)) return input;

  let text = input;

  const funcRegex = /(?:oklch|oklab|lch|lab|color-mix|color)\(/gi;
  let match: RegExpExecArray | null;
  let iterations = 0;

  while (iterations < 5000) {
    funcRegex.lastIndex = 0;
    match = funcRegex.exec(text);
    if (!match) break;

    const startIndex = match.index;
    const openParenIndex = startIndex + match[0].length - 1;

    let depth = 1;
    let closeParenIndex = -1;
    for (let i = openParenIndex + 1; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
      if (depth === 0) {
        closeParenIndex = i;
        break;
      }
    }

    if (closeParenIndex === -1) {
      let endIdx = text.indexOf(';', openParenIndex);
      if (endIdx === -1) endIdx = text.indexOf('}', openParenIndex);
      if (endIdx === -1) endIdx = text.length;
      text = text.slice(0, startIndex) + 'rgb(0, 0, 0)' + text.slice(endIdx);
      iterations++;
      continue;
    }

    const fullFunc = text.slice(startIndex, closeParenIndex + 1);
    const converted = resolveCssColorNative(fullFunc);

    text = text.slice(0, startIndex) + converted + text.slice(closeParenIndex + 1);
    iterations++;
  }

  // Absolute guarantee fallback: strip any lingering oklch/oklab/lch/lab/color-mix/color calls
  text = text.replace(/oklch\s*\([^;}]*/gi, 'rgb(0, 0, 0)');
  text = text.replace(/oklab\s*\([^;}]*/gi, 'rgb(0, 0, 0)');
  text = text.replace(/lch\s*\([^;}]*/gi, 'rgb(0, 0, 0)');
  text = text.replace(/lab\s*\([^;}]*/gi, 'rgb(0, 0, 0)');
  text = text.replace(/color-mix\s*\([^;}]*/gi, 'rgb(0, 0, 0)');
  text = text.replace(/color\s*\([^;}]*/gi, 'rgb(0, 0, 0)');

  return text;
}

export function sanitizeOklchInDoc(clonedDoc: Document, certData?: CertificateData, sourceElement?: HTMLElement) {
  if (!clonedDoc || !clonedDoc.querySelectorAll) return;

  // 1. Preserve external font links (e.g. Google Fonts) and inline converted styles
  const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  links.forEach((link) => {
    const href = (link as HTMLLinkElement).href || '';
    if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com') || href.includes('font')) {
      // KEEP external font stylesheets intact
      return;
    }
    try {
      const sheet = Array.from(document.styleSheets).find((s) => s.href === href);
      if (sheet) {
        let cssText = '';
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let i = 0; i < rules.length; i++) {
              cssText += rules[i].cssText + '\n';
            }
          }
        } catch (e) {}
        if (cssText) {
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = replaceAllColorFunctions(cssText);
          clonedDoc.head?.appendChild(styleEl);
          link.remove();
        }
      }
    } catch (e) {
      // Safe fallback: do not remove link if processing fails
    }
  });

  // Ensure any Google Fonts link present in main document head is also in clonedDoc head
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    const mainFontLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'));
    mainFontLinks.forEach((fontLink) => {
      const href = (fontLink as HTMLLinkElement).href;
      if (!clonedDoc.querySelector(`link[href="${href}"]`)) {
        const newLink = clonedDoc.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href;
        clonedDoc.head?.appendChild(newLink);
      }
    });
  }

  // 2. Sanitize all <style> elements in clonedDoc
  const styleElements = Array.from(clonedDoc.querySelectorAll('style'));
  styleElements.forEach((styleEl) => {
    if (styleEl.textContent && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(styleEl.textContent)) {
      styleEl.textContent = replaceAllColorFunctions(styleEl.textContent);
    }
  });

  // 3. Sanitize all styleSheets in clonedDoc
  try {
    const sheets = Array.from(clonedDoc.styleSheets);
    sheets.forEach((sheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (rule.cssText && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(rule.cssText)) {
              if ('style' in rule && rule.style) {
                const cssStyle = (rule as CSSStyleRule).style;
                for (let j = 0; j < cssStyle.length; j++) {
                  const prop = cssStyle[j];
                  const val = cssStyle.getPropertyValue(prop);
                  if (val && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(val)) {
                    cssStyle.setProperty(
                      prop,
                      replaceAllColorFunctions(val),
                      cssStyle.getPropertyPriority(prop)
                    );
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Safe ignore
      }
    });
  } catch (e) {}

  // Inject explicit Arabic typography fix, flexbox text centering, & badge/stamp layout locks
  const styleFix = clonedDoc.createElement('style');
  styleFix.textContent = `
    #certificate-print-area, #certificate-print-area * {
      letter-spacing: 0px !important;
      word-spacing: 0px !important;
      font-variant-ligatures: normal !important;
      font-feature-settings: "liga" 1, "dlig" 1 !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
      box-sizing: border-box !important;
    }

    /* Lock centering for badges, stamps, and circular elements */
    #certificate-print-area [class*="badge"],
    #certificate-print-area [class*="stamp"],
    #certificate-print-area [class*="rounded-full"],
    #certificate-print-area .flex-col.items-center {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
    }

    #certificate-print-area [class*="rounded-full"] span,
    #certificate-print-area [class*="stamp"] span,
    #certificate-print-area [class*="badge"] span {
      display: block !important;
      width: 100% !important;
      text-align: center !important;
      margin: 0 auto !important;
      line-height: 1.2 !important;
    }

    #certificate-print-area .text-center {
      text-align: center !important;
    }
    #certificate-print-area .justify-center {
      justify-content: center !important;
    }
    #certificate-print-area .items-center {
      align-items: center !important;
    }
    #certificate-print-area .inline-flex {
      display: inline-flex !important;
    }
  `;
  clonedDoc.head.appendChild(styleFix);

  // 4. Synchronize exact computed styles from live DOM to cloned document
  const origContainer = sourceElement || (typeof document !== 'undefined' ? document.getElementById('certificate-print-area') : null);
  const clonedContainer = clonedDoc.getElementById('certificate-print-area') || (clonedDoc.querySelector('[data-certificate-canvas="true"]') as HTMLElement);

  if (clonedContainer) {
    clonedContainer.setAttribute('dir', 'rtl');
    clonedContainer.style.direction = 'rtl';
    clonedContainer.style.letterSpacing = '0px';
    clonedContainer.style.wordSpacing = '0px';
    clonedContainer.style.transform = 'none';
    clonedContainer.style.margin = '0';
    clonedContainer.style.position = 'relative';
    clonedContainer.style.boxShadow = 'none';

    // Determine target unscaled base dimensions using mathematical proportion engine
    const explicitAspect = certData?.aspectRatio ||
      clonedContainer.getAttribute('data-aspect') ||
      (clonedContainer.classList.contains('aspect-portrait') ? 'A4-portrait' : undefined) ||
      (clonedContainer.classList.contains('aspect-square') ? 'square' : 'A4-landscape');

    const dims = getCertificateDimensions(explicitAspect);
    const baseW = dims.baseWidth;
    const baseH = dims.baseHeight;

    clonedContainer.style.width = `${baseW}px`;
    clonedContainer.style.height = `${baseH}px`;
    clonedContainer.style.minWidth = `${baseW}px`;
    clonedContainer.style.minHeight = `${baseH}px`;
    clonedContainer.style.maxWidth = `${baseW}px`;
    clonedContainer.style.maxHeight = `${baseH}px`;
  }

  if (origContainer && clonedContainer && origContainer.querySelectorAll && clonedContainer.querySelectorAll) {
    const origList = [origContainer, ...Array.from(origContainer.querySelectorAll('*'))];
    const clonedList = [clonedContainer, ...Array.from(clonedContainer.querySelectorAll('*'))];

    const len = Math.min(origList.length, clonedList.length);
    for (let i = 0; i < len; i++) {
      const origNode = origList[i];
      const clonedNode = clonedList[i];

      if (origNode instanceof HTMLElement && clonedNode instanceof HTMLElement) {
        const cs = window.getComputedStyle(origNode);

        // Copy computed colors (resolved to rgb/rgba)
        if (cs.color) clonedNode.style.color = replaceAllColorFunctions(cs.color);
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
          clonedNode.style.backgroundColor = replaceAllColorFunctions(cs.backgroundColor);
        }
        if (cs.backgroundImage && cs.backgroundImage !== 'none') {
          clonedNode.style.backgroundImage = replaceAllColorFunctions(cs.backgroundImage);
        }
        if (cs.boxShadow && cs.boxShadow !== 'none' && origNode !== origContainer) {
          clonedNode.style.boxShadow = replaceAllColorFunctions(cs.boxShadow);
        }

        // Copy layout spacing & dimensions, except for badges/stamps to avoid responsive layout drift
        const classNameStr = origNode.className ? origNode.className.toString() : '';
        const isBadgeOrStamp = classNameStr.includes('rounded-full') || classNameStr.includes('stamp') || classNameStr.includes('badge');

        if (!isBadgeOrStamp) {
          if (cs.paddingTop) clonedNode.style.paddingTop = cs.paddingTop;
          if (cs.paddingRight) clonedNode.style.paddingRight = cs.paddingRight;
          if (cs.paddingBottom) clonedNode.style.paddingBottom = cs.paddingBottom;
          if (cs.paddingLeft) clonedNode.style.paddingLeft = cs.paddingLeft;
        } else {
          clonedNode.style.display = 'flex';
          clonedNode.style.flexDirection = 'column';
          clonedNode.style.alignItems = 'center';
          clonedNode.style.justifyContent = 'center';
        }

        if (cs.marginTop && cs.marginTop !== '0px') clonedNode.style.marginTop = cs.marginTop;
        if (cs.marginRight && cs.marginRight !== '0px') clonedNode.style.marginRight = cs.marginRight;
        if (cs.marginBottom && cs.marginBottom !== '0px') clonedNode.style.marginBottom = cs.marginBottom;
        if (cs.marginLeft && cs.marginLeft !== '0px') clonedNode.style.marginLeft = cs.marginLeft;

        if (cs.boxSizing) clonedNode.style.boxSizing = cs.boxSizing;

        // Copy computed opacity, zIndex, and transform
        if (cs.opacity) clonedNode.style.opacity = cs.opacity;
        if (cs.zIndex && cs.zIndex !== 'auto') clonedNode.style.zIndex = cs.zIndex;
        if (origNode !== origContainer) {
          if (origNode.style && origNode.style.transform) {
            clonedNode.style.transform = origNode.style.transform;
          } else if (cs.transform && cs.transform !== 'none') {
            clonedNode.style.transform = cs.transform;
          }
        }

        // Copy typography & alignment
        if (cs.fontFamily) clonedNode.style.fontFamily = cs.fontFamily;
        if (cs.fontSize) clonedNode.style.fontSize = cs.fontSize;
        if (cs.fontWeight) clonedNode.style.fontWeight = cs.fontWeight;
        if (cs.fontStyle) clonedNode.style.fontStyle = cs.fontStyle;
        if (cs.lineHeight) clonedNode.style.lineHeight = cs.lineHeight;
        if (cs.textAlign) clonedNode.style.textAlign = cs.textAlign;
        if (cs.textDecorationLine) clonedNode.style.textDecorationLine = cs.textDecorationLine;
        if (cs.textTransform) clonedNode.style.textTransform = cs.textTransform;
        if (cs.whiteSpace) clonedNode.style.whiteSpace = cs.whiteSpace;
        if (cs.direction) clonedNode.style.direction = cs.direction;

        // Force letterSpacing and wordSpacing to normal for Arabic connected text
        clonedNode.style.letterSpacing = '0px';
        clonedNode.style.wordSpacing = '0px';

        // Copy borders & corner radii
        if (cs.borderStyle && cs.borderStyle !== 'none') clonedNode.style.borderStyle = cs.borderStyle;
        if (cs.borderWidth && cs.borderWidth !== '0px') clonedNode.style.borderWidth = cs.borderWidth;
        if (cs.borderColor) clonedNode.style.borderColor = replaceAllColorFunctions(cs.borderColor);

        if (cs.borderTopStyle && cs.borderTopStyle !== 'none') clonedNode.style.borderTopStyle = cs.borderTopStyle;
        if (cs.borderTopWidth && cs.borderTopWidth !== '0px') clonedNode.style.borderTopWidth = cs.borderTopWidth;
        if (cs.borderTopColor) clonedNode.style.borderTopColor = replaceAllColorFunctions(cs.borderTopColor);

        if (cs.borderRightStyle && cs.borderRightStyle !== 'none') clonedNode.style.borderRightStyle = cs.borderRightStyle;
        if (cs.borderRightWidth && cs.borderRightWidth !== '0px') clonedNode.style.borderRightWidth = cs.borderRightWidth;
        if (cs.borderRightColor) clonedNode.style.borderRightColor = replaceAllColorFunctions(cs.borderRightColor);

        if (cs.borderBottomStyle && cs.borderBottomStyle !== 'none') clonedNode.style.borderBottomStyle = cs.borderBottomStyle;
        if (cs.borderBottomWidth && cs.borderBottomWidth !== '0px') clonedNode.style.borderBottomWidth = cs.borderBottomWidth;
        if (cs.borderBottomColor) clonedNode.style.borderBottomColor = replaceAllColorFunctions(cs.borderBottomColor);

        if (cs.borderLeftStyle && cs.borderLeftStyle !== 'none') clonedNode.style.borderLeftStyle = cs.borderLeftStyle;
        if (cs.borderLeftWidth && cs.borderLeftWidth !== '0px') clonedNode.style.borderLeftWidth = cs.borderLeftWidth;

        if (cs.borderRadius && cs.borderRadius !== '0px') clonedNode.style.borderRadius = cs.borderRadius;
        if (cs.borderTopLeftRadius && cs.borderTopLeftRadius !== '0px') clonedNode.style.borderTopLeftRadius = cs.borderTopLeftRadius;
        if (cs.borderTopRightRadius && cs.borderTopRightRadius !== '0px') clonedNode.style.borderTopRightRadius = cs.borderTopRightRadius;
        if (cs.borderBottomRightRadius && cs.borderBottomRightRadius !== '0px') clonedNode.style.borderBottomRightRadius = cs.borderBottomRightRadius;
        if (cs.borderBottomLeftRadius && cs.borderBottomLeftRadius !== '0px') clonedNode.style.borderBottomLeftRadius = cs.borderBottomLeftRadius;

        if (origNode !== origContainer) {
          if (cs.objectFit) clonedNode.style.objectFit = cs.objectFit;
          if (cs.mixBlendMode) clonedNode.style.mixBlendMode = cs.mixBlendMode;
          if (cs.filter && cs.filter !== 'none') clonedNode.style.filter = replaceAllColorFunctions(cs.filter);
        }

        if (clonedNode.style.cssText && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(clonedNode.style.cssText)) {
          clonedNode.style.cssText = replaceAllColorFunctions(clonedNode.style.cssText);
        }
      } else if (origNode instanceof SVGElement && clonedNode instanceof SVGElement) {
        const cs = window.getComputedStyle(origNode);
        if (cs.fill && cs.fill !== 'none') {
          const resFill = replaceAllColorFunctions(cs.fill);
          clonedNode.style.fill = resFill;
          clonedNode.setAttribute('fill', resFill);
        }
        if (cs.stroke && cs.stroke !== 'none') {
          const resStroke = replaceAllColorFunctions(cs.stroke);
          clonedNode.style.stroke = resStroke;
          clonedNode.setAttribute('stroke', resStroke);
        }
        if (cs.strokeWidth) {
          clonedNode.style.strokeWidth = cs.strokeWidth;
          clonedNode.setAttribute('stroke-width', cs.strokeWidth);
        }
        if (cs.strokeDasharray && cs.strokeDasharray !== 'none') {
          clonedNode.style.strokeDasharray = cs.strokeDasharray;
          clonedNode.setAttribute('stroke-dasharray', cs.strokeDasharray);
        }
        if (cs.strokeLinecap) clonedNode.style.strokeLinecap = cs.strokeLinecap;
        if (cs.strokeLinejoin) clonedNode.style.strokeLinejoin = cs.strokeLinejoin;
        if (cs.opacity) clonedNode.style.opacity = cs.opacity;
        if (cs.transform && cs.transform !== 'none') clonedNode.style.transform = cs.transform;
      }

      // Check inline attributes
      if (clonedNode instanceof HTMLElement || clonedNode instanceof SVGElement) {
        Array.from(clonedNode.attributes).forEach((attr) => {
          if (attr.value && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(attr.value)) {
            clonedNode.setAttribute(attr.name, replaceAllColorFunctions(attr.value));
          }
        });
      }
    }
  } else {
    // Fallback if origContainer is not found
    const allElements = clonedDoc.querySelectorAll ? Array.from(clonedDoc.querySelectorAll('*')) : [];
    allElements.forEach((el) => {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        if (el instanceof HTMLElement) {
          el.style.letterSpacing = '0px';
          el.style.wordSpacing = '0px';
          if (el.style?.cssText && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(el.style.cssText)) {
            el.style.cssText = replaceAllColorFunctions(el.style.cssText);
          }
        }
        Array.from(el.attributes).forEach((attr) => {
          if (attr.value && /(?:oklch|oklab|lch|lab|color-mix|color)\(/i.test(attr.value)) {
            el.setAttribute(attr.name, replaceAllColorFunctions(attr.value));
          }
        });
      }
    });
  }

  // 5. Ensure NO text clipping, overflow hidden, or truncated ellipsis in clonedDoc
  if (clonedContainer && clonedContainer.querySelectorAll) {
    clonedContainer.style.overflow = 'visible';

    // Remove any interactive UI controls or drag handles cloned into the certificate
    clonedContainer.querySelectorAll('.drag-handle, [data-editor-control]').forEach((ctrl) => {
      ctrl.remove();
    });

    // Convert CSS flex gap to explicit child margins for html2canvas
    const allFlexEls = [clonedContainer, ...Array.from(clonedContainer.querySelectorAll('*'))];
    allFlexEls.forEach((el) => {
      if (el instanceof HTMLElement) {
        const computed = window.getComputedStyle(el);
        if (computed.display === 'flex' || computed.display === 'inline-flex') {
          const gapVal = computed.gap || computed.columnGap || computed.rowGap;
          if (gapVal && gapVal !== 'normal' && gapVal !== '0px') {
            const isColumn = computed.flexDirection.includes('column');
            const children = Array.from(el.children);
            for (let k = 1; k < children.length; k++) {
              const child = children[k];
              if (child instanceof HTMLElement) {
                if (isColumn) {
                  if (!child.style.marginTop) child.style.marginTop = gapVal;
                } else {
                  if (computed.direction === 'rtl') {
                    if (!child.style.marginRight) child.style.marginRight = gapVal;
                  } else {
                    if (!child.style.marginLeft) child.style.marginLeft = gapVal;
                  }
                }
              }
            }
          }
        }
      }
    });

    const clonedElements = Array.from(clonedContainer.querySelectorAll('*'));
    clonedElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        // Ensure text overflow is not hidden
        el.style.overflow = 'visible';
        if (el.style.textOverflow === 'ellipsis') {
          el.style.textOverflow = 'clip';
        }
        el.classList.remove('truncate');
        el.classList.remove('overflow-hidden');
        el.classList.remove('text-ellipsis');

        // Convert any leftover input/textarea to inline span with full text
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
          const span = clonedDoc.createElement('span');
          span.textContent = inputEl.value || inputEl.placeholder || '';
          span.className = inputEl.className.replace(/\btruncate\b|\boverflow-hidden\b|\btext-ellipsis\b/g, '');
          span.style.cssText = inputEl.style.cssText;
          span.style.overflow = 'visible';
          span.style.whiteSpace = 'pre-wrap';
          span.style.wordBreak = 'break-word';
          span.style.display = 'inline-block';
          span.style.border = 'none';
          span.style.background = 'transparent';
          span.style.outline = 'none';
          span.style.boxShadow = 'none';
          el.parentNode?.replaceChild(span, el);
        }
      }
    });
  }
}

export async function findCertificateCanvasElement(
  canvasRef?: React.RefObject<HTMLDivElement | null>,
  maxAttempts = 25,
  delayMs = 100
): Promise<HTMLElement> {
  for (let i = 0; i < maxAttempts; i++) {
    const el =
      canvasRef?.current ||
      document.getElementById('certificate-print-area') ||
      document.querySelector('[data-certificate-canvas="true"]') ||
      document.querySelector('#certificate-print-area') ||
      (document.querySelector('.relative.overflow-hidden.bg-white') as HTMLElement);

    if (el) return el as HTMLElement;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('لم نتمكن من تحديد لوحة الشهادة لالتقاط الصورة. يرجى التأكد من أنك في واجهة التصميم ثم المحاولة مجدداً.');
}

export interface CaptureCanvasOptions {
  scale?: number;
  backgroundColor?: string;
  customWidth?: number;
  customHeight?: number;
}

/**
 * Captures certificate DOM element with exact mathematical aspect ratio equations,
 * zero coordinate drift, full font ligature rendering, and high-DPI rasterization.
 */
export async function captureCertificateCanvas(
  element: HTMLElement | null | undefined,
  certificateData: CertificateData,
  options: CaptureCanvasOptions = {}
): Promise<HTMLCanvasElement> {
  let targetElement = element;
  if (!targetElement) {
    try {
      targetElement = await findCertificateCanvasElement(undefined, 10, 50);
    } catch {
      targetElement = typeof document !== 'undefined'
        ? (document.getElementById('certificate-print-area') ||
           document.querySelector('[data-certificate-canvas="true"]') ||
           document.querySelector('.relative.overflow-hidden.bg-white')) as HTMLElement
        : null;
    }
  }

  if (!targetElement) {
    throw new Error('لم يتم العثور على لوحة الشهادة للتصدير.');
  }

  const dims = getCertificateDimensions(certificateData.aspectRatio);
  const targetWidth = options.customWidth || dims.baseWidth;
  const targetHeight = options.customHeight || dims.baseHeight;
  const scale = options.scale ?? 3.0;

  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }
  await waitForImagesToLoad(targetElement);

  // Direct precision html2canvas capture with exact coordinate isolation
  const canvas = await html2canvas(targetElement, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor || certificateData.backgroundColor || '#ffffff',
    logging: false,
    width: targetWidth,
    height: targetHeight,
    windowWidth: targetWidth,
    windowHeight: targetHeight,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    onclone: (clonedDoc, clonedEl) => {
      sanitizeOklchInDoc(clonedDoc, certificateData, targetElement);
      const clonedCert = (clonedEl || clonedDoc.getElementById('certificate-print-area') || clonedDoc.querySelector('[data-certificate-canvas="true"]')) as HTMLElement;
      if (clonedCert) {
        clonedCert.style.transform = 'none';
        clonedCert.style.transformOrigin = 'center center';
        clonedCert.style.margin = '0 auto';
        clonedCert.style.position = 'relative';
        clonedCert.style.boxShadow = 'none';
        clonedCert.style.width = `${targetWidth}px`;
        clonedCert.style.height = `${targetHeight}px`;
        clonedCert.style.minWidth = `${targetWidth}px`;
        clonedCert.style.minHeight = `${targetHeight}px`;
        clonedCert.style.maxWidth = `${targetWidth}px`;
        clonedCert.style.maxHeight = `${targetHeight}px`;
        clonedCert.style.overflow = 'hidden';
      }
      // Ensure all parents of clonedCert in clonedDoc do not introduce offsets or scaling
      let parent = clonedCert ? clonedCert.parentElement : null;
      while (parent && parent !== clonedDoc.body) {
        parent.style.transform = 'none';
        parent.style.margin = '0';
        parent.style.padding = '0';
        parent = parent.parentElement;
      }
    }
  });

  return canvas;
}

/**
 * Creates a proportional, distortion-free PDF matching the exact aspect ratio equations
 * of the preview canvas and target paper standards.
 */
export function createProportionalPdf(
  canvas: HTMLCanvasElement,
  certificateData: CertificateData
): jsPDF {
  const dims = getCertificateDimensions(certificateData.aspectRatio);
  const isSquare = certificateData.aspectRatio === 'square';
  const isLandscape = dims.orientation === 'landscape';

  let pdf: jsPDF;
  if (isSquare) {
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [dims.widthMm, dims.heightMm],
      compress: true
    });
  } else {
    pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Mathematical Aspect Ratio Calculations
  const canvasAspect = canvas.width / canvas.height;
  const pageAspect = pageWidth / pageHeight;

  let drawWidth = pageWidth;
  let drawHeight = pageHeight;
  let posX = 0;
  let posY = 0;

  if (Math.abs(canvasAspect - pageAspect) > 0.002) {
    if (canvasAspect > pageAspect) {
      drawWidth = pageWidth;
      drawHeight = pageWidth / canvasAspect;
      posY = (pageHeight - drawHeight) / 2;
    } else {
      drawHeight = pageHeight;
      drawWidth = pageHeight * canvasAspect;
      posX = (pageWidth - drawWidth) / 2;
    }
  }

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', posX, posY, drawWidth, drawHeight, undefined, 'FAST');
  return pdf;
}

export function getCleanStudentFileName(studentName?: string, prefix = 'شهادة_تقدير', ext = ''): string {
  const clean = (studentName || 'طالب').replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim() || 'طالب';
  return `${prefix}_${clean}${ext ? (ext.startsWith('.') ? ext : `.${ext}`) : ''}`;
}

export async function exportCertificateAsPdf(
  element: HTMLElement,
  certificateData: CertificateData
): Promise<void> {
  const canvas = await captureCertificateCanvas(element, certificateData, { scale: 2.8 });
  const pdf = createProportionalPdf(canvas, certificateData);
  const fileName = getCleanStudentFileName(certificateData.studentName, 'شهادة_تقدير', 'pdf');
  pdf.save(fileName);
  try {
    autoArchiveCertificate(certificateData, { event: 'export_pdf' });
  } catch (e) {
    console.warn('Auto-archive on PDF export error:', e);
  }
}

export async function exportCertificateAsPng(
  element: HTMLElement,
  certificateData: CertificateData
): Promise<void> {
  const canvas = await captureCertificateCanvas(element, certificateData, { scale: 3.0 });
  const fileName = getCleanStudentFileName(certificateData.studentName, 'شهادة', 'png');
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
  try {
    autoArchiveCertificate(certificateData, { event: 'export_png' });
  } catch (e) {
    console.warn('Auto-archive on PNG export error:', e);
  }
}

/**
 * Captures certificate DOM element and returns a PNG Blob
 */
export async function captureCertificateCanvasBlob(
  element: HTMLElement,
  certificateData: CertificateData,
  options: CaptureCanvasOptions = {}
): Promise<Blob> {
  const canvas = await captureCertificateCanvas(element, certificateData, options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('فشل إنشاء ملف الصورة من اللوحة'));
    }, 'image/png', 0.95);
  });
}

/**
 * Creates and exports a single combined multi-page PDF document containing all batch certificates.
 */
export async function exportBatchCertificatesAsSinglePdf(
  certificates: CertificateData[],
  renderContainer: (cert: CertificateData) => Promise<HTMLElement>,
  options?: {
    batchTitle?: string;
    onProgress?: (current: number, total: number, studentName: string) => void;
  }
): Promise<void> {
  if (!certificates || certificates.length === 0) {
    throw new Error('لا توجد شهادات لتصديرها');
  }

  const total = certificates.length;
  let pdf: jsPDF | null = null;

  for (let i = 0; i < total; i++) {
    const cert = certificates[i];
    if (options?.onProgress) {
      options.onProgress(i + 1, total, cert.studentName);
    }

    const element = await renderContainer(cert);
    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await captureCertificateCanvas(element, cert, { scale: 2.5 });
    const dims = getCertificateDimensions(cert.aspectRatio);
    const isSquare = cert.aspectRatio === 'square';
    const isLandscape = dims.orientation === 'landscape';

    if (i === 0) {
      if (isSquare) {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [dims.widthMm, dims.heightMm],
          compress: true
        });
      } else {
        pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });
      }
    } else if (pdf) {
      if (isSquare) {
        pdf.addPage([dims.widthMm, dims.heightMm], 'portrait');
      } else {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }
    }

    if (pdf) {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = pageWidth / pageHeight;

      let drawWidth = pageWidth;
      let drawHeight = pageHeight;
      let posX = 0;
      let posY = 0;

      if (Math.abs(canvasAspect - pageAspect) > 0.002) {
        if (canvasAspect > pageAspect) {
          drawWidth = pageWidth;
          drawHeight = pageWidth / canvasAspect;
          posY = (pageHeight - drawHeight) / 2;
        } else {
          drawHeight = pageHeight;
          drawWidth = pageHeight * canvasAspect;
          posX = (pageWidth - drawWidth) / 2;
        }
      }

      const imgData = canvas.toDataURL('image/png', 0.95);
      pdf.addImage(imgData, 'PNG', posX, posY, drawWidth, drawHeight, undefined, 'FAST');
    }
  }

  if (pdf) {
    const rawTitle = options?.batchTitle || 'دفعة_شهادات_تقدير_مجمعة';
    const safeTitle = rawTitle.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().replace(/\s+/g, '_');
    const fileName = `${safeTitle}_(${total}_شهادة).pdf`;
    pdf.save(fileName);

    try {
      autoArchiveBatchCertificates(certificates, rawTitle);
    } catch (e) {
      console.warn('Auto-archive batch on PDF export error:', e);
    }
  }
}
