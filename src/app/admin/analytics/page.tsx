'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AnalyticsPage() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState<any>(null);

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
            {/* Chart will go here */}
          </div>
        </div>
      )}
    </div>
  );
}
