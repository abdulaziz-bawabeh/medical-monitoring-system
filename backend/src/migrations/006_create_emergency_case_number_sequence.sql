/*
 * Generates globally unique sequential numbers used inside
 * human-readable emergency case references.
 *
 * Example:
 * EMR-20260721-00000001
 */
CREATE SEQUENCE emergency_case_number_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 20;