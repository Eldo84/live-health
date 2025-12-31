import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useSponsoredContent, SponsoredContent } from "../../../../lib/useSponsoredContent";
import { Star, Pin, ExternalLink, MapPin } from "lucide-react";
import { useLanguage } from "../../../../contexts/LanguageContext";

interface SponsoredCardProps {
  content: SponsoredContent;
  onView: (id: string) => void;
  onClick: (id: string) => void;
}

const SponsoredCard: React.FC<SponsoredCardProps> = ({ content, onView, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

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

  const isAnimatedGif = React.useMemo(() => {
    if (!content.image_url) return false;
    const url = content.image_url.toLowerCase();
    return url.endsWith('.gif') || url.includes('image/gif');
  }, [content.image_url]);

  const planMeta = React.useMemo(() => {
    if (content.plan_type === 'enterprise') {
      return { label: 'Premium', dot: 'bg-amber-400' };
    }
    if (content.plan_type === 'professional') {
      return { label: 'Pro', dot: 'bg-blue-400' };
    }
    return { label: 'Basic', dot: 'bg-slate-300' };
  }, [content.plan_type]);

  return (
    <div
      ref={cardRef}
      className={`relative w-full h-[84px] rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 ${
        content.is_pinned 
          ? 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-400/20' 
          : content.is_featured 
            ? 'ring-2 ring-blue-400/50 shadow-lg shadow-blue-400/10' 
            : 'shadow-md hover:shadow-xl'
      } hover:scale-[1.02] ${!hasImage ? 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700' : ''}`}
      onClick={handleClick}
    >
      {/* Background Media */}
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
              className="absolute inset-0 w-full h-full object-cover"
              alt={content.title}
              src={content.image_url}
              loading={isAnimatedGif ? 'eager' : 'lazy'}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        </>
      )}

      {/* Status Badge (Top Left) */}
      {(content.is_pinned || content.is_featured) && (
        <div className="absolute top-2 left-2 z-10">
          {content.is_pinned && (
            <div className="bg-amber-400/30 border border-amber-200/30 rounded-full p-1 flex items-center justify-center backdrop-blur-sm">
              <Pin className="w-2.5 h-2.5 text-white/90" />
            </div>
          )}
          {content.is_featured && !content.is_pinned && (
            <div className="bg-blue-400/30 border border-blue-200/30 rounded-full p-1 flex items-center justify-center backdrop-blur-sm">
              <Star className="w-2.5 h-2.5 text-white/90" />
            </div>
          )}
        </div>
      )}

      {/* Plan Type Badge (Top Right) - simplified */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-1 rounded-full px-2 py-0.5 border border-white/10 bg-black/30 backdrop-blur-sm shadow-sm">
          <span className={`w-2 h-2 rounded-full ${planMeta.dot}`} />
          <span className="text-[10px] font-semibold text-white/90 uppercase">
            {planMeta.label}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="absolute inset-0 flex flex-col justify-end p-2">
        {/* Title & Description */}
        <div className="space-y-0.5 mb-1">
          <h3 className="text-white font-bold text-[12px] leading-tight line-clamp-2 drop-shadow-lg">
            {content.title}
          </h3>
          {content.description && (
            <p className="text-white/90 text-[10px] leading-snug line-clamp-1 drop-shadow">
              {content.description}
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/80">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] font-medium">
              {content.location || 'Global'}
            </span>
          </div>
          
          {content.click_url && (
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 group-hover:bg-white/30 transition-colors">
              <span className="text-[10px] font-semibold text-white">Visit</span>
              <ExternalLink className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Play Icon for Videos */}
      {content.play_icon_url && isVideo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none">
          <img
            className="w-8 h-8 drop-shadow-lg"
            alt="Video"
            src={content.play_icon_url}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
    </div>
  );
};

const SponsoredCardSkeleton: React.FC = () => (
  <div className="relative w-full h-[84px] rounded-lg overflow-hidden bg-slate-700/50 animate-pulse">
    <div className="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent" />
    <div className="absolute top-2 right-2 w-12 h-5 bg-slate-600 rounded-md" />
    <div className="absolute bottom-3 left-3 space-y-2">
      <div className="w-32 h-4 bg-slate-600 rounded" />
      <div className="w-20 h-3 bg-slate-600 rounded" />
    </div>
  </div>
);

const PlanCarousel: React.FC<{
  items: SponsoredContent[];
  accentClass: string;
  onView: (id: string) => void;
  onClick: (id: string) => void;
  cardWidth: number;
}> = ({ items, accentClass, onView, onClick, cardWidth }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationIntervalRef = useRef<number | null>(null);

  const CARD_WIDTH = cardWidth;
  const CARD_GAP = 8;

  useEffect(() => {
    if (items.length <= 1 || isPaused) {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      return;
    }

    rotationIntervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 3000);

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [items.length, isPaused]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    setCurrentIndex(0);
    scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }, [items]);

  useEffect(() => {
    if (!scrollContainerRef.current || items.length <= 1) return;
    const scrollPosition = currentIndex * (CARD_WIDTH + CARD_GAP);
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });
  }, [currentIndex, items.length]);

  return (
    <div className="space-y-1">
      <div className={`${accentClass} h-[2px] w-full rounded-full bg-current opacity-60`} />
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto overflow-y-hidden custom-scrollbar pb-0.5"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
            height: 0;
          }
          .custom-scrollbar {
            scrollbar-width: none;
          }
        `}</style>
        <div className="flex items-stretch gap-2" style={{ minWidth: 'max-content' }}>
          {items.map((content) => (
            <div key={content.id} className="flex-shrink-0" style={{ minWidth: `${CARD_WIDTH}px`, maxWidth: `${CARD_WIDTH}px` }}>
              <SponsoredCard
                content={content}
                onView={onView}
                onClick={onClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SponsoredSectionProps {
  width?: number;
  height?: number | string;
  maxHeight?: number | string;
  className?: string;
}

export const SponsoredSection = ({ width, height, maxHeight, className }: SponsoredSectionProps = {}): JSX.Element => {
  const { t } = useLanguage();
  const { data, isLoading, error, trackView, trackClick } = useSponsoredContent({
    location: 'map',
    limit: 10,
  });

  const effectiveCardWidth = useMemo(() => {
    const base = width ?? 240;
    // Keep cards fully visible in narrow sidebars while not shrinking too much
    return Math.max(190, Math.min(220, base - 10));
  }, [width]);

  const sortAds = (ads: SponsoredContent[]) => {
    return [...ads].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      const orderDiff = (a.display_order ?? 9999) - (b.display_order ?? 9999);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const planGroups = useMemo(() => {
    const activeAds = data.filter((ad) => ad.is_active);
    const groups = [
      { key: 'enterprise' as const, title: 'Premium', accent: 'text-amber-400' },
      { key: 'professional' as const, title: 'Professional', accent: 'text-blue-400' },
      { key: 'basic' as const, title: 'Basic', accent: 'text-slate-300' },
    ];

    return groups
      .map((g) => ({
        ...g,
        items: sortAds(activeAds.filter((ad) => ad.plan_type === g.key)),
      }))
      .filter((g) => g.items.length > 0);
  }, [data]);

  const totalAds = planGroups.reduce((sum, g) => sum + g.items.length, 0);

  const rootClasses = [
    'w-full',
    width ? '' : 'lg:w-[240px]',
    'rounded-xl border-2 border-slate-700/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden lg:h-[380px] h-[440px] max-h-[70vh] lg:max-h-[420px]',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const sizeStyles: CSSProperties = {
    boxSizing: 'border-box',
    ...(width ? { width: `${width}px`, maxWidth: `${width}px`, minWidth: `${width}px` } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : {}),
  };

  return (
    <div
      className={rootClasses}
      style={sizeStyles}
    >
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-blue-400 rounded-full" />
          <span className="font-bold text-white text-[13px] tracking-wide">
            {t("news.sponsored")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 py-1.5 space-y-1.5"
      >
        {isLoading ? (
          <div className="space-y-1.5">
            <div className="flex items-stretch gap-2" style={{ minWidth: 'max-content' }}>
              <div style={{ minWidth: `${effectiveCardWidth}px`, maxWidth: `${effectiveCardWidth}px` }}>
                <SponsoredCardSkeleton />
              </div>
              <div style={{ minWidth: `${effectiveCardWidth}px`, maxWidth: `${effectiveCardWidth}px` }}>
                <SponsoredCardSkeleton />
              </div>
              <div style={{ minWidth: `${effectiveCardWidth}px`, maxWidth: `${effectiveCardWidth}px` }}>
                <SponsoredCardSkeleton />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-1.5">
            {planGroups.map((group) => (
              <PlanCarousel
                key={group.key}
                items={group.items}
                accentClass={group.accent}
                onView={trackView}
                onClick={trackClick}
                cardWidth={effectiveCardWidth}
              />
            ))}
          </div>
        ) : totalAds === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-slate-500" />
            </div>
            <div className="text-slate-400 text-sm font-medium mb-3">
              {t("news.noSponsoredContent")}
            </div>
            <a
              href="/?tab=advertise"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors"
            >
              {t("news.advertiseWithUs")} →
            </a>
          </div>
        ) : (
          <div className="space-y-1.5">
            {planGroups.map((group) => (
              <PlanCarousel
                key={group.key}
                items={group.items}
                accentClass={group.accent}
                onView={trackView}
                onClick={trackClick}
                cardWidth={effectiveCardWidth}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};