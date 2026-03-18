"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ extracted: number; inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResult({ extracted: data.extracted, inserted: data.inserted });
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="label-mono text-foreground/40 mb-1">TOOLS</div>
        <h1 className="text-3xl font-black text-foreground">Import PDF</h1>
      </div>

      <div className="brutalist-box bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-background">
          <div className="label-mono text-foreground/60">BANK STATEMENT</div>
        </div>

        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <label
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-background p-10 cursor-pointer hover:border-blue-primary transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <span className="text-4xl">📄</span>
            {file ? (
              <span className="font-bold text-foreground text-center break-all">{file.name}</span>
            ) : (
              <span className="label-mono text-foreground/50 text-center">
                CLICK TO SELECT A PDF FILE
              </span>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Action */}
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="w-4 h-4" />
                Parsing PDF…
              </span>
            ) : (
              "Import"
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="border-2 border-border bg-background px-4 py-3">
              <div className="label-mono text-foreground/60 mb-1">RESULT</div>
              <div className="font-bold text-foreground">
                {result.inserted} expense{result.inserted !== 1 ? "s" : ""} imported
              </div>
              <div className="label-mono text-foreground/40 mt-0.5">
                {result.extracted} transactions found in PDF
              </div>
            </div>
          )}

          {error && (
            <div className="border-2 border-red-500 bg-background px-4 py-3">
              <div className="label-mono text-red-500 mb-1">ERROR</div>
              <div className="font-bold text-foreground">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
