// backend/src/utils/schemaGenerator.js
//
// Generates JSON-LD structured data for blog posts (Schema.org BlogPosting).
// Used by publicRoutes.js to embed SEO-friendly schema markup in API responses.

export const generatePostSchema = (post) => {
    if (!post) return null;
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title || "Fotographiya Blog",
        "image": post.featuredImageUrl ? [post.featuredImageUrl] : [],
        "datePublished": post.createdAt,
        "dateModified": post.updatedAt,
        "author": [{
            "@type": "Person",
            "name": "Fotographiya Admin",
        }]
    };
};
