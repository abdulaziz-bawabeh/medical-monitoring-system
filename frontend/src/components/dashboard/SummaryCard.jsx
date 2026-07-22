function SummaryCard({
    label,
    value,
    helper,
    icon: Icon,
    tone = "default",
  }) {
    return (
      <article
        className={`summary-card summary-card--${tone}`}
      >
        <div className="summary-card__icon">
          <Icon size={21} />
        </div>
  
        <div>
          <span className="summary-card__label">
            {label}
          </span>
  
          <strong className="summary-card__value">
            {value}
          </strong>
  
          <p className="summary-card__helper">
            {helper}
          </p>
        </div>
      </article>
    );
  }
  
  export default SummaryCard;