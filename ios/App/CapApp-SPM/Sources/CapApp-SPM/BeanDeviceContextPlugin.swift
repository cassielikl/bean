import Capacitor
import EventKit
import HealthKit
import Security

@objc(BeanDeviceContextPlugin)
public class BeanDeviceContextPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BeanDeviceContextPlugin"
    public let jsName = "BeanDeviceContext"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestCalendarAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readCalendarContexts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestHealthAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readHealthTrends", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveApprovedContexts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readApprovedContexts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearApprovedContexts", returnType: CAPPluginReturnPromise),
    ]

    private let eventStore = EKEventStore()
    private let healthStore = HKHealthStore()
    private let keychainAccount = "approved-derived-contexts"

    @objc func requestCalendarAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents { granted, error in self.finishPermission(call, granted, error) }
        } else {
            eventStore.requestAccess(to: .event) { granted, error in self.finishPermission(call, granted, error) }
        }
    }

    private func finishPermission(_ call: CAPPluginCall, _ granted: Bool, _ error: Error?) {
        DispatchQueue.main.async {
            if let error { call.reject(error.localizedDescription) } else { call.resolve(["granted": granted]) }
        }
    }

    @objc func readCalendarContexts(_ call: CAPPluginCall) {
        let start = Date(), end = Calendar.current.date(byAdding: .day, value: 7, to: start)!
        let events = eventStore.events(matching: eventStore.predicateForEvents(withStart: start, end: end, calendars: nil))
        let contexts = events.compactMap { event -> [String: Any]? in
            let value = "\(event.title ?? "") \(event.notes ?? "")".lowercased()
            let kind: String
            if value.range(of: "exam|test|midterm|final", options: .regularExpression) != nil { kind = "exam" }
            else if value.range(of: "deadline|due", options: .regularExpression) != nil { kind = "deadline" }
            else if value.range(of: "doctor|dentist|appointment", options: .regularExpression) != nil { kind = "appointment" }
            else if value.contains("birthday") { kind = "birthday" }
            else if value.range(of: "flight|train|travel|trip", options: .regularExpression) != nil { kind = "travel" }
            else if !event.hasAlarms { return nil } else { kind = "important" }
            return ["kind": kind, "startsAt": ISO8601DateFormatter().string(from: event.startDate), "expiresAt": ISO8601DateFormatter().string(from: event.endDate.addingTimeInterval(86400))]
        }
        call.resolve(["contexts": contexts])
    }

    @objc func requestHealthAccess(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let steps = HKObjectType.quantityType(forIdentifier: .stepCount),
              let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
              let mindful = HKObjectType.categoryType(forIdentifier: .mindfulSession) else {
            call.resolve(["granted": false, "available": false]); return
        }
        healthStore.requestAuthorization(toShare: [], read: [steps, sleep, mindful]) { granted, error in
            DispatchQueue.main.async {
                if let error { call.reject(error.localizedDescription) } else { call.resolve(["granted": granted, "available": true]) }
            }
        }
    }

    @objc func readHealthTrends(_ call: CAPPluginCall) {
        let group = DispatchGroup(); var result: [[String: Any]] = []; let lock = NSLock()
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
            group.enter(); compareQuantity(steps, unit: .count()) { band in lock.lock(); result.append(self.context("activity_trend", band)); lock.unlock(); group.leave() }
        }
        if let mindful = HKObjectType.categoryType(forIdentifier: .mindfulSession) {
            group.enter(); compareCategoryDuration(mindful) { band in lock.lock(); result.append(self.context("mindful_trend", band)); lock.unlock(); group.leave() }
        }
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            group.enter(); compareCategoryDuration(sleep) { band in lock.lock(); result.append(self.context("sleep_trend", band)); lock.unlock(); group.leave() }
        }
        group.notify(queue: .main) { call.resolve(["contexts": result]) }
    }

    private func context(_ kind: String, _ band: String) -> [String: Any] {
        ["kind": kind, "band": band, "expiresAt": ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400))]
    }

    private func band(_ recent: Double, _ baseline: Double) -> String {
        guard baseline > 0 else { return "usual" }
        return recent < baseline * 0.8 ? "below_usual" : recent > baseline * 1.2 ? "above_usual" : "usual"
    }

    private func compareQuantity(_ type: HKQuantityType, unit: HKUnit, completion: @escaping (String) -> Void) {
        let end = Date(), recentStart = Calendar.current.date(byAdding: .day, value: -7, to: end)!, baselineStart = Calendar.current.date(byAdding: .day, value: -14, to: end)!
        func sum(_ start: Date, _ stop: Date, _ done: @escaping (Double) -> Void) {
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: stop), options: .cumulativeSum) { _, stats, _ in done(stats?.sumQuantity()?.doubleValue(for: unit) ?? 0) }
            healthStore.execute(query)
        }
        sum(recentStart, end) { recent in sum(baselineStart, recentStart) { baseline in completion(self.band(recent, baseline)) } }
    }

    private func compareCategoryDuration(_ type: HKCategoryType, completion: @escaping (String) -> Void) {
        let end = Date(), recentStart = Calendar.current.date(byAdding: .day, value: -7, to: end)!, baselineStart = Calendar.current.date(byAdding: .day, value: -14, to: end)!
        func duration(_ start: Date, _ stop: Date, _ done: @escaping (Double) -> Void) {
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: start, end: stop), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in done((samples ?? []).reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }) }
            healthStore.execute(query)
        }
        duration(recentStart, end) { recent in duration(baselineStart, recentStart) { baseline in completion(self.band(recent, baseline)) } }
    }

    @objc func saveApprovedContexts(_ call: CAPPluginCall) {
        guard let contexts = call.getArray("contexts"), let data = try? JSONSerialization.data(withJSONObject: contexts) else { call.reject("Invalid contexts"); return }
        SecItemDelete(keychainQuery() as CFDictionary)
        var query = keychainQuery(); query[kSecValueData as String] = data
        let status = SecItemAdd(query as CFDictionary, nil)
        status == errSecSuccess ? call.resolve() : call.reject("Unable to secure contexts")
    }

    @objc func readApprovedContexts(_ call: CAPPluginCall) {
        var query = keychainQuery(); query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data, let contexts = try? JSONSerialization.jsonObject(with: data) else { call.resolve(["contexts": []]); return }
        call.resolve(["contexts": contexts])
    }

    @objc func clearApprovedContexts(_ call: CAPPluginCall) { SecItemDelete(keychainQuery() as CFDictionary); call.resolve() }
    private func keychainQuery() -> [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.bean.noticing", kSecAttrAccount as String: keychainAccount] }
}
