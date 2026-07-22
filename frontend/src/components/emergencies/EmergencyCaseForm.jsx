import {
    AlertTriangle,
    MapPin,
    Send,
  } from "lucide-react";
  
  import {
    useState,
  } from "react";
  
  import {
    useEmergencyOperationsStore,
  } from "../../stores/emergencyOperationsStore.js";
  
  const initialFormState = {
    summary: "",
  
    longitude: "",
  
    latitude: "",
  };
  
  function EmergencyCaseForm() {
    const [
      formData,
      setFormData,
    ] = useState(
      initialFormState,
    );
  
    const [
      successMessage,
      setSuccessMessage,
    ] = useState(null);
  
    const createEmergency =
      useEmergencyOperationsStore(
        (state) =>
          state.createEmergency,
      );
  
    const createStatus =
      useEmergencyOperationsStore(
        (state) =>
          state.createStatus,
      );
  
    const createError =
      useEmergencyOperationsStore(
        (state) =>
          state.createError,
      );
  
    const isSubmitting =
      createStatus ===
      "submitting";
  
    function handleChange(
      event,
    ) {
      const {
        name,
        value,
      } = event.target;
  
      setFormData(
        (current) => ({
          ...current,
  
          [name]: value,
        }),
      );
  
      setSuccessMessage(null);
    }
  
    async function handleSubmit(
      event,
    ) {
      event.preventDefault();
  
      setSuccessMessage(null);
  
      const longitude =
        Number(
          formData.longitude,
        );
  
      const latitude =
        Number(
          formData.latitude,
        );
  
      if (
        !Number.isFinite(
          longitude,
        ) ||
        !Number.isFinite(
          latitude,
        )
      ) {
        return;
      }
  
      try {
        const result =
          await createEmergency({
            eventId:
              globalThis.crypto
                .randomUUID(),
  
            summary:
              formData
                .summary
                .trim(),
  
            longitude,
  
            latitude,
  
            reportedAt:
              new Date()
                .toISOString(),
  
            payload: {
              source:
                "medical-dashboard",
  
              createdFrom:
                "emergency-form",
            },
          });
  
        setSuccessMessage(
          result.duplicate
            ? `${result.emergencyCase.caseNumber} was already registered.`
            : `${result.emergencyCase.caseNumber} was created successfully.`,
        );
  
        setFormData(
          initialFormState,
        );
      } catch {
        /*
         * The Store already contains the user-facing error.
         */
      }
    }
  
    return (
      <section className="emergency-form-card">
        <header className="emergency-form-card__header">
          <div className="emergency-form-card__icon">
            <AlertTriangle size={21} />
          </div>
  
          <div>
            <span>
              Emergency intake
            </span>
  
            <h2>
              Register Emergency Case
            </h2>
  
            <p>
              Enter the incident location and a concise operational summary.
            </p>
          </div>
        </header>
  
        <form
          className="emergency-form"
          onSubmit={handleSubmit}
        >
          <label className="emergency-form__field">
            <span>
              Emergency summary
            </span>
  
            <textarea
              name="summary"
              value={
                formData.summary
              }
              onChange={
                handleChange
              }
              minLength={5}
              maxLength={500}
              rows={4}
              required
              placeholder="Describe the emergency and the required medical response."
            />
          </label>
  
          <div className="emergency-form__coordinates">
            <label className="emergency-form__field">
              <span>
                Longitude
              </span>
  
              <div className="emergency-form__input">
                <MapPin size={15} />
  
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={
                    formData.longitude
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="36.2900"
                />
              </div>
            </label>
  
            <label className="emergency-form__field">
              <span>
                Latitude
              </span>
  
              <div className="emergency-form__input">
                <MapPin size={15} />
  
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={
                    formData.latitude
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="33.5150"
                />
              </div>
            </label>
          </div>
  
          {createError && (
            <div className="emergency-form__message emergency-form__message--error">
              {createError}
            </div>
          )}
  
          {successMessage && (
            <div className="emergency-form__message emergency-form__message--success">
              {successMessage}
            </div>
          )}
  
          <button
            type="submit"
            className="emergency-form__submit"
            disabled={
              isSubmitting
            }
          >
            <Send size={16} />
  
            {isSubmitting
              ? "Registering..."
              : "Register Emergency"}
          </button>
        </form>
      </section>
    );
  }
  
  export default EmergencyCaseForm;