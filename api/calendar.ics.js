// Endpoint ini menghasilkan feed kalender (.ics) berisi Jadwal + Alarm milik satu user,
// dibaca langsung dari Firestore pakai Firebase Admin SDK (akses server-side, bukan dari browser).
// Calendar.app di Mac/iPhone bisa "subscribe" ke URL ini sekali, lalu otomatis cek update berkala.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
  );
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const DAYS_ORDER = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DAY_TO_ICAL = { Minggu:'SU', Senin:'MO', Selasa:'TU', Rabu:'WE', Kamis:'TH', Jumat:'FR', Sabtu:'SA' };

function pad(n){ return n < 10 ? '0' + n : '' + n; }

// Cari tanggal terdekat (hari ini atau setelahnya) yang jatuh pada nama hari tertentu —
// dipakai sebagai titik awal (DTSTART) untuk event yang berulang tiap minggu
function nextDateForDay(dayName){
  const targetIdx = DAYS_ORDER.indexOf(dayName);
  const now = new Date();
  const diff = (targetIdx - now.getDay() + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d;
}

function icalDateTime(date, timeStr){
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`;
}

function icalStamp(){
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s){
  return String(s || '').replace(/[\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
}

module.exports = async function handler(req, res) {
  const uid = req.query.uid;
  if (!uid) { res.status(400).send('Parameter uid wajib diisi'); return; }

  try {
    const snap = await db.collection('appData').doc(uid).get();
    if (!snap.exists) { res.status(404).send('Data tidak ditemukan untuk user ini'); return; }
    const data = snap.data();
    const scheds = data.scheds || [];
    const alarms = data.alarms || [];

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DUIT App//Jadwal dan Alarm//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Jadwal DUIT',
      'X-WR-TIMEZONE:Asia/Jakarta',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H'
    ];

    // ── Jadwal (scheds): item dengan "date" = sekali pakai, tanpa "date" = berulang tiap minggu ──
    scheds.forEach(s => {
      if (s.date) {
        const [y, mo, da] = s.date.split('-').map(Number);
        const dateObj = new Date(y, mo - 1, da);
        lines.push(
          'BEGIN:VEVENT',
          `UID:sched-${s.id}@duit-app`,
          `DTSTAMP:${icalStamp()}`,
          `DTSTART;TZID=Asia/Jakarta:${icalDateTime(dateObj, s.start)}`,
          `DTEND;TZID=Asia/Jakarta:${icalDateTime(dateObj, s.end || s.start)}`,
          `SUMMARY:${escapeText(s.name || 'Jadwal')}`,
          'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Reminder','TRIGGER:-PT10M','END:VALARM',
          'END:VEVENT'
        );
      } else {
        const base = nextDateForDay(s.day);
        const byday = DAY_TO_ICAL[s.day] || 'MO';
        lines.push(
          'BEGIN:VEVENT',
          `UID:sched-${s.id}@duit-app`,
          `DTSTAMP:${icalStamp()}`,
          `DTSTART;TZID=Asia/Jakarta:${icalDateTime(base, s.start)}`,
          `DTEND;TZID=Asia/Jakarta:${icalDateTime(base, s.end || s.start)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
          `SUMMARY:${escapeText(s.name || 'Jadwal')}`,
          'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Reminder','TRIGGER:-PT10M','END:VALARM',
          'END:VEVENT'
        );
      }
    });

    // ── Alarm: daily / weekday / weekend / once ──
    alarms.filter(a => a.active !== false).forEach(a => {
      const today = new Date();
      let rrule = null;
      if (a.repeat === 'daily') rrule = 'RRULE:FREQ=DAILY';
      else if (a.repeat === 'weekday') rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
      else if (a.repeat === 'weekend') rrule = 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU';
      // 'once' → tanpa RRULE, sekali saja

      const dt = icalDateTime(today, a.time);
      const lines2 = [
        'BEGIN:VEVENT',
        `UID:alarm-${a.id}@duit-app`,
        `DTSTAMP:${icalStamp()}`,
        `DTSTART;TZID=Asia/Jakarta:${dt}`,
        `DTEND;TZID=Asia/Jakarta:${dt}`
      ];
      if (rrule) lines2.push(rrule);
      lines2.push(
        `SUMMARY:⏰ ${escapeText(a.label || 'Alarm')}`,
        'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Alarm','TRIGGER:PT0M','END:VALARM',
        'END:VEVENT'
      );
      lines.push(...lines2);
    });

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="jadwal-duit.ics"');
    res.status(200).send(lines.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
};
