"use client";

import React from "react";

interface GoogleMapProps {
  width?: string
  height?: string
  src?: string
}

const GoogleMapComponent = ({ width, height, src }: GoogleMapProps) => {
  return (
    <iframe
      src={src}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ width, height }}
    ></iframe>
  );
};

export default GoogleMapComponent;
