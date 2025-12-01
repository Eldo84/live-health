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
import { geocodeLocation, detectCountryInText } from "../lib/geocode";
import { geocodeWithOpenCage } from "../lib/opencage";

const alertSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  url: z.string().url("Please enter a valid URL"),
  headline: z.string().min(1, "Headline is required"),
  location: z.string().min(1, "Location is required"),
  date: z.string().min(1, "Date is required"),
  disease: z.string().min(1, "Disease is required"),
  customDisease: z.string().optional(),
  description: z.string().min(1, "Description is required"),
}).refine((data) => {
  // If disease is "custom", customDisease must be provided
  if (data.disease === "custom" && !data.customDisease?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please enter a custom disease name",
  path: ["customDisease"],
});

type AlertFormValues = z.infer<typeof alertSchema>;

interface Disease {
  id: string;
  name: string;
}

interface AddAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAlertDialog: React.FC<AddAlertDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loadingDiseases, setLoadingDiseases] = useState(false);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      email: user?.email || "",
      url: "",
      headline: "",
      location: "",
      date: new Date().toISOString().split("T")[0],
      disease: "",
      customDisease: "",
      description: "",
    },
  });

  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [user, form]);

  // Fetch diseases list
  useEffect(() => {
    if (open) {
      fetchDiseases();
    }
  }, [open]);

  const fetchDiseases = async () => {
    setLoadingDiseases(true);
    try {
      const { data, error } = await supabase
        .from("diseases")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setDiseases(data || []);
    } catch (err: any) {
      console.error("Error fetching diseases:", err);
    } finally {
      setLoadingDiseases(false);
    }
  };

  const onSubmit = async (values: AlertFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Determine the disease name
      const diseaseName = values.disease === "custom" 
        ? values.customDisease!.trim() 
        : diseases.find(d => d.id === values.disease)?.name || values.disease;

      if (!diseaseName) {
        throw new Error("Invalid disease selection");
      }

      // Geocode location
      let coordinates: [number, number] | null = null;
      let countryName: string | null = null;

      // Try local geocoding first
      coordinates = geocodeLocation(values.location);
      if (coordinates) {
        countryName = detectCountryInText(values.location);
      }

      // If local geocoding fails, try OpenCage
      if (!coordinates) {
        coordinates = await geocodeWithOpenCage(values.location);
        if (coordinates) {
          // Try to detect country from location text
          countryName = detectCountryInText(values.location);
        }
      }

      if (!coordinates) {
        throw new Error("Could not geocode the location. Please provide a more specific location (e.g., 'New York, USA' or 'London, UK').");
      }

      // Get or create news source (use a default "User Submitted" source)
      let sourceId: string;
      const { data: existingSource } = await supabase
        .from("news_sources")
        .select("id")
        .eq("name", "User Submitted")
        .maybeSingle();

      if (existingSource) {
        sourceId = existingSource.id;
      } else {
        const { data: newSource, error: sourceError } = await supabase
          .from("news_sources")
          .insert({
            name: "User Submitted",
            url: null,
            type: "user_submission",
            reliability_score: 0.7,
            is_active: true,
          })
          .select("id")
          .single();

        if (sourceError || !newSource) {
          throw new Error("Failed to create news source");
        }
        sourceId = newSource.id;
      }

      // Get or create news article
      const publishedDate = new Date(values.date);
      const { data: existingArticle } = await supabase
        .from("news_articles")
        .select("id")
        .eq("url", values.url)
        .maybeSingle();

      let articleId: string;
      if (existingArticle) {
        articleId = existingArticle.id;
      } else {
        const locationData = {
          country: countryName || values.location,
          lat: coordinates[0],
          lng: coordinates[1],
        };

        const { data: newArticle, error: articleError } = await supabase
          .from("news_articles")
          .insert({
            source_id: sourceId,
            title: values.headline,
            content: values.description,
            url: values.url,
            published_at: publishedDate.toISOString(),
            location_extracted: locationData,
            diseases_mentioned: [diseaseName.toLowerCase()],
            sentiment_score: -0.5, // Default neutral-negative for user submissions
            is_verified: false,
          })
          .select("id")
          .single();

        if (articleError || !newArticle) {
          throw new Error("Failed to create news article: " + (articleError?.message || "Unknown error"));
        }
        articleId = newArticle.id;
      }

      // Get or create disease
      let diseaseId: string;
      const { data: existingDisease } = await supabase
        .from("diseases")
        .select("id")
        .eq("name", diseaseName)
        .maybeSingle();

      if (existingDisease) {
        diseaseId = existingDisease.id;
      } else {
        const { data: newDisease, error: diseaseError } = await supabase
          .from("diseases")
          .insert({
            name: diseaseName,
            severity_level: "medium",
            color_code: "#66dbe1",
            description: values.description,
          })
          .select("id")
          .single();

        if (diseaseError || !newDisease) {
          throw new Error("Failed to create disease: " + (diseaseError?.message || "Unknown error"));
        }
        diseaseId = newDisease.id;
      }

      // Get or create country
      let countryId: string | null = null;
      if (countryName) {
        const { data: existingCountry } = await supabase
          .from("countries")
          .select("id")
          .ilike("name", countryName)
          .maybeSingle();

        if (existingCountry) {
          countryId = existingCountry.id;
        } else {
          // Try to get country code from geocoding result if available
          const { data: newCountry, error: countryError } = await supabase
            .from("countries")
            .insert({
              name: countryName,
              code: countryName.substring(0, 2).toUpperCase(), // Simple fallback
              continent: "Unknown",
              population: 0,
            })
            .select("id")
            .single();

          if (!countryError && newCountry) {
            countryId = newCountry.id;
          }
        }
      }

      // Create outbreak signal
      const { error: signalError } = await supabase
        .from("outbreak_signals")
        .insert({
          article_id: articleId,
          disease_id: diseaseId,
          country_id: countryId,
          latitude: coordinates[0],
          longitude: coordinates[1],
          confidence_score: 0.8, // User submissions have high confidence
          case_count_mentioned: 0,
          severity_assessment: "medium",
          is_new_outbreak: true,
          detected_at: publishedDate.toISOString(),
        });

      if (signalError) {
        throw new Error("Failed to create outbreak signal: " + signalError.message);
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting the alert");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDisease = form.watch("disease");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 bg-[#2a4149] border-[#89898947] max-h-[90vh] overflow-y-auto">
        <DialogClose className="text-white hover:text-white/80" />
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-white [font-family:'Roboto',Helvetica]">
            Add alert
          </DialogTitle>
          <DialogDescription className="text-xs text-[#ffffff99] [font-family:'Roboto',Helvetica]">
            Submit a news story about an outbreak
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
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        disabled
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="Enter the URL of the news story"
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
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Headline
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the headline"
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the location (e.g., 'New York, USA' or 'London, UK')"
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="disease"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Disease
                    </FormLabel>
                    <FormControl>
                      <Select
                        className="h-9 text-sm bg-[#ffffff1a] border-[#ffffff33] text-white focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                        disabled={loadingDiseases}
                      >
                        <option value="" className="bg-[#2a4149] text-white">
                          Select a disease
                        </option>
                        {diseases.map((disease) => (
                          <option key={disease.id} value={disease.id} className="bg-[#2a4149] text-white">
                            {disease.name}
                          </option>
                        ))}
                        <option value="custom" className="bg-[#2a4149] text-white">
                          Add custom disease
                        </option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedDisease === "custom" && (
                <FormField
                  control={form.control}
                  name="customDisease"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Custom Disease Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the disease name"
                        className="h-9 text-sm bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-white [font-family:'Roboto',Helvetica]">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description about the disease outbreak"
                        className="min-h-[70px] text-sm bg-[#ffffff1a] border-[#ffffff33] text-white placeholder:text-[#ffffff66] focus-visible:ring-app-primary [font-family:'Roboto',Helvetica]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="flex items-center justify-center p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                <div className="text-xs text-red-300 [font-family:'Roboto',Helvetica]">{error}</div>
              </div>
            )}

            {success && (
              <div className="flex items-center justify-center p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                <div className="text-xs text-green-300 [font-family:'Roboto',Helvetica]">
                  Alert submitted successfully! The dialog will close shortly.
                </div>
              </div>
            )}

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
                "Submit Alert"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

