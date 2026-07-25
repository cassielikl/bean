import { Capacitor, registerPlugin } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { DerivedContextInput } from "@/lib/backend/types";

interface BeanDeviceContextPlugin {
  requestCalendarAccess(): Promise<{ granted: boolean }>;
  readCalendarContexts(): Promise<{ contexts: DerivedContextInput[] }>;
  requestHealthAccess(): Promise<{ granted: boolean; available: boolean }>;
  readHealthTrends(): Promise<{ contexts: DerivedContextInput[] }>;
  saveApprovedContexts(input: { contexts: DerivedContextInput[] }): Promise<void>;
  readApprovedContexts(): Promise<{ contexts: DerivedContextInput[] }>;
  clearApprovedContexts(): Promise<void>;
}

const NativeContext = registerPlugin<BeanDeviceContextPlugin>("BeanDeviceContext");
export const isNativeIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export async function connectCalendar() {
  if (!isNativeIOS()) return { granted: true, contexts: [] as DerivedContextInput[] };
  const permission = await NativeContext.requestCalendarAccess();
  if (!permission.granted) return { granted: false, contexts: [] as DerivedContextInput[] };
  const { contexts } = await NativeContext.readCalendarContexts();
  const approved = contexts.map((context) => ({ ...context, userApproved: true }));
  await NativeContext.saveApprovedContexts({ contexts: approved });
  return { granted: true, contexts: approved };
}

export async function connectHealth() {
  if (!isNativeIOS()) return { granted: true, contexts: [] as DerivedContextInput[] };
  const permission = await NativeContext.requestHealthAccess();
  if (!permission.granted) return { granted: false, contexts: [] as DerivedContextInput[] };
  const { contexts } = await NativeContext.readHealthTrends();
  return { granted: true, contexts: contexts.map((context) => ({ ...context, userApproved: true })) };
}

export async function disconnectDeviceContext() {
  if (isNativeIOS()) await NativeContext.clearApprovedContexts();
}

export async function connectNotifications(onToken: (token: string) => Promise<void>) {
  if (!isNativeIOS()) return { granted: true };
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return { granted: false };
  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener("registration", ({ value }) => { void onToken(value); });
  await PushNotifications.register();
  const local = await LocalNotifications.checkPermissions();
  if (local.display === "prompt") await LocalNotifications.requestPermissions();
  return { granted: true };
}

export async function scheduleLocalContextMessage(context: DerivedContextInput, beanName: string) {
  if (!isNativeIOS()) return;
  const when = context.startsAt ? new Date(new Date(context.startsAt).getTime() - 24 * 60 * 60 * 1000) : new Date(Date.now() + 60_000);
  if (when.getTime() <= Date.now()) return;
  const body = context.kind === "exam" ? `Good luck tomorrow. ${beanName} believes in you!` : context.kind === "deadline" ? `${beanName} is cheering you on for tomorrow.` : `You have something important tomorrow. ${beanName} is thinking of you.`;
  await LocalNotifications.schedule({ notifications: [{ id: Math.abs(when.getTime() % 2_147_483_647), title: beanName, body, schedule: { at: when }, extra: { kind: context.kind } }] });
}
