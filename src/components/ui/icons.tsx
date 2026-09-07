import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ComponentType, SVGProps } from "react";
import {
  Add01Icon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BarChartIcon,
  Building01Icon,
  Calendar01Icon,
  Calendar03Icon,
  Camera01Icon,
  Cancel01Icon,
  CheckIcon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  CloudCheckIcon,
  CloudOffIcon,
  Download04Icon,
  File01Icon,
  FilterIcon,
  FloppyDiskIcon,
  Home01Icon,
  ListChecksIcon,
  Location01Icon,
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  Menu01Icon,
  Moon02Icon,
  PencilEdit01Icon,
  PoundIcon,
  PrinterIcon,
  RefreshCwIcon,
  Search01Icon,
  Settings01Icon,
  SparkleIcon,
  Sun03Icon,
  TrashIcon,
  UserIcon,
  Loading03Icon
} from "@hugeicons/core-free-icons";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & { size?: number | string; weight?: string; strokeWidth?: number };
export type Icon = ComponentType<IconProps>;

function createIcon(icon: IconSvgElement): Icon {
  return function HugeIcon({ size = 24, weight, ...props }: IconProps) {
    void weight;
    return <HugeiconsIcon icon={icon} size={size} {...props} />;
  };
}

export const Buildings = createIcon(Building01Icon);
export const Home = createIcon(Home01Icon);
export const ChartBar = createIcon(BarChartIcon);
export const ClipboardText = createIcon(ClipboardIcon);
export const FileText = createIcon(File01Icon);
export const ListChecks = createIcon(ListChecksIcon);
export const SignOut = createIcon(Logout01Icon);
export const X = createIcon(Cancel01Icon);
export const List = createIcon(Menu01Icon);
export const ArrowRight = createIcon(ArrowRight01Icon);
export const ArrowLeft = createIcon(ArrowLeft01Icon);
export const ArrowClockwise = createIcon(RefreshCwIcon);
export const RefreshCw = createIcon(RefreshCwIcon);
export const ArrowsClockwise = createIcon(RefreshCwIcon);
export const Check = createIcon(CheckIcon);
export const CheckCircle = createIcon(CheckmarkCircle02Icon);
export const MapPin = createIcon(Location01Icon);
export const Sparkle = createIcon(SparkleIcon);
export const User = createIcon(UserIcon);
export const Warning = createIcon(Alert02Icon);
export const WarningCircle = createIcon(AlertCircleIcon);
export const Calendar = createIcon(Calendar03Icon);
export const CalendarBlank = createIcon(Calendar01Icon);
export const Camera = createIcon(Camera01Icon);
export const CaretDown = createIcon(ArrowDown01Icon);
export const CaretLeft = createIcon(ArrowLeft01Icon);
export const CaretRight = createIcon(ArrowRight01Icon);
export const CurrencyGbp = createIcon(PoundIcon);
export const DownloadSimple = createIcon(Download04Icon);
export const Printer = createIcon(PrinterIcon);
export const Funnel = createIcon(FilterIcon);
export const MagnifyingGlass = createIcon(Search01Icon);
export const Envelope = createIcon(Mail01Icon);
export const Lock = createIcon(LockIcon);
export const Moon = createIcon(Moon02Icon);
export const PencilSimple = createIcon(PencilEdit01Icon);
export const Plus = createIcon(Add01Icon);
export const Gear = createIcon(Settings01Icon);
export const SpinnerGap = createIcon(Loading03Icon);
export const Sun = createIcon(Sun03Icon);
export const Trash = createIcon(TrashIcon);
export const FloppyDisk = createIcon(FloppyDiskIcon);
export const House = createIcon(Home01Icon);
export const CloudCheck = createIcon(CloudCheckIcon);
export const CloudSlash = createIcon(CloudOffIcon);
