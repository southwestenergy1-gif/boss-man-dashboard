import React from 'react';

export default function BusinessSelector({ businesses, active, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(businesses).map(([key, business]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all duration-200 border ${
            active === key
              ? 'bg-slate-800 text-slate-50 border-slate-700'
              : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-300 hover:border-slate-600'
          }`}
          style={{
            borderColor: active === key ? business.color : undefined,
            backgroundColor: active === key ? `${business.color}15` : undefined
          }}
        >
          <span className="flex items-center gap-2">
            <span>{business.icon}</span>
            {business.name}
          </span>
        </button>
      ))}
    </div>
  );
}
