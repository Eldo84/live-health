import React, { useEffect, useRef, useState } from "react";
import { useSponsoredContent, SponsoredContent } from "../../../../lib/useSponsoredContent";
import { Loader2, Star, Pin, ExternalLink, ChevronRight } from "lucide-react";
import { useLanguage } from "../../../../contexts/LanguageContext";

interface PremiumAdCardProps {
  content: SponsoredContent;
  onView: (id: string) => void;
  onClick: (id: string) => void;
}

interface PremiumAdCardPropsWithMobile extends PremiumAdCardProps {
  isMobile?: boolean;
  compact?: boolean;
}

const PremiumAdCard: React.FC<PremiumAdCardPropsWithMobile> = ({ content, onView, onClick, isMobile = false, compact = false }) => {
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

  const hasImage = content.image_url && content.image_url.trim() !== '';

  // Detect if the media is a video based on file extension
  const isVideo = React.useMemo(() => {
    if (!content.image_url) return false;
    const url = content.image_url.toLowerCase();
    return url.endsWith('.mp4') || 
           url.endsWith('.webm') || 
           url.endsWith('.mov') || 
           url.endsWith('.avi') ||
           url.includes('/video/') ||
           url.includes('video/mp4') ||
           url.includes('video/webm');
  }, [content.image_url]);

  // Detect if the media is an animated GIF
  const isAnimatedGif = React.useMemo(() => {
    if (!content.image_url) return false;
    const url = content.image_url.toLowerCase();
    return url.endsWith('.gif') || url.includes('image/gif');
  }, [content.image_url]);

  const cardWidth = isMobile ? (compact ? '240px' : '280px') : '320px';
  const cardHeight = isMobile ? (compact ? '70px' : '110px') : compact ? '100px' : '120px';

  return (
    <div
      ref={cardRef}
      className={`relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 shadow-lg ${
        content.is_pinned 
          ? 'ring-2 ring-amber-400/50 hover:ring-amber-400' 
          : content.is_featured 
            ? 'ring-1 ring-blue-400/30 hover:ring-blue-400/50' 
            : 'hover:opacity-90 hover:scale-[1.02]'
      } ${!hasImage ? 'bg-gradient-to-br from-primary/20 to-primary/40' : ''}`}
      style={{ width: cardWidth, height: cardHeight }}
      onClick={handleClick}
    >
      {/* Background Media - Video or Image */}
      {hasImage && (
        <>
          {isVideo ? (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={content.image_url}
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => {
                (e.target as HTMLVideoElement).style.display = 'none';
              }}
            />
          ) : (
            <img
              className="absolute inset-0 w-full h-full object-contain"
              alt={content.title}
              src={content.image_url}
              loading={isAnimatedGif ? 'eager' : 'lazy'}
              style={{ backgroundColor: 'rgba(42, 65, 73, 0.3)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,0.85)_100%)]" />
        </>
      )}

      {/* Content Overlay */}
      <div className={`absolute inset-0 flex flex-col justify-between ${isMobile ? (compact ? 'p-1.5' : 'p-2.5') : compact ? 'p-2.5' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`text-white font-bold leading-tight ${compact && isMobile ? 'mb-0.5 line-clamp-1' : 'mb-1 line-clamp-2'} ${isMobile ? (compact ? 'text-[10px]' : 'text-xs') : compact ? 'text-xs' : 'text-sm'}`}>
              {content.title}
            </h3>
            {!compact && content.description && 
             content.description.trim() !== '' && 
             content.description.trim().toLowerCase() !== content.title.trim().toLowerCase() && (
              <p className={`text-white/90 leading-tight line-clamp-2 mt-0.5 ${isMobile ? 'text-[10px]' : compact ? 'text-[10px]' : 'text-xs'}`}>
                {content.description}
              </p>
            )}
          </div>
          
          {/* Plan Badge */}
          {!compact && (content.is_pinned || content.is_featured) && (
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

        <div className={`flex items-center justify-between mt-auto ${isMobile ? (compact ? 'pt-0.5' : 'pt-1') : 'pt-2'}`}>
          <div className="flex items-center gap-2">
            <span className={`[font-family:'Roboto',Helvetica] font-medium text-white/90 ${isMobile ? (compact ? 'text-[9px]' : 'text-[10px]') : 'text-xs'}`}>
              {content.location || 'Global'}
            </span>
            {content.click_url && (
              <ExternalLink className={`text-white/70 ${isMobile ? (compact ? 'w-2.5 h-2.5' : 'w-3 h-3') : 'w-4 h-4'}`} />
            )}
          </div>
          <ChevronRight className={`text-white/80 group-hover:translate-x-1 transition-transform ${isMobile ? (compact ? 'w-2.5 h-2.5' : 'w-3 h-3') : 'w-4 h-4'}`} />
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );
};

interface PremiumAdsSectionProps {
  floating?: boolean;
  mobile?: boolean;
  compact?: boolean; // Compact mode for dashboard
}

export const PremiumAdsSection = ({ floating = false, mobile = false, compact = false }: PremiumAdsSectionProps): JSX.Element | null => {
  const { t } = useLanguage();
  const { data, isLoading, trackView, trackClick } = useSponsoredContent({
    location: 'map',
    limit: 1000, // High limit to show all ads
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);
  const currentAdIndexRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Filter for ads - premium (enterprise) only on desktop, all active ads on mobile
  const premiumAds = React.useMemo(() => {
    // Filter active ads
    const activeAds = data.filter(ad => ad.is_active);
    
    // On mobile, show all active ads (basic, professional, enterprise)
    // On desktop, show only enterprise tier ads (premium)
    const filtered = mobile 
      ? activeAds // Mobile: show all active ads
      : activeAds.filter(ad => ad.plan_type === 'enterprise'); // Desktop: only enterprise
    
    // On mobile: sort by plan priority (enterprise -> professional -> basic), then by newest within each plan
    // On desktop: sort by newest first only (created_at DESC)
    const sorted = mobile
      ? (() => {
          // Define plan priority order
          const planPriority: Record<string, number> = {
            'enterprise': 1,
            'professional': 2,
            'basic': 3,
          };
          
          return filtered.sort((a, b) => {
            // First, sort by plan priority
            const priorityDiff = planPriority[a.plan_type] - planPriority[b.plan_type];
            if (priorityDiff !== 0) {
              return priorityDiff;
            }
            // Within the same plan, sort by newest first (created_at DESC)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
        })()
      : filtered.sort((a, b) => {
          // Desktop: sort by newest first only (created_at DESC)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    
    // Debug logging (can be removed later)
    if (mobile && process.env.NODE_ENV === 'development') {
      console.log('Mobile ads filter:', {
        totalAds: data.length,
        activeAds: activeAds.length,
        filteredAds: sorted.length,
        breakdown: {
          enterprise: sorted.filter(a => a.plan_type === 'enterprise').length,
          professional: sorted.filter(a => a.plan_type === 'professional').length,
          basic: sorted.filter(a => a.plan_type === 'basic').length,
        }
      });
    }
    
    return sorted;
  }, [data, mobile]);

  // Auto-scroll functionality - scroll to next ad every 2 seconds
  // Optimized for desktop/laptop: smooth horizontal left-to-right scrolling
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

    // Reset to first ad when ads change and ensure first ad is fully visible
    // Start from left (scrollLeft = 0) for left-to-right scrolling
    currentAdIndexRef.current = 0;
    
    // Debug: Log how many ads we have
    if (mobile && process.env.NODE_ENV === 'development') {
      console.log('Auto-scroll initialized:', {
        totalAds: premiumAds.length,
        ads: premiumAds.map((ad, idx) => ({
          index: idx,
          id: ad.id,
          title: ad.title,
          plan_type: ad.plan_type,
          is_pinned: ad.is_pinned
        }))
      });
    }
    
    // Ensure we start at the beginning showing only the first ad (leftmost position)
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (container) {
        container.scrollLeft = 0; // Start from left for left-to-right scrolling
      }
    });

    const scrollInterval = 2000; // 2 seconds per ad (desktop optimized)

    // Helper function to perform programmatic scroll
    const performScroll = (targetScroll: number) => {
      if (!container) return;
      
      // Mark that we're doing programmatic scrolling
      isProgrammaticScrollRef.current = true;
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
      
      // Clear the flag after scroll animation completes (smooth scroll takes ~500ms)
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 600);
    };

    const scrollToNextAd = () => {
      if (isPaused) return;

      const container = scrollContainerRef.current;
      const cardsContainer = cardsContainerRef.current;
      if (!container || !cardsContainer) return;

      const cards = cardsContainer.children;
      const totalItems = Math.min(cards.length, premiumAds.length);
      if (totalItems <= 1) return;

      // Move to next ad index (wrap around after last)
      currentAdIndexRef.current = (currentAdIndexRef.current + 1) % totalItems;
      
      const currentIndex = currentAdIndexRef.current;
      const cardsPadding = mobile ? 12 : 16; // Desktop padding
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);

      // Debug logging for mobile
      if (mobile && process.env.NODE_ENV === 'development') {
        console.log(`Scrolling to ad ${currentIndex + 1}/${totalItems}:`, {
          index: currentIndex,
          adType: premiumAds[currentIndex]?.plan_type,
          adTitle: premiumAds[currentIndex]?.title?.substring(0, 30),
          totalCards: cards.length,
          totalAds: premiumAds.length
        });
      }

      const targetCard = cards[currentIndex] as HTMLElement | undefined;
      if (!targetCard) {
        if (mobile && process.env.NODE_ENV === 'development') {
          console.warn(`Card at index ${currentIndex} not found. Cards: ${cards.length}, Ads: ${premiumAds.length}`);
        }
        // Reset if card not found
        currentAdIndexRef.current = 0;
        performScroll(0);
        return;
      }

      // Calculate target scroll: position card at the left edge (accounting for padding)
      // This ensures left-to-right horizontal scrolling on desktop
      const cardOffsetLeft = targetCard.offsetLeft;
      let targetScroll = cardOffsetLeft - cardsPadding;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      // Smooth scroll to show the full card (left-to-right on desktop)
      performScroll(targetScroll);
    };

    scrollIntervalRef.current = window.setInterval(scrollToNextAd, scrollInterval);

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [premiumAds.length, isPaused, mobile]);

  // Pause on hover (desktop) or touch/scroll (mobile)
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  
  // Handle touch/scroll to pause auto-scroll temporarily
  const handleTouchStart = () => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };
  
  const handleTouchEnd = () => {
    // Resume after 3 seconds of no interaction
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, 3000);
  };
  
  const handleScroll = () => {
    // Ignore scroll events during programmatic scrolling (auto-scroll)
    if (isProgrammaticScrollRef.current) {
      return;
    }
    
    setIsPaused(true);
    
    // Update current index based on scroll position when user manually scrolls
    const container = scrollContainerRef.current;
    const cardsContainer = cardsContainerRef.current;
    if (container && cardsContainer) {
      const cards = cardsContainer.children;
      const scrollLeft = container.scrollLeft;
      const cardsPadding = mobile ? 12 : 16; // Desktop padding
      
      // Find which card is most visible based on scroll position
      // A card is considered "visible" if its left edge is at or near the container's left edge (accounting for padding)
      let mostVisibleIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const cardOffsetLeft = card.offsetLeft;
        // Calculate where the card should be positioned relative to scroll
        const cardScrollPosition = cardOffsetLeft - cardsPadding;
        // Calculate distance from current scroll position
        const distance = Math.abs(cardScrollPosition - scrollLeft);
        
        if (distance < minDistance) {
          minDistance = distance;
          mostVisibleIndex = i;
        }
      }
      
      // Only update if we found a valid index
      if (mostVisibleIndex >= 0 && mostVisibleIndex < cards.length) {
        currentAdIndexRef.current = mostVisibleIndex;
        
        if (mobile && process.env.NODE_ENV === 'development') {
          console.log('Manual scroll detected card:', mostVisibleIndex, 'of', cards.length);
        }
      }
    }
    
    // Resume after 3 seconds of no scrolling
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, 3000);
  };
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    // On mobile, hide the section while loading to avoid layout shift
    if (mobile) {
      return null;
    }
    
    return (
      <div className={`w-full ${floating ? 'bg-transparent' : 'bg-[#2a4149] border-t border-[#EAEBF024]'} py-4`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#67DBE2]" />
            <span className="text-[#a7a7a7] text-sm">{t("news.loadingPremiumAds")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (premiumAds.length === 0) {
    // On mobile, hide the section entirely when there are no ads
    if (mobile) {
      return null;
    }
    
    return (
      <div className={`w-full ${floating ? 'bg-transparent' : 'bg-[#2a4149] border-t border-[#EAEBF024]'} py-4`}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-[#a7a7a7] text-sm mb-2">{t("news.noPremiumAdsAvailable")}</p>
            <a
              href="/?tab=advertise"
              className="text-xs text-[#67DBE2] hover:underline"
            >
              {t("news.advertiseWithUs")} →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${floating ? 'bg-transparent' : mobile ? 'bg-[#2a4149]' : 'bg-[#2a4149] border-t border-[#EAEBF024]'} ${mobile ? (compact ? 'py-1' : 'py-2') : compact ? 'py-1.5' : 'py-4'} ${mobile ? 'overflow-hidden' : 'overflow-visible'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={mobile ? { maxHeight: compact ? '90px' : '110px' } : undefined}
    >
      <div className={`w-full ${mobile ? 'px-0' : compact ? 'px-2' : 'px-4'} overflow-hidden`}>
        {!floating && !mobile && (
          <div className={`flex items-center gap-3 ${compact ? 'mb-1.5' : 'mb-3'}`}>
            <div className="flex items-center gap-2">
              <Star className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-amber-400`} />
              <h3 className={`[font-family:'Roboto',Helvetica] font-semibold ${compact ? 'text-xs' : 'text-sm'} text-white`}>
                {t("news.premiumAdvertisements")}
              </h3>
            </div>
            <div className="flex-1 h-px bg-[#EAEBF024]" />
            <span className={`text-[#a7a7a7] ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {premiumAds.length} {premiumAds.length === 1 ? t("news.ad") : t("news.ads")}
            </span>
          </div>
        )}
        
        {mobile && (
          <div className={`flex items-center gap-2 ${compact ? 'mb-1 px-2' : 'mb-2 px-3'}`}>
            <Star className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-400`} />
            <h3 className={`[font-family:'Roboto',Helvetica] font-semibold ${compact ? 'text-[10px]' : 'text-xs'} text-white`}>
              {t("news.premiumAdvertisements")}
            </h3>
            <span className={`text-[#a7a7a7] ${compact ? 'text-[9px]' : 'text-[10px]'} ml-auto`}>
              {premiumAds.length} {premiumAds.length === 1 ? t("news.ad") : t("news.ads")}
            </span>
          </div>
        )}
        
        <div
          ref={scrollContainerRef}
          className={`premium-ads-scroll flex overflow-x-auto overflow-y-hidden scroll-smooth ${mobile ? (compact ? 'gap-2 pb-0.5' : 'gap-3 pb-1') : compact ? 'gap-3 pb-1' : 'gap-4 pb-2'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4a5a60 transparent',
            msOverflowStyle: 'auto',
            WebkitOverflowScrolling: mobile ? 'touch' : 'auto',
            touchAction: mobile ? 'pan-x' : 'auto',
            paddingLeft: '0px',
            paddingRight: '0px',
            direction: 'ltr', // Ensure left-to-right direction
            scrollBehavior: 'smooth', // Smooth scrolling for desktop
          }}
          onTouchStart={mobile ? handleTouchStart : undefined}
          onTouchEnd={mobile ? handleTouchEnd : undefined}
          onScroll={handleScroll}
        >
          <style>{`
            .premium-ads-scroll::-webkit-scrollbar {
              height: ${mobile ? '4px' : '6px'};
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
          <div 
            ref={cardsContainerRef}
            className={`flex premium-ads-scroll ${mobile ? (compact ? 'gap-2' : 'gap-3') : compact ? 'gap-3' : 'gap-4'}`} 
            style={{ 
              minWidth: 'max-content',
              width: 'max-content',
              display: 'flex',
              flexWrap: 'nowrap',
              paddingLeft: mobile ? (compact ? '8px' : '12px') : compact ? '8px' : '16px',
              paddingRight: mobile ? (compact ? '8px' : '12px') : compact ? '8px' : '16px',
            }}
          >
            {premiumAds.map((content) => (
              <PremiumAdCard
                key={content.id}
                content={content}
                onView={trackView}
                onClick={trackClick}
                isMobile={mobile}
                compact={compact}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
