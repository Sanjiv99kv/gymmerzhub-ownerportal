import { City, State } from "country-state-city";

const INDIA_COUNTRY_CODE = "IN";

export type IndiaStateOption = {
  isoCode: string;
  name: string;
};

export type IndiaCityOption = {
  name: string;
};

export function getIndiaStates(): IndiaStateOption[] {
  return State.getStatesOfCountry(INDIA_COUNTRY_CODE)
    .map((state) => ({
      isoCode: state.isoCode,
      name: state.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getIndiaCitiesByStateCode(stateCode: string): IndiaCityOption[] {
  if (!stateCode) return [];
  const cities = City.getCitiesOfState(INDIA_COUNTRY_CODE, stateCode) ?? [];
  const unique = new Map<string, IndiaCityOption>();
  for (const city of cities) {
    if (!city?.name) continue;
    unique.set(city.name, { name: city.name });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}
