"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, Layers, Zap, TrendingUp, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalUsers: number;
  usersToday: number;
  totalWorkspaces: number;
  workspacesToday: number;
  totalVersions: number;
  versionsToday: number;
  planBreakdown: { plan: string; count: number }[];
  signupsByDay: { date: string; count: number }[];
  gensByDay: { date: string; count: number }[];
  recentUsers: {
    name: string;
    email: string;
    plan: string;
    credits: number;
    createdAt: string;
  }[];
  topPrompts: { prompt: string; count: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0f0f0f] p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, borderColor: `${color}25` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white/90">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/25">{sub}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => setStats(data as Stats))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-red-400/60">{error ?? "Failed to load"}</p>
      </div>
    );
  }

  const planColors: Record<string, string> = {
    free: "#a1a1aa",
    starter: "#3b82f6",
    pro: "#a78bfa",
  };

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          sub={`+${stats.usersToday} today`}
          color="#3b82f6"
        />
        <StatCard
          icon={Layers}
          label="Total Projects"
          value={stats.totalWorkspaces}
          sub={`+${stats.workspacesToday} today`}
          color="#10b981"
        />
        <StatCard
          icon={Zap}
          label="Total Generations"
          value={stats.totalVersions}
          sub={`+${stats.versionsToday} today`}
          color="#f59e0b"
        />
        <StatCard
          icon={TrendingUp}
          label="Plan Distribution"
          value={stats.totalUsers}
          sub={stats.planBreakdown
            .map((p) => `${p.plan}: ${p.count}`)
            .join(" · ")}
          color="#a78bfa"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Signups chart */}
        <div className="rounded-xl border border-white/8 bg-[#0f0f0f] p-5">
          <p className="mb-4 text-sm font-medium text-white/60">
            User Signups (30 days)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.signupsByDay}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#signupGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Generations chart */}
        <div className="rounded-xl border border-white/8 bg-[#0f0f0f] p-5">
          <p className="mb-4 text-sm font-medium text-white/60">
            AI Generations (30 days)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.gensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-xl border border-white/8 bg-[#0f0f0f] p-5">
          <p className="mb-4 text-sm font-medium text-white/60">
            Recent Users
          </p>
          <div className="space-y-3">
            {stats.recentUsers.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-white/4 pb-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/70">
                    {u.name}
                  </p>
                  <p className="truncate text-[10px] text-white/25">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: `${planColors[u.plan] ?? "#666"}15`,
                      color: planColors[u.plan] ?? "#666",
                    }}
                  >
                    {u.plan}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {formatDistanceToNow(new Date(u.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top prompts */}
        <div className="rounded-xl border border-white/8 bg-[#0f0f0f] p-5">
          <p className="mb-4 text-sm font-medium text-white/60">
            Popular Prompts
          </p>
          <div className="space-y-3">
            {stats.topPrompts.length === 0 ? (
              <p className="text-xs text-white/20">No prompts yet</p>
            ) : (
              stats.topPrompts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border-b border-white/4 pb-3 last:border-0"
                >
                  <p className="line-clamp-2 text-xs text-white/50 leading-relaxed">
                    {p.prompt}
                  </p>
                  <span className="shrink-0 rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-medium text-white/30">
                    {p.count}×
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
