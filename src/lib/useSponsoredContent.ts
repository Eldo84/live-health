import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface SponsoredContent {
  id: string;
  submission_id: string | null;
  subscription_id: string | null;
  user_id: string | null;
  plan_type: 'basic' | 'professional' | 'enterprise';
  title: string;
  description: string | null;
  image_url: string;
  play_icon_url: string | null;
  location: string;
  click_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  is_featured: boolean;
  is_pinned: boolean;
  max_duration_days: number | null;
  display_locations: string[];
  click_count: number;
  view_count: number;
  analytics_level: 'basic' | 'advanced' | 'custom';
  created_at: string;
  updated_at: string;
}

interface UseSponsoredContentOptions {
  location?: 'map' | 'homepage' | 'newsletter';
  limit?: number;
  enabled?: boolean;
}

interface UseSponsoredContentReturn {
  data: SponsoredContent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  trackView: (contentId: string) => Promise<void>;
  trackClick: (contentId: string) => Promise<void>;
}

// Fallback data when database is empty or has errors
const fallbackSponsoredContent: SponsoredContent[] = [
  {
    id: 'fallback-1',
    submission_id: null,
    subscription_id: null,
    user_id: null,
    plan_type: 'enterprise',
    title: 'Global Health Partner',
    description: 'Supporting outbreak response worldwide',
    image_url: '/image.png',
    play_icon_url: '/group-1420.png',
    location: 'Global',
    click_url: null,
    display_order: 50,
    is_active: true,
    start_date: null,
    end_date: null,
    is_featured: true,
    is_pinned: true,
    max_duration_days: 90,
    display_locations: ['map', 'homepage', 'newsletter'],
    click_count: 0,
    view_count: 0,
    analytics_level: 'custom',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fallback-2',
    submission_id: null,
    subscription_id: null,
    user_id: null,
    plan_type: 'professional',
    title: 'Health Innovation',
    description: 'Advancing healthcare technology',
    image_url: '/image-1.png',
    play_icon_url: '/group-1420-1.png',
    location: 'Global',
    click_url: null,
    display_order: 100,
    is_active: true,
    start_date: null,
    end_date: null,
    is_featured: true,
    is_pinned: false,
    max_duration_days: 60,
    display_locations: ['map', 'homepage'],
    click_count: 0,
    view_count: 0,
    analytics_level: 'advanced',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fallback-3',
    submission_id: null,
    subscription_id: null,
    user_id: null,
    plan_type: 'basic',
    title: 'Research Partner',
    description: 'Supporting disease research',
    image_url: '/image-2.png',
    play_icon_url: '/group-1420-2.png',
    location: 'Global',
    click_url: null,
    display_order: 200,
    is_active: true,
    start_date: null,
    end_date: null,
    is_featured: false,
    is_pinned: false,
    max_duration_days: 30,
    display_locations: ['map'],
    click_count: 0,
    view_count: 0,
    analytics_level: 'basic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useSponsoredContent(options: UseSponsoredContentOptions = {}): UseSponsoredContentReturn {
  const { location = 'map', limit = 1000, enabled = true } = options;
  
  const [data, setData] = useState<SponsoredContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSponsoredContent = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to use the database function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_active_sponsored_content', { p_location: location });

      if (functionError) {
        // If function doesn't exist, fall back to direct query
        console.warn('RPC function not available, using direct query:', functionError.message);
        
        const { data: queryData, error: queryError } = await supabase
          .from('sponsored_content')
          .select('*')
          .eq('is_active', true)
          .contains('display_locations', [location])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (queryError) {
          // If table doesn't exist or other error, use fallback
          console.warn('Database query failed, using fallback data:', queryError.message);
          setData(fallbackSponsoredContent.filter(item => 
            item.display_locations.includes(location)
          ).slice(0, limit));
          return;
        }

        if (queryData && queryData.length > 0) {
          setData(queryData);
        } else {
          // Empty database, use fallback
          setData(fallbackSponsoredContent.filter(item => 
            item.display_locations.includes(location)
          ).slice(0, limit));
        }
        return;
      }

      if (functionData && functionData.length > 0) {
        setData(functionData);
      } else {
        // Empty result, use fallback
        setData(fallbackSponsoredContent.filter(item => 
          item.display_locations.includes(location)
        ).slice(0, limit));
      }
    } catch (err) {
      console.error('Error fetching sponsored content:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Use fallback on error
      setData(fallbackSponsoredContent.filter(item => 
        item.display_locations.includes(location)
      ).slice(0, limit));
    } finally {
      setIsLoading(false);
    }
  }, [location, limit, enabled]);

  useEffect(() => {
    fetchSponsoredContent();
  }, [fetchSponsoredContent]);

  const trackView = useCallback(async (contentId: string) => {
    // Skip tracking for fallback content
    if (contentId.startsWith('fallback-')) return;

    try {
      // Get the ad's user_id to set as content_owner_id
      const { data: adData } = await supabase
        .from('sponsored_content')
        .select('user_id')
        .eq('id', contentId)
        .single();

      // Increment view count
      await supabase.rpc('increment_sponsored_view', { p_content_id: contentId });

      // Record analytics event with content_owner_id
      await supabase.from('advertising_analytics').insert({
        sponsored_content_id: contentId,
        content_owner_id: adData?.user_id || null,
        event_type: 'view',
        event_data: {
          referrer: document.referrer,
          page: window.location.pathname,
        },
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      // Silently fail - analytics shouldn't break the UI
      console.warn('Failed to track view:', err);
    }
  }, []);

  const trackClick = useCallback(async (contentId: string) => {
    // Skip tracking for fallback content
    if (contentId.startsWith('fallback-')) return;

    try {
      // Get the ad's user_id to set as content_owner_id
      const { data: adData } = await supabase
        .from('sponsored_content')
        .select('user_id')
        .eq('id', contentId)
        .single();

      // Increment click count
      await supabase.rpc('increment_sponsored_click', { p_content_id: contentId });

      // Record analytics event with content_owner_id
      await supabase.from('advertising_analytics').insert({
        sponsored_content_id: contentId,
        content_owner_id: adData?.user_id || null,
        event_type: 'click',
        event_data: {
          referrer: document.referrer,
          page: window.location.pathname,
        },
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      // Silently fail
      console.warn('Failed to track click:', err);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSponsoredContent,
    trackView,
    trackClick,
  };
}

// Helper function to get plan badge info
export function getPlanBadgeInfo(planType: SponsoredContent['plan_type']) {
  switch (planType) {
    case 'enterprise':
      return {
        label: 'Premium',
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
      };
    case 'professional':
      return {
        label: 'Featured',
        color: 'bg-blue-500',
        textColor: 'text-blue-500',
      };
    default:
      return null;
  }
}

