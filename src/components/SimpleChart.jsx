export function BarChart({ data, height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  
  // Add padding to the scale so bars don't reach 100% unless they're actually at max
  const range = maxValue - minValue;
  const paddedMax = maxValue + (range * 0.1); // Add 10% padding at top
  const paddedMin = Math.max(0, minValue - (range * 0.1));

  return (
    <div className="space-y-2">
      {/* Y-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span>{paddedMin.toFixed(0)}%</span>
        <span>{((paddedMax + paddedMin) / 2).toFixed(0)}%</span>
        <span>{paddedMax.toFixed(0)}%</span>
      </div>
      
      <div className="flex items-end justify-around gap-4 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4 border border-gray-100" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = ((item.value - paddedMin) / (paddedMax - paddedMin)) * 100;
          const barHeight = Math.max(percentage, 5); // Minimum 5% height for visibility
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 group">
              <div className="w-full flex items-end justify-center relative" style={{ height: `${height - 60}px` }}>
                {/* Value label on top */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="bg-gray-900 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {item.value.toFixed(1)}%
                  </div>
                  <div className="w-2 h-2 bg-gray-900 transform rotate-45 -mt-1 mx-auto"></div>
                </div>
                
                {/* Bar */}
                <div
                  className="w-full max-w-[80px] bg-gradient-to-t from-cyan-500 via-cyan-400 to-blue-400 rounded-t-xl transition-all duration-300 hover:from-cyan-600 hover:via-cyan-500 hover:to-blue-500 relative shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ 
                    height: `${barHeight}%`,
                    minHeight: '30px'
                  }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20 rounded-t-xl"></div>
                  
                  {/* Value inside bar (visible on hover) */}
                  <span className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.value.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Label */}
              <span className="text-xs text-gray-600 mt-3 font-medium text-center group-hover:text-cyan-600 transition-colors">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-gray-300"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 45 * Math.cos((currentAngle * Math.PI) / 180);
            const y2 = 50 + 45 * Math.sin((currentAngle * Math.PI) / 180);
            const largeArc = angle > 180 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={item.color}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-700">{item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
