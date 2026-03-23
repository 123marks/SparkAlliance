/**
 * holidays.ts — 中国节假日数据（2026 年）
 *
 * 注意：农历节日（清明、端午、中秋等）每年日期不同
 * 此文件按年维护，下次更新时只需修改对应日期
 */

/** 2026 年中国节假日（公历 MM-DD → 节日名） */
export const CHINESE_HOLIDAYS_2026: Record<string, string> = {
  '01-01': '元旦',
  '01-29': '除夕',
  '01-30': '春节',
  '01-31': '春节',
  '02-01': '春节',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-05': '清明节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '05-31': '端午节',
  '06-01': '儿童节',
  '08-01': '建军节',
  '08-28': '七夕',
  '09-10': '教师节',
  '10-01': '国庆节',
  '10-02': '国庆节',
  '10-03': '国庆节',
  '10-06': '中秋节',
  '11-11': '双十一',
  '12-24': '平安夜',
  '12-25': '圣诞节',
}

/**
 * 获取指定月份的节日数量
 * @param month 月份 1-12
 */
export function getHolidayCountForMonth(month: number): number {
  const prefix = String(month).padStart(2, '0') + '-'
  return Object.keys(CHINESE_HOLIDAYS_2026)
    .filter(key => key.startsWith(prefix)).length
}

/**
 * 获取指定日期的节日名称
 * @returns 节日名 或 null
 */
export function getHolidayName(date: Date): string | null {
  const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return CHINESE_HOLIDAYS_2026[key] || null
}
