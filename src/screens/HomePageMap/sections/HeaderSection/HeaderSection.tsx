import { ChevronDownIcon, Menu, Home, ChevronRight, LogOut, User, Plus, Shield, Megaphone, MessageSquare } from "lucide-react";
import { NotificationBell } from "../../../../components/NotificationBell";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    <div className="w-full bg-[#2a4149] border-b border-[#89898947] relative z-[10000]">
      <header className="flex items-center justify-center bg-transparent">
        <div className="flex w-full max-w-[1280px] h-[56px] items-center justify-between px-4">
          <img
            className="h-10 w-auto object-contain lg:h-16"
            alt="OutbreakNow Logo"
            src={outbreakNowLogo}
          />

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
          <div className="xl:hidden">
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
              <SheetContent side="left" className="w-[280px] bg-[#2a4149] border-r border-[#eaebf024] [&>button]:text-white [&>button]:hover:text-white [&>button]:hover:bg-white/10">
                <SheetHeader>
                  <SheetTitle className="text-left text-white [font-family:'Roboto',Helvetica]">
                    {t("common.navigation")}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
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
                              className={`w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none ${
                                isActive(item.path) ? "bg-[#ffffff1a]" : ""
                              }`}
                            >
                              <img
                                className="w-[22px] h-[22px] flex-shrink-0"
                                alt={`${item.label} icon`}
                                src={item.icon}
                              />
                              <span className={`flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] ${
                                isActive(item.path) ? "font-semibold text-[#ffffff]" : "font-normal text-[#ffffff99]"
                              } text-[15px]`}>
                                {item.label}
                              </span>
                              <ChevronRight
                                className={`w-4 h-4 text-[#ffffff99] transition-transform ${
                                  isDashboardOpen ? "rotate-90" : ""
                                }`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="flex flex-col gap-2 pl-6 mt-2">
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
                                    className={`flex items-center gap-3.5 w-full text-left hover:opacity-80 transition-opacity py-2`}
                                  >
                                    <div className="flex items-center justify-center w-[5px] h-[22px]">
                                      <div className="w-[5px] h-1.5 bg-[#ffffff80] rounded-[5px]" />
                                    </div>
                                    <span className={`flex-1 [font-family:'Inter',Helvetica] font-semibold text-xs ${
                                      isActiveItem ? "text-[#66dbe1]" : "text-[#ffffff80]"
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
                        className={`w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none ${
                          isActive(item.path) ? "bg-[#ffffff1a]" : ""
                        }`}
                      >
                        {item.icon === "home" ? (
                          <Home className="w-[22px] h-[22px] flex-shrink-0 text-[#ffffff99]" />
                        ) : (
                          <img
                            className="w-[22px] h-[22px] flex-shrink-0"
                            alt={`${item.label} icon`}
                            src={item.icon}
                          />
                        )}
                        <span className={`flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] ${
                          isActive(item.path) ? "font-semibold text-[#ffffff]" : "font-normal text-[#ffffff99]"
                        } text-[15px]`}>
                          {item.label}
                        </span>
                      </Button>
                    );
                  })}
                </nav>
                
                {/* Mobile Auth Section */}
                <div className="mt-6 pt-6 border-t border-[#ffffff1a]">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleAddAlertClick();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white border border-[#4eb7bd]/50 hover:border-[#4eb7bd] transition-colors"
                    >
                      <Plus className="w-[22px] h-[22px] flex-shrink-0" />
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
                      className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white border border-[#4eb7bd]/50 hover:border-[#4eb7bd] transition-colors"
                    >
                      <MessageSquare className="w-[22px] h-[22px] flex-shrink-0" />
                      <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                        Feedback
                      </span>
                    </Button>
                    {user ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigate('/dashboard/advertising');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white border border-primary/50 hover:border-primary transition-colors"
                        >
                          <Megaphone className="w-[22px] h-[22px] flex-shrink-0" />
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
                            className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white border border-yellow-500/50 hover:border-yellow-500 transition-colors"
                          >
                            <Shield className="w-[22px] h-[22px] flex-shrink-0" />
                            <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                              {t("common.adminPanel")}
                            </span>
                          </Button>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 text-white">
                          <NotificationBell />
                          <User className="w-4 h-4" />
                          <span className="[font-family:'Roboto',Helvetica] font-medium text-sm">
                            {user.email}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white"
                        >
                          <LogOut className="w-[22px] h-[22px] flex-shrink-0" />
                          <span className="flex-1 text-left ml-3 [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px]">
                            {t("common.logOut")}
                          </span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            openAuthDialog("login");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start h-[46px] px-4 hover:bg-[#ffffff1a] rounded-none text-white"
                        >
                          <span className="flex-1 text-left [font-family:'Roboto',Helvetica] font-normal text-[#ffffff99] text-[15px]">
                            {t("common.logIn")}
                          </span>
                        </Button>
                        <Button
                          onClick={() => {
                            openAuthDialog("signup");
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start h-[46px] px-4 bg-app-primary hover:bg-app-primary/90 rounded-none text-white"
                        >
                          <span className="flex-1 text-left [font-family:'Roboto',Helvetica] font-semibold text-[15px]">
                            {t("common.signUp")}
                          </span>
                        </Button>
                      </>
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
