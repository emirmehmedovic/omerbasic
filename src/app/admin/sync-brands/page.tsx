"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Terminal, X } from "lucide-react";

type LogEntry = {
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  timestamp: string;
};

type ProgressData = {
  processedCount: number;
  updatedCount: number;
  errorCount: number;
  totalProducts: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
};

export default function SyncBrandsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    totalProducts?: number;
    updatedCount?: number;
    skippedCount?: number;
    errorCount?: number;
    message?: string;
  } | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    setLogs([]);
    setProgress(null);

    // Create AbortController for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/admin/sync-vehicle-brands", {
        method: "POST",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'complete') {
              setResult({
                success: true,
                ...data.data,
              });
            } else if (data.type === 'error') {
              setResult({
                success: false,
                message: data.data.error,
              });
            } else if (data.type === 'progress') {
              setProgress(data.data);
            } else {
              // Log message
              setLogs(prev => [...prev, {
                type: data.type,
                message: data.message,
                timestamp: data.timestamp
              }]);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setLogs(prev => [...prev, {
          type: 'error',
          message: '❌ Synchronization cancelled by user',
          timestamp: new Date().toISOString()
        }]);
      } else {
        setResult({
          success: false,
          message: error.message || "Greška pri komunikaciji sa serverom",
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'progress':
        return 'text-blue-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Sinhronizacija Vehicle Brands
        </h1>
        <p className="text-gray-600 mt-2">
          Ažuriraj compatible brands za sve proizvode na osnovu vehicle fitments
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Kada koristiti
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-7">
              <li>• Nakon importa novih vehicle fitments</li>
              <li>• Nakon ručnog dodavanja fitments-a u bazi</li>
              <li>• Ako primjetiš da neki proizvodi ne prikazuju brendove</li>
            </ul>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
              <div className="text-sm text-slate-600 font-medium">Ukupno proizvoda</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {progress?.totalProducts?.toLocaleString() || '24,617'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Obrađeno</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {progress?.processedCount?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 font-medium">Ažurirano</div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {progress?.updatedCount?.toLocaleString() || '0'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress: {progress.percentage}%</span>
                <span>Batch {progress.currentBatch}/{progress.totalBatches}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Terminal Log Output */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Terminal className="w-4 h-4" />
                  <span>Sync Log</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
              <div
                ref={logContainerRef}
                className="bg-gray-900 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto border-2 border-gray-700 shadow-inner"
              >
                {logs.map((log, index) => (
                  <div key={index} className={`${getLogColor(log.type)} mb-1`}>
                    <span className="text-gray-500 text-xs mr-2">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    {log.message}
                  </div>
                ))}
                {isLoading && (
                  <div className="text-gray-400 animate-pulse">
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-blink">▊</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              onClick={handleSync}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-amber via-orange to-brown hover:opacity-90 text-white px-8 py-6 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sinhronizacija u toku...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Pokreni Sinhronizaciju
                </>
              )}
            </Button>

            {isLoading && (
              <Button
                onClick={handleCancel}
                size="lg"
                variant="destructive"
                className="px-8 py-6 text-lg"
              >
                <X className="w-5 h-5 mr-2" />
                Otkaži
              </Button>
            )}
          </div>

          {/* Result Section */}
          {result && !isLoading && (
            <div
              className={`rounded-lg p-6 border-2 ${
                result.success
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-bold text-lg mb-3 ${
                      result.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {result.success
                      ? "✅ Sinhronizacija uspješna!"
                      : "❌ Greška pri sinhronizaciji"}
                  </h3>

                  {result.success && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-green-600 font-medium">
                          Ukupno
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {result.totalProducts?.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-green-600 font-medium">
                          Ažurirano
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {result.updatedCount?.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-green-600 font-medium">
                          Preskočeno
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {result.skippedCount?.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-green-600 font-medium">
                          Greške
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {result.errorCount}
                        </div>
                      </div>
                    </div>
                  )}

                  {!result.success && result.message && (
                    <p className="text-red-800 mt-2">{result.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Technical Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-slate-900 mb-2">
              Tehnički detalji:
            </h4>
            <ul className="text-slate-700 space-y-1">
              <li>
                • Proces prolazi kroz sve proizvode u batch-evima od 100
              </li>
              <li>
                • Ekstraktuje unique vehicle brands iz ProductVehicleFitment
                tabele
              </li>
              <li>
                • Ažurira Product.compatibleBrands relaciju (many-to-many)
              </li>
              <li>
                • Real-time streaming progress sa Server-Sent Events
              </li>
              <li>
                • Prosječno vrijeme: ~5-10 minuta za 24k proizvoda
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  );
}
