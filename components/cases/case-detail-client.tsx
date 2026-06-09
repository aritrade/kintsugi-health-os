"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseView } from "@/components/cases/case-view";
import { Download, Printer, Trash2 } from "lucide-react";
import type { CaseContent } from "@/server/cases/build";

export function CaseDetailClient({
  id,
  title,
  content,
}: {
  id: string;
  title: string;
  content: CaseContent;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function del() {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/v1/cases/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/cases");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <main className="space-y-5 p-6">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/v1/cases/${id}/export?format=md`}>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4" /> Markdown
          </Button>
        </a>
        <a href={`/api/v1/cases/${id}/export?format=json`}>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4" /> JSON
          </Button>
        </a>
        <a href={`/cases/${id}/print`} target="_blank" rel="noopener noreferrer">
          <Button size="sm">
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </a>
        <Button size="sm" variant="outline" onClick={del} disabled={deleting} className="ml-auto">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardContent className="py-6">
          <CaseView title={title} content={content} />
        </CardContent>
      </Card>
    </main>
  );
}
