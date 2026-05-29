import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    id: z.string(),
    loc: z.string(),
    cat: z.string(),
    year: z.number().optional(),
    tone: z.enum(['warm', 'deep', 'light', 'dark']).default('warm'),
    ratio: z.string().default('4/5'),
    order: z.number().default(0),
    excerpt: z.string().optional(),
    photo: z.string().optional(),       // Unsplash ID for card cover
    photoDetail: z.string().optional(), // Unsplash ID for detail-page hero
    photoAlt: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    // Phân loại bài (1 category) + tags (nhiều) — dùng cho filter + internal
    // linking. Mặc định "Ghi chép" để bài cũ không cần sửa frontmatter.
    category: z.string().default('Ghi chép'),
    tags: z.array(z.string()).default([]),
    tone: z.enum(['warm', 'deep', 'light', 'dark']).default('warm'),
    photo: z.string().optional(),
    photoAlt: z.string().optional(),
  }),
});

export const collections = { projects, blog };
