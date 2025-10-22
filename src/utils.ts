/**
 * UTC 시간을 KST(한국 시간)로 변환
 * @param utcDateStr - UTC ISO 문자열 또는 SQLite datetime 문자열
 * @returns KST 시간 문자열 (YYYY.MM.DD HH:MM 형식)
 */
export function convertUTCToKST(utcDateStr: string | null | undefined): string {
  if (!utcDateStr) return '';
  
  try {
    // SQLite datetime 형식 처리: "2025-10-22 15:47:35" → UTC로 파싱
    // ISO 형식 처리: "2025-10-22T15:47:35.000Z"
    const date = new Date(utcDateStr.replace(' ', 'T') + (utcDateStr.includes('T') ? '' : 'Z'));
    
    // KST는 UTC+9
    const kstOffset = 9 * 60; // 9시간 = 540분
    const kstTime = new Date(date.getTime() + kstOffset * 60 * 1000);
    
    // YYYY.MM.DD HH:MM 형식으로 변환
    const year = kstTime.getUTCFullYear();
    const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kstTime.getUTCDate()).padStart(2, '0');
    const hours = String(kstTime.getUTCHours()).padStart(2, '0');
    const minutes = String(kstTime.getUTCMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Date conversion error:', error, 'Input:', utcDateStr);
    return utcDateStr;
  }
}

/**
 * 배열의 모든 날짜 필드를 UTC에서 KST로 변환
 * @param items - 변환할 객체 배열
 * @param dateFields - 변환할 날짜 필드명 배열
 * @returns 변환된 배열
 */
export function convertArrayDatesToKST<T extends Record<string, any>>(
  items: T[],
  dateFields: string[] = ['created_at', 'message_date', 'out_rank_date', 'started_at', 'completed_at', 'last_message_date']
): T[] {
  return items.map(item => {
    const converted = { ...item };
    for (const field of dateFields) {
      if (field in converted && converted[field]) {
        converted[field] = convertUTCToKST(converted[field]);
      }
    }
    return converted;
  });
}

/**
 * 단일 객체의 모든 날짜 필드를 UTC에서 KST로 변환
 * @param item - 변환할 객체
 * @param dateFields - 변환할 날짜 필드명 배열
 * @returns 변환된 객체
 */
export function convertObjectDatesToKST<T extends Record<string, any>>(
  item: T | null | undefined,
  dateFields: string[] = ['created_at', 'message_date', 'out_rank_date', 'started_at', 'completed_at', 'last_message_date']
): T | null {
  if (!item) return null;
  
  const converted = { ...item };
  for (const field of dateFields) {
    if (field in converted && converted[field]) {
      converted[field] = convertUTCToKST(converted[field]);
    }
  }
  return converted;
}
