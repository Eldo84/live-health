import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

const feedbackSchema = z.object({
  email: z.union([
    z.string().email("Please enter a valid email address"),
    z.literal("")
  ]).optional(),
  feedbackType: z.enum(["bug", "feature", "suggestion", "general"], {
    required_error: "Please select a feedback type",
  }),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      email: user?.email || "",
      feedbackType: undefined,
      message: "",
    },
  });

  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    } else {
      form.setValue("email", "");
    }
  }, [user, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        email: user?.email || "",
        feedbackType: undefined,
        message: "",
      });
    }
  }, [open, user, form]);

  const onSubmit = async (values: FeedbackFormValues) => {
    setIsLoading(true);

    try {
      // Use user email if authenticated, otherwise use provided email or "anonymous@outbreaknow.org"
      const emailToUse = user?.email || values.email || "anonymous@outbreaknow.org";

      // Save feedback submission
      const { error: submissionError } = await supabase
        .from("user_feedback")
        .insert({
          user_id: user?.id || null,
          user_email: emailToUse,
          feedback_type: values.feedbackType,
          message: values.message,
          status: "new",
        });

      if (submissionError) {
        throw new Error("Failed to submit feedback: " + submissionError.message);
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it and get back to you if needed.",
        variant: "default",
      });

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
      }, 1500);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred while submitting feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 bg-[#2a4149] border-[#89898947] max-h-[90vh] overflow-y-auto">
        <DialogClose className="text-white hover:text-white/80" />
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-white [font-family:'Roboto',Helvetica]">
            Send Feedback
          </DialogTitle>
          <DialogDescription className="text-xs text-[#ffffff99] [font-family:'Roboto',Helvetica]">
            Help us improve by sharing your feedback, reporting bugs, or suggesting new features
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Email {!user && <span className="text-[#ffffff66]">(optional)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        disabled={!!user} // Disable if user is authenticated
                        className="h-9 text-sm bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Feedback Type
                    </FormLabel>
                    <FormControl>
                      <Select
                        className="h-9 text-sm bg-[#ffffff1a] border-[#ffffff33] text-white focus-visible:ring-app-primary [font-family:'Roboto',Helvetica] [&>option]:bg-[#2a4149] [&>option]:text-white"
                        {...field}
                      >
                        <option value="" className="bg-[#2a4149] text-white">
                          Select feedback type
                        </option>
                        <option value="bug" className="bg-[#2a4149] text-white">
                          Bug Report
                        </option>
                        <option value="feature" className="bg-[#2a4149] text-white">
                          Feature Request
                        </option>
                        <option value="suggestion" className="bg-[#2a4149] text-white">
                          Suggestion
                        </option>
                        <option value="general" className="bg-[#2a4149] text-white">
                          General Feedback
                        </option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Message
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your feedback, bug report, or feature request in detail..."
                        className="min-h-[120px] text-sm bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-sm bg-app-primary border border-[#4eb7bd] hover:bg-app-primary/90 text-white [font-family:'Roboto',Helvetica] font-semibold"
              disabled={isLoading}
            >
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
                  Submitting...
                </span>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

