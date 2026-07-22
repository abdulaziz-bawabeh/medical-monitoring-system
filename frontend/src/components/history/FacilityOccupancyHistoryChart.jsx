import {
    useMemo,
  } from "react";
  
  const CHART_WIDTH =
    1000;
  
  const CHART_HEIGHT =
    320;
  
  const CHART_PADDING = {
    top: 30,
    right: 28,
    bottom: 54,
    left: 58,
  };
  
  const SERIES_COLORS = [
    "#0f766e",
    "#256d85",
    "#b66b22",
    "#a8434b",
    "#6553a3",
    "#3f7f55",
    "#8b5e3c",
  ];
  
  function formatTime(
    value,
  ) {
    const date =
      new Date(value);
  
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Invalid time";
    }
  
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour:
          "2-digit",
  
        minute:
          "2-digit",
  
        day:
          "2-digit",
  
        month:
          "short",
      },
    ).format(date);
  }
  
  function createSvgPath(
    points,
  ) {
    if (
      points.length === 0
    ) {
      return "";
    }
  
    return points
      .map(
        (
          point,
          index,
        ) => {
          const command =
            index === 0
              ? "M"
              : "L";
  
          return `${command} ${point.x} ${point.y}`;
        },
      )
      .join(" ");
  }
  
  function FacilityOccupancyHistoryChart({
    history,
  }) {
    const chartData =
      useMemo(() => {
        if (
          !history ||
          history.points.length === 0
        ) {
          return {
            series:
              [],
  
            timeTicks:
              [],
          };
        }
  
        const fromTime =
          new Date(
            history.range.from,
          ).getTime();
  
        const toTime =
          new Date(
            history.range.to,
          ).getTime();
  
        const duration =
          Math.max(
            1,
            toTime - fromTime,
          );
  
        const innerWidth =
          CHART_WIDTH -
          CHART_PADDING.left -
          CHART_PADDING.right;
  
        const innerHeight =
          CHART_HEIGHT -
          CHART_PADDING.top -
          CHART_PADDING.bottom;
  
        const facilityNames =
          Object.fromEntries(
            history.facilities.map(
              (facility) => [
                facility.id,
                facility.name,
              ],
            ),
          );
  
        const groupedPoints =
          new Map();
  
        for (
          const point of
          history.points
        ) {
          const facilityId =
            String(
              point.facilityId,
            );
  
          if (
            !groupedPoints.has(
              facilityId,
            )
          ) {
            groupedPoints.set(
              facilityId,
              [],
            );
          }
  
          const recordedTime =
            new Date(
              point.recordedAt,
            ).getTime();
  
          const x =
            CHART_PADDING.left +
            (
              (
                recordedTime -
                fromTime
              ) /
              duration
            ) *
              innerWidth;
  
          const occupancy =
            Math.max(
              0,
              Math.min(
                100,
                point
                  .occupancyPercentage,
              ),
            );
  
          const y =
            CHART_PADDING.top +
            (
              1 -
              occupancy /
                100
            ) *
              innerHeight;
  
          groupedPoints
            .get(
              facilityId,
            )
            .push({
              ...point,
              x,
              y,
            });
        }
  
        const series =
          Array.from(
            groupedPoints.entries(),
          ).map(
            (
              [
                facilityId,
                points,
              ],
              index,
            ) => {
              const sortedPoints =
                points.sort(
                  (
                    first,
                    second,
                  ) =>
                    new Date(
                      first.recordedAt,
                    ).getTime() -
                    new Date(
                      second.recordedAt,
                    ).getTime(),
                );
  
              return {
                facilityId,
  
                facilityName:
                  facilityNames[
                    facilityId
                  ] ??
                  `Facility ${facilityId}`,
  
                color:
                  SERIES_COLORS[
                    index %
                      SERIES_COLORS.length
                  ],
  
                points:
                  sortedPoints,
  
                path:
                  createSvgPath(
                    sortedPoints,
                  ),
              };
            },
          );
  
        const timeTicks =
          Array.from(
            {
              length:
                5,
            },
            (
              _,
              index,
            ) => {
              const ratio =
                index / 4;
  
              return {
                x:
                  CHART_PADDING.left +
                  ratio *
                    innerWidth,
  
                value:
                  new Date(
                    fromTime +
                      ratio *
                        duration,
                  )
                    .toISOString(),
              };
            },
          );
  
        return {
          series,
          timeTicks,
        };
      }, [
        history,
      ]);
  
    if (
      !history ||
      history.points.length ===
        0
    ) {
      return (
        <section className="history-card history-chart-card">
          <header className="history-card__header">
            <div>
              <span>
                Medical capacity history
              </span>
  
              <h2>
                Facility Occupancy
              </h2>
  
              <p>
                Occupancy readings recorded
                during the selected time
                range.
              </p>
            </div>
          </header>
  
          <div className="history-empty-state">
            No facility occupancy readings
            were found for this period.
          </div>
        </section>
      );
    }
  
    const innerHeight =
      CHART_HEIGHT -
      CHART_PADDING.top -
      CHART_PADDING.bottom;
  
    const percentageTicks = [
      0,
      25,
      50,
      75,
      90,
      100,
    ];
  
    return (
      <section className="history-card history-chart-card">
        <header className="history-card__header">
          <div>
            <span>
              Medical capacity history
            </span>
  
            <h2>
              Facility Occupancy
            </h2>
  
            <p>
              Historical bed occupancy
              readings across the selected
              facilities.
            </p>
          </div>
  
          <strong className="history-card__counter">
            {history.count}
            {" "}
            readings
          </strong>
        </header>
  
        <div className="history-chart-wrapper">
          <svg
            className="history-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="Historical facility occupancy chart"
          >
            {percentageTicks.map(
              (percentage) => {
                const y =
                  CHART_PADDING.top +
                  (
                    1 -
                    percentage /
                      100
                  ) *
                    innerHeight;
  
                return (
                  <g
                    key={
                      percentage
                    }
                  >
                    <line
                      x1={
                        CHART_PADDING.left
                      }
                      x2={
                        CHART_WIDTH -
                        CHART_PADDING.right
                      }
                      y1={y}
                      y2={y}
                      className={
                        percentage ===
                        90
                          ? "history-chart__threshold"
                          : "history-chart__grid-line"
                      }
                    />
  
                    <text
                      x={
                        CHART_PADDING.left -
                        12
                      }
                      y={
                        y + 4
                      }
                      textAnchor="end"
                      className="history-chart__axis-label"
                    >
                      {percentage}%
                    </text>
                  </g>
                );
              },
            )}
  
            {chartData.timeTicks.map(
              (tick) => (
                <g
                  key={
                    tick.value
                  }
                >
                  <line
                    x1={
                      tick.x
                    }
                    x2={
                      tick.x
                    }
                    y1={
                      CHART_PADDING.top
                    }
                    y2={
                      CHART_HEIGHT -
                      CHART_PADDING.bottom
                    }
                    className="history-chart__vertical-line"
                  />
  
                  <text
                    x={
                      tick.x
                    }
                    y={
                      CHART_HEIGHT -
                      22
                    }
                    textAnchor="middle"
                    className="history-chart__time-label"
                  >
                    {formatTime(
                      tick.value,
                    )}
                  </text>
                </g>
              ),
            )}
  
            {chartData.series.map(
              (series) => (
                <g
                  key={
                    series.facilityId
                  }
                >
                  {series.points.length >
                    1 && (
                    <path
                      d={
                        series.path
                      }
                      fill="none"
                      stroke={
                        series.color
                      }
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
  
                  {series.points.map(
                    (point) => (
                      <circle
                        key={
                          point.id
                        }
                        cx={
                          point.x
                        }
                        cy={
                          point.y
                        }
                        r="6"
                        fill={
                          series.color
                        }
                      >
                        <title>
                          {
                            series
                              .facilityName
                          }
                          {": "}
                          {
                            point
                              .occupancyPercentage
                          }
                          {"% — "}
                          {formatTime(
                            point
                              .recordedAt,
                          )}
                        </title>
                      </circle>
                    ),
                  )}
                </g>
              ),
            )}
          </svg>
        </div>
  
        <div className="history-chart-legend">
          {chartData.series.map(
            (series) => (
              <div
                key={
                  series.facilityId
                }
              >
                <span
                  style={{
                    backgroundColor:
                      series.color,
                  }}
                />
  
                {
                  series
                    .facilityName
                }
              </div>
            ),
          )}
        </div>
      </section>
    );
  }
  
  export default FacilityOccupancyHistoryChart;