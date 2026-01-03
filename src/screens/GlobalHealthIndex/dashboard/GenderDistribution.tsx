import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface GenderDistributionProps { title: string; malePercentage?: number; femalePercentage?: number; }

export const GenderDistribution = ({ title, malePercentage = 48, femalePercentage = 52 }: GenderDistributionProps) => {
  const data = [
    { name: 'Male', value: malePercentage, color: 'hsl(199, 89%, 48%)' },
    { name: 'Female', value: femalePercentage, color: 'hsl(320, 70%, 55%)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;
    return (<div className="bg-background/95 backdrop-blur-none rounded-lg p-2 shadow-2xl border-2 border-primary/30 text-[10px] sm:text-xs"><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="font-bold text-foreground">{item.name}: {item.value}%</span></div></div>);
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '350ms' }}>
      <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-4">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-[120px] h-[120px] sm:w-[160px] sm:h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={4} dataKey="value" stroke="none">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Total</span>
            <span className="text-sm sm:text-lg font-semibold font-mono">100%</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 sm:gap-6 mt-2 sm:mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="text-[10px] sm:text-xs">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="ml-1 font-mono font-medium">{item.value}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
