import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "../components/ui/button";
import { PasswordInput } from "../components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";

type ResetFormValues = {
  password: string;
  confirmPassword: string;
};

/**
 * Landing page for the password-reset email link. Supabase's client
 * (detectSessionInUrl) consumes the recovery token in the URL hash on load and
 * fires a PASSWORD_RECOVERY auth event, granting a short-lived session that lets
 * updateUser({ password }) set a new password. We gate the form on that session
 * so a stale / already-consumed link shows a clear "expired" message instead of
 * a silent failure.
 */
export const ResetPasswordScreen: React.FC = () => {
  const { updatePassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // null = still checking, true = valid recovery session, false = no/expired link
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setHasSession(true);
      }
    });

    // The hash may already be processed by the time we mount — check directly too.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!settled) setHasSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetSchema = z.object({
    password: z.string().min(6, t("auth.passwordTooShort")),
    confirmPassword: z.string().min(6, t("auth.passwordTooShort")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("auth.passwordsDontMatch"),
    path: ["confirmPassword"],
  });

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await updatePassword(values.password);
      if (error) {
        setError(error.message);
      } else {
        setDone(true);
      }
    } catch (err: any) {
      setError(err.message || t("auth.resetError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b2c32] px-4">
      <Helmet>
        <title>{t("auth.resetPassword")} | OutbreakNow</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="w-full max-w-md p-8 bg-[#2a4149] border border-[#89898947] rounded-2xl shadow-xl">
        <div className="space-y-2 text-center mb-6">
          <h1 className="text-2xl font-bold text-white [font-family:'Roboto',Helvetica]">
            {t("auth.resetPassword")}
          </h1>
          <p className="text-sm text-[#ffffff99] [font-family:'Roboto',Helvetica]">
            {done ? t("auth.passwordResetSuccess") : t("auth.enterNewPassword")}
          </p>
        </div>

        {done ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-app-primary/10 border border-app-primary/40 rounded-xl">
              <svg className="w-5 h-5 mt-0.5 shrink-0 text-app-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-white [font-family:'Roboto',Helvetica]">
                {t("auth.passwordResetSuccess")}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/map")}
              className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold"
            >
              {t("auth.continueToApp")}
            </Button>
          </div>
        ) : hasSession === false ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
              <div className="text-sm text-red-300 text-center [font-family:'Roboto',Helvetica]">
                {t("auth.resetLinkExpired")}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/map")}
              className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold"
            >
              {t("auth.backToLogin")}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.newPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("auth.enterNewPasswordPlaceholder")}
                        className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white [font-family:'Roboto',Helvetica]">{t("auth.confirmPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        className="h-11 text-base bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="flex items-center justify-center p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                  <div className="text-sm text-red-300 [font-family:'Roboto',Helvetica]">{error}</div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold"
                disabled={isLoading || hasSession === null}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("auth.updatingPassword")}
                  </span>
                ) : (
                  t("auth.updatePassword")
                )}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
