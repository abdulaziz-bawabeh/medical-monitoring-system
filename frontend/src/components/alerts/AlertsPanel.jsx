import {
    AlertCircle,
    BellRing,
    Check,
    Clock3,
  } from "lucide-react";
  
  import {
    useEmergencyOperationsStore,
  } from "../../stores/emergencyOperationsStore.js";
  
  function formatDateTime(
    value,
  ) {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(
      new Date(value),
    );
  }
  
  function formatAlertType(
    alertType,
  ) {
    const labels = {
      FACILITY_HIGH_OCCUPANCY:
        "High Facility Occupancy",
  
      EMERGENCY_CASE_CREATED:
        "Emergency Case",
  
      DISPATCH_CONFIRMATION_REQUIRED:
        "Dispatch Confirmation",
  
      AMBULANCE_OFFLINE:
        "Ambulance Offline",
  
      DISPATCH_STATUS_CHANGED:
        "Dispatch Status",
    };
  
    return (
      labels[alertType] ??
      alertType
    );
  }
  
  function AlertsPanel() {
    const alertIds =
      useEmergencyOperationsStore(
        (state) =>
          state.alertIds,
      );
  
    const alertsById =
      useEmergencyOperationsStore(
        (state) =>
          state.alertsById,
      );
  
    const acknowledgingAlertId =
      useEmergencyOperationsStore(
        (state) =>
          state
            .acknowledgingAlertId,
      );
  
    const acknowledgeError =
      useEmergencyOperationsStore(
        (state) =>
          state.acknowledgeError,
      );
  
    const acknowledgeAlert =
      useEmergencyOperationsStore(
        (state) =>
          state.acknowledgeAlert,
      );
  
    const alerts =
      alertIds
        .map(
          (alertId) =>
            alertsById[
              alertId
            ],
        )
        .filter(Boolean);
  
    const openAlertCount =
      alerts.filter(
        (alert) =>
          alert.status ===
          "OPEN",
      ).length;
  
    async function handleAcknowledge(
      alertId,
    ) {
      try {
        await acknowledgeAlert(
          alertId,
        );
      } catch {
        /*
         * Error is displayed from Zustand.
         */
      }
    }
  
    return (
      <section className="alerts-panel">
        <header className="alerts-panel__header">
          <div>
            <span>
              Operational notifications
            </span>
  
            <h2>
              Alerts
            </h2>
  
            <p>
              {openAlertCount}
              {" "}
              open alerts require attention.
            </p>
          </div>
  
          <div className="alerts-panel__icon">
            <BellRing size={21} />
  
            {openAlertCount > 0 && (
              <strong>
                {openAlertCount}
              </strong>
            )}
          </div>
        </header>
  
        {acknowledgeError && (
          <div className="alerts-panel__error">
            <AlertCircle size={16} />
  
            {acknowledgeError}
          </div>
        )}
  
        {alerts.length === 0 ? (
          <div className="alerts-panel__empty">
            No operational alerts are available.
          </div>
        ) : (
          <div className="alerts-panel__list">
            {alerts.map(
              (alert) => (
                <article
                  key={alert.id}
                  className={`alert-item alert-item--${alert.status.toLowerCase()}`}
                >
                  <div className="alert-item__top">
                    <div>
                      <span className="alert-item__type">
                        {formatAlertType(
                          alert.alertType,
                        )}
                      </span>
  
                      <h3>
                        {alert.title}
                      </h3>
                    </div>
  
                    <span
                      className={`alert-item__status alert-item__status--${alert.status.toLowerCase()}`}
                    >
                      {alert.status}
                    </span>
                  </div>
  
                  <p className="alert-item__message">
                    {alert.message}
                  </p>
  
                  {alert.emergencyCase && (
                    <div className="alert-item__resource">
                      Emergency:
                      {" "}
                      <strong>
                        {
                          alert
                            .emergencyCase
                            .caseNumber
                        }
                      </strong>
                    </div>
                  )}
  
                  {alert.facility && (
                    <div className="alert-item__resource">
                      Facility:
                      {" "}
                      <strong>
                        {
                          alert
                            .facility
                            .name
                        }
                      </strong>
                    </div>
                  )}
  
                  {alert.ambulance && (
                    <div className="alert-item__resource">
                      Ambulance:
                      {" "}
                      <strong>
                        {
                          alert
                            .ambulance
                            .code
                        }
                      </strong>
                    </div>
                  )}
  
                  <footer className="alert-item__footer">
                    <span>
                      <Clock3 size={13} />
  
                      {formatDateTime(
                        alert.createdAt,
                      )}
                    </span>
  
                    {alert.status ===
                      "OPEN" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAcknowledge(
                            alert.id,
                          )
                        }
                        disabled={
                          acknowledgingAlertId ===
                          alert.id
                        }
                      >
                        <Check size={14} />
  
                        {acknowledgingAlertId ===
                        alert.id
                          ? "Acknowledging..."
                          : "Acknowledge"}
                      </button>
                    )}
  
                    {alert.acknowledgedBy && (
                      <span className="alert-item__acknowledged">
                        Acknowledged by
                        {" "}
                        {
                          alert
                            .acknowledgedBy
                            .name
                        }
                      </span>
                    )}
                  </footer>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    );
  }
  
  export default AlertsPanel;