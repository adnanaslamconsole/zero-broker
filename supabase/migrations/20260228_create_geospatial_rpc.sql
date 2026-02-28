-- Function to fetch properties based on user's current location with distance calculation
CREATE OR REPLACE FUNCTION get_properties_geospatial(
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT NULL,
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
  distance_km DOUBLE PRECISION,
  total_count BIGINT
) AS $$
DECLARE
  earth_radius_km DOUBLE PRECISION := 6371.0;
BEGIN
  RETURN QUERY
  WITH calculated_distances AS (
    SELECT 
      p.*,
      (
        earth_radius_km * acos(
          cos(radians(p_user_lat)) * cos(radians(p.latitude::double precision)) * 
          cos(radians(p.longitude::double precision) - radians(p_user_lng)) + 
          sin(radians(p_user_lat)) * sin(radians(p.latitude::double precision))
        )
      ) AS distance
    FROM properties p
    WHERE 
      p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      AND p.is_available = true
      AND (p_type IS NULL OR p.type = p_type)
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
  ),
  filtered_by_radius AS (
    SELECT 
      *,
      COUNT(*) OVER() as full_count
    FROM calculated_distances
    -- If radius is provided, we still include all but we can filter if needed. 
    -- The user wants nearby first, then distant. So we sort by distance.
  )
  SELECT 
    fbr.id, fbr.title, fbr.description, fbr.type, fbr.property_category, fbr.price, 
    fbr.city, fbr.locality, fbr.address, fbr.bedrooms, fbr.bathrooms, fbr.area, 
    fbr.furnishing_status, fbr.amenities, fbr.images, fbr.latitude::double precision, fbr.longitude::double precision, 
    fbr.is_verified, fbr.is_available, fbr.owner_id, fbr.created_at, fbr.updated_at,
    fbr.distance,
    fbr.full_count
  FROM filtered_by_radius fbr
  ORDER BY 
    CASE WHEN p_sort_by = 'relevance' THEN fbr.distance END ASC,
    CASE WHEN p_sort_by = 'price-low' THEN fbr.price END ASC,
    CASE WHEN p_sort_by = 'price-high' THEN fbr.price END DESC,
    CASE WHEN p_sort_by = 'newest' THEN fbr.created_at END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
