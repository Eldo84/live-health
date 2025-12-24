import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../../../../components/ui/badge";
import { useSponsoredContent, getPlanBadgeInfo, SponsoredContent } from "../../../../lib/useSponsoredContent";
import { Loader2, Star, Pin, ExternalLink } from "lucide-react";
import { useLanguage } from "../../../../contexts/LanguageContext";

interface SponsoredCardProps {
  content: SponsoredContent;
  onView: (id: string) => void;
  onClick: (id: string) => void;
}

const SponsoredCard: React.FC<SponsoredCardProps> = ({ content, onView, onClick }) => {
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
      className={`relative w-full h-20 rounded-md overflow-hidden cursor-pointer group transition-all duration-200 shadow-sm ${
        content.is_pinned 
          ? 'ring-2 ring-amber-400/50 hover:ring-amber-400' 
          : content.is_featured 
            ? 'ring-1 ring-blue-400/30 hover:ring-blue-400/50' 
            : 'hover:opacity-90 hover:scale-[1.02]'
      } ${!hasImage ? 'bg-gradient-to-br from-primary/20 to-primary/40' : ''}`}
      onClick={handleClick}
    >
      {/* Background Image - only if image_url exists */}
      {hasImage && (
        <>
          <img
            className="absolute inset-0 w-full h-full object-cover"
            alt={content.title}
            src={content.image_url}
            onError={(e) => {
              // If image fails to load, hide it and show text instead
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Gradient Overlay - only when image exists */}
          <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,1)_100%)]" />
        </>
      )}

      {/* Text Content - shown when no image or image fails to load */}
      {!hasImage && (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-white font-semibold text-xs leading-tight mb-1 line-clamp-2">
              {content.title}
            </h3>
            {content.description && (
              <p className="text-white/80 text-[10px] leading-tight line-clamp-2">
                {content.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Plan Badge (Top Right) */}
      {(content.is_pinned || content.is_featured) && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {content.is_pinned && (
            <div className="bg-amber-500/90 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-0.5">
              <Pin className="w-2.5 h-2.5 text-white" />
              <span className="text-[8px] font-semibold text-white">PINNED</span>
            </div>
          )}
          {content.is_featured && !content.is_pinned && (
            <div className="bg-blue-500/90 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 text-white" />
              <span className="text-[8px] font-semibold text-white">FEATURED</span>
            </div>
          )}
        </div>
      )}

      {/* Location (Bottom Left) - only show when image exists */}
      {hasImage && (
        <div className="absolute bottom-2 left-2 [font-family:'Roboto',Helvetica] font-medium text-white text-xs">
          {content.location || 'Global'}
        </div>
      )}

      {/* Time/Status (Bottom Right) */}
      <div className={`absolute bottom-2 right-2 flex items-center gap-1 ${!hasImage ? 'text-white/90' : ''}`}>
        {content.click_url && (
          <ExternalLink className="w-2.5 h-2.5 text-white/70" />
        )}
        <span className="[font-family:'Roboto',Helvetica] font-medium text-white text-[10px]">
          {content.plan_type === 'enterprise' ? 'Premium' : content.plan_type === 'professional' ? 'Pro' : 'Ad'}
        </span>
      </div>
      
      {/* Location (Bottom Left) - show when no image */}
      {!hasImage && (
        <div className="absolute bottom-2 left-2 [font-family:'Roboto',Helvetica] font-medium text-white/80 text-[10px]">
          {content.location || 'Global'}
        </div>
      )}

      {/* Play Icon (Center) - if provided */}
      {content.play_icon_url && (
        <img
          className="absolute top-1/2 left-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 opacity-80 group-hover:opacity-100 transition-opacity"
          alt="Play"
          src={content.play_icon_url}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );
};

// Loading skeleton
const SponsoredCardSkeleton: React.FC = () => (
  <div className="relative w-full h-20 rounded-md overflow-hidden bg-gray-700/50 animate-pulse">
    <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
    <div className="absolute bottom-2 left-2 w-12 h-3 bg-gray-600 rounded" />
    <div className="absolute bottom-2 right-2 w-8 h-2 bg-gray-600 rounded" />
  </div>
);

export const SponsoredSection = (): JSX.Element => {
  const { t } = useLanguage();
  const { data, isLoading, error, trackView, trackClick } = useSponsoredContent({
    location: 'map',
    limit: 10,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationIntervalRef = useRef<number | null>(null);

  // Auto-rotate ads every 5 seconds (only if multiple ads)
  useEffect(() => {
    if (data.length <= 1 || isLoading || isPaused) {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      return;
    }

    rotationIntervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % data.length);
    }, 3000); // Rotate every 5 seconds

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [data.length, isLoading, isPaused]);

  // Scroll to show the current ad when index changes
  useEffect(() => {
    if (!scrollContainerRef.current || data.length <= 1 || isLoading) {
      return;
    }

    const container = scrollContainerRef.current;
    const cardHeight = 80 + 10; // card height (h-20 = 80px) + gap (space-y-2.5 = 10px)
    const scrollPosition = currentIndex * cardHeight;

    container.scrollTo({
      top: scrollPosition,
      behavior: 'smooth',
    });
  }, [currentIndex, data.length, isLoading]);

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <div
      className="w-full lg:w-[240px] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg flex flex-col overflow-hidden lg:h-[380px] h-[500px] max-h-[55vh] lg:max-h-[380px]"
      style={{ boxSizing: 'border-box' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#EAEBF024]/50 flex items-center justify-between">
        <Badge
          variant="secondary"
          className="bg-transparent border-none [font-family:'Inter',Helvetica] font-medium text-[#a7a7a7] text-sm"
        >
          {t("news.sponsored")}
        </Badge>
        {data.length > 0 && !isLoading && (
          <span className="text-[10px] text-[#a7a7a7]/60">{data.length} {t("news.ads")}</span>
        )}
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 py-3"
      >
        {isLoading ? (
          // Loading state
          <div className="space-y-2.5">
            <SponsoredCardSkeleton />
            <SponsoredCardSkeleton />
            <SponsoredCardSkeleton />
          </div>
        ) : error ? (
          // Error state (still shows fallback data from hook)
          <div className="space-y-2.5">
            {data.map((content) => (
              <SponsoredCard
                key={content.id}
                content={content}
                onView={trackView}
                onClick={trackClick}
              />
            ))}
          </div>
        ) : data.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-[#a7a7a7]/60 text-sm mb-2">{t("news.noSponsoredContent")}</div>
            <a
              href="/?tab=advertise"
              className="text-xs text-primary hover:underline"
            >
              {t("news.advertiseWithUs")}
            </a>
          </div>
        ) : (
          // Data display
          <div className="space-y-2.5">
            {data.map((content) => (
              <SponsoredCard
                key={content.id}
                content={content}
                onView={trackView}
                onClick={trackClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Advertise CTA */}
      {!isLoading && (
        <div className="px-4 py-2 border-t border-[#EAEBF024]/30">
          <a
            href="/?tab=advertise"
            className="text-[10px] text-[#a7a7a7]/60 hover:text-primary transition-colors block text-center"
          >
            {t("news.wantToAdvertiseHere")} →
          </a>
        </div>
      )}
    </div>
  );
};
