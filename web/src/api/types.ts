export type LocationMethod = "GPS" | "MAP_PIN" | "ADDRESS_SEARCH";

export type BlockedType = "BIKE_LANE" | "BUS_LANE" | "FIRE_HYDRANT" | "CROSSWALK" | "OTHER";

export type VehicleType =
  | "COMMERCIAL_VEHICLE"
  | "RIDESHARE_DELIVERY"
  | "PERSONAL_VEHICLE"
  | "OTHER";

export interface ReportPoint {
  id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  reportedAt: string;
}

// All optional — a report is already complete with just a location, so none
// of this supplementary detail should ever be required to submit one.
export interface ReportDetails {
  blockedType?: BlockedType;
  blockedTypeOther?: string;
  vehicleType?: VehicleType;
  vehicleTypeOther?: string;
  // Base64 image data URL (e.g. "data:image/jpeg;base64,...").
  photo?: string;
}

export interface CreateReportInput extends ReportDetails {
  latitude: number;
  longitude: number;
  address?: string;
  locationMethod: LocationMethod;
  reportedAt: string;
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface StreetCount {
  street: string;
  count: number;
  latitude: number;
  longitude: number;
}

export interface Stats {
  totalReports: number;
  byHour: HourCount[];
  byDayOfWeek: DayCount[];
  trend: TrendPoint[];
  topStreets: StreetCount[];
  peakHour: HourCount | null;
  peakDay: DayCount | null;
}

export interface TimeWindow {
  start?: string;
  end?: string;
}
