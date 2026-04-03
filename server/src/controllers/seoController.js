const Property = require('../models/Property');

exports.getSitemap = async (req, res) => {
  try {
    const properties = await Property.find({ isAvailable: true }).select('_id updatedAt');
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://zerobrokerapp.netlify.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://zerobrokerapp.netlify.app/properties</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    properties.forEach(prop => {
      sitemap += `
  <url>
    <loc>https://zerobrokerapp.netlify.app/property/${prop._id}</loc>
    <lastmod>${prop.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
};
