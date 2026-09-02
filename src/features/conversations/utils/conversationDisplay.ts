function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatWeekdayTime(d: Date): string {
  return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${formatTime(d)}`;
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonthDayYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const raw = (phone || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

export function getConversationClientDisplayName(conv: {
  client_name?: string | null;
  client_phone?: string | null;
}): string {
  const phone = conv.client_phone?.trim();
  const name = conv.client_name?.trim();
  if (phone) return formatPhoneForDisplay(phone);
  return name || "Unknown";
}

export function getInitial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function getConversationDate(c: {
  created_at?: string;
  conversation_date?: string;
  conversation_time?: string;
}): Date | null {
  if (c.created_at) {
    const d = new Date(c.created_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (c.conversation_date) {
    const timePart =
      c.conversation_time && /^\d{1,2}:\d{2}/.test(c.conversation_time)
        ? c.conversation_time.length === 5
          ? `${c.conversation_time}:00`
          : c.conversation_time
        : "00:00:00";
    const d = new Date(`${c.conversation_date}T${timePart}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatConversationTime(c: {
  created_at?: string;
  conversation_date?: string;
  conversation_time?: string;
}): string {
  const d = getConversationDate(c);
  if (!d) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return `Today ${formatTime(d)}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear();
  if (isYesterday) return `Yesterday ${formatTime(d)}`;
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays < 7) return formatWeekdayTime(d);
  if (d.getFullYear() === now.getFullYear()) return formatMonthDay(d);
  return formatMonthDayYear(d);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function getStatusDotClass(status: string | null | undefined): string {
  const s = (status || "").toLowerCase();
  if (s.includes("analyzed") || s.includes("completed") || s.includes("done")) return "bg-success";
  if (s.includes("processing")) return "bg-warning";
  if (s.includes("failed") || s.includes("error")) return "bg-danger";
  return "bg-foreground/30";
}
