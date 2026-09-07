import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { PageHeader } from "@/components/ui/page-header";
import { getProperty } from "@/lib/data";

export default async function EditPropertyPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const property = await getProperty(propertyId);
  if (!property) notFound();
  return <div className="grid gap-7"><PageHeader title={`Edit ${property.name}`} description="Update the property details. Existing units and surveys are preserved." /><PropertyForm propertyId={propertyId} initialValues={{ name: property.name, buildingName: property.buildingName, propertyType: property.propertyType as "House" | "Bungalow" | "Flat" | "Maisonette" | "Park home" | undefined, addressLine1: property.addressLine1, addressLine2: property.addressLine2, town: property.town, postcode: property.postcode, constructionYear: property.constructionYear, numberOfStoreys: property.numberOfStoreys, reference: property.reference }} /></div>;
}
