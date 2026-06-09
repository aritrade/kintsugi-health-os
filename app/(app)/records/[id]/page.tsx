import { RecordDetailClient } from "@/components/vault/record-detail-client";

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordDetailClient recordId={id} />;
}
