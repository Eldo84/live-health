import React, { useEffect, useRef, useState } from "react";
import { useSponsoredContent, getPlanBadgeInfo, SponsoredContent } from "../../../../lib/useSponsoredContent";
import { Loader2, Star, Pin, ExternalLink, ChevronRight } from "lucide-react";

interface PremiumAdCardProps {
  content: SponsoredContent;
  onView: (id: string) => void;
  onClick: (id: string) => void;
}

const PremiumAdCard: React.FC<PremiumAdCardProps> = ({ content, onView, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  // Track view when card becomes visible
  useEffect(() => {
    if (hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            onView(content.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [content.id, onView]);

  const handleClick = () => {
    onClick(content.id);
    if (content.click_url) {
      window.open(content.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  const planBadge = getPlanBadgeInfo(content.plan_type);
  const hasImage = content.image_url && content.image_url.trim() !== '';

  return (
    <div
      ref={cardRef}
      className={`relative flex-shrink-0 w-[320px] h-[120px] rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 shadow-lg ${
        content.is_pinned 
          ? 'ring-2 ring-amber-400/50 hover:ring-amber-400' 
          : content.is_featured 
            ? 'ring-1 ring-blue-400/30 hover:ring-blue-400/50' 
            : 'hover:opacity-90 hover:scale-[1.02]'
      } ${!hasImage ? 'bg-gradient-to-br from-primary/20 to-primary/40' : ''}`}
      onClick={handleClick}
    >
      {/* Background Image */}
      {hasImage && (
        <>
          <img
            className="absolute inset-0 w-full h-full object-cover"
            alt={content.title}
            src={content.image_url}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,0.85)_100%)]" />
        </>
      )}

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">
              {content.title}
            </h3>
            {content.description && 
             content.description.trim() !== '' && 
             content.description.trim().toLowerCase() !== content.title.trim().toLowerCase() && (
              <p className="text-white/90 text-xs leading-tight line-clamp-2 mt-0.5">
                {content.description}
              </p>
            )}
          </div>
          
          {/* Plan Badge */}
          {(content.is_pinned || content.is_featured) && (
            <div className="flex-shrink-0 flex items-center gap-1">
              {content.is_pinned && (
                <div className="bg-amber-500/90 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                  <Pin className="w-3 h-3 text-white" />
                  <span className="text-[9px] font-semibold text-white">PREMIUM</span>
                </div>
              )}
              {content.is_featured && !content.is_pinned && (
                <div className="bg-blue-500/90 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                  <Star className="w-3 h-3 text-white" />
                  <span className="text-[9px] font-semibold text-white">FEATURED</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-2">
            <span className="[font-family:'Roboto',Helvetica] font-medium text-white/90 text-xs">
              {content.location || 'Global'}
            </span>
            {content.click_url && (
              <ExternalLink className="w-4 h-4 text-white/70" />
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );
};

export const PremiumAdsSection = (): JSX.Element => {
  const { data, isLoading, error, trackView, trackClick } = useSponsoredContent({
    location: 'map',
    limit: 20,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  // Filter for premium ads - only enterprise tier (true premium)
  const premiumAds = React.useMemo(() => {
    return data.filter(ad => {
      // Only show active enterprise tier ads (true premium tier)
      return ad.is_active && ad.plan_type === 'enterprise';
    }).sort((a, b) => {
      // Sort: pinned first, then by creation date
      if (a.is_pinned && !b.is_pinned) return -1;
      if (b.is_pinned && !a.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data]);

  // Auto-scroll functionality - only if content overflows
  useEffect(() => {
    if (!scrollContainerRef.current || premiumAds.length <= 1 || isPaused) {
      return;
    }

    const container = scrollContainerRef.current;
    
    // Check if content actually overflows before enabling auto-scroll
    const checkOverflow = () => {
      return container.scrollWidth > container.clientWidth;
    };

    if (!checkOverflow()) {
      return; // No overflow, no need for auto-scroll
    }

    let scrollPosition = 0;
    const scrollSpeed = 1; // pixels per frame
    const scrollDelay = 30; // milliseconds between frames

    const scroll = () => {
      if (isPaused) return;
      
      scrollPosition += scrollSpeed;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      // If we've reached the end, reset to beginning
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
        container.scrollLeft = 0;
      } else {
        container.scrollLeft = scrollPosition;
      }
    };

    scrollIntervalRef.current = window.setInterval(scroll, scrollDelay);

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [premiumAds.length, isPaused]);

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  if (isLoading) {
    return (
      <div className="w-full bg-[#2a4149] border-t border-[#EAEBF024] py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#67DBE2]" />
            <span className="text-[#a7a7a7] text-sm">Loading premium ads...</span>
          </div>
        </div>
      </div>
    );
  }

  if (premiumAds.length === 0) {
    return (
      <div className="w-full bg-[#2a4149] border-t border-[#EAEBF024] py-4">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-[#a7a7a7] text-sm mb-2">No premium ads available</p>
            <a
              href="/?tab=advertise"
              className="text-xs text-[#67DBE2] hover:underline"
            >
              Advertise with us →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-[#2a4149] border-t border-[#EAEBF024] py-4 overflow-visible"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="w-full px-4 overflow-visible">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-sm">
              Premium Advertisements
            </h3>
          </div>
          <div className="flex-1 h-px bg-[#EAEBF024]" />
          <span className="text-[#a7a7a7] text-xs">
            {premiumAds.length} {premiumAds.length === 1 ? 'ad' : 'ads'}
          </span>
        </div>
        
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto overflow-y-visible scroll-smooth pb-2 -mx-4 px-4"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4a5a60 transparent',
            msOverflowStyle: 'auto',
          }}
        >
          <style>{`
            .premium-ads-scroll::-webkit-scrollbar {
              height: 6px;
            }
            .premium-ads-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .premium-ads-scroll::-webkit-scrollbar-thumb {
              background: #4a5a60;
              border-radius: 3px;
            }
            .premium-ads-scroll::-webkit-scrollbar-thumb:hover {
              background: #5a6a70;
            }
          `}</style>
          <div className="flex gap-4 premium-ads-scroll" style={{ paddingRight: '20px' }}>
            {premiumAds.map((content) => (
              <PremiumAdCard
                key={content.id}
                content={content}
                onView={trackView}
                onClick={trackClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

