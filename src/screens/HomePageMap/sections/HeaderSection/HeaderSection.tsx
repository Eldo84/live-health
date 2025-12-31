import { ChevronDownIcon, Menu, Home, ChevronRight, LogOut, User, Plus, Shield, Megaphone, MessageSquare, Sparkles, Filter, Utensils, Droplet, Bug, Wind, Handshake, Hospital, PawPrint, Heart, AlertTriangle, Brain, Syringe, Activity, AlertCircle, Beaker, Dna, Stethoscope, Cloud } from "lucide-react";
import { NotificationBell } from "../../../../components/NotificationBell";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../../../components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";
import { AuthDialog } from "../../../../components/AuthDialog";
import { AddAlertDialog } from "../../../../components/AddAlertDialog";
import { FeedbackDialog } from "../../../../components/FeedbackDialog";
import { useAuth } from "../../../../contexts/AuthContext";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../../../contexts/LanguageContext";
import { supabase } from "../../../../lib/supabase";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import { useOutbreakCategories } from "../../../../lib/useOutbreakCategories";
import { useFilterPanel } from "../../../../contexts/FilterPanelContext";
import { buildStandardizedCategories } from "../../../../lib/outbreakCategoryUtils";

const menuItems = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    path: "/",
  },
  {
    id: "map",
    label: "Map",
    icon: "/group-1377.png",
    path: "/map",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "/group-1378.png",
    path: "/dashboard",
    subItems: [
      { label: "Disease Outbreak", tab: "overview" },
      { label: "AI Powered Prediction", tab: "predictions" },
      { label: "Global Population Health Index", tab: "health-index" },
      { label: "My Advertising", path: "/dashboard/advertising" },
    ],
  },
  {
    id: "dataset",
    label: "Dataset",
    icon: "/group-969.png",
    path: "/dataset",
  },
];

export const HeaderSection = (): JSX.Element => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [addAlertDialogOpen, setAddAlertDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if we're on the map page
  const isMapPage = location.pathname.startsWith("/map") || location.pathname.startsWith("/app/map");
  
  // Listen for category selection changes broadcast by HomePageMap
  useEffect(() => {
    const handleCategoryChange = (event: Event) => {
      const detail = (event as CustomEvent<{ category: string | null }>).detail;
      setSelectedCategory(detail?.category || null);
    };
    window.addEventListener('outbreakCategorySelectionChanged', handleCategoryChange);
    return () => window.removeEventListener('outbreakCategorySelectionChanged', handleCategoryChange);
  }, []);

  // Listen for category stats (counts) broadcast by HomePageMap
  useEffect(() => {
    const handleStatsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, { cases?: number }>>).detail;
      if (!detail) {
        setCategoryCounts({});
        return;
      }
      const counts = Object.fromEntries(
        Object.entries(detail).map(([name, value]) => [name, value?.cases ?? 0])
      );
      setCategoryCounts(counts);
    };
    window.addEventListener('outbreakCategoryStatsUpdated', handleStatsUpdate);
    return () => window.removeEventListener('outbreakCategoryStatsUpdated', handleStatsUpdate);
  }, []);
  
  // Outbreak categories state for mobile header button
  const { categories: dbCategories } = useOutbreakCategories();
  const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = useState(false);
  
  // Filter panel state from context
  const { isMobileFiltersOpen, setIsMobileFiltersOpen } = useFilterPanel();
  
  // Simplified category processing for header
  const diseaseCategories = React.useMemo(
    () => buildStandardizedCategories(dbCategories || []),
    [dbCategories]
  );
  
  // Handle category click - dispatch custom event for HomePageMap to listen
  const handleCategoryClick = (categoryName: string, options?: { keepOpen?: boolean }) => {
    const nextSelection = selectedCategory === categoryName ? null : categoryName;
    setSelectedCategory(nextSelection);
    const event = new CustomEvent('outbreakCategorySelected', { 
      detail: { categoryName } 
    });
    window.dispatchEvent(event);
    if (!options?.keepOpen) {
      setIsCategoriesPanelOpen(false);
    }
  };

  const handleResetCategory = () => {
    if (!selectedCategory) return;
    // Send the same category name to allow map to clear it (toggle logic)
    handleCategoryClick(selectedCategory, { keepOpen: true });
  };

  const getCategoryCount = (name: string) => categoryCounts[name] ?? 0;

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // Query user_roles table (RLS policy fixed - no more circular dependency)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // Handle specific error cases
          if (error.code === 'PGRST116') {
            // No record found - user is not admin (default role is 'user')
            setIsAdmin(false);
            return;
          }
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
          return;
        }

        // Check if user is admin
        setIsAdmin(data?.role === 'admin');
      } catch (error: any) {
        // Catch any unexpected errors
        console.error('Unexpected error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };

    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownOpen]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setIsDashboardOpen(false);
  };

  const handleDashboardSubItem = (subItem: { tab?: string; path?: string; label: string }) => {
    if (subItem.path) {
      navigate(subItem.path);
    } else if (subItem.tab) {
      navigate(`/dashboard?tab=${subItem.tab}`);
    }
    setMobileMenuOpen(false);
    setIsDashboardOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const openAuthDialog = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };

  const handleAddAlertClick = () => {
    if (user) {
      setAddAlertDialogOpen(true);
    } else {
      openAuthDialog("login");
    }
  };

  return (
    <div className="w-full bg-[#2a4149] border-b border-[#89898947] fixed top-0 left-0 right-0 z-[10000]">
      <header className="flex items-center justify-center bg-transparent">
        <div className="flex w-full max-w-[1280px] h-[56px] items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Go to home page"
          >
            <img
              className="h-12 w-auto object-contain sm:h-14 md:h-16 lg:h-20 xl:h-24"
              alt="OutbreakNow Logo"
              src={outbreakNowLogo}
            />
          </Link>

          {/* Mobile Header Title */}
          <div className="flex-1 px-3 lg:hidden">
            <p className="[font-family:'Roboto',Helvetica] text-white text-xs font-semibold leading-4 text-center line-clamp-2">
              Global Outbreak & Disease Monitoring System
            </p>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setFeedbackDialogOpen(true)}
              >
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 whitespace-nowrap">
                  Feedback
                </span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 whitespace-nowrap">
                  {t("common.help")}
                </span>
              </div>
              {/* Language Selector */}
              <div className="relative" ref={languageDropdownRef}>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                >
                  <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName.toUpperCase() || "ENG"}
                  </span>
                  <ChevronDownIcon className={`w-5 h-5 text-white transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {languageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-[#2a4149] border-2 border-[#4eb7bd]/50 rounded-lg shadow-2xl z-[9999] overflow-hidden backdrop-blur-sm">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setLanguageDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[#4eb7bd]/20 transition-all duration-200 border-b border-[#89898947]/30 last:border-b-0 ${
                            language === lang.code ? 'bg-[#4eb7bd]/15 border-l-2 border-l-[#4eb7bd]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ffffff] text-sm">
                              {lang.nativeName}
                            </span>
                            {language === lang.code && (
                              <span className="text-app-primary text-base font-bold">✓</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleAddAlertClick}
              className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10 border border-[#4eb7bd]/50 hover:border-[#4eb7bd] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("common.addAlert")}
            </Button>
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard/advertising')}
                  className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10 border border-primary/50 hover:border-primary transition-colors flex items-center gap-2"
                  title="My Advertising"
                >
                  <Megaphone className="w-4 h-4" />
                  {t("common.myAds")}
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/admin')}
                    className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10 border border-yellow-500/50 hover:border-yellow-500 transition-colors flex items-center gap-2"
                    title={t("common.adminPanel")}
                  >
                    <Shield className="w-4 h-4" />
                    {t("common.admin")}
                  </Button>
                )}
                <div className="flex items-center gap-2 px-3 py-2 text-white">
                  <NotificationBell />
                  <User className="w-4 h-4" />
                  <span className="[font-family:'Roboto',Helvetica] font-medium text-sm">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t("common.logOut")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => openAuthDialog("login")}
                  className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10"
                >
                  {t("common.logIn")}
                </Button>

                <Button
                  onClick={() => openAuthDialog("signup")}
                  className="h-auto bg-app-primary border border-solid border-[#4eb7bd] shadow-shadow-xs px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-app-primary/90"
                >
                  {t("common.signUp")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation Menu */}
          <div className="xl:hidden flex items-center gap-2">
            {/* Filters Button - Mobile Only, Map Page Only */}
            {isMobile && isMapPage && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 bg-[#67DBE2]/20 hover:bg-[#67DBE2]/30 relative"
                aria-label="Open Filters"
                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              >
                <Filter className="h-5 w-5" />
              </Button>
            )}
            {/* Outbreak Categories Button - Mobile Only, Map Page Only */}
            {isMobile && isMapPage && diseaseCategories.length > 0 && (
              <Sheet open={isCategoriesPanelOpen} onOpenChange={setIsCategoriesPanelOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 bg-[#67DBE2]/20 hover:bg-[#67DBE2]/30"
                    aria-label="Open Categories"
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-[#2a4149] border-t border-[#67DBE2]/20 max-h-[70vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-[#67DBE2] text-left">Outbreak Categories</SheetTitle>
                  </SheetHeader>
                <div className="mt-4 space-y-3">
                  {selectedCategory && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white border border-white/15 bg-white/5 hover:bg-white/10"
                        onClick={handleResetCategory}
                      >
                        Reset selection
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-4">
                      {diseaseCategories.map((category) => (
                        <button
                          key={category.name}
                          onClick={() => handleCategoryClick(category.name)}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg transition-all active:scale-95"
                          style={{
                            backgroundColor: 'transparent',
                          }}
                        >
                          <div 
                            className="rounded-full flex items-center justify-center transition-all"
                            style={{
                              width: '50px',
                              height: '50px',
                              backgroundColor: category.color,
                              boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
                            }}
                          >
                            {React.createElement(category.icon, {
                              style: {
                                width: '28px',
                                height: '28px',
                                color: '#FFFFFF',
                                stroke: '#FFFFFF',
                                fill: 'none',
                                strokeWidth: 2.5,
                              }
                            })}
                          </div>
                          <span className="text-xs text-white text-center line-clamp-2">
                            {category.name}
                          </span>
                          <span className="text-[11px] text-white/70">
                            {getCategoryCount(category.name)} outbreaks
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {/* Add Alert - Mobile/Tablet on Map */}
            {isMobile && isMapPage && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 bg-[#67DBE2]/20 hover:bg-[#67DBE2]/30"
                aria-label="Add alert"
                onClick={handleAddAlertClick}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            {/* Notifications - Mobile/Tablet on Map */}
            {isMobile && isMapPage && (
              <div className="flex items-center">
                <NotificationBell />
              </div>
            )}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[320px] sm:w-[360px] p-0 bg-[#1f3541] border-r border-white/10 text-white shadow-2xl overflow-hidden h-[100dvh] max-h-[100dvh] z-[1600]"
              >
                <div className="flex flex-col h-full">
                  <div className="px-5 pt-5 pb-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#67DBE2]/15 text-[#67DBE2] flex items-center justify-center font-bold tracking-tight">
                        LH
                      </div>
                      <div className="space-y-0.5">
                        <SheetTitle className="text-left text-white [font-family:'Roboto',Helvetica] text-lg leading-5">
                          {t("common.navigation")}
                        </SheetTitle>
                        <p className="text-xs text-white/60">
                          Stay on top of outbreaks and alerts
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex-1 overflow-y-auto px-4 py-5 space-y-6"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}
                  >
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 px-1">
                        {t("common.navigation")}
                      </p>
                      <nav className="flex flex-col gap-2">
                        {menuItems.map((item) => {
                          if (item.id === "dashboard" && item.subItems) {
                            return (
                              <Collapsible
                                key={item.id}
                                open={isDashboardOpen}
                                onOpenChange={setIsDashboardOpen}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={`w-full justify-start h-[48px] px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${
                                      isActive(item.path) ? "border-[#67DBE2]/50 bg-[#67DBE2]/10" : ""
                                    }`}
                                  >
                                    <img
                                      className="w-[22px] h-[22px] flex-shrink-0"
                                      alt={`${item.label} icon`}
                                      src={item.icon}
                                    />
                                    <span className={`flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] ${
                                      isActive(item.path) ? "font-semibold text-white" : "font-medium text-white/80"
                                    } text-[15px]`}>
                                      {item.label}
                                    </span>
                                    <ChevronRight
                                      className={`w-4 h-4 text-white/70 transition-transform ${
                                        isDashboardOpen ? "rotate-90" : ""
                                      }`}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="flex flex-col gap-2 pl-2 mt-2">
                                    {item.subItems.map((subItem, index) => {
                                      const isPathBased = 'path' in subItem && subItem.path;
                                      const currentTab = new URLSearchParams(location.search).get("tab");
                                      const isActiveItem = isPathBased
                                        ? location.pathname === subItem.path
                                        : isActive("/dashboard") && (
                                            index === 0
                                              ? (!currentTab || currentTab === "overview")
                                              : currentTab === subItem.tab
                                          );
                                      return (
                                        <button
                                          key={index}
                                          onClick={() => handleDashboardSubItem(subItem)}
                                          className="flex items-center gap-3.5 w-full text-left hover:opacity-90 transition-opacity py-2 px-2 rounded-lg bg-white/5"
                                        >
                                          <div className="flex items-center justify-center w-[5px] h-[22px]">
                                            <div className="w-[5px] h-1.5 bg-[#ffffff80] rounded-[5px]" />
                                          </div>
                                          <span className={`flex-1 [font-family:'Inter',Helvetica] font-semibold text-xs ${
                                            isActiveItem ? "text-[#66dbe1]" : "text-[#ffffffb3]"
                                          }`}>
                                            {subItem.tab === "overview" ? t("header.diseaseOutbreak") :
                                             subItem.tab === "predictions" ? t("header.aiPrediction") :
                                             subItem.tab === "health-index" ? t("header.globalHealthIndex") :
                                             subItem.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          }
                          return (
                            <Button
                              key={item.id}
                              variant="ghost"
                              onClick={() => handleNavigation(item.path)}
                              className={`w-full justify-start h-[48px] px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${
                                isActive(item.path) ? "border-[#67DBE2]/50 bg-[#67DBE2]/10" : ""
                              }`}
                            >
                              {item.icon === "home" ? (
                                <Home className="w-[22px] h-[22px] flex-shrink-0 text-white/80" />
                              ) : (
                                <img
                                  className="w-[22px] h-[22px] flex-shrink-0"
                                  alt={`${item.label} icon`}
                                  src={item.icon}
                                />
                              )}
                              <span className={`flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] ${
                                isActive(item.path) ? "font-semibold text-white" : "font-medium text-white/80"
                              } text-[15px]`}>
                                {item.label}
                              </span>
                            </Button>
                          );
                        })}
                      </nav>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 px-1">
                        Quick actions
                      </p>
                      <div className="grid gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            handleAddAlertClick();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start h-[48px] px-4 rounded-lg border border-[#4eb7bd]/40 bg-[#4eb7bd]/10 hover:bg-[#4eb7bd]/20 text-white transition-colors"
                        >
                          <Plus className="w-[20px] h-[20px] flex-shrink-0" />
                          <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                            {t("common.addAlert")}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setFeedbackDialogOpen(true);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start h-[48px] px-4 rounded-lg border border-[#4eb7bd]/40 bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                          <MessageSquare className="w-[20px] h-[20px] flex-shrink-0" />
                          <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                            Feedback
                          </span>
                        </Button>
                        {user && (
                          <>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                navigate('/dashboard/advertising');
                                setMobileMenuOpen(false);
                              }}
                              className="w-full justify-start h-[48px] px-4 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-white transition-colors"
                            >
                              <Megaphone className="w-[20px] h-[20px] flex-shrink-0" />
                              <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                                {t("common.myAdvertising")}
                              </span>
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  navigate('/admin/advertising');
                                  setMobileMenuOpen(false);
                                }}
                                className="w-full justify-start h-[48px] px-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 text-white transition-colors"
                              >
                                <Shield className="w-[20px] h-[20px] flex-shrink-0" />
                                <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                                  {t("common.adminPanel")}
                                </span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                          <NotificationBell />
                          <div className="flex flex-col">
                            <span className="[font-family:'Roboto',Helvetica] font-semibold text-sm">{user.email}</span>
                            <span className="text-xs text-white/60">Signed in</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="w-full justify-center h-[46px] rounded-lg bg-white/10 hover:bg-white/15 text-white"
                        >
                          <LogOut className="w-[18px] h-[18px] mr-2" />
                          <span className="[font-family:'Roboto',Helvetica] font-medium text-[15px]">
                            {t("common.logOut")}
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            openAuthDialog("login");
                            setMobileMenuOpen(false);
                          }}
                          className="h-[46px] rounded-lg bg-white/10 hover:bg-white/15 text-white"
                        >
                          <span className="[font-family:'Roboto',Helvetica] font-medium text-[15px]">
                            {t("common.logIn")}
                          </span>
                        </Button>
                        <Button
                          onClick={() => {
                            openAuthDialog("signup");
                            setMobileMenuOpen(false);
                          }}
                          className="h-[46px] rounded-lg bg-[#67DBE2] hover:bg-[#58c8d0] text-[#0f2430] font-semibold"
                        >
                          <span className="[font-family:'Roboto',Helvetica] text-[15px]">
                            {t("common.signUp")}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
      />
      
      {/* Add Alert Dialog */}
      {user && (
        <AddAlertDialog
          open={addAlertDialogOpen}
          onOpenChange={setAddAlertDialogOpen}
        />
      )}
      
      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </div>
  );
};
