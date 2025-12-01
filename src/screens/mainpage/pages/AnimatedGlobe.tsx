import React from "react";

const AnimatedGlobe: React.FC = () => {
  return (
    <div aria-hidden className="globe-wrap">
      <div className="stars" />
      <div className="globe animate-spin-slower" />
    </div>
  );
};

export default AnimatedGlobe;
