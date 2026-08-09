import { useEffect, useMemo, useState } from "react";

const GARAGE_TIME_ZONE = "Europe/London";

const GARAGE_HOURS = {
  openHour: 9,
  closeHour: 16,
};

type GarageStatusInfo = {
  isOpen: boolean;
  label: "Open" | "Closed";
  countdownText: string;
};

function getLondonTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: GARAGE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function getGarageStatus(date: Date): GarageStatusInfo {
  const { hour, minute } = getLondonTimeParts(date);

  const currentMinutes = hour * 60 + minute;
  const openingMinutes = GARAGE_HOURS.openHour * 60;
  const closingMinutes = GARAGE_HOURS.closeHour * 60;

  const isOpen =
    currentMinutes >= openingMinutes && currentMinutes < closingMinutes;

  if (isOpen) {
    const minutesUntilClose = closingMinutes - currentMinutes;

    return {
      isOpen: true,
      label: "Open",
      countdownText: `Closes in ${formatDuration(minutesUntilClose)}`,
    };
  }

  if (currentMinutes < openingMinutes) {
    const minutesUntilOpen = openingMinutes - currentMinutes;

    return {
      isOpen: false,
      label: "Closed",
      countdownText: `Opens in ${formatDuration(minutesUntilOpen)}`,
    };
  }

  const minutesUntilMidnight = 24 * 60 - currentMinutes;
  const minutesUntilOpen = minutesUntilMidnight + openingMinutes;

  return {
    isOpen: false,
    label: "Closed",
    countdownText: `Opens in ${formatDuration(minutesUntilOpen)}`,
  };
}

export default function GarageStatus() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const status = useMemo(() => getGarageStatus(currentTime), [currentTime]);

  return (
    <div
      className={`
        flex items-center gap-2.5
        rounded-full
        border
        px-3.5 py-2
        backdrop-blur-md
        transition-all
        duration-300
        ${
          status.isOpen
            ? `
              border-emerald-500/30
              bg-emerald-500/10
              shadow-lg
              shadow-emerald-500/10
            `
            : `
              border-rose-500/30
              bg-rose-500/10
              shadow-lg
              shadow-rose-500/10
            `
        }
      `}
    >
      <span className="relative flex h-2.5 w-2.5">
        {status.isOpen && (
          <span
            className="
              absolute
              inline-flex
              h-full w-full
              animate-ping
              rounded-full
              bg-emerald-400
              opacity-75
            "
          />
        )}

        <span
          className={`
            relative
            inline-flex
            h-2.5 w-2.5
            rounded-full
            ${status.isOpen ? "bg-emerald-400" : "bg-rose-400"}
          `}
        />
      </span>

      <div className="flex flex-col leading-tight">
        {/* <span
          className={`
            text-xs
            font-semibold
            tracking-wide
            ${status.isOpen ? "text-emerald-400" : "text-rose-400"}
          `}
        >
          {status.label}
        </span> */}

        <span
          className="
            whitespace-nowrap
            text-[16px]
            font-medium
            text-zinc-500
            dark:text-zinc-400
          "
        >
          {status.countdownText}
        </span>
      </div>
    </div>
  );
}
