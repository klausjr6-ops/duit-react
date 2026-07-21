// Private iCalendar feed for DUIT schedules.
// The URL is a capability: it requires both the Firebase uid and the random
// calendarToken stored in that user's private Firestore document.

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { timingSafeEqual } from "node:crypto";

const DAY_TO_ICAL = {
  Minggu: "SU",
  Senin: "MO",
  Selasa: "TU",
  Rabu: "WE",
  Kamis: "TH",
  Jumat: "FR",
  Sabtu: "SA",
};
const DAYS_ORDER = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function getDb() {
  if (!getApps().length) {
    const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!encodedServiceAccount) {
      throw new Error("Calendar service account is not configured");
    }

    const serviceAccount = JSON.parse(
      Buffer.from(encodedServiceAccount, "base64").toString("utf8")
    );
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

function getSingleQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function hasValidToken(receivedToken, expectedToken) {
  if (!receivedToken || !expectedToken) return false;

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function pad(value) {
  return value < 10 ? `0${value}` : String(value);
}

function icalStamp() {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "")) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return false;
  const [hour, minute] = time.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function icalDateTime(dateKey, time = "00:00") {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return `${year}${pad(month)}${pad(day)}T${pad(hour || 0)}${pad(minute || 0)}00`;
}

function icalUntil(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  // 23:59:59 Asia/Jakarta = 16:59:59 UTC; Jakarta has no DST.
  return `${year}${pad(month)}${pad(day)}T165959Z`;
}

function defaultEndTime(start = "00:00") {
  const [hour, minute] = start.split(":").map(Number);
  const totalMinutes = ((hour || 0) * 60 + (minute || 0) + 60) % (24 * 60);
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function escapeText(value) {
  return String(value || "")
    .replace(/[\\,;]/g, (match) => `\\${match}`)
    .replace(/\r?\n/g, "\\n");
}

function dayIndexFromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayInJakarta() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function nextDateForDay(dayName) {
  const targetIndex = DAYS_ORDER.indexOf(dayName);
  const today = todayInJakarta();
  if (targetIndex < 0) return today;

  const offset = (targetIndex - dayIndexFromDateKey(today) + 7) % 7;
  return addDaysToDateKey(today, offset);
}

function scheduleRule(schedule, startDate) {
  if (!schedule.recurring && schedule.date) return null;

  const dayName = schedule.date
    ? DAYS_ORDER[dayIndexFromDateKey(startDate)]
    : schedule.day;
  const byDay = DAY_TO_ICAL[dayName];
  if (!byDay) return null;

  const until = isValidDateKey(schedule.untilDate) ? `;UNTIL=${icalUntil(schedule.untilDate)}` : "";
  return `RRULE:FREQ=WEEKLY;BYDAY=${byDay}${until}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const uid = getSingleQueryValue(req.query.uid);
  const token = getSingleQueryValue(req.query.token);
  if (!uid || !token) {
    res.status(401).json({ error: "A private calendar feed URL is required" });
    return;
  }

  try {
    const db = getDb();
    const snapshot = await db.doc(`users/${uid}/data/main`).get();
    if (!snapshot.exists) {
      res.status(404).json({ error: "Calendar data not found" });
      return;
    }

    const data = snapshot.data() || {};
    if (!hasValidToken(token, data.settings?.calendarToken)) {
      // Do not reveal whether a uid exists or whether only the token is wrong.
      res.status(404).json({ error: "Calendar feed not found" });
      return;
    }

    const schedules = Array.isArray(data.scheds) ? data.scheds : [];
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DUIT App//Jadwal//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Jadwal DUIT",
      "X-WR-TIMEZONE:Asia/Jakarta",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    ];

    schedules.forEach((schedule) => {
      const startDate = schedule.date || nextDateForDay(schedule.day);
      if (!isValidDateKey(startDate) || !isValidTime(schedule.start)) return;
      const endTime = schedule.end && isValidTime(schedule.end)
        ? schedule.end
        : defaultEndTime(schedule.start);
      // Legacy schedules may cross midnight. iCalendar requires DTEND to be
      // later than DTSTART, so move the end date to tomorrow in that case.
      const endDate = endTime <= schedule.start ? addDaysToDateKey(startDate, 1) : startDate;
      const rule = scheduleRule(schedule, startDate);

      lines.push(
        "BEGIN:VEVENT",
        `UID:sched-${escapeText(schedule.id)}@duit-app`,
        `DTSTAMP:${icalStamp()}`,
        `DTSTART;TZID=Asia/Jakarta:${icalDateTime(startDate, schedule.start)}`,
        `DTEND;TZID=Asia/Jakarta:${icalDateTime(endDate, endTime)}`,
        `SUMMARY:${escapeText(schedule.name || "Jadwal")}`
      );

      if (schedule.desc) lines.push(`DESCRIPTION:${escapeText(schedule.desc)}`);
      if (rule) lines.push(rule);

      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "TRIGGER:-PT10M",
        "END:VALARM",
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");

    // A calendar URL is private; never let a shared cache retain its contents.
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="jadwal-duit.ics"');
    res.status(200).send(lines.join("\r\n"));
  } catch (error) {
    console.error("Calendar feed error:", error);
    const notConfigured = error instanceof Error && error.message === "Calendar service account is not configured";
    res.status(notConfigured ? 503 : 500).json({
      error: notConfigured
        ? "Calendar feed is not configured on this deployment"
        : "Calendar feed is temporarily unavailable",
    });
  }
}
