"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Link as LinkIcon,
  Code2,
  TrendingUp,
  Zap,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  Globe,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/lib/stats";

export function DashboardView() {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const totalLinks = stats?.totalLinks ?? 0;
  const webLinks = stats?.webLinks ?? 0;
  const apiLinks = stats?.apiLinks ?? 0;
  const webPercentage = totalLinks > 0 ? Math.round((webLinks / totalLinks) * 100) : 0;
  const apiPercentage = totalLinks > 0 ? 100 - webPercentage : 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("operational")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Links */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("totalLinks")}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? "..." : totalLinks.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{stats?.todayLinks ?? 0} hoje
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: API Usage */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("totalApiCalls")}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? "..." : (stats?.totalApiCalls ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                +{stats?.todayApiCalls ?? 0} hoje
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Today Links */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("todayLinks")}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? "..." : (stats?.todayLinks ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Gerados nas últimas 24h
            </p>
          </div>
        </div>

        {/* Card 4: Today API Calls */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("todayApiCalls")}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {loading ? "..." : (stats?.todayApiCalls ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Chamadas API nas últimas 24h
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Section: Link Generation Channel Share */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            {t("linkDistribution")}
          </h2>
          <span className="text-xs text-muted-foreground">
            Web vs API
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 flex overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${webPercentage}%` }}
          />
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${apiPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">{t("webShare")}</div>
              <div className="text-sm font-bold text-foreground">
                {webLinks.toLocaleString()} ({webPercentage}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">{t("apiShare")}</div>
              <div className="text-sm font-bold text-foreground">
                {apiLinks.toLocaleString()} ({apiPercentage}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Endpoint Distribution & 7-Day Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Distribution Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                {t("endpointDistribution")}
              </h2>
            </div>

            {Object.keys(stats?.endpointBreakdown || {}).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(stats?.endpointBreakdown || {}).map(([ep, count]) => {
                  const maxCount = Math.max(...Object.values(stats?.endpointBreakdown || {}), 1);
                  const barWidth = Math.round((count / maxCount) * 100);
                  return (
                    <div key={ep} className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between font-mono font-medium text-foreground">
                        <span>/api/v1/{ep}</span>
                        <span className="text-muted-foreground">{count.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 7-Day History Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                {t("recentActivity")}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="pb-2">Data</th>
                    <th className="pb-2 text-right">Links Gerados</th>
                    <th className="pb-2 text-right">Chamadas API</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats?.dailyHistory.map((item) => (
                    <tr key={item.date} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 font-mono text-foreground">{item.date}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.links.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {item.apiCalls.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {stats?.lastUpdated && (
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground text-right">
              {t("lastUpdated")}: {new Date(stats.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
