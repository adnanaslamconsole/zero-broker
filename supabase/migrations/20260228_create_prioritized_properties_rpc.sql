-- Function to fetch properties with prioritization for a specific city
CREATE OR REPLACE FUNCTION get_properties_prioritized(
  p_city TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_category TEXT[] DEFAULT NULL,
  p_bedrooms INT[] DEFAULT NULL,
  p_furnishing TEXT[] DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  type TEXT,
  property_category TEXT,
  price NUMERIC,
  city TEXT,
  locality TEXT,
  address TEXT,
  bedrooms INT,
  bathrooms INT,
  area NUMERIC,
  furnishing_status TEXT,
  amenities TEXT[],
  images TEXT[],
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN,
  is_available BOOLEAN,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_data AS (
    SELECT 
      p.*,
      COUNT(*) OVER() as full_count
    FROM properties p
    WHERE 
      (p_type IS NULL OR p.type = p_type)
      AND (p_category IS NULL OR p.property_category = ANY(p_category))
      AND (p_bedrooms IS NULL OR p.bedrooms = ANY(p_bedrooms))
      AND (p_furnishing IS NULL OR p.furnishing_status = ANY(p_furnishing))
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (p_search_query IS NULL OR (
          p.title ILIKE '%' || p_search_query || '%' OR 
          p.city ILIKE '%' || p_search_query || '%' OR 
          p.locality ILIKE '%' || p_search_query || '%'
      ))
      AND p.is_available = true
  )
  SELECT 
    fd.id, fd.title, fd.description, fd.type, fd.property_category, fd.price, 
    fd.city, fd.locality, fd.address, fd.bedrooms, fd.bathrooms, fd.area, 
    fd.furnishing_status, fd.amenities, fd.images, fd.latitude, fd.longitude, 
    fd.is_verified, fd.is_available, fd.owner_id, fd.created_at, fd.updated_at,
    fd.full_count
  FROM filtered_data fd
  ORDER BY 
    CASE 
      WHEN p_city IS NOT NULL AND fd.city ILIKE p_city THEN 0 
      ELSE 1 
    END,
    CASE 
      WHEN p_sort_by = 'price-low' THEN fd.price 
      ELSE NULL 
    END ASC,
    CASE 
      WHEN p_sort_by = 'price-high' THEN fd.price 
      ELSE NULL 
    END DESC,
    fd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
