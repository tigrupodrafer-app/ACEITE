import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function StatsCards({ icon: Icon, title, value, color }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <Icon className={`w-8 h-8 ${color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );
}