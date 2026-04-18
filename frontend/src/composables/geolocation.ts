/**
 * 人类可读地理位置工具
 *
 * 能力：
 *   1. 浏览器定位（navigator.geolocation）
 *   2. 反向地理编码：经纬度 → 省/市/区 中文地址（Nominatim OSM）
 *   3. 关键词搜索地点（Nominatim search）
 *   4. 省市区静态联动（无需联网，基于内置数据）
 *
 * 隐私：所有请求都走 HTTPS，不把用户经纬度发给第三方以外的服务器
 */

export interface LocationInfo {
  /** 展示给用户的文本，如 "北京市 · 海淀区" */
  label: string
  /** 国家 */
  country?: string
  /** 省/州 */
  province?: string
  /** 市 */
  city?: string
  /** 区/县 */
  district?: string
  /** 街道/详细地址 */
  street?: string
  /** 经纬度 */
  latitude?: number
  /** 经纬度 */
  longitude?: number
  /** 原始 data（调试用） */
  raw?: unknown
}

export class GeolocationError extends Error {
  code: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'network'
  constructor(code: GeolocationError['code'], msg: string) {
    super(msg)
    this.code = code
  }
}

/** 获取浏览器定位（纯坐标） */
export async function getCurrentCoords(timeoutMs = 8000): Promise<{ latitude: number; longitude: number }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new GeolocationError('unsupported', '当前浏览器不支持定位')
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => {
        if (err.code === 1) reject(new GeolocationError('denied', '请允许定位权限'))
        else if (err.code === 2) reject(new GeolocationError('unavailable', '定位服务不可用'))
        else if (err.code === 3) reject(new GeolocationError('timeout', '定位超时'))
        else reject(new GeolocationError('unavailable', err.message || '定位失败'))
      },
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 60_000 },
    )
  })
}

/**
 * 反向地理编码（Nominatim OSM，免费）
 * 注意：Nominatim 要求每秒 <= 1 请求 + 设 User-Agent，这里前端做不到 UA，但可通过 accept-language 降低限流
 */
export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<LocationInfo> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh-CN&zoom=14&addressdetails=1`
  let data: { address?: Record<string, string>; display_name?: string }
  try {
    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' } })
    if (!res.ok) throw new GeolocationError('network', `反向解析失败 ${res.status}`)
    data = await res.json()
  } catch (err) {
    if (err instanceof GeolocationError) throw err
    throw new GeolocationError('network', '网络异常，无法解析地址')
  }

  const addr = data.address || {}
  const province = addr.state || addr.region || ''
  const city = addr.city || addr.county || addr.town || addr.municipality || ''
  const district = addr.city_district || addr.suburb || addr.neighbourhood || addr.district || ''
  const street = addr.road || addr.pedestrian || addr.residential || ''

  const parts: string[] = []
  if (city) parts.push(city.replace(/市$/, '') + (city.endsWith('市') ? '市' : ''))
  else if (province) parts.push(province)
  if (district) parts.push(district)

  const label = parts.length > 0
    ? parts.join(' · ')
    : (data.display_name?.split(',').slice(0, 2).join(' · ') || `${lat.toFixed(2)},${lon.toFixed(2)}`)

  return {
    label,
    country: addr.country,
    province,
    city,
    district,
    street,
    latitude: lat,
    longitude: lon,
    raw: data,
  }
}

/**
 * 关键词搜索地点
 */
export async function searchPlaces(keyword: string, signal?: AbortSignal): Promise<LocationInfo[]> {
  const q = keyword.trim()
  if (!q) return []
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&accept-language=zh-CN&limit=8&countrycodes=cn`
  try {
    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' } })
    if (!res.ok) return []
    const arr = (await res.json()) as Array<{
      display_name: string
      lat: string
      lon: string
      address?: Record<string, string>
    }>
    return arr.map(item => {
      const addr = item.address || {}
      const city = addr.city || addr.county || addr.town || ''
      const district = addr.suburb || addr.neighbourhood || addr.district || ''
      const name = addr.attraction || addr.amenity || addr.building || addr.shop || ''
      const label = [name, city, district].filter(Boolean).join(' · ') || item.display_name.split(',').slice(0, 2).join(' · ')
      return {
        label,
        country: addr.country,
        province: addr.state,
        city, district,
        street: addr.road,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        raw: item,
      }
    })
  } catch {
    return []
  }
}

/**
 * 一步到位：浏览器定位 → 反向解析 → 返回可读地址
 */
export async function detectReadableLocation(): Promise<LocationInfo> {
  const { latitude, longitude } = await getCurrentCoords()
  try {
    return await reverseGeocode(latitude, longitude)
  } catch {
    // 降级：返回坐标
    return {
      label: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
      latitude, longitude,
    }
  }
}

// =============================================
// 省市区联选（静态数据，不依赖网络）
// 精简版：覆盖 34 个省级行政区 + 每省前 5 个典型城市，足够校园社交场景
// 完整版可替换为 province-city-china npm 包（>500KB 打包，这里内联精简版）
// =============================================

export interface RegionLevelItem {
  code: string
  name: string
  children?: RegionLevelItem[]
}

export const REGION_TREE: RegionLevelItem[] = [
  { code: 'BJ', name: '北京', children: [
    { code: 'BJ-DC', name: '东城区' }, { code: 'BJ-XC', name: '西城区' },
    { code: 'BJ-HD', name: '海淀区' }, { code: 'BJ-CY', name: '朝阳区' },
    { code: 'BJ-FT', name: '丰台区' }, { code: 'BJ-CP', name: '昌平区' },
  ]},
  { code: 'SH', name: '上海', children: [
    { code: 'SH-PD', name: '浦东新区' }, { code: 'SH-HK', name: '虹口区' },
    { code: 'SH-JA', name: '静安区' }, { code: 'SH-YP', name: '杨浦区' },
    { code: 'SH-MH', name: '闵行区' }, { code: 'SH-SJ', name: '松江区' },
  ]},
  { code: 'TJ', name: '天津', children: [
    { code: 'TJ-HB', name: '河北区' }, { code: 'TJ-NK', name: '南开区' },
    { code: 'TJ-HX', name: '河西区' }, { code: 'TJ-HP', name: '和平区' },
  ]},
  { code: 'CQ', name: '重庆', children: [
    { code: 'CQ-YZ', name: '渝中区' }, { code: 'CQ-SP', name: '沙坪坝区' },
    { code: 'CQ-JB', name: '江北区' }, { code: 'CQ-NA', name: '南岸区' },
  ]},
  { code: 'GD', name: '广东省', children: [
    { code: 'GD-GZ', name: '广州市' }, { code: 'GD-SZ', name: '深圳市' },
    { code: 'GD-DG', name: '东莞市' }, { code: 'GD-FS', name: '佛山市' },
    { code: 'GD-ZH', name: '珠海市' }, { code: 'GD-HZ', name: '惠州市' },
  ]},
  { code: 'ZJ', name: '浙江省', children: [
    { code: 'ZJ-HZ', name: '杭州市' }, { code: 'ZJ-NB', name: '宁波市' },
    { code: 'ZJ-WZ', name: '温州市' }, { code: 'ZJ-SX', name: '绍兴市' },
    { code: 'ZJ-JX', name: '嘉兴市' },
  ]},
  { code: 'JS', name: '江苏省', children: [
    { code: 'JS-NJ', name: '南京市' }, { code: 'JS-SZ', name: '苏州市' },
    { code: 'JS-WX', name: '无锡市' }, { code: 'JS-CZ', name: '常州市' },
    { code: 'JS-XZ', name: '徐州市' }, { code: 'JS-NT', name: '南通市' },
  ]},
  { code: 'SC', name: '四川省', children: [
    { code: 'SC-CD', name: '成都市' }, { code: 'SC-MY', name: '绵阳市' },
    { code: 'SC-LS', name: '乐山市' }, { code: 'SC-YA', name: '雅安市' },
  ]},
  { code: 'HB', name: '湖北省', children: [
    { code: 'HB-WH', name: '武汉市' }, { code: 'HB-YC', name: '宜昌市' },
    { code: 'HB-XY', name: '襄阳市' }, { code: 'HB-HG', name: '黄冈市' },
  ]},
  { code: 'HN', name: '湖南省', children: [
    { code: 'HN-CS', name: '长沙市' }, { code: 'HN-ZZ', name: '株洲市' },
    { code: 'HN-HY', name: '衡阳市' }, { code: 'HN-XT', name: '湘潭市' },
  ]},
  { code: 'SD', name: '山东省', children: [
    { code: 'SD-JN', name: '济南市' }, { code: 'SD-QD', name: '青岛市' },
    { code: 'SD-YT', name: '烟台市' }, { code: 'SD-WF', name: '潍坊市' },
    { code: 'SD-WH', name: '威海市' },
  ]},
  { code: 'FJ', name: '福建省', children: [
    { code: 'FJ-FZ', name: '福州市' }, { code: 'FJ-XM', name: '厦门市' },
    { code: 'FJ-QZ', name: '泉州市' }, { code: 'FJ-PT', name: '莆田市' },
  ]},
  { code: 'AH', name: '安徽省', children: [
    { code: 'AH-HF', name: '合肥市' }, { code: 'AH-WH', name: '芜湖市' },
    { code: 'AH-BB', name: '蚌埠市' }, { code: 'AH-AQ', name: '安庆市' },
  ]},
  { code: 'HA', name: '河南省', children: [
    { code: 'HA-ZZ', name: '郑州市' }, { code: 'HA-LY', name: '洛阳市' },
    { code: 'HA-KF', name: '开封市' }, { code: 'HA-XX', name: '新乡市' },
  ]},
  { code: 'HE', name: '河北省', children: [
    { code: 'HE-SJ', name: '石家庄市' }, { code: 'HE-BD', name: '保定市' },
    { code: 'HE-TS', name: '唐山市' }, { code: 'HE-QH', name: '秦皇岛市' },
  ]},
  { code: 'SX', name: '山西省', children: [
    { code: 'SX-TY', name: '太原市' }, { code: 'SX-DT', name: '大同市' },
    { code: 'SX-XZ', name: '忻州市' },
  ]},
  { code: 'LN', name: '辽宁省', children: [
    { code: 'LN-SY', name: '沈阳市' }, { code: 'LN-DL', name: '大连市' },
    { code: 'LN-AS', name: '鞍山市' }, { code: 'LN-FS', name: '抚顺市' },
  ]},
  { code: 'JL', name: '吉林省', children: [
    { code: 'JL-CC', name: '长春市' }, { code: 'JL-JL', name: '吉林市' },
    { code: 'JL-SP', name: '四平市' },
  ]},
  { code: 'HL', name: '黑龙江省', children: [
    { code: 'HL-HB', name: '哈尔滨市' }, { code: 'HL-QQ', name: '齐齐哈尔市' },
    { code: 'HL-DQ', name: '大庆市' },
  ]},
  { code: 'SN', name: '陕西省', children: [
    { code: 'SN-XA', name: '西安市' }, { code: 'SN-BJ', name: '宝鸡市' },
    { code: 'SN-XY', name: '咸阳市' },
  ]},
  { code: 'GS', name: '甘肃省', children: [
    { code: 'GS-LZ', name: '兰州市' }, { code: 'GS-JY', name: '嘉峪关市' },
  ]},
  { code: 'QH', name: '青海省', children: [
    { code: 'QH-XN', name: '西宁市' },
  ]},
  { code: 'YN', name: '云南省', children: [
    { code: 'YN-KM', name: '昆明市' }, { code: 'YN-DL', name: '大理市' },
    { code: 'YN-LJ', name: '丽江市' },
  ]},
  { code: 'GZ', name: '贵州省', children: [
    { code: 'GZ-GY', name: '贵阳市' }, { code: 'GZ-ZY', name: '遵义市' },
  ]},
  { code: 'HI', name: '海南省', children: [
    { code: 'HI-HK', name: '海口市' }, { code: 'HI-SY', name: '三亚市' },
  ]},
  { code: 'JX', name: '江西省', children: [
    { code: 'JX-NC', name: '南昌市' }, { code: 'JX-JJ', name: '九江市' },
  ]},
  { code: 'GX', name: '广西', children: [
    { code: 'GX-NN', name: '南宁市' }, { code: 'GX-GL', name: '桂林市' },
  ]},
  { code: 'XJ', name: '新疆', children: [
    { code: 'XJ-WL', name: '乌鲁木齐市' }, { code: 'XJ-KS', name: '喀什市' },
  ]},
  { code: 'XZ', name: '西藏', children: [
    { code: 'XZ-LS', name: '拉萨市' },
  ]},
  { code: 'NM', name: '内蒙古', children: [
    { code: 'NM-HH', name: '呼和浩特市' }, { code: 'NM-BT', name: '包头市' },
  ]},
  { code: 'NX', name: '宁夏', children: [
    { code: 'NX-YC', name: '银川市' },
  ]},
  { code: 'HK', name: '香港', children: [
    { code: 'HK-C', name: '中西区' },
  ]},
  { code: 'MO', name: '澳门' },
  { code: 'TW', name: '台湾' },
]

/** 根据 code 取省节点 */
export function findProvince(code: string): RegionLevelItem | undefined {
  return REGION_TREE.find(p => p.code === code)
}

/** 查找省市组合对应的显示文本 */
export function formatRegion(provinceCode: string, cityCode?: string): string {
  const p = findProvince(provinceCode)
  if (!p) return ''
  if (!cityCode) return p.name
  const c = p.children?.find(x => x.code === cityCode)
  return c ? `${p.name} · ${c.name}` : p.name
}
