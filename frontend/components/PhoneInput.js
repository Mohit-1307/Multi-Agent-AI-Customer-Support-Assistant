// frontend/components/PhoneInput.js
//
// A phone number field with a country-code dropdown (flag + dial code),
// styled to match the app's auth-input look. Always optional — callers
// decide whether to require a value, this component just collects it.
//
// value/onChange work with the full E.164-ish string (e.g. "+919876543210")
// so the parent doesn't need to know about the country split internally.

import { useEffect, useRef, useState } from "react";

import { COUNTRY_CODES } from "../data/countryCodes";

const DEFAULT_COUNTRY = COUNTRY_CODES.find((c) => c.iso === "IN") || COUNTRY_CODES[0];

export default function PhoneInput({ value, onChange, placeholder = "98765 43210" }) {

  const [country, setCountry] = useState(DEFAULT_COUNTRY);

  const [number, setNumber] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [search, setSearch] = useState("");

  const dropdownRef = useRef(null);

  // If the parent passed an initial value (e.g. editing an existing
  // number), try to split it into country + local number on first render.
  useEffect(() => {

    if (!value) return;

    const match = COUNTRY_CODES

      .slice()

      .sort((a, b) => b.dial.length - a.dial.length) // longest dial code first, so "+1242" (Bahamas) matches before "+1" (US)

      .find((c) => value.startsWith(c.dial));

    if (match) {

      setCountry(match);

      setNumber(value.slice(match.dial.length).trim());

    } else {

      setNumber(value);

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {

    const handleClickOutside = (e) => {

      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {

        setDropdownOpen(false);

        setSearch("");

      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  const emitChange = (nextCountry, nextNumber) => {

    const digitsOnly = nextNumber.replace(/[^\d]/g, "");

    onChange(digitsOnly ? `${nextCountry.dial}${digitsOnly}` : "");

  };

  const handleCountrySelect = (c) => {

    setCountry(c);

    setDropdownOpen(false);

    setSearch("");

    emitChange(c, number);

  };

  const handleNumberChange = (e) => {

    const next = e.target.value;

    setNumber(next);

    emitChange(country, next);

  };

  const filteredCountries = COUNTRY_CODES.filter((c) =>

    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)

  );

  return (

    <div style = {{ display: "flex", gap: 8 }}>

      <div ref = {dropdownRef} style = {{ position: "relative" }}>

        <button

          type = "button"

          onClick = {() => setDropdownOpen((prev) => !prev)}

          className = "auth-input"

          style = {{

            width: 108,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 6,

            cursor: "pointer",

          }}

        >

          <span style = {{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>

            <span>{country.flag}</span>

            <span>{country.dial}</span>

          </span>

          <svg width = "10" height = "10" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" strokeWidth = "3" strokeLinecap = "round" strokeLinejoin = "round" style = {{ flexShrink: 0 }}>

            <polyline points = "6 9 12 15 18 9" />

          </svg>

        </button>

        {dropdownOpen && (

          <div

            className = "card"

            style = {{

              position: "absolute",

              top: "calc(100% + 6px)",

              left: 0,

              width: 260,

              maxHeight: 320,

              overflowY: "auto",

              zIndex: 30,

              padding: 8,

            }}

          >

            <input

              type = "text"

              autoFocus

              value = {search}

              onChange = {(e) => setSearch(e.target.value)}

              placeholder = "Search country..."

              className = "auth-input"

              style = {{ marginBottom: 6, fontSize: 13, padding: "8px 10px" }}

            />

            {filteredCountries.map((c) => (

              <button

                key = {c.iso}

                type = "button"

                onClick = {() => handleCountrySelect(c)}

                style = {{

                  width: "100%",

                  display: "flex",

                  alignItems: "center",

                  gap: 8,

                  padding: "7px 8px",

                  background: c.iso === country.iso ? "var(--techmart-gray-100)" : "transparent",

                  border: "none",

                  borderRadius: 8,

                  cursor: "pointer",

                  textAlign: "left",

                  fontSize: 13,

                  color: "var(--tm-text-strong)",

                }}

                onMouseEnter = {(e) => (e.currentTarget.style.background = "var(--techmart-gray-100)")}

                onMouseLeave = {(e) => (e.currentTarget.style.background = c.iso === country.iso ? "var(--techmart-gray-100)" : "transparent")}

              >

                <span>{c.flag}</span>

                <span style = {{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>

                <span style = {{ color: "var(--tm-text-muted)" }}>{c.dial}</span>

              </button>

            ))}

            {filteredCountries.length === 0 && (

              <p style = {{ fontSize: 13, color: "var(--tm-text-muted)", padding: "8px 4px" }}>No countries found</p>

            )}

          </div>

        )}

      </div>

      <input

        type = "tel"

        value = {number}

        onChange = {handleNumberChange}

        placeholder = {placeholder}

        className = "auth-input"

        style = {{ flex: 1 }}

      />

    </div>

  );

}