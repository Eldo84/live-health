import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const OutbreakMap = () => {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  return (
    <>
      <Helmet>
        <title>Live Outbreak Map | OutbreakNow</title>
        <meta name="description" content="Explore real-time global outbreak insights on an interactive map." />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <main className="min-h-screen flex items-center justify-center section">
        <div className="container-prose text-center">
          <h1 className="headline">Live Outbreak Map</h1>
          <p className="subheadline mt-3">Interactive monitoring experience coming next. Meanwhile, return to the homepage or explore partnerships.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link to="/">
              <Button variant="secondary">← Back Home</Button>
            </Link>
            <Link to="/partnership">
              <Button variant="hero">🤝 Become a Partner</Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default OutbreakMap;
