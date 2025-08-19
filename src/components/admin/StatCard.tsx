import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export const StatCard = ({ title, value, icon: Icon, description }: StatCardProps) => {
  return (
    <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm hover:shadow-lg transition-all duration-200 rounded-xl group">
      <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
          <div className="p-2 bg-gradient-to-r from-amber/10 to-orange/10 border border-amber/20 rounded-lg group-hover:from-amber/20 group-hover:to-orange/20 transition-all duration-200">
            <Icon className="h-4 w-4 text-amber group-hover:text-orange transition-colors duration-200" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        {description && (
          <p className="text-xs text-gray-600">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
