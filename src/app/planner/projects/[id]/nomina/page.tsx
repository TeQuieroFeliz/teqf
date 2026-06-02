import { redirect } from 'next/navigation';

// Nomina is embedded in the project hub tab at /planner/projects/[id]
export default function NominaPage({ params }: { params: { id: string } }) {
  redirect(`/planner/projects/${params.id}`);
}
