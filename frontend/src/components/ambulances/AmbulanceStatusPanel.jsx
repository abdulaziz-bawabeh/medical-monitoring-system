import {
    Ambulance,
    MapPin,
  } from "lucide-react";
  
  function formatTime(value) {
    if (!value) {
      return "No location received";
    }
  
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
    ).format(new Date(value));
  }
  
  function AmbulanceStatusPanel({
    ambulances,
  }) {
    return (
      <section className="dashboard-panel">
        <header className="dashboard-panel__header">
          <div>
            <span className="dashboard-panel__eyebrow">
              Emergency Fleet
            </span>
  
            <h2>Ambulance Status</h2>
          </div>
  
          <div className="dashboard-panel__header-icon">
            <Ambulance size={21} />
          </div>
        </header>
  
        {ambulances.length === 0 ? (
          <div className="dashboard-empty">
            No ambulances match the selected filter.
          </div>
        ) : (
          <div className="ambulance-list">
            {ambulances.map(
              (ambulance) => (
                <article
                  key={ambulance.id}
                  className="ambulance-card"
                >
                  <div className="ambulance-card__top">
                    <div className="ambulance-card__identity">
                      <div className="ambulance-card__icon">
                        <Ambulance size={20} />
                      </div>
  
                      <div>
                        <strong>
                          {ambulance.code}
                        </strong>
  
                        <span>
                          {ambulance
                            .baseFacility
                            ?.name ??
                            "No base facility"}
                        </span>
                      </div>
                    </div>
  
                    <span
                      className={`resource-status resource-status--${ambulance.status.toLowerCase()}`}
                    >
                      {ambulance.status}
                    </span>
                  </div>
  
                  <div className="ambulance-card__location">
                    <MapPin size={15} />
  
                    <div>
                      <strong>
                        {ambulance.location
                          ? `${ambulance.location.latitude.toFixed(4)}, ${ambulance.location.longitude.toFixed(4)}`
                          : "Location unavailable"}
                      </strong>
  
                      <span>
                        {formatTime(
                          ambulance.lastLocationAt,
                        )}
                      </span>
                    </div>
                  </div>
  
                  <div className="ambulance-card__footer">
                    <span>
                      {ambulance.governorate.name}
                    </span>
  
                    <span>
                      Sequence{" "}
                      {ambulance.lastSequenceNumber}
                    </span>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    );
  }
  
  export default AmbulanceStatusPanel;