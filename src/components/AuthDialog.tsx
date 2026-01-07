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
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || t("auth.googleLoginError"));
    } finally {
      setIsGoogleLoading(false);
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

                <Button type="submit" className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold" disabled={isLoading || isGoogleLoading}>
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

                <Button type="submit" className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold" disabled={isLoading || isGoogleLoading}>
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

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#ffffff33]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#2a4149] px-2 text-[#ffffff99] [font-family:'Roboto',Helvetica]">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full h-11 text-base bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 [font-family:'Roboto',Helvetica] font-semibold flex items-center justify-center gap-2"
          >
            {isGoogleLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isGoogleLoading ? t("auth.signingInWithGoogle") : t("auth.continueWithGoogle")}
          </Button>

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