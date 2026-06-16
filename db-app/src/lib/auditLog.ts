export interface AuditEvent {
  eventType: string;
  payload?: Record<string, unknown>;
}

const sessionKey = "medical-desert-planner-session-id";

export function logPlannerEvent(event: AuditEvent) {
  const body = JSON.stringify({
    eventType: event.eventType,
    sessionId: sessionId(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    payload: event.payload ?? {},
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/log-event", new Blob([body], { type: "application/json" }));
    if (sent) return;
  }

  void fetch("/api/log-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging must never interrupt planner workflows.
  });
}

function sessionId() {
  const existing = localStorage.getItem(sessionKey);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(sessionKey, next);
  return next;
}
