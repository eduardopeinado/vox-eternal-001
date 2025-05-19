import React from 'react';

interface DashboardCardProps {
  icon: React.ElementType;
  title: string;
  value?: string | number;
  description: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ icon: Icon, title, value, description }) => {
  return (
    <div 
      className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ease-in-out group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 bg-dorado-claro/20 rounded-full mr-4 group-hover:bg-dorado-claro/30 transition-colors">
            <Icon className="w-6 h-6 text-dorado-claro" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-semibold font-serif text-azul-profundo">
            {title}
          </h2>
        </div>
        {value !== undefined && (
          <span className="text-3xl font-bold text-azul-profundo/90 font-sans">
            {value}
          </span>
        )}
      </div>
      <p className="text-sm font-sans text-azul-profundo/80 mt-1">
        {description}
      </p>
    </div>
  );
};

export default DashboardCard; 