import AddLocationDialog from "@/components/admin/location/AddLocationDialog";
import {
  getLocation,
  editLocation,
  deleteLocation,
} from "@/actions/location/location-crud";
import LocationTable from "@/components/admin/location/LocationTable";

export const dynamic = "force-dynamic";

export default async function LocationPage() {
  const cities = await getLocation();

  return (
    <div className="space-y-6">
      <AddLocationDialog />
      <LocationTable
        locations={cities}
        onEdit={editLocation as any}
        onDelete={deleteLocation as any}
      />
    </div>
  );
}
