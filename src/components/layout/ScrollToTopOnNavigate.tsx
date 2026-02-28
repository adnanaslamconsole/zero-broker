import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo({
      top: 0,
      behavior: 'instant' // Instant scroll on navigation
    });
  }, [pathname]);

  return null;
}
