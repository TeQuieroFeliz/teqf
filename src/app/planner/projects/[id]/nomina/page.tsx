import { redirect } from 'next/navigation';

// Nomina is embedded in the project hub tab at /planner/projects/[id]
export default async function NominaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/planner/projects/${id}`);
}
