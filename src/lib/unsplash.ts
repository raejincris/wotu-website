// Curated Unsplash photo set — warm editorial minimal vibe.
// Each ID is verified to return HTTP 200 from images.unsplash.com.
// License: Unsplash free embed (no attribution required, recommended).

export interface Photo {
  id: string;          // photo-{timestamp}-{hash} segment
  alt: string;         // accessibility / fallback text
  credit?: string;     // photographer (optional)
}

export const PHOTOS = {
  hero:        { id: '1768836180164-070b4c1a8f94', alt: 'Phòng ăn ấm áp trong ánh sáng tự nhiên' },

  serviceDesign:       { id: '1693664681816-f7f8422758f0', alt: 'Phòng tối giản với cửa kéo Nhật, ánh sáng tự nhiên' },
  serviceConstruction: { id: '1772442364436-6ee6e42302a2', alt: 'Ánh nắng đổ trên sàn gỗ và tủ' },
  serviceInterior:     { id: '1768152858627-517b5e495830', alt: 'Tường nâu ấm với cửa sổ hẹp' },

  // Project covers
  projectDoiThong:    { id: '1627750168257-9a7d3965ef8b', alt: 'Nhà gỗ giữa rừng thông' },
  projectQ2:          { id: '1700474568247-2bf81611b293', alt: 'Phòng khách tối giản' },
  projectBachTra:     { id: '1622620645400-7ad92fcd9515', alt: 'Đồng hồ tường trắng trên tường nâu, không gian café ấm' },
  projectNhaCuaMe:    { id: '1764445274425-f6bcdd84bbd4', alt: 'Phòng truyền thống với cửa giấy và vườn nhỏ' },

  // Project detail wide hero (16:9)
  detailDoiThong:    { id: '1768836180164-070b4c1a8f94', alt: 'Không gian sống ấm áp với gỗ tự nhiên' },
  detailQ2:          { id: '1637412816281-f80ec9948fea', alt: 'Phòng khách tone đất với sofa và bàn nhỏ' },
  detailBachTra:     { id: '1591633767356-bbf4d2a3a833', alt: 'Tách trà sứ trắng trên đĩa lót xanh' },
  detailNhaCuaMe:    { id: '1712169603032-7b7b2ff1ea2f', alt: 'Bàn gỗ với bình hoa, không gian thân mật ấm' },

  // Blog
  blogMaterials:     { id: '1523755231516-e43fd2e8dca5', alt: 'Bàn gỗ tự nhiên — vân và bề mặt thô' },
  blogLight:         { id: '1567016376408-0226e4d0c1ea', alt: 'Sofa da nâu trong phòng tone trung tính' },

  // Generic / fallback
  projectListingHero: { id: '1753552502151-93914d36ecf2', alt: 'Phòng truyền thống Nhật Bản, vật liệu tự nhiên' },
  studio:            { id: '1777041097323-2f2ab6734a82', alt: 'Phòng ăn thanh lịch với bàn gỗ và tone ấm' },
  reserve1:          { id: '1593286364015-f4e749862918', alt: 'Tách thuỷ tinh trên khay gỗ — chi tiết café' },
  reserve2:          { id: '1663860135564-aedfa0274ef6', alt: 'Tách cà phê trên bàn gỗ trong ánh sáng ấm' },
  reserve3:          { id: '1724582586529-62622e50c0b3', alt: 'Phòng khách với cửa sổ lớn, ánh sáng tự nhiên' },
} as const satisfies Record<string, Photo>;

/**
 * Build an Unsplash image URL with sane defaults.
 * @param id - photo ID segment (without `photo-` prefix is also accepted)
 * @param w - target width (px). Pick 800 for thumb, 1600 for hero, 2400 for retina detail.
 * @param ratio - "4/5" | "3/4" | "16/9" | "1/1" — optional crop ratio
 */
export function img(
  id: string,
  w: number = 1600,
  ratio?: '4/5' | '3/4' | '16/9' | '1/1' | '4/3' | '5/4'
): string {
  const cleanId = id.startsWith('photo-') ? id.slice(6) : id;
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    q: '75',
  });
  if (ratio) {
    const [num, den] = ratio.split('/').map(Number);
    if (num && den) {
      params.set('h', String(Math.round((w * den) / num)));
    }
  }
  return `https://images.unsplash.com/photo-${cleanId}?${params.toString()}`;
}

/** Build a `srcset` string for responsive `<img>` */
export function imgSrcset(id: string, ratio?: '4/5' | '3/4' | '16/9' | '1/1' | '4/3' | '5/4'): string {
  return [800, 1200, 1600, 2400]
    .map((w) => `${img(id, w, ratio)} ${w}w`)
    .join(', ');
}
