'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { MapComponentProps } from './MapComponent';

const DynamicMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
});

// Forwarding props with the correct type
const Map = (props: MapComponentProps) => <DynamicMap {...props} />;

export default Map;
