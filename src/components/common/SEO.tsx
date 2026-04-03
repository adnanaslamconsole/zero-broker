import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterHandle?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  twitterHandle = '@zerobroker'
}) => {
  const siteTitle = 'Zero Broker | Buy, Rent & Sell Properties without Brokerage';
  const fullTitle = title ? `${title} | Zero Broker` : siteTitle;
  const defaultDescription = 'India\'s premium platform to find properties without any brokerage. Save thousands on your next home or office.';
  const metaDescription = description || defaultDescription;
  const url = canonical || typeof window !== 'undefined' ? window.location.href : '';
  const image = ogImage || 'https://zerobrokerapp.netlify.app/og-image.jpg';

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={twitterHandle} />

      {/* Additional Meta */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default SEO;
