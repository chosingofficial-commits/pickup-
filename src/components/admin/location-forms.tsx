"use client";

import { useActionState } from "react";
import {
  createDivisionAction,
  createDistrictAction,
  createUpazilaAction,
  createTownAction,
  createNeighbourhoodWithZoneAction,
  createDeliveryZoneByRadiusAction,
  createExclusionZoneAction,
} from "@/lib/actions/admin-locations";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { RadiusZonePicker } from "@/components/maps/radius-zone-picker";

type Option = { id: string; name: string };

function Result({ state }: { state: { status: string; message?: string } }) {
  if (state.status === "success") return <p className="text-xs text-brand-primary">{state.message}</p>;
  if (state.status === "error") return <p className="text-xs text-red-600">{state.message}</p>;
  return null;
}

export function AddDivisionForm() {
  const [state, formAction] = useActionState(createDivisionAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="division-name">New division</Label>
        <Input id="division-name" name="name" placeholder="E.g. Chattogram" required />
      </div>
      <SubmitButton className="w-auto px-4">Add</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function AddDistrictForm({ divisions }: { divisions: Option[] }) {
  const [state, formAction] = useActionState(createDistrictAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="district-division">Division</Label>
        <Select id="district-division" name="divisionId" defaultValue="" required>
          <option value="" disabled>
            Select division
          </option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="district-name">New district</Label>
        <Input id="district-name" name="name" placeholder="E.g. Khagrachari" required />
      </div>
      <SubmitButton className="w-auto px-4">Add</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function AddUpazilaForm({ districts }: { districts: Option[] }) {
  const [state, formAction] = useActionState(createUpazilaAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="upazila-district">District</Label>
        <Select id="upazila-district" name="districtId" defaultValue="" required>
          <option value="" disabled>
            Select district
          </option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="upazila-name">New upazila</Label>
        <Input id="upazila-name" name="name" placeholder="E.g. Khagrachari Sadar" required />
      </div>
      <SubmitButton className="w-auto px-4">Add</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function AddTownForm({ upazilas }: { upazilas: Option[] }) {
  const [state, formAction] = useActionState(createTownAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="town-upazila">Upazila</Label>
        <Select id="town-upazila" name="upazilaId" defaultValue="" required>
          <option value="" disabled>
            Select upazila
          </option>
          {upazilas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="town-name">New town / service area</Label>
        <Input id="town-name" name="name" placeholder="E.g. Rangamati Sadar" required />
      </div>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-gray-700">
        <input type="checkbox" name="activateNow" value="1" />
        Activate immediately
      </label>
      <SubmitButton className="w-auto px-4">Add town</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function AddNeighbourhoodForm({ towns }: { towns: Option[] }) {
  const [state, formAction] = useActionState(createNeighbourhoodWithZoneAction, initialActionState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="nb-town">Town</Label>
        <Select id="nb-town" name="townId" defaultValue="" required>
          <option value="" disabled>
            Select town
          </option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="nb-name">Neighbourhood name</Label>
        <Input id="nb-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="nb-fee">Delivery fee (৳)</Label>
        <Input id="nb-fee" name="deliveryFee" type="number" min="0" step="1" required />
      </div>
      <div>
        <Label htmlFor="nb-min">Min ETA (minutes)</Label>
        <Input id="nb-min" name="estimatedMinutesMin" type="number" min="1" defaultValue={20} required />
      </div>
      <div>
        <Label htmlFor="nb-max">Max ETA (minutes)</Label>
        <Input id="nb-max" name="estimatedMinutesMax" type="number" min="1" defaultValue={35} required />
      </div>
      <div>
        <Label htmlFor="nb-lat">Centre latitude (optional)</Label>
        <Input id="nb-lat" name="centerLat" type="number" step="0.000001" />
      </div>
      <div>
        <Label htmlFor="nb-lng">Centre longitude (optional)</Label>
        <Input id="nb-lng" name="centerLng" type="number" step="0.000001" />
      </div>
      <div className="flex items-end">
        <SubmitButton className="w-auto px-5">Add neighbourhood & zone</SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <Result state={state} />
      </div>
    </form>
  );
}

export function AddDeliveryZoneByRadiusForm({ towns }: { towns: Option[] }) {
  const [state, formAction] = useActionState(createDeliveryZoneByRadiusAction, initialActionState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="dzr-town">Town</Label>
        <Select id="dzr-town" name="townId" defaultValue="" required>
          <option value="" disabled>
            Select town
          </option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="dzr-name">Zone name</Label>
        <Input id="dzr-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="dzr-fee">Delivery fee (৳)</Label>
        <Input id="dzr-fee" name="deliveryFee" type="number" min="0" step="1" required />
      </div>
      <div>
        <Label htmlFor="dzr-min">Min ETA (minutes)</Label>
        <Input id="dzr-min" name="estimatedMinutesMin" type="number" min="1" defaultValue={20} required />
      </div>
      <div>
        <Label htmlFor="dzr-max">Max ETA (minutes)</Label>
        <Input id="dzr-max" name="estimatedMinutesMax" type="number" min="1" defaultValue={35} required />
      </div>

      <RadiusZonePicker
        latName="centerLat"
        lngName="centerLng"
        radiusName="radiusMeters"
        defaultLat={23.10478}
        defaultLng={91.98124}
        defaultRadiusMeters={2235}
      />

      <div className="flex items-end">
        <SubmitButton className="w-auto px-5">Add radius zone</SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <Result state={state} />
      </div>
    </form>
  );
}

const EXCLUSION_CATEGORIES = ["SCHOOL", "HOSPITAL", "CLINIC", "CHILDRENS_PARK", "PLAYGROUND", "SPORTS_VENUE", "OTHER"];

export function AddExclusionZoneForm() {
  const [state, formAction] = useActionState(createExclusionZoneAction, initialActionState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="ez-name">Name</Label>
        <Input id="ez-name" name="name" placeholder="E.g. Khagrachari Govt. High School" required />
      </div>
      <div>
        <Label htmlFor="ez-category">Category</Label>
        <Select id="ez-category" name="category" defaultValue="SCHOOL">
          {EXCLUSION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <RadiusZonePicker latName="centerLat" lngName="centerLng" radiusName="radiusMeters" defaultRadiusMeters={100} />
      <div className="flex items-end">
        <SubmitButton className="w-auto px-5">Add exclusion zone</SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <Result state={state} />
      </div>
    </form>
  );
}
