'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface DifficultyDistribution {
  difficulty_level: 'easy' | 'medium' | 'tough';
  count: number;
}

interface AnalyticsStats {
  total_quizzes: number;
  total_questions: number;
  total_users: number;
  difficulty_distribution: DifficultyDistribution[];
}

const DifficultyChart = ({ data }: { data: DifficultyDistribution[] }) => {
  const maxCount = Math.max(...data.map(d => d.count), 0);
  const chartHeight = 200;

  const getBarColor = (level: string) => {
    switch (level) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'tough':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex justify-around items-end h-64 p-4 border rounded-lg">
      {data.map((item) => (
        <div key={item.difficulty_level} className="flex flex-col items-center">
          <div
            className={`w-16 ${getBarColor(item.difficulty_level)}`}
            style={{ height: `${(item.count / (maxCount || 1)) * chartHeight}px` }}
          ></div>
          <span className="mt-2 text-sm font-medium">{item.difficulty_level}</span>
          <span className="text-xs text-gray-500">{item.count}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_analytics');
      if (error) {
        console.error(error);
      } else {
        setStats(data);
      }
    };

    fetchStats();
  }, [supabase]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Total Quizzes</h2>
            <p className="text-3xl font-bold">{stats.total_quizzes}</p>
          </div>
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Total Questions</h2>
            <p className="text-3xl font-bold">{stats.total_questions}</p>
          </div>
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Total Users</h2>
            <p className="text-3xl font-bold">{stats.total_users}</p>
          </div>
          <div className="bg-white shadow-md rounded p-4 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-lg font-bold mb-2">Question Difficulty Distribution</h2>
            {stats.difficulty_distribution && <DifficultyChart data={stats.difficulty_distribution} />}
          </div>
        </div>
      )}
    </div>
  );
}
