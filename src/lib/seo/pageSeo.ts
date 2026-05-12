type PageSeoInput = {
  title: string;
  description: string;
  canonical: string;
  keywords?: string[] | undefined;
  ogImage?: string | undefined;
  type?: 'website' | 'article' | undefined;
  publishedTime?: string | undefined;
  modifiedTime?: string | undefined;
};

export const buildPageSeo = (input: PageSeoInput) => {
  const title = input.title.trim();
  const description = input.description.trim();
  const canonical = input.canonical.startsWith('/') ? input.canonical : `/${input.canonical}`;
  return {
    title,
    description,
    canonical,
    keywords: input.keywords || [],
    ogImage: input.ogImage || undefined,
    type: input.type,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
  };
};
