/**
 * Transforms an entire CertificateData object to match the selected recipient gender with AI in a SINGLE API CALL
 */
export async function adaptCertificateGender(
  data: CertificateData,
  newGender: RecipientGender,
  options?: { preserveCustomStudentName?: boolean; apiKey?: string }
): Promise<CertificateData> {
  const isFemale = newGender === 'female';

  // إذا لم يتوفر مفتاح API أو فشل الاتصال، نستخدم المحول المحلي السريع المباشر
  if (!options?.apiKey) {
    return {
      ...data,
      recipientGender: newGender,
      studentName: convertArabicTextGender(data.studentName || '', newGender),
      recipientIntro: convertArabicTextGender(data.recipientIntro || '', newGender),
      appreciationText: convertArabicTextGender(data.appreciationText || '', newGender),
      badgeTitle: convertArabicTextGender(data.badgeTitle || '', newGender),
      title: convertArabicTextGender(data.title || '', newGender),
      subtitle: convertArabicTextGender(data.subtitle || '', newGender),
      grade: convertArabicTextGender(data.grade || '', newGender),
    };
  }

  try {
    // إرسال طلب واحد فقط لجميع الحقول معاً لمنع قطع الشبكة (Status: 0)
    const promptText = `قم بتعديل كافة نصوص الشهادة التالية لتكون موجهة لـ (${isFemale ? 'طالبة / أنثى' : 'طالب / مذكر'}):
1. المقدمة: "${data.recipientIntro || ''}"
2. نص التقدير: "${data.appreciationText || ''}"
3. الوسام: "${data.badgeTitle || ''}"

أرجع JSON فقط يحتوي على التعديلات بالتنسيق التالي:
{
  "recipientIntro": "النص المعدل",
  "appreciationText": "النص المعدل",
  "badgeTitle": "النص المعدل"
}`;

    const response = await fetch('/api/adapt-gender-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': options.apiKey,
      },
      body: JSON.stringify({
        text: promptText,
        targetGender: newGender,
        apiKey: options.apiKey,
      }),
    });

    if (!response.ok) throw new Error('API request failed');

    const result = await response.json();
    let adaptedData = result.adaptedText || result.result;

    if (typeof adaptedData === 'string') {
      try {
        const cleanJson = adaptedData.replace(/```json/g, '').replace(/```/g, '').trim();
        adaptedData = JSON.parse(cleanJson);
      } catch (e) {
        adaptedData = {};
      }
    }

    return {
      ...data,
      recipientGender: newGender,
      studentName: convertArabicTextGender(data.studentName || '', newGender),
      recipientIntro: adaptedData?.recipientIntro || convertArabicTextGender(data.recipientIntro || '', newGender),
      appreciationText: adaptedData?.appreciationText || convertArabicTextGender(data.appreciationText || '', newGender),
      badgeTitle: adaptedData?.badgeTitle || convertArabicTextGender(data.badgeTitle || '', newGender),
    };
  } catch (error) {
    console.warn('AI adaptation failed, falling back to instant local conversion:', error);
    // عند حدوث أي خطأ، يتم استخدام المحول المحلي المباشر فورا دون تعطيل المستخدم
    return {
      ...data,
      recipientGender: newGender,
      studentName: convertArabicTextGender(data.studentName || '', newGender),
      recipientIntro: convertArabicTextGender(data.recipientIntro || '', newGender),
      appreciationText: convertArabicTextGender(data.appreciationText || '', newGender),
      badgeTitle: convertArabicTextGender(data.badgeTitle || '', newGender),
      title: convertArabicTextGender(data.title || '', newGender),
      subtitle: convertArabicTextGender(data.subtitle || '', newGender),
      grade: convertArabicTextGender(data.grade || '', newGender),
    };
  }
}
