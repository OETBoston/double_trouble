export type LocationMethod = "GPS" | "MAP_PIN" | "ADDRESS_SEARCH";

export interface ReportPoint {
  id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  reportedAt: string;
}

export interface CreateReportInput {
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
