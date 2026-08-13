// Feed RSS cho Nhật ký (blog Studio) — discovery cho feed reader + một số AI
// crawler ưu tiên đọc feed thay vì crawl từng trang. Chỉ 13 bài blog, không
// gồm dự án/sản phẩm (không phải nội dung dạng bài viết theo thời gian).
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'WOTU · Nhật ký',
    description: 'Ghi chép về vật liệu, ánh sáng và những thứ không gấp — từ studio thiết kế & thi công nội thất WOTU, Quy Nhơn.',
    site: context.site,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      link: `/studio/blog/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>vi</language>`,
  });
}
