#!/usr/bin/env python3
"""Read a Google Calendar private iCal feed and write events.json for the dashboard.

Reads the feed URL from the CALENDAR_ICS_URL environment variable (a GitHub secret
in CI). Expands recurring events over a rolling window and normalizes everything to
the schema the dashboard expects:

  { "syncedAt": "YYYY-MM-DD",
    "events": [ {title, start, end?, startTime?, endTime?, location?, allDay, trip?} ] }

All-day `end` is the inclusive last day; timed events carry HH:MM in America/New_York.
"""
import os
import sys
import json
import datetime
import urllib.request
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

TZ = ZoneInfo("America/New_York")
WINDOW_DAYS = 120


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "dashboard-calendar-sync"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def is_date_only(value) -> bool:
    return isinstance(value, datetime.date) and not isinstance(value, datetime.datetime)


def to_local(dt: datetime.datetime) -> datetime.datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(TZ)


def main() -> int:
    url = os.environ.get("CALENDAR_ICS_URL", "").strip()
    if not url:
        sys.stderr.write("ERROR: CALENDAR_ICS_URL is not set.\n")
        return 2

    raw = fetch(url)
    if b"BEGIN:VCALENDAR" not in raw:
        sys.stderr.write("ERROR: feed did not return iCal data (check the secret link).\n")
        return 3

    cal = icalendar.Calendar.from_ical(raw)
    today = datetime.datetime.now(TZ).date()
    end_window = today + datetime.timedelta(days=WINDOW_DAYS)

    occurrences = recurring_ical_events.of(cal).between(today, end_window)
    events = []
    for comp in occurrences:
        summary = str(comp.get("SUMMARY", "")).strip()
        if not summary:
            continue
        location = str(comp.get("LOCATION", "")).strip()
        dtstart = comp.get("DTSTART").dt
        dtend_field = comp.get("DTEND")
        all_day = is_date_only(dtstart)

        ev = {"title": summary, "allDay": all_day}
        if location:
            ev["location"] = location

        if all_day:
            ev["start"] = dtstart.isoformat()
            if dtend_field is not None:
                last = dtend_field.dt - datetime.timedelta(days=1)  # DTEND is exclusive
                if last > dtstart:
                    ev["end"] = last.isoformat()
                    ev["trip"] = True
        else:
            local = to_local(dtstart)
            ev["start"] = local.date().isoformat()
            ev["startTime"] = local.strftime("%H:%M")
            if dtend_field is not None:
                end_local = to_local(dtend_field.dt)
                ev["endTime"] = end_local.strftime("%H:%M")

        events.append(ev)

    events.sort(key=lambda e: (e["start"], e.get("startTime", "00:00")))
    out = {"syncedAt": today.isoformat(), "events": events}

    with open("events.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote events.json with {len(events)} events (window {today} .. {end_window}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
