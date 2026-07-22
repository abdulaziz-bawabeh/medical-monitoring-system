import {
    BedDouble,
  } from "lucide-react";
  
  function formatFacilityType(
    facilityType,
  ) {
    const labels = {
      CENTRAL_HOSPITAL:
        "Central Hospital",
  
      CLINIC:
        "Clinic",
  
      FIELD_MEDICAL_POINT:
        "Field Medical Point",
    };
  
    return (
      labels[facilityType] ??
      facilityType
    );
  }
  
  function formatTime(value) {
    if (!value) {
      return "No data";
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
  
  function FacilityOccupancyPanel({
    facilities,
  }) {
    return (
      <section className="dashboard-panel">
        <header className="dashboard-panel__header">
          <div>
            <span className="dashboard-panel__eyebrow">
              Medical Capacity
            </span>
  
            <h2>Facility Occupancy</h2>
          </div>
  
          <div className="dashboard-panel__header-icon">
            <BedDouble size={21} />
          </div>
        </header>
  
        {facilities.length === 0 ? (
          <div className="dashboard-empty">
            No medical facilities match the selected filter.
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Governorate</th>
                  <th>Capacity</th>
                  <th>Available</th>
                  <th>Occupancy</th>
                  <th>Status</th>
                  <th>Last update</th>
                </tr>
              </thead>
  
              <tbody>
                {facilities.map(
                  (facility) => (
                    <tr key={facility.id}>
                      <td>
                        <strong>
                          {facility.name}
                        </strong>
  
                        <span>
                          {formatFacilityType(
                            facility.facilityType,
                          )}
                        </span>
                      </td>
  
                      <td>
                        {facility.governorate.name}
                      </td>
  
                      <td>
                        {facility.totalBeds}
                      </td>
  
                      <td>
                        {facility.occupancy
                          ?.availableBeds ??
                          "—"}
                      </td>
  
                      <td>
                        {facility.occupancy
                          ? `${facility.occupancy.occupancyPercentage.toFixed(1)}%`
                          : "No data"}
                      </td>
  
                      <td>
                        {facility.occupancy ? (
                          <span
                            className={`resource-status resource-status--${facility.occupancy.status.toLowerCase()}`}
                          >
                            {
                              facility
                                .occupancy
                                .status
                            }
                          </span>
                        ) : (
                          <span className="resource-status resource-status--unknown">
                            UNKNOWN
                          </span>
                        )}
                      </td>
  
                      <td>
                        {formatTime(
                          facility
                            .occupancy
                            ?.recordedAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
  
  export default FacilityOccupancyPanel;