import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AddDivisionForm,
  AddDistrictForm,
  AddTownForm,
  AddZoneForm,
  AddDeliveryZoneByRadiusForm,
  AddExclusionZoneForm,
  InlineRenameField,
  DeleteServiceAreaForm,
} from "@/components/admin/location-forms";
import { DeliveryZoneRow } from "@/components/admin/delivery-zone-row";
import { toggleServiceAreaActiveAction, toggleExclusionZoneActiveAction, isServiceAreaDeletable } from "@/lib/actions/admin-locations";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Locations & delivery zones" };

export default async function AdminLocationsPage() {
  const [divisions, districts, towns, serviceAreas, exclusionZones] = await Promise.all([
    db.division.findMany({ orderBy: { name: "asc" } }),
    db.district.findMany({ include: { division: true }, orderBy: { name: "asc" } }),
    db.town.findMany({ orderBy: { name: "asc" } }),
    db.serviceArea.findMany({
      include: {
        town: { include: { district: true } },
        deliveryZones: { include: { neighbourhood: true }, orderBy: { name: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.geographicExclusionZone.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const deletability = new Map(
    await Promise.all(serviceAreas.map(async (area) => [area.id, await isServiceAreaDeletable(area.id)] as const)),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Locations & delivery zones</h1>
        <p className="mt-1 text-sm text-gray-600">
          Expand Pick Up to new areas without any code changes — add the place hierarchy below, then activate it as a
          service area. See also{" "}
          <Link href="/admin/coverage-requests" className="text-brand-primary hover:underline">
            customer coverage requests
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <CardTitle>1. Build the place hierarchy</CardTitle>
          <AddDivisionForm />
          <AddDistrictForm divisions={divisions} />
          <AddTownForm districts={districts.map((d) => ({ id: d.id, name: `${d.name} (${d.division.name})` }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>2. Service areas</CardTitle>
          {serviceAreas.map((area) => (
            <div key={area.id} className="rounded-control border border-border-brand p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">
                    <InlineRenameField kind="serviceArea" id={area.id} defaultValue={area.name} />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    Town: <InlineRenameField kind="town" id={area.town.id} defaultValue={area.town.name} />, {area.town.district.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={area.isActive ? "brand" : "outline"}>{area.isActive ? "Active" : "Inactive"}</Badge>
                  <form action={toggleServiceAreaActiveAction}>
                    <input type="hidden" name="serviceAreaId" value={area.id} />
                    <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                      {area.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  {deletability.get(area.id) && <DeleteServiceAreaForm serviceAreaId={area.id} areaName={area.name} />}
                </div>
              </div>
              {area.deliveryZones.length > 0 && (
                <div className="mt-3 space-y-2">
                  {area.deliveryZones.map((zone) => (
                    <DeliveryZoneRow
                      key={zone.id}
                      zoneId={zone.id}
                      name={zone.name}
                      nameBn={zone.nameBn}
                      deliveryFee={Number(zone.deliveryFee)}
                      estimatedMinutesMin={zone.estimatedMinutesMin}
                      estimatedMinutesMax={zone.estimatedMinutesMax}
                      isActive={zone.isActive}
                    />
                  ))}
                </div>
              )}
              <AddZoneForm serviceAreaId={area.id} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>3. Add a delivery zone by radius</CardTitle>
          <p className="text-sm text-gray-600">
            For coverage areas defined by a simple radius around a point rather than a named neighbourhood — the
            circle is saved as the zone&apos;s boundary polygon.
          </p>
          <AddDeliveryZoneByRadiusForm towns={towns.map((t) => ({ id: t.id, name: t.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>Geographic exclusion zones</CardTitle>
          <p className="text-sm text-gray-600">Age-restricted products cannot be delivered within these radii (schools, hospitals, etc.).</p>
          <AddExclusionZoneForm />
          <div className="space-y-2">
            {exclusionZones.map((zone) => (
              <div key={zone.id} className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm">
                <span>
                  {zone.name} · {zone.category.replaceAll("_", " ")} · {zone.radiusMeters}m
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={zone.isActive ? "brand" : "outline"}>{zone.isActive ? "Active" : "Inactive"}</Badge>
                  <form action={toggleExclusionZoneActiveAction}>
                    <input type="hidden" name="zoneId" value={zone.id} />
                    <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                      {zone.isActive ? "Disable" : "Enable"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
