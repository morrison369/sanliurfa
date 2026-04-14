/**
 * Blog Module - Main Exports
 */

export {
  // Post operations
  getPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getFeaturedPosts,
  getRelatedPosts,
  searchPosts,
  
  // Category & Tag
  getCategories,
  getTags,
  createCategory,
  createTag,
  
  // Other
  getPostRevisions,
  getBlogStats,
  calculateReadingTime,
  generateRSS,
  
  // Types
  type BlogPost,
  type BlogCategory,
  type BlogTag,
  type BlogRevision,
} from './db';

// Constants
export { BLOG_CATEGORIES } from './db';
