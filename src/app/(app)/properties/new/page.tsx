import { PageHeader } from "@/components/ui/page-header";
import { PropertyForm } from "@/components/properties/property-form";
export const metadata = { title: "Add property" };
export default function NewPropertyPage() { return <div className="grid gap-7"><PageHeader title="Add property" description="Create the building record before adding flats, rooms or units." /><PropertyForm /></div>; }
