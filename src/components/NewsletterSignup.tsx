import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

/**
 * NewsletterSignup component - newsletter subscription form
 */
const NewsletterSignup = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        title: "Please enter a valid email",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Thanks for subscribing!",
      description: "You'll receive updates about OutbreakNow.",
    });
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground">Stay Updated</h4>
      <p className="text-sm text-muted-foreground">
        Get the latest outbreak intelligence and platform updates.
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" aria-label="Subscribe">
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewsletterSignup;

