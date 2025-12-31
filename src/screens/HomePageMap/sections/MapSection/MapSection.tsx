export const MapSection = (): JSX.Element => {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 flex items-center justify-center rounded bg-[#23313c] hover:bg-[#28424f] text-white text-lg font-semibold transition-colors border border-[#EAEBF024]"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded bg-[#23313c] hover:bg-[#28424f] text-white text-lg font-semibold transition-colors border border-[#EAEBF024]"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>

    </div>
  );
};
