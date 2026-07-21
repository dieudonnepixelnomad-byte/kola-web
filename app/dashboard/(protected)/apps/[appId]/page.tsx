import { AppDetail } from "./AppDetail";

export default async function AppDetailPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  return <AppDetail appId={appId} />;
}
