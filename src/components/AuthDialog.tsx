import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

// Schemas will be created inside component to use translations

type LoginFormValues = {
  email: string;
  password: string;
};

type SignUpFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "login" | "signup";
  onModeChange?: (mode: "login" | "signup") => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange, mode, onModeChange }) => {
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.passwordTooShort")),
  });

  const signUpSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.passwordTooShort")),
    confirmPassword: z.string().min(6, t("auth.passwordTooShort")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("auth.passwordsDontMatch"),
    path: ["confirmPassword"],
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        setError(error.message);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          loginForm.reset();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || t("auth.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUpSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signUp(values.email, values.password);
      if (error) {
        setError(error.message);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          signUpForm.reset();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || t("auth.signupError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setError(null);
    loginForm.reset();
    signUpForm.reset();
    onModeChange?.(mode === "login" ? "signup" : "login");
  };

  // Reset forms when mode changes to ensure proper initialization
  useEffect(() => {
    if (open) {
      if (mode === "login") {
        loginForm.reset({ email: "", password: "" });
      } else {
        signUpForm.reset({ email: "", password: "", confirmPassword: "" });
      }
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open]);

  const isSignUpMode = mode === "signup";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-8 bg-[#2a4149] border-[#89898947]">
        <DialogClose className="text-white hover:text-white/80" />
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-bold text-white [font-family:'Roboto',Helvetica]">
            {isSignUpMode ? t("auth.createAccount") : t("auth.welcomeBack")}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#ffffff99] [font-family:'Roboto',Helvetica]">
            {isSignUpMode
              ? t("auth.signUpDescription")
              : t("auth.signInDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isSignUpMode ? (
            <Form {...signUpForm}>
              <form key="signup-form" onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-5">
                <div className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.emailAddress")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t("auth.enterEmail")}
                            className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("auth.enterPassword")}
                            className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.confirmPassword")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("auth.confirmPasswordPlaceholder")}
                            className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {error && (
                  <div className="flex items-center justify-center p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                    <div className="text-sm text-red-300 [font-family:'Roboto',Helvetica]">{error}</div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t("auth.creatingAccount")}
                    </span>
                  ) : (
                    t("auth.createAccount")
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...loginForm}>
              <form key="login-form" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                <div className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.emailAddress")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t("auth.enterEmail")}
                            className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("auth.enterPassword")}
                            className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {error && (
                  <div className="flex items-center justify-center p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                    <div className="text-sm text-red-300 [font-family:'Roboto',Helvetica]">{error}</div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t("auth.signingIn")}
                    </span>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="pt-6">
            <div className="text-center">
              <p className="text-sm text-[#ffffff99] [font-family:'Roboto',Helvetica]">
                {isSignUpMode ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={handleModeSwitch}
                  disabled={isLoading}
                  className="text-sm font-semibold text-app-primary hover:text-app-primary/80 hover:underline focus:outline-none focus:underline [font-family:'Roboto',Helvetica] transition-colors"
                >
                  {isSignUpMode ? t("auth.signIn") : t("auth.createOne")}
                </button>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};