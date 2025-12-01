import { ChevronDownIcon, Menu, Home, ChevronRight, LogOut, User, Plus } from "lucide-react";
import React, { useState } from "react";
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
import { useAuth } from "../../../../contexts/AuthContext";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";

const navigationItems = [
  { label: "About", hasDropdown: false },
  { label: "Resources", hasDropdown: true },
  { label: "Contact", hasDropdown: false },
  { label: "Help", hasDropdown: false },
  { label: "ENG", hasDropdown: true },
];

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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

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

  const handleDashboardSubItem = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
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
    <div className="w-full bg-[#2a4149] border-b border-[#89898947]">
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
              {navigationItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.hasDropdown && (
                    <ChevronDownIcon className="w-5 h-5 text-white" />
                  )}
                </div>
              ))}
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
              Add alert
            </Button>
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-white">
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
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => openAuthDialog("login")}
                  className="h-auto px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-white/10"
                >
                  Log in
                </Button>

                <Button
                  onClick={() => openAuthDialog("signup")}
                  className="h-auto bg-app-primary border border-solid border-[#4eb7bd] shadow-shadow-xs px-[18px] py-2.5 rounded-lg [font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-base tracking-[0] leading-6 hover:bg-app-primary/90"
                >
                  Sign up
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
                    Navigation
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
                                const currentTab = new URLSearchParams(location.search).get("tab");
                                const isActiveItem = isActive("/dashboard") && (
                                  index === 0
                                    ? (!currentTab || currentTab === "overview")
                                    : currentTab === subItem.tab
                                );
                                return (
                                  <button
                                    key={index}
                                    onClick={() => handleDashboardSubItem(subItem.tab)}
                                    className={`flex items-center gap-3.5 w-full text-left hover:opacity-80 transition-opacity py-2`}
                                  >
                                    <div className="flex items-center justify-center w-[5px] h-[22px]">
                                      <div className="w-[5px] h-1.5 bg-[#ffffff80] rounded-[5px]" />
                                    </div>
                                    <span className={`flex-1 [font-family:'Inter',Helvetica] font-semibold text-xs ${
                                      isActiveItem ? "text-[#66dbe1]" : "text-[#ffffff80]"
                                    }`}>
                                      {subItem.label}
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
                        Add alert
                      </span>
                    </Button>
                    {user ? (
                      <>
                        <div className="flex items-center gap-2 px-4 py-2 text-white">
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
                            Log out
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
                            Log in
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
                            Sign up
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
    </div>
  );
};
