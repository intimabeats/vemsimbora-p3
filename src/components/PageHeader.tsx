import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  actions 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          {Icon && (
            <div className="mr-4 p-3 bg-blue-50 text-blue-600 rounded-full hidden md:flex">
              <Icon size={24} />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center">
              {Icon && <Icon className="md:hidden mr-2 text-blue-600" size={24} />}
              {title}
            </h1>
            {description && (
              <p className="text-gray-500 text-sm mt-1 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="w-full md:w-auto mt-4 md:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
